import type { StatusType } from "@/components/common/StatusBadge";
import type { NoticeSeverity } from "@/components/common/NoticeBanner";
import type {
  FeatureOrigin,
  PlanInterval,
  SubscriptionStatus,
} from "@/contracts/types";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Payment overdue",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const SUBSCRIPTION_STATUS_BADGE_TYPE: Record<
  SubscriptionStatus,
  StatusType
> = {
  TRIALING: "pending",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "inactive",
  EXPIRED: "error",
};

/** How urgently each state is presented in the banner. */
export const SUBSCRIPTION_BANNER_SEVERITY: Record<
  SubscriptionStatus,
  NoticeSeverity
> = {
  TRIALING: "INFO",
  ACTIVE: "INFO",
  PAST_DUE: "WARNING",
  CANCELLED: "WARNING",
  EXPIRED: "CRITICAL",
};

export const PLAN_INTERVAL_LABELS: Record<PlanInterval, string> = {
  MONTHLY: "month",
  QUARTERLY: "quarter",
  YEARLY: "year",
};

/** Where a resolved feature value came from, in words a human can act on. */
export const FEATURE_ORIGIN_LABELS: Record<FeatureOrigin, string> = {
  override: "Custom for this organization",
  plan: "From the plan",
  default: "System default",
};

/**
 * Format a paise amount as rupees.
 *
 * Division by 100 happens HERE, at the very edge, and nowhere else — every
 * value in transit and in the database stays an integer count of paise.
 */
export const formatPrice = (priceMinor: number, currency = "INR") => {
  const amount = priceMinor / 100;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    // Intl throws on an unrecognised currency code; a readable fallback beats
    // a crashed billing page.
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
};

export const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatLimit = (limit: number | null) =>
  limit === null ? "Unlimited" : String(limit);
