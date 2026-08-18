import { UserRole } from "@/contracts/types";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EXECUTIVE: "EXECUTIVE",
} as const;

export type { UserRole };

export const ALL_AUTHENTICATED_ROLES = Object.values(ROLES) as UserRole[];
export const DASHBOARD_ROUTE_ROLES = ALL_AUTHENTICATED_ROLES;
export const EXECUTIVE_ONLY_ROLES = [ROLES.EXECUTIVE] as const;
export const LEADS_ADMIN_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
] as const;

export const USERS_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
] as const;

export const ITEMS_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
] as const;

export const LEADS_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.EXECUTIVE,
] as const;

export const QUOTATIONS_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.EXECUTIVE,
] as const;

export const CUSTOMERS_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
] as const;

export const FOLLOW_UPS_ROUTE_ROLES = [ROLES.EXECUTIVE] as const;

export const REPORTS_ROUTE_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.EXECUTIVE,
] as const;

/**
 * Tenant settings — an organization's own plan and preferences.
 *
 * Super-admin is deliberately absent: they have no organization, so the page
 * could only ever render "No organization selected". Their equivalent is
 * PLATFORM_SETTINGS_ROUTE_ROLES below.
 */
export const SETTINGS_ROUTE_ROLES = [ROLES.ADMIN] as const;

/** Installation-wide configuration. Platform operations, never a tenant's. */
export const PLATFORM_SETTINGS_ROUTE_ROLES = [ROLES.SUPER_ADMIN] as const;

export const ORGANIZATION_ADMIN_ROUTE_ROLES = [ROLES.SUPER_ADMIN] as const;
export const SIGNUP_REQUESTS_ROUTE_ROLES = [ROLES.SUPER_ADMIN] as const;

/**
 * Super-admin reads the whole platform; admin is scoped to its own organization
 * by the backend (auditService.getAuditLogs).
 */
export const AUDIT_ROUTE_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN] as const;

/**
 * Authoring only. Everyone reads announcements through the bell, which needs no
 * route of its own — super-admin writes platform-wide, admin writes for its own
 * organization (enforced in announcementService).
 */
export const ANNOUNCEMENTS_ROUTE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
] as const;

export const isUserRole = (value: string): value is UserRole => {
  return ALL_AUTHENTICATED_ROLES.includes(value as UserRole);
};

export const canManageUsers = (role?: UserRole | null) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.MANAGER;
};

export const canAddEditItems = (role?: UserRole | null) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.MANAGER;
};

export const canDeleteItems = (role?: UserRole | null) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
};

export const canToggleItemStatus = (role?: UserRole | null) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.MANAGER;
};
