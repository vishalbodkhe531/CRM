import type { SelectOption } from "@/components/ui/select";
import type { QuotationStatus } from "../types";

interface TypedOption<T extends string> extends SelectOption {
  value: T;
}

const hasOptionValue = <T extends string>(
  options: ReadonlyArray<TypedOption<T>>,
  value: string,
): value is T => {
  return options.some((option) => option.value === value);
};

const statusOptions: TypedOption<QuotationStatus>[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export const quotationStatusOptions = statusOptions;

export const quotationStatusFilterOptions: SelectOption[] = [
  { value: "", label: "All Statuses" },
  ...statusOptions,
];

export const isQuotationStatusValue = (value: string): value is QuotationStatus => {
  return hasOptionValue(statusOptions, value);
};
