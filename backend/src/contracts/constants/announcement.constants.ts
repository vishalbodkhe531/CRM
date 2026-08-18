/**
 * Announcement catalogue.
 *
 * These arrays mirror the Prisma enums in prisma/models/announcement.prisma and
 * are the source of truth for zod validation on both sides of the wire. Changing
 * a value here without a matching migration will pass typecheck and fail at the
 * database.
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

/** Placements that put an announcement in the bell dropdown. */
export const BELL_PLACEMENTS = ["BELL", "BOTH"] as const;

/** Placements that put an announcement in the top-of-page banner. */
export const BANNER_PLACEMENTS = ["BANNER", "BOTH"] as const;

/** How many announcements the bell dropdown fetches. Full history is behind "View all". */
export const ANNOUNCEMENT_FEED_PREVIEW_LIMIT = 10;

/**
 * Upper bound on the ids touched by a single "mark all read" call.
 *
 * markAllRead writes one receipt per visible announcement; without a cap, a
 * tenant that has accumulated thousands of announcements turns one click into
 * one very large insert.
 */
export const ANNOUNCEMENT_MARK_ALL_READ_LIMIT = 200;
