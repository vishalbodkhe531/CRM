import type { FilterConfigItem } from "@/types/filter.types";
import {
  ANNOUNCEMENT_SEVERITIES,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_SCOPES,
} from "@/contracts/types";
import { ROLES, type UserRole } from "@/constants/roles";
import {
  ANNOUNCEMENT_SCOPE_LABELS,
  ANNOUNCEMENT_SEVERITY_LABELS,
  ANNOUNCEMENT_STATUS_LABELS,
} from "./labels";

/**
 * An org admin only ever manages ORGANIZATION-scoped rows (the backend restricts
 * the list), so the scope filter would be a control with one possible value —
 * it is offered to super-admins only.
 */
export const getAnnouncementFilterConfig = (
  viewerRole?: UserRole,
): FilterConfigItem[] => {
  const isSuperAdmin = viewerRole === ROLES.SUPER_ADMIN;

  const filters: FilterConfigItem[] = [
    {
      type: "checkbox-group",
      name: "status",
      label: "Status",
      options: ANNOUNCEMENT_STATUSES.map((status) => ({
        label: ANNOUNCEMENT_STATUS_LABELS[status],
        value: status,
      })),
    },
    {
      type: "checkbox-group",
      name: "severity",
      label: "Severity",
      options: ANNOUNCEMENT_SEVERITIES.map((severity) => ({
        label: ANNOUNCEMENT_SEVERITY_LABELS[severity],
        value: severity,
      })),
    },
  ];

  if (isSuperAdmin) {
    filters.push({
      type: "checkbox-group",
      name: "scope",
      label: "Scope",
      options: ANNOUNCEMENT_SCOPES.map((scope) => ({
        label: ANNOUNCEMENT_SCOPE_LABELS[scope],
        value: scope,
      })),
    });
  }

  return filters;
};
