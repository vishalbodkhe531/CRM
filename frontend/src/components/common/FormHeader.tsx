import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface FormHeaderProps {
  title: string;
  icon: LucideIcon;
  onBack: () => void;
  avatarSrc?: string;
  avatarAlt?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  backButtonClassName?: string;
}

const FormHeader = ({
  title,
  icon: Icon,
  onBack,
  avatarSrc,
  avatarAlt = "Profile",
  action,
  className,
  contentClassName,
  backButtonClassName,
}: FormHeaderProps) => {
  return (
    <div
      className={cn(
        action &&
          "flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className={cn("flex items-center gap-3", contentClassName)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Go back"
          className={cn("-ml-3", backButtonClassName)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={avatarAlt}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <span className="max-w-[200px] truncate font-bold sm:max-w-md">
          {title}
        </span>
      </div>
      {action && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {action}
        </div>
      )}
    </div>
  );
};

export default FormHeader;
