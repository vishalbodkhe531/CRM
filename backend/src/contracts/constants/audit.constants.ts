/**
 * Audit action catalogue.
 *
 * `AuditLog.action` is stored as a plain String so a new action never needs a
 * migration — this list is the single source of truth for the allowed values.
 * Add the action here first, then emit it from the service.
 */
export const AUDIT_ACTIONS = [
  // Organization
  "ORG_CREATED",
  "ORG_UPDATED",
  "ORG_SUSPENDED",
  "ORG_ACTIVATED",
  "ORG_ARCHIVED",
  "ORG_RESTORED",

  // User
  "USER_CREATED",
  "USER_UPDATED",
  "USER_ROLE_CHANGED",
  "USER_DISABLED",
  "USER_ENABLED",
  "USER_DELETED",
  "USER_PASSWORD_RESET",
  "USER_PASSWORD_CHANGED",
  "USER_PROFILE_UPDATED",

  // Lead
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "LEAD_DELETED",
  "LEAD_STATUS_CHANGED",
  "LEAD_CONVERTED",
  "LEAD_IMPORTED",

  // Prospect
  "PROSPECT_CREATED",
  "PROSPECT_UPDATED",
  "PROSPECT_DELETED",

  // Item
  "ITEM_CREATED",
  "ITEM_UPDATED",
  "ITEM_DELETED",

  // Quotation
  "QUOTATION_CREATED",
  "QUOTATION_UPDATED",
  "QUOTATION_DELETED",
  "QUOTATION_STATUS_CHANGED",

  // Auth
  // Logout is deliberately absent: POST /auth/logout is unauthenticated (it must
  // work with an expired token) and the service resolves no identity, so every
  // row would record an unknown actor. Add it only alongside a way to attribute it.
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "SELF_SERVICE_SIGNUP",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_EMAIL_SENT",
  "PASSWORD_RESET_FAILED",
  "PASSWORD_RESET_SUCCEEDED",

  // Announcement
  // Read/dismiss are deliberately absent: they are per-user, high-volume, and
  // would swamp the trail without recording any decision anyone made.
  "ANNOUNCEMENT_CREATED",
  "ANNOUNCEMENT_UPDATED",
  "ANNOUNCEMENT_PUBLISHED",
  "ANNOUNCEMENT_ARCHIVED",
  "ANNOUNCEMENT_DELETED",

  // Billing
  "PLAN_CREATED",
  "PLAN_UPDATED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_PLAN_CHANGED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_CANCELLED",

  // Platform
  "PLATFORM_SETTINGS_UPDATED",

  // Reports
  "REPORT_EXPORTED",

  // Access / enforcement denials — recorded centrally by the error handler when a
  // request is refused, so the trail shows blocked attempts, not only actions that
  // succeeded. Deliberately limited to security/billing-relevant refusals; generic
  // validation and not-found noise is not audited (it would swamp the trail).
  "PERMISSION_DENIED",
  "SUBSCRIPTION_BLOCKED",
  "QUOTA_EXCEEDED",
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
  "REPORT",
  // The installation itself — settings that apply across every tenant.
  "PLATFORM",
  // Generic subject for centrally-recorded access/enforcement denials that are
  // not tied to a single entity row (see the error handler).
  "ACCESS",
] as const;

/**
 * Actions that describe platform-level work rather than tenant activity.
 * These are hidden from organization admins — only super-admins see them.
 */
export const PLATFORM_ONLY_AUDIT_ACTIONS = [
  "ORG_CREATED",
  "ORG_ARCHIVED",
  "ORG_RESTORED",
  // The plan catalogue is platform operations. A tenant sees changes to THEIR
  // subscription, but not how the price list is maintained.
  "PLAN_CREATED",
  "PLAN_UPDATED",
  // Installation-wide configuration is nobody's tenant business.
  "PLATFORM_SETTINGS_UPDATED",
] as const;
