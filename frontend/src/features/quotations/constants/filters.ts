import type { FilterConfigItem } from "@/types/filter.types";

export const QUOTATION_STATUS_LABELS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const QUOTATION_FILTER_CONFIG: FilterConfigItem[] = [
  {
    type: "checkbox-group",
    name: "status",
    label: "Status",
    options: toOptions(QUOTATION_STATUS_LABELS),
  },
  {
    type: "text",
    name: "createdFrom",
    label: "Created From",
    inputType: "date",
  },
  {
    type: "text",
    name: "createdTo",
    label: "Created To",
    inputType: "date",
  },
];
