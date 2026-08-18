import { Prisma, Role } from "@prisma/client";
import { auditRepository, type AuditLogWithRelations } from "./audit.repository";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/errors/appError";
import { ROLES } from "../../constants/roles";
import { PLATFORM_ONLY_AUDIT_ACTIONS } from "../../contracts/constants";
import type {
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
  AuditSnapshot,
  RecordAuditInput,
} from "../../contracts/types";
import type { AuditLogFilterInput } from "../../contracts/validation";

type AuditReader = {
  id: string;
  role: Role;
  organizationId?: string | null;
};

/**
 * Keys that must never reach the audit table, even if a caller passes them by
 * mistake. Snapshots are supposed to be built with pickFields(); this is the
 * second line of defence, not the first.
 */
const SENSITIVE_KEYS = [
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "authorization",
];

const isSensitiveKey = (key: string) => {
  const normalized = key.toLowerCase().replace(/[_-]/g, "");
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
};

/**
 * Build an audit snapshot from an entity.
 *
 * Always use this instead of spreading an entity — a spread will silently start
 * logging any new column added to the model later, including sensitive ones.
 */
export const pickFields = <T extends object, K extends keyof T>(
  source: T | null | undefined,
  keys: readonly K[],
): AuditSnapshot => {
  if (!source) return null;

  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    const name = String(key);
    if (isSensitiveKey(name)) continue;
    const value = source[key];
    snapshot[name] = value instanceof Date ? value.toISOString() : value;
  }
  return snapshot;
};

const scrubSnapshot = (snapshot: AuditSnapshot): AuditSnapshot => {
  if (!snapshot) return null;

  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (isSensitiveKey(key)) continue;
    scrubbed[key] = value;
  }
  return scrubbed;
};

const toJsonInput = (snapshot: AuditSnapshot) =>
  snapshot === null
    ? Prisma.DbNull
    : (snapshot as Prisma.InputJsonValue);

const mapToEntry = (row: AuditLogWithRelations): AuditLogEntry => ({
  id: row.id,
  action: row.action as AuditAction,
  entityType: row.entityType as AuditEntityType,
  entityId: row.entityId,
  actor: {
    id: row.actorId,
    email: row.actorEmail,
    role: row.actorRole,
    name: row.actor
      ? `${row.actor.firstName} ${row.actor.lastName}`.trim()
      : null,
  },
  organizationId: row.organizationId,
  organizationName: row.organization?.name ?? null,
  before: scrubSnapshot(row.before as AuditSnapshot),
  after: scrubSnapshot(row.after as AuditSnapshot),
  ipAddress: row.ipAddress,
  userAgent: row.userAgent,
  createdAt: row.createdAt.toISOString(),
});

/**
 * Resolve what this reader may see, and translate the request's filters.
 *
 * Super-admin reads across all tenants, optionally narrowed by organizationId.
 * Every other role is pinned to its own organization and additionally cannot see
 * platform-level activity — an org admin gets their tenant's trail, not a window
 * into how the platform is operated.
 *
 * Extracted so the list and the export resolve visibility identically; two
 * copies of this rule would eventually differ, and the difference would be a
 * cross-tenant disclosure.
 */
const resolveReadOptions = (
  params: AuditLogFilterInput,
  reader: AuditReader,
) => {
  const shared = {
    search: params.search,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    actorId: params.actorId,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
  };

  if (reader.role === ROLES.SUPER_ADMIN) {
    return { ...shared, organizationId: params.organizationId };
  }

  if (!reader.organizationId) {
    throw AppError.authorization.forbidden(
      "User must belong to an organization",
    );
  }

  // Reject rather than silently narrowing: an empty list would look like
  // "no activity" instead of "not allowed".
  if (params.organizationId && params.organizationId !== reader.organizationId) {
    throw AppError.authorization.forbidden(
      "Access denied: Audit logs belong to another organization",
    );
  }

  return {
    ...shared,
    organizationId: reader.organizationId,
    excludeActions: PLATFORM_ONLY_AUDIT_ACTIONS,
    excludeActorRoles: [ROLES.SUPER_ADMIN],
  };
};

export const auditService = {
  /**
   * Write an audit row.
   *
   * Never throws and never rejects: a failed audit write must not roll back or
   * fail the business operation that triggered it. Call this AFTER the business
   * transaction has committed, never inside it.
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await auditRepository.create({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorId: input.actor.id ?? null,
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        organizationId: input.organizationId ?? null,
        before: toJsonInput(scrubSnapshot(input.before ?? null)),
        after: toJsonInput(scrubSnapshot(input.after ?? null)),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (error) {
      logger.error("Audit write failed", {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actor.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  /**
   * Read audit rows.
   *
   * Super-admin reads across all tenants, optionally narrowed by organizationId.
   * Every other role is pinned to its own organization and additionally cannot
   * see platform-level activity — an org admin gets their tenant's trail, not a
   * window into how the platform is operated.
   */
  async getAuditLogs(
    params: AuditLogFilterInput,
    reader: AuditReader,
  ): Promise<{ data: AuditLogEntry[]; meta: any }> {
    const result = await auditRepository.findAll({
      pageNum: params.page,
      limitNum: params.limit,
      ...resolveReadOptions(params, reader),
    });

    return {
      data: result.data.map(mapToEntry),
      meta: result.meta,
    };
  },

  /**
   * Stream every row matching the caller's filters, as mapped entries.
   *
   * Shares resolveReadOptions with getAuditLogs, so an export can never widen
   * what a reader is allowed to see. Deliberately unpaginated: an export exists
   * precisely to escape the list's 100-row ceiling.
   */
  async *exportAuditLogs(
    params: AuditLogFilterInput,
    reader: AuditReader,
  ): AsyncGenerator<AuditLogEntry[]> {
    const options = resolveReadOptions(params, reader);

    for await (const batch of auditRepository.streamAll(options)) {
      yield batch.map(mapToEntry);
    }
  },

  /**
   * Delete audit rows older than the configured retention window.
   *
   * Returns 0 and deletes nothing when retention is unset — "keep forever" is
   * the default, and discarding a compliance trail must always be a deliberate
   * choice rather than something that happens because a value was missing.
   */
  async purgeExpiredLogs(
    retentionDays: number | null,
  ): Promise<{ removed: number; cutoff: Date | null }> {
    if (!retentionDays) return { removed: 0, cutoff: null };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const removed = await auditRepository.purgeOlderThan(cutoff);

    if (removed > 0) {
      logger.info("Audit retention purge removed rows", {
        removed,
        cutoff: cutoff.toISOString(),
        retentionDays,
      });
    }

    return { removed, cutoff };
  },
};
