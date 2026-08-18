import { Prisma } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { paginate } from "../../utils/db/paginate";

/**
 * Audit Repository
 *
 * Append-only: exposes create and read helpers only. There is deliberately no
 * update or delete — an audit trail that can be rewritten is not an audit trail.
 */

const auditInclude = {
  actor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.AuditLogInclude;

export type AuditLogWithRelations = Prisma.AuditLogGetPayload<{
  include: typeof auditInclude;
}>;

export interface AuditLogFindAllOptions {
  pageNum?: number;
  limitNum?: number;
  search?: string;
  action?: string | string[];
  entityType?: string | string[];
  entityId?: string;
  actorId?: string;
  organizationId?: string;
  /** Actions hidden from the caller (platform-only rows for org admins). */
  excludeActions?: readonly string[];
  /** Actor roles hidden from the caller (super-admin activity for org admins). */
  excludeActorRoles?: readonly string[];
  createdFrom?: Date;
  createdTo?: Date;
}

/**
 * Translates filter options into a Prisma `where`.
 *
 * Shared by the paginated read and the export so the two can never disagree
 * about what a caller is allowed to see — an export that applied even slightly
 * looser visibility rules than the list would be a data leak wearing a
 * CSV extension.
 */
const buildAuditWhere = (
  options: AuditLogFindAllOptions,
): Prisma.AuditLogWhereInput => {
  const where: Prisma.AuditLogWhereInput = {};

  if (options.search) {
      where.OR = [
        { actorEmail: { contains: options.search, mode: "insensitive" } },
        { actorRole: { contains: options.search, mode: "insensitive" } },
        { action: { contains: options.search, mode: "insensitive" } },
        { entityType: { contains: options.search, mode: "insensitive" } },
        { entityId: { contains: options.search, mode: "insensitive" } },
      ];
    }

    if (options.action) {
      where.action = Array.isArray(options.action)
        ? { in: options.action }
        : options.action;
    }

    if (options.entityType) {
      where.entityType = Array.isArray(options.entityType)
        ? { in: options.entityType }
        : options.entityType;
    }

    if (options.entityId) {
      where.entityId = options.entityId;
    }

    if (options.actorId) {
      where.actorId = options.actorId;
    }

    // Callers resolve this to a concrete value; an undefined organizationId here
    // means "all organizations" and is only ever reached for super-admins.
    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }

    // Exclusions must live in the query, not in a post-filter: filtering after
    // pagination would return short pages and a total that does not match.
    const exclusions: Prisma.AuditLogWhereInput[] = [];
    if (options.excludeActions?.length) {
      exclusions.push({ action: { in: [...options.excludeActions] } });
    }
    if (options.excludeActorRoles?.length) {
      exclusions.push({ actorRole: { in: [...options.excludeActorRoles] } });
    }
    if (exclusions.length) {
      where.NOT = exclusions;
    }

  if (options.createdFrom || options.createdTo) {
    where.createdAt = {
      ...(options.createdFrom ? { gte: options.createdFrom } : {}),
      ...(options.createdTo ? { lte: options.createdTo } : {}),
    };
  }

  return where;
};

/** Rows per round-trip while exporting. Bounds memory, not the result size. */
const EXPORT_BATCH_SIZE = 500;

export const auditRepository = {
  create: async (data: Prisma.AuditLogUncheckedCreateInput, tx?: DB) => {
    const db = tx || prisma;
    return db.auditLog.create({ data });
  },

  findAll: async (options: AuditLogFindAllOptions = {}, tx?: DB) => {
    const db = tx || prisma;
    const page = options.pageNum || 1;
    const limit = Math.min(options.limitNum || 20, 100);

    const where = buildAuditWhere(options);

    const result = await paginate(db.auditLog, where, { page, limit }, db, {
      orderBy: { createdAt: "desc" },
      include: auditInclude,
    });

    // paginate() infers its row type from the delegate's default payload and
    // cannot see through `include`, so restate the shape the include guarantees.
    return {
      ...result,
      data: result.data as AuditLogWithRelations[],
    };
  },

  /**
   * Yields every matching row, oldest first, in batches.
   *
   * A generator rather than an array: an export is deliberately not capped at
   * the list's 100-row page limit, and a compliance period can run to hundreds
   * of thousands of rows. Streaming keeps peak memory at one batch regardless.
   *
   * Keyset pagination on (createdAt, id) rather than OFFSET — with rows still
   * being written during a long export, OFFSET would skip and repeat rows as
   * earlier pages shift underneath it. `id` breaks ties on identical
   * timestamps, which a bulk operation produces routinely.
   */
  async *streamAll(
    options: AuditLogFindAllOptions = {},
    tx?: DB,
  ): AsyncGenerator<AuditLogWithRelations[]> {
    const db = tx || prisma;
    const where = buildAuditWhere(options);

    let cursor: { createdAt: Date; id: string } | null = null;

    for (;;) {
      const rows = (await db.auditLog.findMany({
        where: cursor
          ? {
              AND: [
                where,
                {
                  OR: [
                    { createdAt: { gt: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { gt: cursor.id } },
                  ],
                },
              ],
            }
          : where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: EXPORT_BATCH_SIZE,
        include: auditInclude,
      })) as AuditLogWithRelations[];

      if (!rows.length) return;

      yield rows;

      if (rows.length < EXPORT_BATCH_SIZE) return;

      const last = rows[rows.length - 1];
      cursor = { createdAt: last.createdAt, id: last.id };
    }
  },

  /**
   * Deletes rows older than `cutoff`, in bounded batches.
   *
   * The only place in the application that deletes audit rows. Everything else
   * treats the table as append-only, which is why this lives behind an explicit
   * retention setting rather than being available as a general delete.
   */
  purgeOlderThan: async (
    cutoff: Date,
    batchSize = 1000,
    maxBatches = 100,
    tx?: DB,
  ): Promise<number> => {
    const db = tx || prisma;
    let removed = 0;

    for (let batch = 0; batch < maxBatches; batch += 1) {
      const doomed = await db.auditLog.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take: batchSize,
      });

      if (!doomed.length) break;

      const result = await db.auditLog.deleteMany({
        where: { id: { in: doomed.map((row) => row.id) } },
      });

      removed += result.count;

      if (doomed.length < batchSize) break;
    }

    return removed;
  },
};
