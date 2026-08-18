export const ORGANIZATION_STATUS_VALUES = ["ACTIVE", "SUSPENDED"] as const;

/**
 * Statuses accepted by the organization list filter. "ARCHIVED" is virtual —
 * it is not a column value, and organizationService.getAllOrganizations
 * translates it into a deletedAt check. Never accept it as a writable status.
 */
export const ORGANIZATION_STATUS_FILTER_VALUES = [
  ...ORGANIZATION_STATUS_VALUES,
  "ARCHIVED",
] as const;

export const ORGANIZATION_TYPE_VALUES = ["type1", "type2"] as const;
