import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  CreditCard,
  Info,
  Megaphone,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import type { AnnouncementSeverity, NotificationType } from "@/contracts/types";
import { feedItemKey, type FeedItem } from "../../types";

/**
 * Contents of the bell: announcements and notifications interleaved by date.
 *
 * Rows differ only in their icon and their trailing action — an announcement is
 * dismissed (a per-user receipt), a notification is deleted (it is already
 * per-user). Both render body text as text, never HTML.
 */

interface FeedListProps {
  items: FeedItem[];
  loading: boolean;
  onMarkRead: (item: FeedItem) => void;
  onDismissAnnouncement: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onNavigate?: () => void;
  /** Drop the dropdown height cap — the full page has room to scroll normally. */
  unbounded?: boolean;
}

const ANNOUNCEMENT_ICON: Record<AnnouncementSeverity, typeof Info> = {
  INFO: Megaphone,
  WARNING: AlertTriangle,
  CRITICAL: AlertTriangle,
};

const ANNOUNCEMENT_ICON_CLASS: Record<AnnouncementSeverity, string> = {
  INFO: "text-blue-600 dark:text-blue-400",
  WARNING: "text-yellow-600 dark:text-yellow-400",
  CRITICAL: "text-red-600 dark:text-red-400",
};

const NOTIFICATION_ICON: Record<NotificationType, typeof Info> = {
  FOLLOW_UP_DUE: CalendarClock,
  FOLLOW_UP_OVERDUE: AlertTriangle,
  SUBSCRIPTION_TRIAL_ENDING: CreditCard,
  SUBSCRIPTION_PAST_DUE: CreditCard,
  SUBSCRIPTION_EXPIRED: CreditCard,
};

const NOTIFICATION_ICON_CLASS: Record<NotificationType, string> = {
  FOLLOW_UP_DUE: "text-blue-600 dark:text-blue-400",
  FOLLOW_UP_OVERDUE: "text-red-600 dark:text-red-400",
  SUBSCRIPTION_TRIAL_ENDING: "text-blue-600 dark:text-blue-400",
  SUBSCRIPTION_PAST_DUE: "text-yellow-600 dark:text-yellow-400",
  SUBSCRIPTION_EXPIRED: "text-red-600 dark:text-red-400",
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const FeedList = ({
  items,
  loading,
  onMarkRead,
  onDismissAnnouncement,
  onDeleteNotification,
  onNavigate,
  unbounded = false,
}: FeedListProps) => {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  if (loading) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Loading...
      </p>
    );
  }

  if (!items.length) {
    return (
      <div className="px-4 py-10 text-center">
        <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-semibold text-foreground">
          You're all caught up
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Announcements and reminders will show up here.
        </p>
      </div>
    );
  }

  /** Deep-link target for a notification, or null when it isn't linkable. */
  const resolveHref = (item: FeedItem): string | null => {
    if (item.kind !== "notification") return null;
    
    // If there is no entityId, we can't link to it.
    if (!item.entityId) return null;

    switch (item.entityType) {
      case "PROSPECT":
      case "LEAD":
      case "QUOTATION":
        return `/${item.entityType.toLowerCase()}s/${item.entityId}`;
      case "SUBSCRIPTION":
        // A super-admin has no tenant settings page to land on.
        return user?.role === ROLES.SUPER_ADMIN
          ? "/platform/billing"
          : "/settings";
      default:
        return null;
    }
  };

  return (
    <ul
      className={cn(
        "divide-y divide-border",
        !unbounded && "max-h-104 overflow-y-auto",
      )}
    >
      {items.map((item) => {
        const Icon =
          item.kind === "announcement"
            ? ANNOUNCEMENT_ICON[item.severity]
            : NOTIFICATION_ICON[item.type];

        const iconClass =
          item.kind === "announcement"
            ? ANNOUNCEMENT_ICON_CLASS[item.severity]
            : NOTIFICATION_ICON_CLASS[item.type];

        const href = resolveHref(item);

        const open = () => {
          if (!href) return;
          if (!item.read) onMarkRead(item);
          navigate(href);
          onNavigate?.();
        };

        return (
          <li
            key={feedItemKey(item)}
            className={cn(
              "group relative px-4 py-3 transition-colors hover:bg-muted/40",
              !item.read && "bg-primary/5",
            )}
          >
            <div className="flex items-start gap-3">
              <Icon
                className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  {href ? (
                    <button
                      type="button"
                      onClick={open}
                      className={cn(
                        "min-w-0 truncate text-left text-sm text-foreground hover:underline",
                        item.read ? "font-medium" : "font-bold",
                      )}
                    >
                      {item.title}
                    </button>
                  ) : (
                    <p
                      className={cn(
                        "text-sm text-foreground",
                        item.read ? "font-medium" : "font-bold",
                      )}
                    >
                      {item.title}
                    </p>
                  )}

                  {!item.read && (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  )}
                </div>

                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {item.body}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground/70">
                    {formatWhen(item.createdAt)}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    {!item.read && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onMarkRead(item)}
                      >
                        <Check className="h-3 w-3" />
                        Mark read
                      </Button>
                    )}

                    {item.kind === "announcement" &&
                      item.dismissible &&
                      !item.dismissed && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => onDismissAnnouncement(item.id)}
                          aria-label={`Dismiss ${item.title}`}
                        >
                          <X className="h-3 w-3" />
                          Dismiss
                        </Button>
                      )}

                    {item.kind === "notification" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onDeleteNotification(item.id)}
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default FeedList;
