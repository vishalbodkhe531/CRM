import type {
  AnnouncementPlacement,
  AnnouncementScope,
  AnnouncementSeverity,
  AnnouncementStatus,
} from "@/contracts/types";
import type { UserRole } from "@/constants/roles";

export type {
  AnnouncementAuthor,
  AnnouncementFeedItem,
  AnnouncementFeedMeta,
  AnnouncementListItem,
  AnnouncementPlacement,
  AnnouncementReceiptResult,
  AnnouncementScope,
  AnnouncementSeverity,
  AnnouncementStatus,
} from "@/contracts/types";

export type AnnouncementListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: AnnouncementStatus | AnnouncementStatus[];
  scope?: AnnouncementScope | AnnouncementScope[];
  severity?: AnnouncementSeverity | AnnouncementSeverity[];
  /** Super-admin only; the backend pins every other role to its own org. */
  organizationId?: string;
};

export type AnnouncementFeedParams = {
  limit?: number;
  /** Include dismissed announcements — the "View all" history. */
  includeDismissed?: boolean;
};

/** Wire payload for create/update. Dates are ISO strings. */
export type AnnouncementPayload = {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  placement: AnnouncementPlacement;
  scope: AnnouncementScope;
  targetOrganizationIds: string[];
  targetRoles: UserRole[];
  publishAt: string | null;
  expiresAt: string | null;
  dismissible: boolean;
};
