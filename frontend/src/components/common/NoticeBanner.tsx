import type { ReactNode } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

/**
 * Full-width notice strip shown above the page content.
 *
 * Presentational only — it knows nothing about announcements or billing. Both
 * feed it, which is what keeps the app to ONE banner style and one place to fix
 * when the design changes.
 *
 * Body text is rendered as text, never as HTML: announcement bodies are authored
 * by org admins, and dangerouslySetInnerHTML here would be stored XSS across the
 * whole tenant.
 */

export type NoticeSeverity = "INFO" | "WARNING" | "CRITICAL";

const SEVERITY_STYLES: Record<NoticeSeverity, string> = {
  INFO: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-900",
  WARNING:
    "bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-100 dark:border-yellow-900",
  CRITICAL:
    "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-100 dark:border-red-900",
};

const SEVERITY_ICON: Record<NoticeSeverity, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: AlertTriangle,
};

interface NoticeBannerProps {
  severity: NoticeSeverity;
  title: string;
  body?: string | null;
  /** Omit to make the notice non-dismissible. */
  onDismiss?: () => void;
  /** Trailing call to action, e.g. a link to the billing page. */
  action?: ReactNode;
  className?: string;
}

const NoticeBanner = ({
  severity,
  title,
  body,
  onDismiss,
  action,
  className,
}: NoticeBannerProps) => {
  const Icon = SEVERITY_ICON[severity];

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-b px-4 py-3 sm:px-5 lg:px-6",
        SEVERITY_STYLES[severity],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        {body && (
          <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed opacity-90">
            {body}
          </p>
        )}
      </div>

      {action}

      {onDismiss && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onDismiss}
          aria-label={`Dismiss: ${title}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default NoticeBanner;
