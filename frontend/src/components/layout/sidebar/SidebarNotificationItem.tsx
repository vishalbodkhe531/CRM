import { NavLink } from "react-router-dom";
import { Bell } from "lucide-react";
import TooltipLabel from "@/components/common/TooltipLabel";
import { useFeedUnreadCount } from "@/features/notifications";
import {
  ACTIVE_LINK_CLASS,
  INACTIVE_LINK_CLASS,
} from "@/components/layout/sidebar/sidebarConfig";

interface SidebarNotificationItemProps {
  isCollapsed?: boolean;
  label: string;
  path: string;
  onNavigate: () => void;
}

/**
 * Notifications row in the sidebar.
 *
 * Mirrors SidebarLinkItem exactly and navigates like any other menu item — it is
 * a separate component only because it carries a live unread badge, which the
 * static menu config cannot supply.
 *
 * It navigates rather than opening a popover: a dropdown anchored to a row in a
 * scrollable nav list is awkward, and the full page has room to actually read
 * what it is showing.
 */
const SidebarNotificationItem = ({
  isCollapsed = false,
  label,
  path,
  onNavigate,
}: SidebarNotificationItemProps) => {
  const unreadCount = useFeedUnreadCount();
  const hasUnread = unreadCount > 0;

  const link = (
    <NavLink
      to={path}
      onClick={onNavigate}
      aria-label={hasUnread ? `${label}, ${unreadCount} unread` : label}
      className={({ isActive }) =>
        `
        flex min-h-11 items-center overflow-hidden text-sm transition-[width,background-color,color,border-color] duration-200 ease-out motion-reduce:transition-none
         px-2 py-1
        ${isCollapsed ? "lg:w-11 lg:justify-center lg:px-0 lg:mx-auto" : ""}
        ${isActive ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS}`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`
              relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150 ease-out motion-reduce:transition-none
              ${
                isCollapsed && isActive
                  ? "lg:bg-sidebar-primary lg:text-sidebar-primary-foreground lg:border-sidebar-ring lg:shadow-sm"
                  : "border-transparent"
              }
            `}
          >
            <Bell
              className={`w-5 h-5 shrink-0 ${isActive ? "text-primary-foreground lg:text-inherit" : "text-sidebar-foreground/70"}`}
            />

            {/*
              Collapsed shows a dot: an 80px rail has no room for a number, and a
              clipped "12" is worse than an unambiguous dot.
            */}
            {hasUnread && isCollapsed && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 hidden h-2 w-2 rounded-full bg-destructive lg:block"
              />
            )}
          </span>

          <span
            className={`
              min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none
              ${isCollapsed ? "lg:max-w-0 lg:-translate-x-1 lg:opacity-0" : "max-w-40 translate-x-0 opacity-100"}
            `}
          >
            {label}
          </span>

          {hasUnread && (
            <span
              className={`
                ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5
                text-[11px] font-bold leading-none transition-opacity duration-200 ease-out motion-reduce:transition-none
                ${isActive ? "bg-primary-foreground text-primary" : "bg-destructive text-white"}
                ${isCollapsed ? "lg:hidden" : ""}
              `}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (!isCollapsed) return link;

  return (
    <TooltipLabel
      label={hasUnread ? `${label} (${unreadCount} unread)` : label}
      side="right"
    >
      {link}
    </TooltipLabel>
  );
};

export default SidebarNotificationItem;
