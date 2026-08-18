import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import TooltipLabel from "@/components/common/TooltipLabel";
import { useAppSelector } from "@/hooks/useRedux";
import SidebarFooter from "@/components/layout/sidebar/SidebarFooter";
import SidebarNavigation from "@/components/layout/sidebar/SidebarNavigation";
import {
  SIDEBAR_MENU,
  type SidebarMenuItem,
} from "@/components/layout/sidebar/sidebarConfig";
import { type UserRole } from "@/constants/roles";
import { useFeatureEnabled } from "@/features/billing";
import { usePublicPlatformSettings } from "@/features/platformSettings";
import { splitPlatformName } from "@/utils/platformName";
import type { FeatureKey } from "@/contracts/types";

import { useEffect } from "react";
import logoImg from "@/assets/images/logo.svg";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktopOpen?: boolean;
  onDesktopToggle?: () => void;
}

const Sidebar = ({
  isOpen,
  onClose,
  isDesktopOpen = true,
  onDesktopToggle,
}: SidebarProps) => {
  const { user } = useAppSelector((state) => state.auth);

  // Hooks must run before any early return. Toggle-gated nav items are hidden
  // when the org's plan disables the feature; permissive while billing is
  // unreadable/loading, since the backend is the real gate.
  const announcementsEnabled = useFeatureEnabled("ANNOUNCEMENTS");
  const auditEnabled = useFeatureEnabled("AUDIT_LOG_ACCESS");
  const quotationPdfEnabled = useFeatureEnabled("QUOTATION_PDF");

  const { data: platformSettings } = usePublicPlatformSettings();
  const brand = splitPlatformName(platformSettings?.data?.platformName);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const handleNav = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const featureEnabled: Record<FeatureKey, boolean> = {
    MAX_USERS: true,
    MAX_LEADS: true,
    MAX_PROSPECTS: true,
    MAX_QUOTATIONS: true,
    MAX_ITEMS: true,
    ANNOUNCEMENTS: announcementsEnabled,
    AUDIT_LOG_ACCESS: auditEnabled,
    QUOTATION_PDF: quotationPdfEnabled,
  };

  const visibleMenu = SIDEBAR_MENU.filter((item): item is SidebarMenuItem => {
    if (item.type === "divider") {
      return true;
    }
    if (!item.roles.includes(user.role as UserRole)) {
      return false;
    }
    if (item.type === "link" && item.feature) {
      return featureEnabled[item.feature];
    }
    return true;
  }).map((item) => {
    if (item.type === "link" || item.type === "notifications") {
      return {
        ...item,
        path: item.path,
      };
    }

    if (item.type === "group") {
      return {
        ...item,
        children: item.children.map((child) => ({
          ...child,
          path: child.path,
        })),
      };
    }

    return item;
  });

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        style={{ height: "100dvh", maxHeight: "100dvh" }}
        className={`
          fixed lg:sticky top-0 left-0 h-screen min-h-0
          w-64 bg-sidebar flex flex-col overflow-hidden
          transition-[width,transform] duration-200 ease-out motion-reduce:transition-none
          z-40 lg:z-0
          border-r border-sidebar-border
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isDesktopOpen ? "lg:w-64" : "lg:w-20"}
          lg:translate-x-0
        `}
      >
        <div
          className={`
            h-16 flex items-center justify-between px-5  shrink-0 border-b border-sidebar-border/70
            transition-[padding] duration-200 ease-out motion-reduce:transition-none
            ${isDesktopOpen ? "lg:justify-between lg:px-5" : "lg:justify-center lg:px-3"}
          `}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={logoImg}
              alt="CRM Logo"
              className="h-8 w-8 shrink-0 object-contain"
            />
            <div
              className={`
                flex max-w-40 items-center gap-2 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none
                ${isDesktopOpen ? "lg:max-w-40 lg:translate-x-0 lg:opacity-100" : "lg:max-w-0 lg:-translate-x-1 lg:opacity-0"}
              `}
            >
              <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
                {brand.lead ? `${brand.lead} ` : ""}
                <span>{brand.accent}</span>
              </span>
            </div>
          </div>
          <TooltipLabel
            label={isDesktopOpen ? "Collapse sidebar" : "Expand sidebar"}
            side="right"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onDesktopToggle}
              className="hidden h-8 w-8 rounded-none bg-transparent text-sidebar-foreground/55 shadow-none hover:bg-transparent hover:text-sidebar-foreground lg:flex"
              aria-label={isDesktopOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isDesktopOpen ? (
                <ChevronsLeft className="h-5 w-5" />
              ) : (
                <ChevronsRight className="h-5 w-5" />
              )}
            </Button>
          </TooltipLabel>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <SidebarNavigation
          items={visibleMenu}
          isCollapsed={!isDesktopOpen}
          onNavigate={handleNav}
        />

        <SidebarFooter
          isCollapsed={!isDesktopOpen}
          onNavigate={handleNav}
          user={user}
        />
      </aside>
    </>
  );
};

export default Sidebar;
