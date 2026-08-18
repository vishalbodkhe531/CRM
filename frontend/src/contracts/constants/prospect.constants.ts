export const PROSPECT_STAGE_VALUES = [
  "REQUIREMENT",
  "FOLLOW_UP",
  "DEMO",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const PROSPECT_STATUS_VALUES = ["ACTIVE", "WON", "LOST"] as const;

export const PROSPECT_FOLLOW_UP_TYPE_VALUES = [
  "CALL",
  "EMAIL",
  "MEETING",
  "WHATSAPP",
  "SITE_VISIT",
] as const;

export const PROSPECT_REMINDER_VALUES = [
  "MINUTES_15",
  "MINUTES_30",
  "HOUR_1",
  "DAY_1",
] as const;

export const PROSPECT_ACTIVITY_TYPE_VALUES = [
  "CONVERSION",
  "STAGE_CHANGE",
  "CALL",
  "MEETING",
  "EMAIL",
  "FOLLOW_UP_SET",
  "QUOTATION_CREATED",
  "QUOTATION_UPDATED",
] as const;
