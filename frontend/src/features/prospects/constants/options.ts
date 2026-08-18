import type { SelectOption } from "@/components/ui/select";
import type {
  ProspectActivityType,
  ProspectFollowUpType,
  ProspectReminder,
  ProspectStage,
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

const stageOptions: TypedOption<ProspectStage>[] = [
  { value: "REQUIREMENT", label: "Requirement" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "DEMO", label: "Demo" },
  // { value: "PROPOSAL", label: "Quote" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const followUpTypeOptions: TypedOption<ProspectFollowUpType>[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SITE_VISIT", label: "Site Visit" },
];

const reminderOptions: TypedOption<ProspectReminder>[] = [
  { value: "MINUTES_15", label: "15 minutes before" },
  { value: "MINUTES_30", label: "30 minutes before" },
  { value: "HOUR_1", label: "1 hour before" },
  { value: "DAY_1", label: "1 day before" },
];

const activityTypeOptions: TypedOption<Extract<ProspectActivityType, "CALL" | "MEETING" | "EMAIL">>[] = [
  { value: "CALL", label: "Call" },
  { value: "MEETING", label: "Meeting" },
  { value: "EMAIL", label: "Email" },
];

export const prospectStageOptions = stageOptions;
export const prospectFollowUpTypeOptions = followUpTypeOptions;
export const prospectReminderOptions = reminderOptions;
export const prospectActivityTypeOptions = activityTypeOptions;

export const prospectStageFilterOptions: SelectOption[] = [
  { value: "", label: "All Stages" },
  ...stageOptions,
];

export const isProspectStageValue = (value: string): value is ProspectStage => {
  return hasOptionValue(stageOptions, value);
};
