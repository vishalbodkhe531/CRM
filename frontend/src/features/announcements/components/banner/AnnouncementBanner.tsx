import NoticeBanner from "@/components/common/NoticeBanner";
import type { AnnouncementFeedItem, AnnouncementSeverity } from "@/contracts/types";
import {
  useAnnouncementFeed,
  useAnnouncementReceipt,
} from "../../hooks/useAnnouncementFeed";

/**
 * Top-of-page announcement strip.
 *
 * Rendered inside DashboardLayout above <main> so it survives route changes.
 * Only BANNER/BOTH placements appear here, and only the single most severe live
 * one — stacking banners pushes the actual application off the screen.
 *
 * Presentation lives in the shared NoticeBanner; this component only decides
 * WHICH announcement, if any, deserves the slot.
 */

/** Most severe first; ties broken by recency. */
const SEVERITY_RANK: Record<AnnouncementSeverity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFO: 1,
};

const pickBanner = (
  items: AnnouncementFeedItem[],
): AnnouncementFeedItem | null => {
  const candidates = items.filter(
    (item) =>
      (item.placement === "BANNER" || item.placement === "BOTH") &&
      // A non-dismissible announcement ignores dismissal — that is the point of the flag.
      (!item.dismissed || !item.dismissible),
  );

  if (!candidates.length) return null;

  return candidates.reduce((best, item) => {
    const rankDelta = SEVERITY_RANK[item.severity] - SEVERITY_RANK[best.severity];
    if (rankDelta !== 0) return rankDelta > 0 ? item : best;

    const itemAt = new Date(item.publishAt ?? item.createdAt).getTime();
    const bestAt = new Date(best.publishAt ?? best.createdAt).getTime();
    return itemAt > bestAt ? item : best;
  });
};

const AnnouncementBanner = () => {
  const { data } = useAnnouncementFeed();
  const { dismiss } = useAnnouncementReceipt();

  const banner = pickBanner(data?.data ?? []);
  if (!banner) return null;

  return (
    <NoticeBanner
      severity={banner.severity}
      title={banner.title}
      body={banner.body}
      onDismiss={
        banner.dismissible ? () => dismiss.mutate(banner.id) : undefined
      }
    />
  );
};

export default AnnouncementBanner;
