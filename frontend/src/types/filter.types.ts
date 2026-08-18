export type FilterFieldType = 
  | "checkbox-group"
  | "select"
  | "date-range"
  | "text";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfigItem {
  type: FilterFieldType;
  name: string;
  label: string;
  options?: FilterOption[];
  placeholder?: string;
  inputType?: "text" | "date";
}

export interface ActiveFilter {
  key: string;   // filter name (e.g. 'status')
  label: string; // section label (e.g. 'Status')
  value: string; // actual value (e.g. 'REQUIREMENT')
  valueLabel: string; // friendly label (e.g. 'Requirement')
}

export type FilterState = Record<string, string | string[] | undefined>;
