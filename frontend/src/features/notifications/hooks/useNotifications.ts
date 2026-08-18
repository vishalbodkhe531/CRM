import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { toast } from "@/utils/toast";
import { extractApiError } from "@/utils/apiError";
import type { ApiResponse } from "@/types/api";
import type { NotificationItem } from "@/contracts/types";
import {
  NOTIFICATION_FEED_LIMIT,
  NOTIFICATION_HISTORY_PAGE_SIZE,
} from "@/contracts/types";
import { useAnnouncementFeed } from "@/features/announcements";
import { notificationService } from "../api/services";

type FeedResponse = ApiResponse<NotificationItem[]> & {
  meta?: {
    unreadCount?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  };
};

/**
 * The signed-in user's notifications.
 *
 * Polled on the same 60s cadence as announcements so the bell's two data
 * sources stay roughly in step — a notification appearing 30 seconds after the
 * announcement next to it would look like a bug.
 */
export const useNotifications = () => {
  const user = useAppSelector((s) => s.auth.user);

  return useQuery({
    queryKey: queryKeys.notifications.feed(user?.id),
    queryFn: () =>
      notificationService.getFeed({
        limit: NOTIFICATION_FEED_LIMIT,
        includeRead: true,
      }) as Promise<FeedResponse>,
    enabled: Boolean(user?.id),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
};

/**
 * The full notification history, page by page.
 *
 * Separate from useNotifications, which backs the bell: the bell wants one
 * small, frequently-polled page, while the history page wants everything and
 * must not re-poll pages the user has already scrolled past. Sharing one query
 * would force one of those behaviours onto the other.
 *
 * Polling is deliberately off here — refetchInterval on an infinite query
 * refetches *every* loaded page, so a user who scrolled back six months would
 * re-request all of it every minute.
 */
export const useNotificationHistory = () => {
  const user = useAppSelector((s) => s.auth.user);

  return useInfiniteQuery({
    queryKey: queryKeys.notifications.history(user?.id),
    queryFn: ({ pageParam }) =>
      notificationService.getFeed({
        limit: NOTIFICATION_HISTORY_PAGE_SIZE,
        includeRead: true,
        cursor: pageParam,
      }) as Promise<FeedResponse>,
    initialPageParam: undefined as string | undefined,
    // Null from the server means the feed is exhausted; undefined tells
    // react-query to stop and flips hasNextPage to false.
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });
};

/**
 * Combined unread count across announcements and notifications.
 *
 * Lives here so the sidebar badge and the mobile header badge read the same
 * number from the same two queries — react-query dedupes them, so this costs
 * nothing extra wherever it is used.
 */
export const useFeedUnreadCount = (): number => {
  const { data: notifications } = useNotifications();
  const { data: announcements } = useAnnouncementFeed();

  return (
    (notifications?.meta?.unreadCount ?? 0) +
    (announcements?.meta?.unreadCount ?? 0)
  );
};

export const useNotificationActions = () => {
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);

  const feedKey = queryKeys.notifications.feed(user?.id);
  const historyKey = queryKeys.notifications.history(user?.id);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  /**
   * Apply a local edit to both caches.
   *
   * The bell and the history page hold the same rows under different keys, and
   * the click can come from either — patching only one leaves the notification
   * visibly unchanged on whichever surface the user is actually looking at.
   */
  const patchCaches = (
    apply: (items: NotificationItem[]) => NotificationItem[],
  ) => {
    queryClient.setQueryData<FeedResponse>(feedKey, (current) =>
      current?.data ? { ...current, data: apply(current.data) } : current,
    );

    queryClient.setQueryData<InfiniteData<FeedResponse>>(
      historyKey,
      (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) =>
                page.data ? { ...page, data: apply(page.data) } : page,
              ),
            }
          : current,
    );
  };

  /** Optimistic local patch so the badge never lags a click. */
  const patchLocal = (id: string, patch: Partial<NotificationItem>) =>
    patchCaches((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: (id) => patchLocal(id, { read: true }),
    onSuccess: invalidate,
    onError: (error) => {
      toast.error(extractApiError(error).message);
      invalidate();
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: invalidate,
    onError: (error) => {
      toast.error(extractApiError(error).message);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => notificationService.remove(id),
    onMutate: (id) => {
      // Drop it from the list immediately — a delete that visibly lingers reads
      // as a failure.
      patchCaches((items) => items.filter((item) => item.id !== id));
    },
    onSuccess: invalidate,
    onError: (error) => {
      toast.error(extractApiError(error).message);
      invalidate();
    },
  });

  return { markRead, markAllRead, remove };
};
