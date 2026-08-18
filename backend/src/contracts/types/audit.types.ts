import type {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "../constants/audit.constants";

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/** Whitelisted field snapshot. Never a spread of a full entity — see audit.service. */
export type AuditSnapshot = Record<string, unknown> | null;

export interface AuditActor {
  id: string | null;
  email: string;
  role: string;
  /** Resolved from the actor relation when it still exists; null once deleted. */
  name: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  actor: AuditActor;
  organizationId: string | null;
  organizationName: string | null;
  before: AuditSnapshot;
  after: AuditSnapshot;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** Input accepted by auditService.record(). */
export interface RecordAuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  actor: {
    id?: string | null;
    email: string;
    role: string;
  };
  organizationId?: string | null;
  before?: AuditSnapshot;
  after?: AuditSnapshot;
  ipAddress?: string | null;
  userAgent?: string | null;
}
