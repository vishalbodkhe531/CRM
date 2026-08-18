import { ChevronDown, ChevronRight, UserCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TooltipLabel from "@/components/common/TooltipLabel";
import type { SidebarMenuItem } from "@/components/layout/sidebar/sidebarConfig";

interface SidebarGroupItemProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  isRouteActive: boolean;
  item: Extract<SidebarMenuItem, { type: "group" }>;
  onNavigate: () => void;
  onToggle: () => void;
}

const SidebarGroupItem = ({
  isOpen,
  isCollapsed = false,
  isRouteActive,
  item,
  onNavigate,
  onToggle,
}: SidebarGroupItemProps) => {
  const Icon = item.icon;
  const trigger = (
    <Button
      variant="ghost"
      onClick={onToggle}
      aria-label={item.label}
      className={`
        w-full flex items-center justify-start gap-3 h-auto py-2.5 px-4 text-sm rounded-2xl transition-[width,background-color,color,border-color] duration-200 ease-out motion-reduce:transition-none
        ${isCollapsed ? "lg:w-11 lg:justify-center lg:gap-0 lg:px-0 lg:mx-auto" : ""}
        ${
        isRouteActive
          ? "text-primary font-semibold hover:text-primary hover:bg-transparent"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0 text-primary" />
      <span
        className={`
          min-w-0 flex-1 text-left font-normal whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none
          ${isCollapsed ? "lg:max-w-0 lg:-translate-x-1 lg:opacity-0" : "max-w-40 translate-x-0 opacity-100"}
        `}
      >
        {item.label}
      </span>
      <span
        className={`
          shrink-0 overflow-hidden transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none
          ${isCollapsed ? "lg:max-w-0 lg:opacity-0" : "max-w-4 opacity-100"}
        `}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 transition-transform" />
        ) : (
          <ChevronRight className="w-4 h-4 transition-transform" />
        )}
      </span>
    </Button>
  );

  return (
    <div key={`group-${item.label} `}>
      {isCollapsed ? (
        <TooltipLabel label={`Open ${item.label}`} side="right">
          {trigger}
        </TooltipLabel>
      ) : (
        trigger
      )}

      {isOpen && (
        <div
          className={`
            ml-4 mt-1 pl-4 border-l border-sidebar-border/30 space-y-1
            ${isCollapsed ? "lg:hidden" : ""}
          `}
        >
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm rounded-full transition-colors ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                }`
              }
            >
              <UserCheck className="w-4 h-4 shrink-0 text-primary/70" />
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarGroupItem;
