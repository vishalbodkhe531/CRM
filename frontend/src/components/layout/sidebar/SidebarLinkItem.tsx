import { NavLink } from "react-router-dom";
import {
  ACTIVE_LINK_CLASS,
  INACTIVE_LINK_CLASS,
  type SidebarMenuItem,
} from "@/components/layout/sidebar/sidebarConfig";
import TooltipLabel from "@/components/common/TooltipLabel";

interface SidebarLinkItemProps {
  isCollapsed?: boolean;
  item: Extract<SidebarMenuItem, { type: "link" }>;
  onNavigate: () => void;
}

const ROUTE_PRELOAD_MAP: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/leads": () => import("@/pages/LeadPage"),
  "/prospects": () => import("@/pages/ProspectPage"),
  "/quotations": () => import("@/pages/QuotationPage"),
  "/customers": () => import("@/pages/CustomersPage"),
  "/reports": () => import("@/pages/ReportsPage"),
  "/items": () => import("@/pages/ItemsPage"),
  "/users": () => import("@/pages/UsersPage"),
  "/platform/organizations": () => import("@/pages/OrganizationsPage"),
  "/announcements": () => import("@/pages/AnnouncementsPage"),
  "/audit-logs": () => import("@/pages/AuditLogPage"),
  "/platform/settings": () => import("@/pages/PlatformSettingsPage"),
};

const SidebarLinkItem = ({
  isCollapsed = false,
  item,
  onNavigate,
}: SidebarLinkItemProps) => {
  const Icon = item.icon;

  const handleMouseEnter = () => {
    const preloader = ROUTE_PRELOAD_MAP[item.path];
    if (preloader) {
      preloader().catch(() => {});
    }
  };

  const link = (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      onMouseEnter={handleMouseEnter}
      aria-label={item.label}
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
              flex h-9 w-9 shrink-0 items-center  justify-center rounded-xl border transition-colors duration-150 ease-out motion-reduce:transition-none
              ${
                isCollapsed && isActive
                  ? "lg:bg-sidebar-primary lg:text-sidebar-primary-foreground lg:border-sidebar-ring lg:shadow-sm"
                  : "border-transparent"
              }
            `}
          >
            <Icon
              className={`w-5  h-5 shrink-0 ${isActive ? "text-primary-foreground lg:text-inherit" : "text-sidebar-foreground/70"}`}
            />
          </span>
          <span
            className={`
              min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none
              ${isCollapsed ? "lg:max-w-0 lg:-translate-x-1 lg:opacity-0" : "max-w-40 translate-x-0 opacity-100"}
            `}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );

  if (!isCollapsed) {
    return link;
  }

  return (
    <TooltipLabel label={`Open ${item.label}`} side="right">
      {link}
    </TooltipLabel>
  );
};

export default SidebarLinkItem;
