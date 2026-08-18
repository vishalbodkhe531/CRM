import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import TooltipLabel from "@/components/common/TooltipLabel";
import { NotificationBellLink } from "@/features/notifications";
import { usePublicPlatformSettings } from "@/features/platformSettings";
import { DEFAULT_PLATFORM_NAME } from "@/utils/platformName";

import logoImg from "@/assets/images/logo.svg";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

const MobileHeader = ({ onMenuClick }: MobileHeaderProps) => {
  const { data } = usePublicPlatformSettings();
  const platformName = data?.data?.platformName || DEFAULT_PLATFORM_NAME;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b bg-background px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <TooltipLabel label="Open menu" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="-ml-2 flex h-10 w-10 items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </TooltipLabel>
        <img
          src={logoImg}
          alt="CRM Logo"
          className="h-7 w-7 shrink-0 object-contain"
        />
        <span className="text-xl font-bold tracking-tight text-foreground">
          {platformName}
        </span>
      </div>
      
      {/*
        The desktop counterpart lives in SidebarFooter — this header is lg:hidden
        and the sidebar is a drawer on mobile, so each viewport needs its own bell.
      */}
      <div className="flex items-center gap-2">
        <NotificationBellLink />
      </div>
    </header>
  );
};

export default MobileHeader;
