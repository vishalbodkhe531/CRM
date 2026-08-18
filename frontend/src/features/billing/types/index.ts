import type { SubscriptionStatus } from "@/contracts/types";

export type {
  BillingUsage,
  FeatureKey,
  FeatureKind,
  FeatureOrigin,
  PlanFeatureValue,
  PlanInterval,
  PlanSummary,
  ResolvedFeatureValue,
  SubscriptionStatus,
  SubscriptionSummary,
  UsageMetric,
} from "@/contracts/types";

export type PlanListParams = {
  page?: number;
  limit?: number;
  search?: string;
  /** Super-admin only; the backend ignores both for everyone else. */
  includeInactive?: boolean;
  includePrivate?: boolean;
};

export type SubscriptionListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubscriptionStatus | SubscriptionStatus[];
  planId?: string;
};

/** A live organization that has no subscription row yet. */
export type UnsubscribedOrganization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

/** One feature value on the wire. Limits carry valueInt, toggles valueBool. */
export type FeatureValuePayload = {
  featureKey: string;
  valueInt?: number | null;
  valueBool?: boolean | null;
};

export type PlanPayload = {
  code: string;
  slug?: string;
  name: string;
  description?: string | null;
  priceMinor: number;
  billingCycle: string;
  trialDays: number;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  features: FeatureValuePayload[];
};

export type SubscriptionPayload = {
  planId?: string;
  status?: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  billingEmail?: string | null;
  billingNotes?: string | null;
};

/**
 * The COMPLETE override set for an organization.
 *
 * Sent wholesale rather than patched: keys omitted here are deleted, which is
 * what makes "revert this customer to plan terms" expressible at all.
 */
export type FeatureOverridesPayload = {
  overrides: (FeatureValuePayload & { note?: string | null })[];
};

export type CancelPayload = {
  atPeriodEnd: boolean;
  reason?: string;
};
