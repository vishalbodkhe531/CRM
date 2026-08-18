export const PERMISSIONS = {
  // User Management
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_DISABLE: "user:disable",
  USER_ENABLE: "user:enable",

  // Organization Management
  ORG_CREATE: "org:create",
  ORG_READ: "org:read",
  ORG_UPDATE: "org:update",
  ORG_DELETE: "org:delete",
  ORG_LIST_GLOBAL: "org:list:global",

  // Dashboard
  DASHBOARD_READ: "dashboard:read",

  // Items
  ITEM_CREATE: "item:create",
  ITEM_READ: "item:read",
  ITEM_UPDATE: "item:update",
  ITEM_DELETE: "item:delete",

  // Leads
  LEAD_CREATE: "lead:create",
  LEAD_READ: "lead:read",
  LEAD_UPDATE: "lead:update",
  LEAD_DELETE: "lead:delete",

  // Prospects
  PROSPECT_CREATE: "prospect:create",
  PROSPECT_READ: "prospect:read",
  PROSPECT_UPDATE: "prospect:update",
  PROSPECT_DELETE: "prospect:delete",

  // Quotations
  QUOTATION_CREATE: "quotation:create",
  QUOTATION_READ: "quotation:read",
  QUOTATION_UPDATE: "quotation:update",
  QUOTATION_DELETE: "quotation:delete",

  // Reports
  REPORTS_READ: "reports:read",

  // Audit
  AUDIT_READ: "audit:read",

  // Announcements
  // The viewer surface (feed/read/dismiss) needs none of these — every
  // authenticated user reads their own feed. These gate authoring only.
  ANNOUNCEMENT_CREATE: "announcement:create",
  ANNOUNCEMENT_READ: "announcement:read",
  ANNOUNCEMENT_UPDATE: "announcement:update",
  ANNOUNCEMENT_DELETE: "announcement:delete",
  ANNOUNCEMENT_PUBLISH: "announcement:publish",

  // Billing
  /** Read own organization's plan and usage. */
  BILLING_READ: "billing:read",
  /** Assign plans, set periods, cancel. Super-admin only while billing is operated manually. */
  BILLING_MANAGE: "billing:manage",
  /** Edit the plan catalogue itself. Platform operations — never granted to a tenant. */
  PLAN_MANAGE: "plan:manage",

  // Platform
  /**
   * Read and edit platform-wide settings. Super-admin only: these values apply
   * across every tenant, so they are not a tenant's to change.
   */
  PLATFORM_MANAGE: "platform:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
