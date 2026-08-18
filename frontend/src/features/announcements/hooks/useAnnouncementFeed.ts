import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/hooks/useRedux";
import { extractApiError } from "@/utils/apiError";
import { toast } from "@/utils/toast";
import type { ApiResponse } from "@/types/api";
import type { AnnouncementFeedItem } from "@/contracts/types";
import { announcementService } from "../api/services";
import { ANNOUNCEMENT_FEED_PREVIEW_LIMIT } from "../constants/labels";

/** The feed response carries the unread count in meta, not in data. */
type FeedResponse = ApiResponse<AnnouncementFeedItem[]> & {
  meta?: { unreadCount?: number };
};

/**
 * Announcements visible to the signed-in user.
 *
 * Polled rather than pushed: there is no websocket layer in this app and a
 * minute of latency on a broadcast is acceptable. Scheduling is resolved
 * server-side per request, so a poll is also what makes a future publishAt
 * appear without anyone running a job.
 */
export const useAnnouncementFeed = (options?: {
  includeDismissed?: boolean;
  limit?: number;
}) => {
  const includeDismissed = options?.includeDismissed ?? false;
  const user = useAppSelector((s) => s.auth.user);

  return useQuery({
    queryKey: queryKeys.announcements.feed(user?.id, includeDismissed),
    queryFn: () =>
      announcementService.getFeed({
        includeDismissed,
        limit: options?.limit ?? ANNOUNCEMENT_FEED_PREVIEW_LIMIT,
      }) as Promise<FeedResponse>,
    enabled: Boolean(user?.id),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
};

/**
 * Read / dismiss.
 *
 * The badge is updated optimistically from the server's returned unreadCount so
 * a click never appears to do nothing while the request is in flight. Every feed
 * variant is invalidated on settle because dismissing changes what the
 * includeDismissed=true list contains too.
 */
export const useAnnouncementReceipt = () => {
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);

  const invalidateFeeds = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.announcements.feedScope,
    });

  const applyLocalReceipt = (
    announcementId: string,
    patch: Partial<Pick<AnnouncementFeedItem, "read" | "dismissed">>,
  ) => {
    queryClient.setQueryData<FeedResponse>(
      queryKeys.announcements.feed(user?.id, false),
      (current) => {
        if (!current?.data) return current;

        return {
          ...current,
          data: current.data.map((item) =>
            item.id === announcementId ? { ...item, ...patch } : item,
          ),
        };
      },
    );
  };

  const markRead = useMutation({
    mutationFn: (id: string) => announcementService.markRead(id),
    onMutate: (id) => {
      applyLocalReceipt(id, { read: true });
    },
    onSuccess: invalidateFeeds,
    onError: (error) => {
      toast.error(extractApiError(error).message);
      invalidateFeeds();
    },
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => announcementService.dismiss(id),
    onMutate: (id) => {
      applyLocalReceipt(id, { read: true, dismissed: true });
    },
    onSuccess: invalidateFeeds,
    onError: (error) => {
      toast.error(extractApiError(error).message);
      invalidateFeeds();
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => announcementService.markAllRead(),
    onSuccess: () => {
      invalidateFeeds();
    },
    onError: (error) => {
      toast.error(extractApiError(error).message);
    },
  });

  return { markRead, dismiss, markAllRead };
};
