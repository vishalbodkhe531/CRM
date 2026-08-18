import type {
  ANNOUNCEMENT_PLACEMENTS,
  ANNOUNCEMENT_SCOPES,
  ANNOUNCEMENT_SEVERITIES,
  ANNOUNCEMENT_STATUSES,
} from "../constants/announcement.constants";

export type AnnouncementScope = (typeof ANNOUNCEMENT_SCOPES)[number];
export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
export type AnnouncementPlacement = (typeof ANNOUNCEMENT_PLACEMENTS)[number];

export interface AnnouncementAuthor {
  id: string | null;
  /** Resolved from the createdBy relation while it exists; null once the user is deleted. */
  name: string | null;
}

/**
 * Management-list shape. Returned by the authoring endpoints.
 *
 * `status` is the stored column; `isLive` is what the feed query would actually
 * say right now, so the console can show "Published — starts in 2 days" without
 * re-deriving the scheduling rules in the UI.
 */
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
  /** True when status is PUBLISHED and the current time is inside the publish window. */
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Viewer-feed shape: the list item plus this reader's receipt state. */
export interface AnnouncementFeedItem extends AnnouncementListItem {
  read: boolean;
  dismissed: boolean;
}

export interface AnnouncementFeedMeta {
  unreadCount: number;
}

/** Result of a read/dismiss mutation — the badge updates from this without a refetch. */
export interface AnnouncementReceiptResult {
  announcementId: string;
  read: boolean;
  dismissed: boolean;
  unreadCount: number;
}
