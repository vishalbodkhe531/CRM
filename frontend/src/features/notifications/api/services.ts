import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type { NotificationItem } from "@/contracts/types";

const service = createApiService(api);

export const NOTIFICATION_ENDPOINTS = {
  LIST: "/notifications",
  READ_ALL: "/notifications/read-all",
  READ: (id: string) => `/notifications/${id}/read`,
  DELETE: (id: string) => `/notifications/${id}`,
};

export type NotificationFeedParams = {
  limit?: number;
  includeRead?: boolean;
  /** Id of the last row already held; the next page starts below it. */
  cursor?: string;
};

export const notificationService = {
  getFeed: (params?: NotificationFeedParams) =>
    service.get<NotificationItem[]>(NOTIFICATION_ENDPOINTS.LIST, { params }),

  markRead: (id: string) =>
    service.patch<{ unreadCount: number }>(NOTIFICATION_ENDPOINTS.READ(id)),

  markAllRead: () =>
    service.patch<{ unreadCount: number }>(NOTIFICATION_ENDPOINTS.READ_ALL),

  remove: (id: string) =>
    service.delete<{ unreadCount: number }>(NOTIFICATION_ENDPOINTS.DELETE(id)),
};
