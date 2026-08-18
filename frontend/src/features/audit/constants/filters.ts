import type { FilterConfigItem, FilterOption } from "@/types/filter.types";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/contracts/types";
import { ROLES, type UserRole } from "@/constants/roles";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "./labels";

/**
 * Platform-level actions are never returned to organization admins (the backend
 * excludes them), so they are not offered as filter options either — an option
 * that can only ever return nothing is worse than no option.
 */
const PLATFORM_ONLY_ACTIONS = [
  "ORG_CREATED",
  "ORG_ARCHIVED",
  "ORG_RESTORED",
  "PLAN_CREATED",
  "PLAN_UPDATED",
] as const;

export const getAuditFilterConfig = (
  viewerRole?: UserRole,
  /**
   * Organizations offered in the picker. Super-admin only — every other role is
   * pinned to its own organization by the backend, so the filter would be a
   * control with exactly one legal value.
   */
  organizationOptions: FilterOption[] = [],
): FilterConfigItem[] => {
  const isSuperAdmin = viewerRole === ROLES.SUPER_ADMIN;

  const actionOptions = AUDIT_ACTIONS.filter(
    (action) =>
      isSuperAdmin ||
      !PLATFORM_ONLY_ACTIONS.includes(
        action as (typeof PLATFORM_ONLY_ACTIONS)[number],
      ),
  ).map((action) => ({
    label: AUDIT_ACTION_LABELS[action],
    value: action,
  }));

  return [
    {
      type: "checkbox-group",
      name: "action",
      label: "Action",
      options: actionOptions,
    },
    {
      type: "checkbox-group",
      name: "entityType",
      label: "Entity",
      options: AUDIT_ENTITY_TYPES.map((entity) => ({
        label: AUDIT_ENTITY_LABELS[entity],
        value: entity,
      })),
    },
    /*
     * The backend has always accepted these; only the UI was missing. Without
     * them "show me everything this user did" or "everything that touched this
     * record" — the two questions an audit trail exists to answer — could only
     * be asked by hand-editing the URL.
     */
    ...(isSuperAdmin && organizationOptions.length
      ? [
          {
            type: "select" as const,
            name: "organizationId",
            label: "Organization",
            options: organizationOptions,
            placeholder: "All organizations",
          },
        ]
      : []),
    {
      type: "text",
      name: "actorId",
      label: "Actor ID",
      placeholder: "User id of the person who acted",
    },
    {
      type: "text",
      name: "entityId",
      label: "Entity ID",
      placeholder: "Id of the affected record",
    },
    // Two single-date fields rather than one range: FilterField renders
    // "date-range" as a single date input and passes the filter name straight
    // through to the query, so the names must match the backend schema fields.
    {
      type: "date-range",
      name: "createdFrom",
      label: "From Date",
    },
    {
      type: "date-range",
      name: "createdTo",
      label: "To Date",
    },
  ];
};
