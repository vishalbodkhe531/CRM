import type {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../constants/notification.constants";

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
  /** Pass as `cursor` to fetch the next page. Null when the feed is exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}

/** Input accepted by notificationService.create(). */
export interface CreateNotificationInput {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  /**
   * Deterministic key that makes a repeated job run a no-op. Omit for
   * notifications raised by a one-off user action.
   */
  dedupeKey?: string | null;
}

/** Per-job outcome returned by the internal jobs endpoint. */
export interface JobRunResult {
  job: string;
  created: number;
  skipped: number;
  durationMs: number;
  error?: string;
}

export interface JobsRunSummary {
  ranAt: string;
  totalCreated: number;
  results: JobRunResult[];
}
