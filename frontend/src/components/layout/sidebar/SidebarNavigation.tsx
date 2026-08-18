import type { SidebarMenuItem } from "@/components/layout/sidebar/sidebarConfig";
import SidebarGroupItem from "@/components/layout/sidebar/SidebarGroupItem";
import SidebarLinkItem from "@/components/layout/sidebar/SidebarLinkItem";
import SidebarNotificationItem from "@/components/layout/sidebar/SidebarNotificationItem";

interface SidebarNavigationProps {
  items: SidebarMenuItem[];
  isCollapsed?: boolean;
  onNavigate: () => void;
}

const SidebarNavigation = ({
  items,
  isCollapsed = false,
  onNavigate,
}: SidebarNavigationProps) => {
  return (
    <nav
      className={`
        min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1 transition-[padding] duration-200 ease-out motion-reduce:transition-none
        ${isCollapsed ? "lg:px-2" : "lg:px-3"}
      `}
    >
      {items.map((item, index) => {
        if (item.type === "divider") {
          return (
            <div
              key={`divider-${index}`}
              className={`
                my-2 border-t border-sidebar-border transition-[width,margin] duration-200 ease-out motion-reduce:transition-none
                ${isCollapsed ? "lg:mx-auto lg:w-8" : "lg:w-full"}
              `}
            />
          );
        }

        if (item.type === "link") {
          return (
            <SidebarLinkItem
              key={`${item.label}-${item.path}`}
              isCollapsed={isCollapsed}
              item={item}
              onNavigate={onNavigate}
            />
          );
        }

        if (item.type === "notifications") {
          return (
            <SidebarNotificationItem
              key={`notifications-${item.path}`}
              isCollapsed={isCollapsed}
              label={item.label}
              path={item.path}
              onNavigate={onNavigate}
            />
          );
        }

        if (item.type === "group") {
          return (
            <SidebarGroupItem
              key={`group-${item.label}`}
              isOpen={false}
              isCollapsed={isCollapsed}
              isRouteActive={false}
              item={item}
              onNavigate={onNavigate}
              onToggle={() => {}}
            />
          );
        }

        return null;
      })}
    </nav>
  );
};

export default SidebarNavigation;
