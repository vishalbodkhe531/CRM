import { cn } from "@/utils/cn";
import type { UsageMetric } from "@/contracts/types";
import { formatLimit } from "../../constants/labels";

interface UsageMeterProps {
  metric: UsageMetric;
  /** Overrides the metric's own label when a screen wants different wording. */
  label?: string;
  description?: string;
}

/** Bar colour tracks how close the tenant is to the limit. */
const barClass = (percent: number | null, atLimit: boolean) => {
  if (atLimit) return "bg-destructive";
  if (percent !== null && percent >= 80) return "bg-yellow-500";
  return "bg-primary";
};

const UsageMeter = ({ metric, label, description }: UsageMeterProps) => {
  const { used, limit, percentUsed, atLimit, enforced } = metric;
  const heading = label ?? metric.label;

  // Cap the bar at 100% so an org that went over a lowered plan limit does not
  // render a bar wider than its track.
  const width = percentUsed === null ? 0 : Math.min(percentUsed, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{heading}</p>
        <p className="text-sm text-muted-foreground">
          <span className={cn("font-bold", atLimit && "text-destructive")}>
            {used}
          </span>
          {" / "}
          {formatLimit(limit)}
        </p>
      </div>

      {limit !== null && (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${heading}: ${used} of ${limit} used`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              barClass(percentUsed, atLimit),
            )}
            style={{ width: `${width}%` }}
          />
        </div>
      )}

      {atLimit && enforced && (
        <p className="text-xs font-medium text-destructive">
          Limit reached — upgrade your plan or disable an existing user to add
          more.
        </p>
      )}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default UsageMeter;
