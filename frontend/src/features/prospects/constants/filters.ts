import type { FilterConfigItem } from "@/types/filter.types";
import { PROSPECT_STAGE_LABELS } from "@/constants/labels";

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const PROSPECT_FILTER_CONFIG: FilterConfigItem[] = [
  {
    type: "checkbox-group",
    name: "stage",
    label: "Stage",
    options: toOptions(PROSPECT_STAGE_LABELS),
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

