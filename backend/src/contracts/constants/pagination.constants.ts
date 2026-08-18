/**
 * Shared pagination limits used by every normal list endpoint.
 *
 * Exceptions (intentionally excluded):
 *   - Notification feed: bell 20, history 30, maximum 50
 *   - Announcement viewer feed: maximum 50
 *   - Autocomplete / dropdown selectors: up to 100 (separate from list APIs)
 *   - Scheduled jobs and CSV exports: unbounded by these constants
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
} as const;

export type PaginationLimit = typeof PAGINATION.MAX_LIMIT;
