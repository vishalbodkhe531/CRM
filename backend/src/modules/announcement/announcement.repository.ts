import { Prisma, Role, AnnouncementStatus } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { paginate } from "../../utils/db/paginate";

/**
 * Announcement Repository
 *
 * Holds the visibility query the whole feature depends on. Everything else here
 * is ordinary CRUD.
 */

const announcementInclude = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.AnnouncementInclude;

export type AnnouncementWithRelations = Prisma.AnnouncementGetPayload<{
  include: typeof announcementInclude;
}>;

/** An announcement plus the calling user's receipt, if any. */
export type AnnouncementWithReceipt = AnnouncementWithRelations & {
  receipts: { readAt: Date | null; dismissedAt: Date | null }[];
};

export type AnnouncementViewer = {
  id: string;
  role: Role;
  organizationId: string | null;
};

export interface AnnouncementFindAllOptions {
  pageNum?: number;
  limitNum?: number;
  search?: string;
  status?: string | string[];
  scope?: string | string[];
  severity?: string | string[];
  /** Resolved by the service. Undefined means "all organizations" (super-admin only). */
  organizationId?: string;
  /** Restricts to rows the given org may manage: its own, never another tenant's. */
  restrictToOrganizationId?: string;
}

/**
 * Rows a given user is entitled to see right now.
 *
 * Scheduling and expiry are evaluated here rather than by a background job, so
 * `now` must be passed in by the caller and reused across the list and count
 * queries within one request — otherwise a row can straddle the boundary and the
 * unread badge disagrees with the list it labels.
 *
 * Deliberately has no super-admin branch: a super-admin sees every announcement
 * through the management list, not through their own feed. Special-casing them
 * here would make the function untestable.
 */
export const buildVisibilityWhere = (
  viewer: AnnouncementViewer,
  now: Date,
): Prisma.AnnouncementWhereInput => {
  const audience: Prisma.AnnouncementWhereInput[] = [
    // Platform broadcast to everyone.
    { scope: "PLATFORM", targetOrganizationIds: { isEmpty: true } },
  ];

  if (viewer.organizationId) {
    audience.push(
      // Platform broadcast explicitly targeting this org.
      { scope: "PLATFORM", targetOrganizationIds: { has: viewer.organizationId } },
      // The org's own announcements.
      { scope: "ORGANIZATION", organizationId: viewer.organizationId },
    );
  }

  return {
    deletedAt: null,
    // Both count: a SCHEDULED row is a future-dated publish that goes live once
    // its publishAt passes. The publishAt window below is the timing authority.
    status: { in: [AnnouncementStatus.PUBLISHED, AnnouncementStatus.SCHEDULED] },
    AND: [
      { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      {
        OR: [
          { targetRoles: { isEmpty: true } },
          { targetRoles: { has: viewer.role } },
        ],
      },
      { OR: audience },
    ],
  };
};

export const announcementRepository = {
  create: async (data: Prisma.AnnouncementUncheckedCreateInput, tx?: DB) => {
    const db = tx || prisma;
    return db.announcement.create({ data, include: announcementInclude });
  },

  findById: async (id: string, tx?: DB) => {
    const db = tx || prisma;
    return db.announcement.findFirst({
      where: { id, deletedAt: null },
      include: announcementInclude,
    });
  },

  update: async (
    id: string,
    data: Prisma.AnnouncementUncheckedUpdateInput,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    return db.announcement.update({
      where: { id },
      data,
      include: announcementInclude,
    });
  },

  /** Management list. Org scoping is resolved by the service, never inferred here. */
  findAll: async (options: AnnouncementFindAllOptions = {}, tx?: DB) => {
    const db = tx || prisma;
    const page = options.pageNum || 1;
    const limit = Math.min(options.limitNum || 20, 100);

    const where: Prisma.AnnouncementWhereInput = { deletedAt: null };

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: "insensitive" } },
        { body: { contains: options.search, mode: "insensitive" } },
      ];
    }

    if (options.status) {
      where.status = Array.isArray(options.status)
        ? { in: options.status as AnnouncementStatus[] }
        : (options.status as AnnouncementStatus);
    }

    if (options.scope) {
      where.scope = Array.isArray(options.scope)
        ? { in: options.scope as Prisma.EnumAnnouncementScopeFilter["in"] }
        : (options.scope as never);
    }

    if (options.severity) {
      where.severity = Array.isArray(options.severity)
        ? { in: options.severity as Prisma.EnumAnnouncementSeverityFilter["in"] }
        : (options.severity as never);
    }

    if (options.organizationId) {
      // Match the org's own announcements AND platform announcements explicitly
      // targeting it via targetOrganizationIds — mirroring what that org actually
      // receives in its feed (see buildVisibilityWhere). Using AND keeps this
      // composable with the search OR above. This branch is super-admin-only; org
      // admins go through restrictToOrganizationId below, which deliberately does
      // NOT surface platform announcements they cannot manage.
      const orgId = options.organizationId;
      where.AND = [
        {
          OR: [
            { organizationId: orgId },
            { targetOrganizationIds: { has: orgId } },
          ],
        },
      ];
    }

    // An org admin manages its own announcements and nothing else — notably not
    // the platform announcements it can merely read in its feed.
    if (options.restrictToOrganizationId) {
      where.scope = "ORGANIZATION";
      where.organizationId = options.restrictToOrganizationId;
    }

    const result = await paginate(db.announcement, where, { page, limit }, db, {
      orderBy: [{ createdAt: "desc" }],
      include: announcementInclude,
    });

    // paginate() infers its row type from the delegate's default payload and
    // cannot see through `include`, so restate the shape the include guarantees.
    return {
      ...result,
      data: result.data as AnnouncementWithRelations[],
    };
  },

  /**
   * Viewer feed. Returns visible announcements with this reader's receipt
   * attached, newest first.
   */
  findFeed: async (
    viewer: AnnouncementViewer,
    now: Date,
    options: { limit: number; includeDismissed: boolean },
    tx?: DB,
  ): Promise<AnnouncementWithReceipt[]> => {
    const db = tx || prisma;

    const where: Prisma.AnnouncementWhereInput = buildVisibilityWhere(viewer, now);

    if (!options.includeDismissed) {
      // A non-dismissible announcement ignores dismissal entirely — that is the
      // whole point of the flag, so it stays in the feed either way.
      where.OR = [
        { dismissible: false },
        { receipts: { none: { userId: viewer.id, dismissedAt: { not: null } } } },
      ];
    }

    const rows = await db.announcement.findMany({
      where,
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
      take: options.limit,
      include: {
        ...announcementInclude,
        receipts: {
          where: { userId: viewer.id },
          select: { readAt: true, dismissedAt: true },
        },
      },
    });

    return rows as AnnouncementWithReceipt[];
  },

  /** Visible-and-unread count. Drives the bell badge. */
  countUnread: async (
    viewer: AnnouncementViewer,
    now: Date,
    tx?: DB,
  ): Promise<number> => {
    const db = tx || prisma;

    return db.announcement.count({
      where: {
        ...buildVisibilityWhere(viewer, now),
        receipts: { none: { userId: viewer.id, readAt: { not: null } } },
      },
    });
  },

  /** Ids the viewer may currently see. Used to bound "mark all read". */
  findVisibleIds: async (
    viewer: AnnouncementViewer,
    now: Date,
    limit: number,
    options: { onlyUnread?: boolean } = {},
    tx?: DB,
  ): Promise<string[]> => {
    const db = tx || prisma;

    const where: Prisma.AnnouncementWhereInput = buildVisibilityWhere(viewer, now);
    if (options.onlyUnread) {
      // Unread = no receipt, or a receipt that was seen but not marked read.
      where.receipts = { none: { userId: viewer.id, readAt: { not: null } } };
    }

    const rows = await db.announcement.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((row) => row.id);
  },

  /** True when this announcement is currently visible to this viewer. */
  isVisibleToViewer: async (
    announcementId: string,
    viewer: AnnouncementViewer,
    now: Date,
    tx?: DB,
  ): Promise<boolean> => {
    const db = tx || prisma;

    const match = await db.announcement.findFirst({
      where: { ...buildVisibilityWhere(viewer, now), id: announcementId },
      select: { id: true },
    });

    return match !== null;
  },

  /**
   * Idempotent receipt write.
   *
   * Upsert rather than create: two rapid clicks otherwise race into a unique
   * constraint violation on [announcementId, userId] and surface as a 500.
   */
  upsertReceipt: async (
    announcementId: string,
    userId: string,
    data: { readAt?: Date; dismissedAt?: Date },
    tx?: DB,
  ) => {
    const db = tx || prisma;

    return db.announcementReceipt.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId, ...data },
      update: data,
    });
  },

  /**
   * Bulk receipt write for "mark all read".
   *
   * Two steps because a receipt may already exist with readAt null (the row was
   * "seen" but not read): createMany with skipDuplicates would silently skip
   * those and leave them unread forever. So first stamp readAt on existing
   * unread receipts, then insert receipts for ids that had none.
   */
  markManyRead: async (
    announcementIds: string[],
    userId: string,
    readAt: Date,
    tx?: DB,
  ) => {
    const db = tx || prisma;
    if (!announcementIds.length) return;

    await db.announcementReceipt.updateMany({
      where: {
        userId,
        announcementId: { in: announcementIds },
        readAt: null,
      },
      data: { readAt },
    });

    await db.announcementReceipt.createMany({
      data: announcementIds.map((announcementId) => ({
        announcementId,
        userId,
        readAt,
      })),
      skipDuplicates: true,
    });

    // createMany skipped the rows that already existed; those may be dismiss-only
    // receipts with a null readAt, so stamp them in a second pass.
    await db.announcementReceipt.updateMany({
      where: {
        userId,
        announcementId: { in: announcementIds },
        readAt: null,
      },
      data: { readAt },
    });
  },

  /** Soft delete. Nothing is physically removed; receipts stay for referential integrity. */
  softDelete: async (id: string, deletedAt: Date, tx?: DB) => {
    const db = tx || prisma;
    return db.announcement.update({
      where: { id },
      data: { deletedAt },
      include: announcementInclude,
    });
  },

  /** Existence check for targetOrganizationIds validation. */
  countExistingOrganizations: async (ids: string[], tx?: DB): Promise<number> => {
    const db = tx || prisma;
    if (!ids.length) return 0;

    return db.organization.count({
      where: { id: { in: ids }, deletedAt: null },
    });
  },

  /**
   * Names for the target ids on one page of results.
   *
   * Looked up by id rather than by paging the organization list: the list caps
   * at 100 per page, so resolving names client-side silently blanked every
   * target belonging to the 101st organization onwards.
   */
  findOrganizationNames: async (
    ids: string[],
    tx?: DB,
  ): Promise<Map<string, string>> => {
    const db = tx || prisma;
    if (!ids.length) return new Map();

    const rows = await db.organization.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    return new Map(rows.map((row) => [row.id, row.name]));
  },
};
