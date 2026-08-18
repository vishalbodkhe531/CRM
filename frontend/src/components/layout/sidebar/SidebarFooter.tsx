import { useState } from "react";
import {
  ChevronUp,
  HelpCircle,
  LogOut,
  MoreHorizontal,
  Settings,
  UserCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PLATFORM_SETTINGS_ROUTE_ROLES,
  SETTINGS_ROUTE_ROLES,
  type UserRole,
} from "@/constants/roles";
import type { AuthUser } from "@/contracts/types";
import { useAppDispatch } from "@/hooks/useRedux";
import { logout } from "@/features/auth";

interface SidebarFooterProps {
  isCollapsed?: boolean;
  onNavigate: () => void;
  user: AuthUser;
}

const formatRole = (role: string) =>
  role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getUserName = (user: AuthUser) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.email;
};

const getInitials = (user: AuthUser) => {
  const source = getUserName(user);
  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const SidebarFooter = ({
  isCollapsed = false,
  onNavigate,
  user,
}: SidebarFooterProps) => {
  const dispatch = useAppDispatch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userName = getUserName(user);
  const userRole = formatRole(user.role);
  const initials = getInitials(user);
  /**
   * "Settings" means different things by role: an organization's own
   * preferences for an admin, installation-wide configuration for a
   * super-admin. One menu entry, two destinations — and hidden for roles that
   * have neither.
   */
  const isPlatformOperator = (
    PLATFORM_SETTINGS_ROUTE_ROLES as readonly UserRole[]
  ).includes(user.role as UserRole);
  const canOpenTenantSettings = (
    SETTINGS_ROUTE_ROLES as readonly UserRole[]
  ).includes(user.role as UserRole);

  const canOpenSettings = isPlatformOperator || canOpenTenantSettings;
  const settingsHref = isPlatformOperator
    ? "/platform/settings"
    : "/settings";

  const handleNavigate = () => {
    setIsMenuOpen(false);
    onNavigate();
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    onNavigate();
    void dispatch(logout());
  };

  return (
    <div
      className={`
        shrink-0 border-t border-sidebar-border px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 transition-[padding] duration-200 ease-out motion-reduce:transition-none lg:pb-5
        ${isCollapsed ? "lg:px-2" : "lg:px-3"}
      `}
    >
      <DropdownMenu modal={false} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <div>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open user menu"
              aria-expanded={isMenuOpen}
              className={`
                group relative flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left
                text-sidebar-foreground outline-none transition-[width,background-color,color,box-shadow] duration-200 ease-out
                hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring/70 motion-reduce:transition-none
                ${isCollapsed ? "lg:mx-auto lg:h-11 lg:min-h-11 lg:w-11 lg:justify-center lg:gap-0 lg:p-0" : ""}  
              `}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                {initials || <UserCircle className="h-5 w-5" />}
              </span>
              <span
                aria-hidden="true"
                className={`
                  absolute bottom-1 right-1 hidden h-4 w-4 items-center justify-center rounded-full border border-sidebar-border
                  bg-sidebar text-sidebar-foreground/70 shadow-sm transition-colors group-hover:text-sidebar-foreground
                  ${isCollapsed ? "lg:flex" : "lg:hidden"}
                `}
              >
                <MoreHorizontal className="h-3 w-3" />
              </span>
              <span
                className={`
                  min-w-0 max-w-full flex-1 translate-x-0 overflow-hidden opacity-100 transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none
                  ${isCollapsed ? "lg:max-w-0 lg:flex-none lg:-translate-x-1 lg:opacity-0" : ""}
                `}
              >
                <span className="block truncate text-sm font-bold leading-5">
                  {userName}
                </span>
                <span className="block truncate text-xs font-medium text-sidebar-foreground/60">
                  {userRole}
                </span>
              </span>
              {/* Bare chevron — the circular border read as a second button. */}
              <span
                aria-hidden="true"
                className={`
                  ml-auto flex h-7 w-7 shrink-0 items-center justify-center
                  text-sidebar-foreground/60 opacity-100 transition-[color,transform,opacity] duration-200 ease-out
                  group-hover:text-sidebar-foreground motion-reduce:transition-none
                  ${isCollapsed ? "lg:pointer-events-none lg:w-0 lg:opacity-0" : ""}
                `}
              >
                <ChevronUp
                  className={`h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                    isMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align={isCollapsed ? "end" : "start"}
            side={isCollapsed ? "right" : "top"}
            sideOffset={10}
            className="w-52 border-sidebar-border bg-popover p-1.5 shadow-xl"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DropdownMenuItem asChild>
              <Link
                className="cursor-pointer"
                to={"/profile"}
                onClick={handleNavigate}
              >
                <UserCircle className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            {canOpenSettings ? (
              <DropdownMenuItem asChild>
                <Link
                  className="cursor-pointer"
                  to={settingsHref}
                  onClick={handleNavigate}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link
                className="cursor-pointer"
                to={"/help"}
                onClick={handleNavigate}
              >
                <HelpCircle className="h-4 w-4" />
                <span>Help</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              variant="destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>
    </div>
  );
};

export default SidebarFooter;
