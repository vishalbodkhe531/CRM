/**
 * Mirrors backend/src/contracts/types/audit.types.ts — keep the two in sync.
 */

export const AUDIT_ACTIONS = [
  "ORG_CREATED",
  "ORG_UPDATED",
  "ORG_SUSPENDED",
  "ORG_ACTIVATED",
  "ORG_ARCHIVED",
  "ORG_RESTORED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_ROLE_CHANGED",
  "USER_DISABLED",
  "USER_ENABLED",
  "USER_DELETED",
  "USER_PASSWORD_RESET",
  "USER_PASSWORD_CHANGED",
  "USER_PROFILE_UPDATED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "LEAD_DELETED",
  "LEAD_STATUS_CHANGED",
  "LEAD_CONVERTED",
  "PROSPECT_CREATED",
  "PROSPECT_UPDATED",
  "ITEM_CREATED",
  "ITEM_UPDATED",
  "ITEM_DELETED",
  "QUOTATION_CREATED",
  "QUOTATION_UPDATED",
  "QUOTATION_DELETED",
  "QUOTATION_STATUS_CHANGED",
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "SELF_SERVICE_SIGNUP",
  "ANNOUNCEMENT_CREATED",
  "ANNOUNCEMENT_UPDATED",
  "ANNOUNCEMENT_PUBLISHED",
  "ANNOUNCEMENT_ARCHIVED",
  "ANNOUNCEMENT_DELETED",
  "PLAN_CREATED",
  "PLAN_UPDATED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_PLAN_CHANGED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_CANCELLED",
] as const;

export const AUDIT_ENTITY_TYPES = [
  "ORGANIZATION",
  "USER",
  "AUTH",
  "ANNOUNCEMENT",
  "PLAN",
  "SUBSCRIPTION",
  "LEAD",
  "PROSPECT",
  "ITEM",
  "QUOTATION",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export type AuditSnapshot = Record<string, unknown> | null;

export interface AuditActor {
  id: string | null;
  email: string;
  role: string;
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
