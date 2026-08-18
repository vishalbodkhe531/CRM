import type { ReactNode } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

interface DialogShellProps {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  leadingIcon?: ReactNode;
  size?: "compact" | "form" | "confirm";
  className?: string;
}

const sizeClass = {
  compact: "sm:max-w-md",
  form: "sm:max-w-2xl",
  confirm: "sm:max-w-lg",
};

const DialogShell = ({
  title,
  description,
  children,
  footer,
  leadingIcon,
  size = "form",
  className,
}: DialogShellProps) => (
  <DialogContent
    className={cn(
      "overflow-hidden rounded-xl border-border bg-card p-0 shadow-2xl",
      sizeClass[size],
      className,
    )}
  >
    <DialogHeader className="border-b border-border bg-muted/20 px-5 py-4 text-left">
      <div className="flex items-start gap-3">
        {leadingIcon}
        <div className="min-w-0 space-y-1">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </div>
      </div>
    </DialogHeader>
    {children ? (
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        {children}
      </div>
    ) : null}
    {footer ? (
      <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end">
        {footer}
      </div>
    ) : null}
  </DialogContent>
);

export default DialogShell;
