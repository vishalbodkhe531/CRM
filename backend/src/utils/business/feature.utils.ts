import {
  FEATURE_DEFINITIONS,
  type FeatureKey,
} from "../../contracts/constants";

/**
 * Feature resolution.
 *
 * Precedence, highest first:
 *
 *   1. SubscriptionFeatureOverride  — this organization's negotiated terms
 *   2. PlanFeature                  — what the plan says
 *   3. FEATURE_DEFINITIONS default  — the code-side fallback
 *
 * The override layer is what lets an enterprise deal say "Growth plan but 200
 * seats" without forking a plan, which is how catalogues fill up with
 * one-customer plans nobody dares edit.
 *
 * Pure and Prisma-independent so it can be exercised without a database.
 */

export interface FeatureValueRow {
  featureKey: string;
  valueInt: number | null;
  valueBool: boolean | null;
}

export interface FeatureSource {
  /** Rows from the subscription's plan. */
  planFeatures: FeatureValueRow[];
  /** Rows overriding the plan for this organization. */
  overrides?: FeatureValueRow[];
}

/** Where a resolved value came from. Surfaced in the console so terms are traceable. */
export type FeatureOrigin = "override" | "plan" | "default";

export interface ResolvedLimit {
  key: FeatureKey;
  /** null = unlimited. Never coerce to 0 — that would mean "none allowed". */
  value: number | null;
  origin: FeatureOrigin;
}

export interface ResolvedToggle {
  key: FeatureKey;
  value: boolean;
  origin: FeatureOrigin;
}

const findRow = (rows: FeatureValueRow[] | undefined, key: FeatureKey) =>
  rows?.find((row) => row.featureKey === key);

/**
 * Resolve a numeric limit.
 *
 * A row that EXISTS with a null valueInt means "unlimited" and is a real answer,
 * so presence is tested rather than truthiness — otherwise an explicit
 * "unlimited" override would fall through to the plan's number and silently
 * re-impose a limit the customer negotiated away.
 */
export const resolveLimit = (
  source: FeatureSource,
  key: FeatureKey,
): ResolvedLimit => {
  const definition = FEATURE_DEFINITIONS[key];

  if (definition.kind !== "limit") {
    throw new Error(`Feature ${key} is a toggle, not a limit`);
  }

  const override = findRow(source.overrides, key);
  if (override) {
    return { key, value: override.valueInt, origin: "override" };
  }

  const planFeature = findRow(source.planFeatures, key);
  if (planFeature) {
    return { key, value: planFeature.valueInt, origin: "plan" };
  }

  return {
    key,
    value: (definition.defaultValue as number | null) ?? null,
    origin: "default",
  };
};

/**
 * Resolve a boolean toggle.
 *
 * A row with a null valueBool is treated as absent: null is "not set here", not
 * "off". Reading it as false would disable a feature the moment somebody cleared
 * a field.
 */
export const resolveToggle = (
  source: FeatureSource,
  key: FeatureKey,
): ResolvedToggle => {
  const definition = FEATURE_DEFINITIONS[key];

  if (definition.kind !== "toggle") {
    throw new Error(`Feature ${key} is a limit, not a toggle`);
  }

  const override = findRow(source.overrides, key);
  if (override && override.valueBool !== null) {
    return { key, value: override.valueBool, origin: "override" };
  }

  const planFeature = findRow(source.planFeatures, key);
  if (planFeature && planFeature.valueBool !== null) {
    return { key, value: planFeature.valueBool, origin: "plan" };
  }

  return {
    key,
    value: Boolean(definition.defaultValue),
    origin: "default",
  };
};

/** True when usage has reached the limit. Unlimited is never at limit. */
export const isAtLimit = (limit: number | null, used: number): boolean =>
  limit !== null && used >= limit;
