import type { FilterConfigItem } from "@/types/filter.types";

export const ORGANIZATION_FILTER_CONFIG: FilterConfigItem[] = [
  {
    name: "status",
    label: "Status",
    type: "checkbox-group",
    options: [
      { label: "Active", value: "ACTIVE" },
      { label: "Suspended", value: "SUSPENDED" },
      // Virtual status: the backend maps ARCHIVED to a deletedAt check.
      // Archived organizations are hidden unless this is selected.
      { label: "Archived", value: "ARCHIVED" },
    ],
  },
];
