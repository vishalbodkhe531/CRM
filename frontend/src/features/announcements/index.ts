// Announcements Feature Barrel Exports

// Hooks
export {
  useAnnouncementFeed,
  useAnnouncementReceipt,
} from "./hooks/useAnnouncementFeed";
export {
  useAnnouncement,
  useAnnouncements,
  useArchiveAnnouncement,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useUpdateAnnouncement,
} from "./hooks/useAnnouncements";

// Types
export * from "./types";

// Components
//
// The bell now lives in features/notifications — it renders announcements and
// per-user notifications as one merged list, so it belongs to neither feature
// exclusively and is composed from both.
export { default as AnnouncementBanner } from "./components/banner/AnnouncementBanner";
export { default as AnnouncementForm } from "./components/form/AnnouncementForm";
export { default as AnnouncementsView } from "./components/view/AnnouncementsView";
