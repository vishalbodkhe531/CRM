import type { SelectOption } from "@/components/ui/select";
import type {
  Industry,
  LeadSource,
  LeadStatus,
  LeadType,
} from "../types";

interface TypedOption<T extends string> extends SelectOption {
  value: T;
}

const hasOptionValue = <T extends string>(
  options: ReadonlyArray<TypedOption<T>>,
  value: string,
): value is T => {
  return options.some((option) => option.value === value);
};

const leadStatusValueOptions: TypedOption<LeadStatus>[] = [
  { value: "NEW", label: "New" },
  { value: "ATTEMPTED_CONTACT", label: "Attempted Contact" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "UNQUALIFIED", label: "Unqualified" },
];

const leadSourceValueOptions: TypedOption<LeadSource>[] = [
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "EMAIL", label: "Email" },
  { value: "REFERENCE", label: "Reference" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "WEBSITE", label: "Website" },
  { value: "ADVERTISE", label: "Advertisement" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TRADE_SHOW", label: "Trade Show" },
  { value: "EVENT", label: "Event" },
  { value: "OTHER", label: "Other" },
];

const leadTypeValueOptions: TypedOption<LeadType>[] = [
  { value: "NEW", label: "New" },
  { value: "EXISTING", label: "Existing" },
];

const industryValueOptions: TypedOption<Industry>[] = [
  { value: "IT", label: "IT" },
  { value: "BANKING", label: "Banking" },
  { value: "EDUCATION", label: "Education" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "RETAIL", label: "Retail" },
  { value: "ECOMMERCE", label: "E-Commerce" },
  { value: "AUTOMOBILE", label: "Automobile" },
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "TRAVEL_TOURISM", label: "Travel & Tourism" },
  { value: "MEDIA_ENTERTAINMENT", label: "Media & Entertainment" },
  { value: "OTHER", label: "Other" },
];



export const leadStatusOptions = leadStatusValueOptions;
export const leadStatusFilterOptions: SelectOption[] = [
  { value: "", label: "All Statuses" },
  ...leadStatusValueOptions,
];

export const leadSourceOptions = leadSourceValueOptions;
export const leadSourceFilterOptions: SelectOption[] = [
  { value: "", label: "All Sources" },
  ...leadSourceValueOptions,
];

export const leadTypeOptions = leadTypeValueOptions;
export const leadTypeFilterOptions: SelectOption[] = [
  { value: "", label: "All Types" },
  ...leadTypeValueOptions,
];

export const leadIndustryOptions: SelectOption[] = [
  { value: "", label: "Select Industry" },
  ...industryValueOptions,
];



export const isLeadStatusValue = (value: string): value is LeadStatus => {
  return hasOptionValue(leadStatusValueOptions, value);
};

export const isLeadStatusFilterValue = (
  value: string,
): value is LeadStatus | "" => {
  return value === "" || isLeadStatusValue(value);
};

export const isLeadSourceValue = (value: string): value is LeadSource => {
  return hasOptionValue(leadSourceValueOptions, value);
};

export const isLeadSourceFilterValue = (
  value: string,
): value is LeadSource | "" => {
  return value === "" || isLeadSourceValue(value);
};

export const isLeadTypeValue = (value: string): value is LeadType => {
  return hasOptionValue(leadTypeValueOptions, value);
};

export const isLeadTypeFilterValue = (
  value: string,
): value is LeadType | "" => {
  return value === "" || isLeadTypeValue(value);
};

export const isLeadIndustryValue = (value: string): value is Industry => {
  return hasOptionValue(industryValueOptions, value);
};
