import type {
  AnnouncementFeedItem,
  AnnouncementSeverity,
  NotificationEntityType,
  NotificationItem,
  NotificationType,
} from "@/contracts/types";

export type {
  NotificationEntityType,
  NotificationItem,
  NotificationType,
} from "@/contracts/types";

/**
 * The bell's item type.
 *
 * Announcements are authored and broadcast; notifications are emitted by the
 * system for one person. They are genuinely different records, so this is a
 * discriminated union rather than a lowest-common-denominator interface — the
 * list switches on `kind` and each branch keeps the fields only it has.
 *
 * Merging them into ONE list, sorted by date, is deliberate: two separate
 * dropdowns would make the user check two places to find out what happened.
 */
export type FeedItem =
  | {
      kind: "announcement";
      id: string;
      title: string;
      body: string;
      createdAt: string;
      read: boolean;
      severity: AnnouncementSeverity;
      /** Only announcements can be dismissed; notifications are deleted. */
      dismissible: boolean;
      dismissed: boolean;
    }
  | {
      kind: "notification";
      id: string;
      title: string;
      body: string;
      createdAt: string;
      read: boolean;
      type: NotificationType;
      entityType: NotificationEntityType | null;
      entityId: string | null;
    };

export const toFeedItemFromAnnouncement = (
  announcement: AnnouncementFeedItem,
): FeedItem => ({
  kind: "announcement",
  id: announcement.id,
  title: announcement.title,
  body: announcement.body,
  // Announcements sort by when they went live, not when they were drafted.
  createdAt: announcement.publishAt ?? announcement.createdAt,
  read: announcement.read,
  severity: announcement.severity,
  dismissible: announcement.dismissible,
  dismissed: announcement.dismissed,
});

export const toFeedItemFromNotification = (
  notification: NotificationItem,
): FeedItem => ({
  kind: "notification",
  id: notification.id,
  title: notification.title,
  body: notification.body,
  createdAt: notification.createdAt,
  read: notification.read,
  type: notification.type,
  entityType: notification.entityType,
  entityId: notification.entityId,
});

/**
 * Merge and sort, newest first.
 *
 * Ids are only unique within their own source, so the list must key on
 * `${kind}:${id}` — two records from different tables can collide otherwise.
 */
export const mergeFeed = (items: FeedItem[]): FeedItem[] =>
  [...items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

export const feedItemKey = (item: FeedItem) => `${item.kind}:${item.id}`;
