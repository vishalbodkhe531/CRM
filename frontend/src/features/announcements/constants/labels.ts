import type { StatusType } from "@/components/common/StatusBadge";
import type {
  AnnouncementPlacement,
  AnnouncementScope,
  AnnouncementSeverity,
  AnnouncementStatus,
} from "@/contracts/types";

export { ANNOUNCEMENT_FEED_PREVIEW_LIMIT } from "@/contracts/types";

export const ANNOUNCEMENT_SEVERITY_LABELS: Record<AnnouncementSeverity, string> =
  {
    INFO: "Info",
    WARNING: "Warning",
    CRITICAL: "Critical",
  };

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const ANNOUNCEMENT_SCOPE_LABELS: Record<AnnouncementScope, string> = {
  PLATFORM: "Platform-wide",
  ORGANIZATION: "My organization",
};

export const ANNOUNCEMENT_PLACEMENT_LABELS: Record<
  AnnouncementPlacement,
  string
> = {
  BELL: "Notification bell",
  BANNER: "Top banner",
  BOTH: "Bell and banner",
};

/** Reuses StatusBadge's existing palette rather than introducing new colors. */
export const ANNOUNCEMENT_SEVERITY_BADGE_TYPE: Record<
  AnnouncementSeverity,
  StatusType
> = {
  INFO: "inactive",
  WARNING: "warning",
  CRITICAL: "error",
};

export const ANNOUNCEMENT_STATUS_BADGE_TYPE: Record<
  AnnouncementStatus,
  StatusType
> = {
  DRAFT: "inactive",
  SCHEDULED: "pending",
  PUBLISHED: "success",
  ARCHIVED: "warning",
};
