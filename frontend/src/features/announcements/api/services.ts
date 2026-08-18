import api from "@/lib/api/client";
import { createApiService } from "@/lib/api/service.utils";
import type {
  AnnouncementFeedItem,
  AnnouncementListItem,
  AnnouncementReceiptResult,
} from "@/contracts/types";
import type {
  AnnouncementFeedParams,
  AnnouncementListParams,
  AnnouncementPayload,
} from "../types";
import { ANNOUNCEMENT_ENDPOINTS } from "./endpoints";

const service = createApiService(api);

export const announcementService = {
  // --- Viewer surface ---
  getFeed: (params?: AnnouncementFeedParams) =>
    service.get<AnnouncementFeedItem[]>(ANNOUNCEMENT_ENDPOINTS.FEED, { params }),

  markRead: (id: string) =>
    service.post<AnnouncementReceiptResult>(ANNOUNCEMENT_ENDPOINTS.READ(id)),

  dismiss: (id: string) =>
    service.post<AnnouncementReceiptResult>(ANNOUNCEMENT_ENDPOINTS.DISMISS(id)),

  markAllRead: () =>
    service.post<{ unreadCount: number }>(ANNOUNCEMENT_ENDPOINTS.READ_ALL),

  // --- Authoring surface ---
  getAnnouncements: (params?: AnnouncementListParams) =>
    service.get<AnnouncementListItem[]>(ANNOUNCEMENT_ENDPOINTS.LIST, { params }),

  getAnnouncement: (id: string) =>
    service.get<AnnouncementListItem>(ANNOUNCEMENT_ENDPOINTS.DETAIL(id)),

  createAnnouncement: (payload: AnnouncementPayload) =>
    service.post<AnnouncementListItem, AnnouncementPayload>(
      ANNOUNCEMENT_ENDPOINTS.CREATE,
      payload,
    ),

  updateAnnouncement: (id: string, payload: Partial<AnnouncementPayload>) =>
    service.patch<AnnouncementListItem, Partial<AnnouncementPayload>>(
      ANNOUNCEMENT_ENDPOINTS.UPDATE(id),
      payload,
    ),

  publishAnnouncement: (id: string) =>
    service.post<AnnouncementListItem>(ANNOUNCEMENT_ENDPOINTS.PUBLISH(id)),

  archiveAnnouncement: (id: string) =>
    service.post<AnnouncementListItem>(ANNOUNCEMENT_ENDPOINTS.ARCHIVE(id)),

  deleteAnnouncement: (id: string) =>
    service.delete<AnnouncementListItem>(ANNOUNCEMENT_ENDPOINTS.DELETE(id)),
};
