import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
  bottomBorder?: boolean;
}

const PageHeader = ({
  title,
  description,
  children,
  className,
  action,
  bottomBorder = false,
}: PageHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between",
        bottomBorder && "border-b border-border mb-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-2">{children}</div>}
      </div>

      {action && (
        <div className="flex shrink-0 items-center justify-start gap-2 md:justify-end">
          {action}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
