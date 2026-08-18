import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import PageTabs from "@/components/common/PageTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useAnnouncementFeed,
  useAnnouncementReceipt,
} from "@/features/announcements";
import {
  useNotificationActions,
  useNotificationHistory,
} from "../../hooks/useNotifications";
import {
  mergeFeed,
  toFeedItemFromAnnouncement,
  toFeedItemFromNotification,
  type FeedItem,
} from "../../types";
import FeedList from "../bell/FeedList";

/**
 * Full notifications page.
 *
 * Announcements and per-user notifications interleaved by date, exactly as the
 * bell used to show them — but with room to actually read them. The list itself
 * is the same FeedList component, so the two surfaces cannot drift.
 */

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
] as const;

type FilterTab = (typeof FILTER_TABS)[number]["value"];

const NotificationsView = () => {
  const [filter, setFilter] = useState<FilterTab>("all");

  // Dismissed announcements are included here: this is the full history, not
  // the transient bell list a user has already waved away.
  const { data: announcementData, isLoading: announcementsLoading } =
    useAnnouncementFeed({ includeDismissed: true, limit: 50 });

  const {
    data: notificationPages,
    isLoading: notificationsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationHistory();

  const announcementReceipt = useAnnouncementReceipt();
  const notificationActions = useNotificationActions();

  const notifications = useMemo(
    () => (notificationPages?.pages ?? []).flatMap((page) => page.data ?? []),
    [notificationPages],
  );

  const notificationUnreadCount =
    notificationPages?.pages[0]?.meta?.unreadCount ?? 0;

  const items = useMemo<FeedItem[]>(
    () =>
      mergeFeed([
        ...(announcementData?.data ?? []).map(toFeedItemFromAnnouncement),
        ...notifications.map(toFeedItemFromNotification),
      ]),
    [announcementData?.data, notifications],
  );

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.read) : items),
    [items, filter],
  );

  const unreadCount =
    (announcementData?.meta?.unreadCount ?? 0) + notificationUnreadCount;

  const handleMarkRead = (item: FeedItem) => {
    if (item.kind === "announcement") {
      announcementReceipt.markRead.mutate(item.id);
      return;
    }
    notificationActions.markRead.mutate(item.id);
  };

  /** Both subsystems track their own read state, so both are cleared. */
  const handleMarkAllRead = () => {
    if ((announcementData?.meta?.unreadCount ?? 0) > 0) {
      announcementReceipt.markAllRead.mutate();
    }
    if (notificationUnreadCount > 0) {
      notificationActions.markAllRead.mutate();
    }
  };

  const isMarkingAll =
    announcementReceipt.markAllRead.isPending ||
    notificationActions.markAllRead.isPending;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Notifications"
        description="Reminders, alerts and announcements"
        action={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              disabled={isMarkingAll}
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <PageTabs
        tabs={FILTER_TABS}
        value={filter}
        onValueChange={(value) => setFilter(value as FilterTab)}
      />

      <Card className="overflow-hidden p-0">
        <FeedList
          items={visible}
          // OR, not AND: the feed merges two sources, so showing it while
          // either is still in flight renders a list that is missing half its
          // items and looks settled.
          loading={announcementsLoading || notificationsLoading}
          onMarkRead={handleMarkRead}
          onDismissAnnouncement={(id) => announcementReceipt.dismiss.mutate(id)}
          onDeleteNotification={(id) => notificationActions.remove.mutate(id)}
          // The page has room, so the list is not capped to a dropdown height.
          unbounded
        />

        {/*
          Only notifications paginate; announcements are a bounded set that
          already arrives whole. Hidden while filtering to unread, where "load
          more" would fetch pages that may contribute nothing visible and make
          the button look broken.
        */}
        {hasNextPage && filter === "all" && (
          <div className="flex justify-center border-t border-border p-4">
            <Button
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? "Loading..." : "Load older notifications"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsView;
