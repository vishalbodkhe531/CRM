  /**
   * Source of Truth for Enums (Frontend)
   * Matches Prisma UPPERCASE enums from Backend
   */

  export const UserStatus = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
  } as const;

  export const Role = {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    EXECUTIVE: "EXECUTIVE",
  } as const;

  export const LeadStatus = {
    NEW: "NEW",
    ATTEMPTED_CONTACT: "ATTEMPTED_CONTACT",
    CONTACTED: "CONTACTED",
    QUALIFIED: "QUALIFIED",
    UNQUALIFIED: "UNQUALIFIED",
  } as const;

  export const LeadType = {
    NEW: "NEW",
    EXISTING: "EXISTING",
  } as const;

  export const OrganizationStatus = {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
  } as const;

  export const ItemType = {
    GOODS: "GOODS",
    SERVICE: "SERVICE",
  } as const;

  export const ItemStatus = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
  } as const;
