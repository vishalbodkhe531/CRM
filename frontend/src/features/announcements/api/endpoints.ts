export const ANNOUNCEMENT_ENDPOINTS = {
  // Viewer surface
  FEED: "/announcements/feed",
  READ_ALL: "/announcements/read-all",
  READ: (id: string) => `/announcements/${id}/read`,
  DISMISS: (id: string) => `/announcements/${id}/dismiss`,

  // Authoring surface
  LIST: "/announcements",
  CREATE: "/announcements",
  DETAIL: (id: string) => `/announcements/${id}`,
  UPDATE: (id: string) => `/announcements/${id}`,
  PUBLISH: (id: string) => `/announcements/${id}/publish`,
  ARCHIVE: (id: string) => `/announcements/${id}/archive`,
  DELETE: (id: string) => `/announcements/${id}`,
};
