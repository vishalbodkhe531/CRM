import { FolderX } from "lucide-react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
}

const EmptyState = ({
  title = "No data found",
  description = "Get started by creating a new entry.",
  className,
  icon = <FolderX className="h-10 w-10 text-muted-foreground/50 mb-4" />,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center animate-in fade-in-50",
        className,
      )}
    >
      {icon}
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
    </div>
  );
};

export default EmptyState;
