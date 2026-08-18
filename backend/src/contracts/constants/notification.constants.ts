/**
 * Notification catalogue.
 *
 * `Notification.type` is a plain String in the database so a new type never
 * needs a migration — this list is the single source of truth for the allowed
 * values. Add the type here first, then emit it from a job or a service.
 */
export const NOTIFICATION_TYPES = [
  // Follow-ups
  "FOLLOW_UP_DUE",
  "FOLLOW_UP_OVERDUE",

  // Billing — raised by the scheduled job, not by the read-time state resolver.
  "SUBSCRIPTION_TRIAL_ENDING",
  "SUBSCRIPTION_PAST_DUE",
  "SUBSCRIPTION_EXPIRED",
] as const;

export const NOTIFICATION_ENTITY_TYPES = [
  "PROSPECT",
  "LEAD",
  "QUOTATION",
  "SUBSCRIPTION",
] as const;

/** Bell dropdown fetch size, shared with announcements. */
export const NOTIFICATION_FEED_LIMIT = 20;

/**
 * Upper bound on rows touched by a single "mark all read" call, mirroring the
 * announcement cap — one click must not become an unbounded update.
 */
export const NOTIFICATION_MARK_ALL_READ_LIMIT = 200;

/**
 * How far ahead of its due time a follow-up reminder fires, in minutes.
 *
 * Mirrors the ProspectReminder enum. A prospect with no reminder set gets the
 * default so the follow-up is not silently un-notified.
 */
export const REMINDER_OFFSET_MINUTES: Record<string, number> = {
  MINUTES_15: 15,
  MINUTES_30: 30,
  HOUR_1: 60,
  DAY_1: 24 * 60,
};

export const DEFAULT_REMINDER_OFFSET_MINUTES = 30;

/**
 * Days before a trial ends that the warning notification is sent.
 *
 * Sent once per day per threshold — the dedupe key includes the threshold, so a
 * customer gets three nudges over the final three days rather than one every
 * time the cron ticks.
 */
export const TRIAL_WARNING_DAYS = [7, 3, 1] as const;
