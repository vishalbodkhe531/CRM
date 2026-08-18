/**
 * Mirrors backend/src/contracts/{constants/notification.constants.ts,types/notification.types.ts}
 * — keep the two in sync. Nothing enforces this.
 *
 * Job-only constants (reminder offsets, trial thresholds) are deliberately not
 * mirrored: they are server scheduling details, not a wire contract.
 */

export const NOTIFICATION_TYPES = [
  "FOLLOW_UP_DUE",
  "FOLLOW_UP_OVERDUE",
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

/** Bell dropdown: one short page, polled. */
export const NOTIFICATION_FEED_LIMIT = 20;

/**
 * History page: larger, because it is scrolled rather than glanced at, and each
 * page costs a round trip. Capped at the server's max of 50.
 */
export const NOTIFICATION_HISTORY_PAGE_SIZE = 30;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationEntityType =
  (typeof NOTIFICATION_ENTITY_TYPES)[number];

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
  link?: string | null;
}

export interface NotificationFeedMeta {
  unreadCount: number;
}
