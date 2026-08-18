import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useFeedUnreadCount } from "../../hooks/useNotifications";

/**
 * Bell icon linking to the notifications page.
 *
 * Used by the mobile header, where the sidebar is a drawer and a nav row is
 * two taps away. It navigates rather than opening a dropdown so both entry
 * points land in the same place — a popover on mobile would be a panel nearly
 * as wide as the screen anyway.
 */
const NotificationBellLink = ({ className }: { className?: string }) => {
  const unreadCount = useFeedUnreadCount();
  const hasUnread = unreadCount > 0;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className={cn("relative h-10 w-10", className)}
    >
      <Link
        to={"/notifications"}
        aria-label={
          hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center",
              "rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
};

export default NotificationBellLink;
