import type {
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
} from "../constants/billing.constants";
import type {
  FeatureKey,
  FeatureKind,
} from "../constants/feature.constants";

export type PlanInterval = (typeof PLAN_INTERVALS)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Where a resolved feature value came from. */
export type FeatureOrigin = "override" | "plan" | "default";

/** One feature as configured on a plan. */
export interface PlanFeatureValue {
  key: FeatureKey;
  kind: FeatureKind;
  label: string;
  description: string;
  /** True when the application actually refuses on breach. */
  enforced: boolean;
  /** Limits only. null = unlimited. */
  valueInt: number | null;
  /** Toggles only. */
  valueBool: boolean | null;
}

/** One feature as it applies to a specific organization, after overrides. */
export interface ResolvedFeatureValue extends PlanFeatureValue {
  origin: FeatureOrigin;
  /** Present when an override supplied the value. */
  overrideNote?: string | null;
}

export interface PlanSummary {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  /** Paise. ₹2,000 is 200000. Format at the edge, never store the formatted value. */
  priceMinor: number;
  currency: string;
  billingCycle: PlanInterval;
  trialDays: number;
  /** Can be assigned at all. */
  isActive: boolean;
  /** Offered to customers. A live-but-unlisted plan is isActive && !isPublic. */
  isPublic: boolean;
  sortOrder: number;
  features: PlanFeatureValue[];
}

/**
 * A subscription as the API reports it.
 *
 * `status` is the stored column — what an operator last set. `effectiveStatus`
 * is what the clock says right now and is the only one any access decision may
 * use. They differ whenever a trial or period has lapsed without anyone touching
 * the row, which is the normal case since nothing runs on a timer.
 */
export interface SubscriptionSummary {
  id: string;
  organizationId: string;
  organizationName: string | null;
  plan: PlanSummary;

  status: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus;

  /** Writes are blocked; reads still work. */
  isReadOnly: boolean;
  /** Show a warning banner — trial ending, past due, or cancelling at period end. */
  isWarning: boolean;
  /** Days until the next boundary that matters. Null when nothing is pending. */
  daysRemaining: number | null;
  /** Human-readable explanation of effectiveStatus, for banners and tooltips. */
  reason: string | null;

  /** Every feature after overrides are applied. */
  features: ResolvedFeatureValue[];

  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;

  billingEmail: string | null;
  billingNotes: string | null;

  createdAt: string;
  updatedAt: string;
}

/** One metered dimension on the usage screen. */
export interface UsageMetric {
  key: FeatureKey;
  label: string;
  used: number;
  /** null = unlimited. */
  limit: number | null;
  /** Percentage 0-100, or null when unlimited. */
  percentUsed: number | null;
  /** True when used >= limit. */
  atLimit: boolean;
  /** True when the application actually refuses on breach. */
  enforced: boolean;
  origin: FeatureOrigin;
}

export interface BillingUsage {
  organizationId: string;
  metrics: UsageMetric[];
}
