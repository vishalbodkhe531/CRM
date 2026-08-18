import type { FilterConfigItem } from "@/types/filter.types";
import { USER_ROLE_LABELS } from "@/constants/labels";
import { ROLES, type UserRole } from "@/constants/roles";

const STATUS_FILTER: FilterConfigItem = {
  type: "checkbox-group",
  name: "status",
  label: "Status",
  options: [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ],
};

const ROLE_OPTIONS_BY_VIEWER: Record<UserRole, Array<{ label: string; value: string }>> = {
  [ROLES.SUPER_ADMIN]: [
    { label: USER_ROLE_LABELS.ADMIN, value: ROLES.ADMIN },
    { label: USER_ROLE_LABELS.MANAGER, value: ROLES.MANAGER },
    { label: USER_ROLE_LABELS.EXECUTIVE, value: ROLES.EXECUTIVE },
  ],
  [ROLES.ADMIN]: [
    { label: USER_ROLE_LABELS.MANAGER, value: ROLES.MANAGER },
    { label: USER_ROLE_LABELS.EXECUTIVE, value: ROLES.EXECUTIVE },
  ],
  [ROLES.MANAGER]: [
    { label: USER_ROLE_LABELS.EXECUTIVE, value: ROLES.EXECUTIVE },
  ],
  [ROLES.EXECUTIVE]: [],
};

export const getUserFilterConfig = (viewerRole?: UserRole): FilterConfigItem[] => {
  const roleOptions = viewerRole ? ROLE_OPTIONS_BY_VIEWER[viewerRole] : [];
  const roleFilter: FilterConfigItem | null =
    roleOptions.length > 0
      ? {
          type: "checkbox-group",
          name: "role",
          label: "Role",
          options: roleOptions,
        }
      : null;

  return roleFilter ? [STATUS_FILTER, roleFilter] : [STATUS_FILTER];
};

export const USER_FILTER_CONFIG: FilterConfigItem[] = [
  {
    type: "checkbox-group",
    name: "status",
    label: "Status",
    options: [
      { label: "Active", value: "ACTIVE" },
      { label: "Inactive", value: "INACTIVE" },
    ],
  },
];
