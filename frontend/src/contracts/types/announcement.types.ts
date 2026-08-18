/**
 * Mirrors backend/src/contracts/{constants/announcement.constants.ts,types/announcement.types.ts}
 * — keep the two in sync. Nothing enforces this; a drift compiles fine and
 * breaks at runtime.
 */

export const ANNOUNCEMENT_SCOPES = ["PLATFORM", "ORGANIZATION"] as const;

export const ANNOUNCEMENT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;

export const ANNOUNCEMENT_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export const ANNOUNCEMENT_PLACEMENTS = ["BANNER", "BELL", "BOTH"] as const;

export const BELL_PLACEMENTS = ["BELL", "BOTH"] as const;
export const BANNER_PLACEMENTS = ["BANNER", "BOTH"] as const;

export const ANNOUNCEMENT_FEED_PREVIEW_LIMIT = 10;

export type AnnouncementScope = (typeof ANNOUNCEMENT_SCOPES)[number];
export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
export type AnnouncementPlacement = (typeof ANNOUNCEMENT_PLACEMENTS)[number];

export interface AnnouncementAuthor {
  id: string | null;
  name: string | null;
}

export interface AnnouncementListItem {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  placement: AnnouncementPlacement;
  scope: AnnouncementScope;
  status: AnnouncementStatus;
  publishAt: string | null;
  expiresAt: string | null;
  dismissible: boolean;
  organizationId: string | null;
  organizationName: string | null;
  targetOrganizationIds: string[];
  /**
   * Names parallel to targetOrganizationIds, resolved server-side.
   * Null outside the management list, which is the only surface that renders
   * them — treat null as "not requested", not as "no targets".
   */
  targetOrganizationNames: string[] | null;
  targetRoles: string[];
  createdBy: AnnouncementAuthor | null;
  /** True when status is PUBLISHED and now is inside the publish window. */
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementFeedItem extends AnnouncementListItem {
  read: boolean;
  dismissed: boolean;
}

export interface AnnouncementFeedMeta {
  unreadCount: number;
}

export interface AnnouncementReceiptResult {
  announcementId: string;
  read: boolean;
  dismissed: boolean;
  unreadCount: number;
}
