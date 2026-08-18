import React from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ActionMenuItem {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  show?: boolean;
  className?: string;
  tooltip?: string;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
}

const ActionMenu = ({
  items,
  className,
  buttonClassName,
  iconClassName,
  disabled,
}: ActionMenuProps) => {
  const visibleItems = items.filter((item) => item.show !== false);

  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", buttonClassName, className)}
              aria-label="Open action menu"
              type="button"
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className={cn("h-4 w-4", iconClassName)} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Open actions</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end">
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Tooltip key={`${item.label}-${index}`} delayDuration={300}>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                    }}
                    disabled={item.disabled}
                    className={cn(
                      item.variant === "destructive" &&
                        "text-danger focus:text-danger focus:bg-danger/10",
                      item.className,
                      item.disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {item.label}
                  </DropdownMenuItem>
                </div>
              </TooltipTrigger>
              {item.tooltip && (
                <TooltipContent side="left" className="z-100">
                  {item.tooltip}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionMenu;
