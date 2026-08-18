import {
  ALL_AUTHENTICATED_ROLES,
  ANNOUNCEMENTS_ROUTE_ROLES,
  AUDIT_ROUTE_ROLES,
  DASHBOARD_ROUTE_ROLES,
  EXECUTIVE_ONLY_ROLES,
  LEADS_ADMIN_ROUTE_ROLES,
  ORGANIZATION_ADMIN_ROUTE_ROLES,
  PLATFORM_SETTINGS_ROUTE_ROLES,
  ROLES,
  type UserRole,
} from "@/constants/roles";
import {
  BarChart2,
  Building2,
  ClipboardCheck,
  CreditCard,
  ScrollText,
  FileSpreadsheet,
  FileText,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Package,
  SlidersHorizontal,
  Target,
  Users
} from "lucide-react";
import type { ElementType } from "react";
import type { FeatureKey } from "@/contracts/types";

export type SidebarRole = UserRole;

export interface SidebarChild {
  label: string;
  path: string;
}

export type SidebarMenuItem =
  | {
      type: "link";
      label: string;
      path: string;
      icon: ElementType;
      roles: SidebarRole[];
      /**
       * When set, the item is hidden unless the org's plan enables this toggle.
       * The backend also enforces these features — this only keeps the nav
       * honest so a tenant is not shown a page it will be refused.
       */
      feature?: FeatureKey;
    }
  | {
      /**
       * A link that also carries a live unread badge. Rendered by
       * SidebarNotificationItem — separate only because the badge count cannot
       * come from this static config.
       */
      type: "notifications";
      label: string;
      path: string;
      roles: SidebarRole[];
    }
  | {
      type: "group";
      label: string;
      icon: ElementType;
      roles: SidebarRole[];
      children: SidebarChild[];
    }
  | {
      type: "divider";
    };

export const ACTIVE_LINK_CLASS =
  "bg-primary text-primary-foreground font-semibold rounded-xl";
export const INACTIVE_LINK_CLASS =
  "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl transition-colors";

export const SIDEBAR_MENU: SidebarMenuItem[] = [
  {
    type: "link",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: [...DASHBOARD_ROUTE_ROLES],
  },
  {
    // Directly under Dashboard: it is checked constantly and should not be
    // hunted for at the bottom of a long menu.
    type: "notifications",
    label: "Notifications",
    path: "/notifications",
    roles: [...ALL_AUTHENTICATED_ROLES],
  },
  {
    type: "link",
    label: "Organizations",
    path: "/platform/organizations",
    icon: Building2,
    roles: [...ORGANIZATION_ADMIN_ROUTE_ROLES],
  },
  {
    type: "link",
    label: "Signup Requests",
    path: "/platform/signup-requests",
    icon: ClipboardCheck,
    roles: [...ORGANIZATION_ADMIN_ROUTE_ROLES],
  },
  {
    type: "link",
    label: "Users",
    path: "/users",
    icon: Users,
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    type: "link",
    label: "Items",
    path: "/items",
    icon: Package,
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    type: "link",
    label: "Leads",
    path: "/leads",
    icon: FileText,
    roles: [...LEADS_ADMIN_ROUTE_ROLES],
  },
  {
    type: "link",
    label: "My Leads",
    path: "/leads",
    icon: FileText,
    roles: [...EXECUTIVE_ONLY_ROLES],
  },
  {
    type: "link",
    label: "Prospects",
    path: "/prospects",
    icon: Target,
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EXECUTIVE],
  },
  {
    type: "link",
    label: "Quotations",
    path: "/quotations",
    icon: FileSpreadsheet,
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EXECUTIVE],
  },
  {
    type: "link",
    label: "Customers",
    path: "/customers",
    icon: Handshake,
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    type: "link",
    label: "Reports",
    path: "/reports",
    icon: BarChart2,
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EXECUTIVE],
  },
  {
    type: "link",
    label: "Billing",
    path: "/platform/billing",
    icon: CreditCard,
    roles: [...ORGANIZATION_ADMIN_ROUTE_ROLES],
  },
  {
    // One entry for both roles, like Audit Log below — their role sets are
    // identical. This was previously two entries pointing at two URLs that
    // rendered the same page.
    type: "link",
    label: "Announcements",
    path: "/announcements",
    icon: Megaphone,
    roles: [...ANNOUNCEMENTS_ROUTE_ROLES],
    feature: "ANNOUNCEMENTS",
  },
  {
    type: "link",
    label: "Audit Log",
    path: "/audit-logs",
    icon: ScrollText,
    roles: [...AUDIT_ROUTE_ROLES],
    feature: "AUDIT_LOG_ACCESS",
  },
  {
    // Last: configuration is set up once and revisited rarely, unlike
    // everything above it.
    type: "link",
    label: "Platform Settings",
    path: "/platform/settings",
    icon: SlidersHorizontal,
    roles: [...PLATFORM_SETTINGS_ROUTE_ROLES],
  },
  // {
  //   type: "link",
  //   label: "Follow-ups",
  //   path: "/followups",
  //   icon: CalendarClock,
  //   roles: [...FOLLOW_UPS_ROUTE_ROLES],
  // },
];
