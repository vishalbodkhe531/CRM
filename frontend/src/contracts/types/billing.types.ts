/**
 * Mirrors backend/src/contracts/{constants/billing.constants.ts,constants/feature.constants.ts,types/billing.types.ts}
 * — keep the three in sync. Nothing enforces this; a drift compiles fine and
 * breaks at runtime.
 *
 * PLAN_SEEDS is deliberately NOT mirrored: it is server-side seed data, not a
 * wire contract. The frontend reads plans from GET /billing/plans.
 */

export const PLAN_INTERVALS = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
] as const;

export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 7;
export const BILLING_CURRENCY = "INR";

/**
 * Feature keys live in CODE on both sides — an operator can change a plan's
 * VALUE for a key, never the key itself.
 */
export const FEATURE_KEYS = [
  "MAX_USERS",
  "MAX_LEADS",
  "MAX_PROSPECTS",
  "MAX_QUOTATIONS",
  "MAX_ITEMS",
  "AUDIT_LOG_ACCESS",
  "ANNOUNCEMENTS",
  "QUOTATION_PDF",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureKind = "limit" | "toggle";
export type FeatureOrigin = "override" | "plan" | "default";

export type PlanInterval = (typeof PLAN_INTERVALS)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * One feature as configured on a plan.
 *
 * The server sends label/description/kind/enforced alongside the value so the
 * console never has to keep its own copy of the catalogue in sync.
 */
export interface PlanFeatureValue {
  key: FeatureKey;
  kind: FeatureKind;
  label: string;
  description: string;
  enforced: boolean;
  /** Limits only. null = unlimited. */
  valueInt: number | null;
  /** Toggles only. */
  valueBool: boolean | null;
}

/** One feature as it applies to a specific organization, after overrides. */
export interface ResolvedFeatureValue extends PlanFeatureValue {
  origin: FeatureOrigin;
  overrideNote?: string | null;
}

export interface PlanSummary {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  /** Paise. ₹2,000 is 200000 — format at render time. */
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

export interface SubscriptionSummary {
  id: string;
  organizationId: string;
  organizationName: string | null;
  plan: PlanSummary;

  /** What an operator last set. */
  status: SubscriptionStatus;
  /** What the clock says now. Use this for anything user-visible. */
  effectiveStatus: SubscriptionStatus;

  isReadOnly: boolean;
  isWarning: boolean;
  daysRemaining: number | null;
  reason: string | null;

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

export interface UsageMetric {
  key: FeatureKey;
  label: string;
  used: number;
  /** null = unlimited. */
  limit: number | null;
  percentUsed: number | null;
  atLimit: boolean;
  /** True when the application actually refuses on breach. */
  enforced: boolean;
  origin: FeatureOrigin;
}

export interface BillingUsage {
  organizationId: string;
  metrics: UsageMetric[];
}
