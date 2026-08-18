import type { UserRole } from "@/constants/roles";
import type { Industry, LeadSource, LeadStatus, LeadType } from "@/types/leads";

// --- Param Types ---

export type UserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | UserRole[];
  organizationId?: string;
  status?: "ACTIVE" | "INACTIVE" | Array<"ACTIVE" | "INACTIVE">;
};

/** "ARCHIVED" is a virtual filter status — see OrganizationStatusFilter. */
type OrgStatusFilter = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type OrgListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrgStatusFilter | OrgStatusFilter[];
};

export type ItemListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | Array<"ACTIVE" | "INACTIVE">;
  itemType?: "GOODS" | "SERVICE" | Array<"GOODS" | "SERVICE">;
};

export type LeadListParams = {
  page?: number;
  limit?: number;
  search?: string;
  source?: LeadSource | LeadSource[];
  status?: LeadStatus | LeadStatus[];
  leadType?: LeadType | LeadType[];
  industry?: Industry | Industry[];
  assignedToId?: string | string[];
  includeInactive?: boolean;
};

export type AuditLogListParams = {
  page?: number;
  limit?: number;
  search?: string;
  action?: string | string[];
  entityType?: string | string[];
  entityId?: string;
  actorId?: string;
  organizationId?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type AnnouncementListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string | string[];
  scope?: string | string[];
  severity?: string | string[];
  organizationId?: string;
};

export type SignupRequestListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?:
    | "PENDING"
    | "CONTACTED"
    | "APPROVED"
    | "REJECTED"
    | Array<"PENDING" | "CONTACTED" | "APPROVED" | "REJECTED">;
};

export type ProspectListParams = {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string | string[];
  assignedToId?: string | string[];
  createdFrom?: string;
  createdTo?: string;
};


// --- Query Key Factory ---

/**
 * Global Query Key Factory
 * Centralized, standardized structure: [entity, scope, filters, context]
 * Always use null for stable keys (prevents {} !== {} infinite refetch)
 */
export const queryKeys = {
  dashboard: {
    all: (orgId?: string | null) => ["dashboard", orgId ?? null] as const,
    detail: (role: UserRole, orgId?: string | null) =>
      ["dashboard", role, orgId ?? null] as const,
  },
  users: {
    all: ["users"] as const,
    listScope: ["users", "list"] as const,
    detailScope: ["users", "detail"] as const,
    list: (params?: UserListParams, orgId?: string | null) =>
      ["users", "list", params ?? null, orgId ?? null] as const,
    detail: (id: string, orgId?: string | null) =>
      ["users", "detail", id, orgId ?? null] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    listScope: ["organizations", "list"] as const,
    detailScope: ["organizations", "detail"] as const,
    list: (params?: OrgListParams) =>
      ["organizations", "list", params ?? null] as const,
    detail: (id: string) => ["organizations", "detail", id] as const,
    bySlug: (slug: string) => ["organizations", "slug", slug] as const,
  },
  items: {
    all: ["items"] as const,
    listScope: ["items", "list"] as const,
    detailScope: ["items", "detail"] as const,
    statsScope: ["items", "stats"] as const,
    list: (params?: ItemListParams, orgId?: string | null) =>
      ["items", "list", params ?? null, orgId ?? null] as const,
    stats: (orgId?: string | null) =>
      ["items", "stats", orgId ?? null] as const,
    detail: (id: string, orgId?: string | null) =>
      ["items", "detail", id, orgId ?? null] as const,
  },
  leads: {
    all: ["leads"] as const,
    listScope: ["leads", "list"] as const,
    detailScope: ["leads", "detail"] as const,
    list: (params?: LeadListParams, orgId?: string | null) =>
      ["leads", "list", params ?? null, orgId ?? null] as const,
    detail: (id: string, orgId?: string | null) =>
      ["leads", "detail", id, orgId ?? null] as const,
    assignableUsers: (orgId?: string | null) =>
      ["leads", "assignable-users", null, orgId ?? null] as const,
  },
  prospects: {
    all: ["prospects"] as const,
    listScope: ["prospects", "list"] as const,
    detailScope: ["prospects", "detail"] as const,
    list: (params?: ProspectListParams, orgId?: string | null) =>
      ["prospects", "list", params ?? null, orgId ?? null] as const,
    detail: (id: string, orgId?: string | null) =>
      ["prospects", "detail", id, orgId ?? null] as const,
    customerStats: (orgId?: string | null) =>
      ["prospects", "customer-stats", orgId ?? null] as const,
  },
  audit: {
    all: ["audit"] as const,
    listScope: ["audit", "list"] as const,
    list: (params?: AuditLogListParams, orgId?: string | null) =>
      ["audit", "list", params ?? null, orgId ?? null] as const,
  },
  announcements: {
    all: ["announcements"] as const,
    listScope: ["announcements", "list"] as const,
    detailScope: ["announcements", "detail"] as const,
    list: (params?: AnnouncementListParams, orgId?: string | null) =>
      ["announcements", "list", params ?? null, orgId ?? null] as const,
    detail: (id: string, orgId?: string | null) =>
      ["announcements", "detail", id, orgId ?? null] as const,
    /**
     * Viewer feed. Keyed by user rather than by selected org: a super-admin's own
     * feed does not change when they scope into a tenant workspace, and keying it
     * by org would blank the bell on every workspace switch.
     */
    feedScope: ["announcements", "feed"] as const,
    feed: (userId?: string | null, includeDismissed = false) =>
      ["announcements", "feed", userId ?? null, includeDismissed] as const,
  },
  signupRequests: {
    all: ["signup-requests"] as const,
    listScope: ["signup-requests", "list"] as const,
    detailScope: ["signup-requests", "detail"] as const,
    list: (params?: SignupRequestListParams) =>
      ["signup-requests", "list", params ?? null] as const,
    detail: (id: string) => ["signup-requests", "detail", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    /** Keyed by user, not org — a super-admin's own notifications do not change
     *  when they scope into a tenant workspace. */
    feed: (userId?: string | null) =>
      ["notifications", "feed", userId ?? null] as const,
    /**
     * The paged history. A separate key from `feed` on purpose: the bell polls
     * one short page, the history page accumulates many and must not be
     * refetched wholesale on that cadence.
     */
    history: (userId?: string | null) =>
      ["notifications", "history", userId ?? null] as const,
  },
  billing: {
    all: ["billing"] as const,
    plans: (params?: unknown) => ["billing", "plans", params ?? null] as const,
    /**
     * The caller's own subscription. Keyed by the scoped org so a super-admin
     * moving between tenant workspaces does not read a cached tenant's plan.
     */
    subscription: (orgId?: string | null) =>
      ["billing", "subscription", orgId ?? null] as const,
    /** Safe status (all roles). Separate key from `subscription` (billing-read). */
    subscriptionStatus: (orgId?: string | null) =>
      ["billing", "subscription-status", orgId ?? null] as const,
    usage: (orgId?: string | null) =>
      ["billing", "usage", orgId ?? null] as const,
    subscriptionsScope: ["billing", "subscriptions"] as const,
    subscriptions: (params?: unknown) =>
      ["billing", "subscriptions", params ?? null] as const,
    subscriptionByOrg: (organizationId: string) =>
      ["billing", "subscriptions", "detail", organizationId] as const,
    unsubscribedOrganizations: ["billing", "unsubscribed-organizations"] as const,
  },
  /**
   * Platform-wide, so deliberately NOT keyed by organization: these values are
   * the same whichever tenant a super-admin has scoped into.
   */
  platformSettings: {
    all: ["platform-settings"] as const,
    settings: ["platform-settings", "settings"] as const,
    public: ["platform-settings", "public"] as const,
  },
  quotations: {
    all: ["quotations"] as const,
    listScope: ["quotations", "list"] as const,
    detailScope: ["quotations", "detail"] as const,
    list: (params?: unknown, orgId?: string | null) =>
      ["quotations", "list", params ?? null, orgId ?? null] as const,
    detail: (id: string, orgId?: string | null) =>
      ["quotations", "detail", id, orgId ?? null] as const,
  },
};
