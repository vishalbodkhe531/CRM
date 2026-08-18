import type { FilterConfigItem } from "@/types/filter.types";

export const SIGNUP_REQUEST_FILTER_CONFIG: FilterConfigItem[] = [
  {
    name: "status",
    label: "Status",
    type: "checkbox-group",
    options: [
      { label: "Pending", value: "PENDING" },
      { label: "Contacted", value: "CONTACTED" },
      { label: "Approved", value: "APPROVED" },
      { label: "Rejected", value: "REJECTED" },
    ],
  },
];
