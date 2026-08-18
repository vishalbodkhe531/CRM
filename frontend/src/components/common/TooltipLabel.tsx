import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipLabelProps {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

const TooltipLabel = ({
  label,
  children,
  side = "top",
  align = "center",
}: TooltipLabelProps) => (
  <Tooltip delayDuration={300}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side} align={align}>
      {label}
    </TooltipContent>
  </Tooltip>
);

export default TooltipLabel;
