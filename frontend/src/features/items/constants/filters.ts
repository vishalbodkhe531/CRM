import type { FilterConfigItem } from "@/types/filter.types";

export const ITEM_FILTER_CONFIG: FilterConfigItem[] = [
  {
    type: "checkbox-group",
    name: "itemType",
    label: "Item Type",
    options: [
      { label: "Goods", value: "GOODS" },
      { label: "Service", value: "SERVICE" },
    ],
  },
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
