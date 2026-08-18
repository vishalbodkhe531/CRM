import type { FeatureKey } from "./feature.constants";

/**
 * Billing catalogue.
 *
 * Mirrors the Prisma enums in prisma/models/billing.prisma and is the source of
 * truth for zod validation on both sides of the wire.
 */

export const PLAN_INTERVALS = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
] as const;

/**
 * Days a lapsed subscription keeps full access before going read-only.
 *
 * Decision D3. Do not shorten this without a product conversation: the grace
 * window is the difference between "your card expired, please update it" and a
 * customer discovering at 9am that their sales team cannot work.
 */
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 7;

/** Single-currency INR by decision D6. */
export const BILLING_CURRENCY = "INR";

/** A plan's starting feature values. Omitted keys fall back to code defaults. */
type PlanSeedFeatures = Partial<Record<FeatureKey, number | boolean | null>>;

interface PlanSeed {
  code: string;
  slug: string;
  name: string;
  description: string;
  /** PAISE. 200000 = ₹2,000. */
  priceMinor: number;
  billingCycle: (typeof PLAN_INTERVALS)[number];
  trialDays: number;
  sortOrder: number;
  /** Can be assigned at all. */
  isActive?: boolean;
  /** Offered to customers. */
  isPublic?: boolean;
  features: PlanSeedFeatures;
}

/**
 * Default system plans, created ONCE at installation.
 *
 * ⚠️ PLACEHOLDER PRICING — structurally correct but commercially invented.
 * Replace with the real terms before onboarding a paying customer.
 *
 * Deliberately NOT re-applied on later deploys: once a super-admin has edited a
 * plan through the console, a redeploy silently resetting it to the value
 * checked into git would be a billing incident. seedPlans skips existing codes
 * unless explicitly forced.
 *
 * ── Catalogue shape ────────────────────────────────────────────────────────
 * Three plans customers can be sold, two the operator assigns by hand:
 *
 *   FREE / STARTER / PROFESSIONAL   public, in ascending order
 *   ENTERPRISE                      negotiated per customer, off the menu
 *   GRANDFATHERED                   migration artifact, retired
 *
 * TRIAL is NOT a plan. `trialDays` on a paid plan already opens the
 * subscription in TRIALING with a trialEndsAt (see buildInitialSubscription),
 * so a separate free plan for trialling is both redundant and — because a plan
 * with unset limits means unlimited — a way to get the product for nothing.
 *
 * ── Every limit must be monotonic across FREE -> STARTER -> PROFESSIONAL ──
 * A cheaper plan that grants MORE of anything is a reason not to buy the
 * dearer one. This went wrong once already: STARTER was edited in the console
 * with only its seat count filled in, and the blank limits resolved to
 * unlimited, leaving the ₹2,000 plan strictly more generous than the ₹6,000 one
 * on leads, prospects, quotations and items. Keep the ladder ordered, and keep
 * `null` (unlimited) out of the public plans entirely.
 */
export const PLAN_SEEDS: PlanSeed[] = [
  {
    code: "MONTHLY",
    slug: "monthly",
    name: "Monthly Plan",
    description: "Full CRM access with all features, billed monthly.",
    priceMinor: 59900, // ₹599/month (59,900 paise)
    billingCycle: "MONTHLY",
    trialDays: 0,
    sortOrder: 1,
    isActive: true,
    isPublic: true,
    features: {
      MAX_USERS: null,
      MAX_LEADS: null,
      MAX_PROSPECTS: null,
      MAX_QUOTATIONS: null,
      MAX_ITEMS: null,
      AUDIT_LOG_ACCESS: true,
      ANNOUNCEMENTS: true,
      QUOTATION_PDF: true,
    },
  },
  {
    code: "ANNUAL",
    slug: "annual",
    name: "Annual Plan",
    description: "Full CRM access with all features, billed annually (₹499/month).",
    priceMinor: 598800, // ₹5,988/year (₹499/month × 12 months = 598,800 paise)
    billingCycle: "YEARLY",
    trialDays: 0,
    sortOrder: 2,
    isActive: true,
    isPublic: true,
    features: {
      MAX_USERS: null,
      MAX_LEADS: null,
      MAX_PROSPECTS: null,
      MAX_QUOTATIONS: null,
      MAX_ITEMS: null,
      AUDIT_LOG_ACCESS: true,
      ANNOUNCEMENTS: true,
      QUOTATION_PDF: true,
    },
  },
];
