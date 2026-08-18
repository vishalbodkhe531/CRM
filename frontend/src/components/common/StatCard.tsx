import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
}

export const StatCard = ({ title, value, icon }: StatCardProps) => (
  <div className="flex h-[88px] min-w-0 flex-col justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors">
    <div className="flex items-center justify-between gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
        {icon}
      </div>

      <span className="min-w-0 truncate text-3xl font-bold leading-none text-foreground">
        {value}
      </span>
    </div>

    <p className="truncate text-sm font-medium text-muted-foreground">
      {title}
    </p>
  </div>
);
