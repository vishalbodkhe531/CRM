import { z } from "zod";
import {
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
} from "../constants/billing.constants";
import {
  FEATURE_DEFINITIONS,
  FEATURE_KEYS,
  type FeatureKey,
} from "../constants/feature.constants";

const PlanIntervalEnum = z.enum(PLAN_INTERVALS);
const SubscriptionStatusEnum = z.enum(SUBSCRIPTION_STATUSES);
const FeatureKeyEnum = z.enum(FEATURE_KEYS);

/** Mirrors the query-array handling used by AuditLogFilterSchema. */
const parseQueryArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      typeof entry === "string"
        ? entry.split(",").map((part) => part.trim()).filter(Boolean)
        : [],
    );
  }

  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  }

  return value;
};

/**
 * Money is an integer count of paise.
 *
 * `.int()` is the whole point: accepting 199.99 here would store a rupee value
 * in a paise column and undercharge by a factor of 100.
 */
const priceMinor = z
  .number()
  .int("Price must be a whole number of paise")
  .min(0, "Price cannot be negative");

/**
 * One feature value.
 *
 * The key is constrained to FEATURE_KEYS, so an operator can never invent a key
 * from the UI — that is exactly what would unhook enforcement code silently.
 * The value shape is then checked against the key's declared kind: a limit must
 * carry valueInt, a toggle must carry valueBool.
 */
const featureValueBase = z.object({
  featureKey: FeatureKeyEnum,
  /** null is meaningful for a limit: it means unlimited. */
  valueInt: z.number().int().min(0).nullable().optional(),
  valueBool: z.boolean().nullable().optional(),
});

/**
 * Enforce that the value matches the key's declared kind.
 *
 * Applied via superRefine rather than a plain refine so the error can point at
 * the offending field — being told "featureKey is invalid" when the real
 * problem is a missing valueInt sends people looking in the wrong place.
 */
const withKindCheck = <
  T extends z.ZodType<{
    featureKey: FeatureKey;
    valueInt?: number | null;
    valueBool?: boolean | null;
  }>,
>(
  schema: T,
) =>
  schema.superRefine((value, ctx) => {
    const definition = FEATURE_DEFINITIONS[value.featureKey];

    if (definition.kind === "limit" && value.valueInt === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `${value.featureKey} is a limit and needs valueInt (null means unlimited)`,
        path: ["valueInt"],
      });
    }

    if (definition.kind === "toggle" && value.valueBool === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `${value.featureKey} is a toggle and needs valueBool`,
        path: ["valueBool"],
      });
    }
  });

export const FeatureValueSchema = withKindCheck(featureValueBase);

/** Overrides carry a note explaining why this customer has different terms. */
export const FeatureOverrideSchema = withKindCheck(
  featureValueBase.extend({
    note: z.string().trim().max(300).optional().nullable(),
  }),
);

const uniqueFeatureKeys = <T extends { featureKey: string }>(rows: T[]) =>
  new Set(rows.map((row) => row.featureKey)).size === rows.length;

export const CreatePlanSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(
      /^[A-Z0-9_]+$/,
      "Code can only contain uppercase letters, numbers and underscores",
    ),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens")
    .optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  priceMinor: priceMinor.default(0),
  billingCycle: PlanIntervalEnum.default("MONTHLY"),
  trialDays: z.number().int().min(0).max(365).default(0),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  features: z
    .array(FeatureValueSchema)
    .default([])
    .refine(uniqueFeatureKeys, "Each feature may only appear once"),
});

/**
 * `code` is absent on purpose — renaming a plan's code would silently orphan
 * every seed, script and audit row that refers to it. Create a new plan instead.
 */
export const UpdatePlanSchema = CreatePlanSchema.omit({ code: true }).partial();

export const PlanFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  /** Super-admin only: include retired plans. */
  includeInactive: z.coerce.boolean().default(false),
  /** Super-admin only: include plans not offered to customers. */
  includePrivate: z.coerce.boolean().default(false),
});

/**
 * Super-admin assignment of a plan to an organization.
 *
 * Every field is optional so the console can change one thing at a time — for
 * example extending currentPeriodEnd after an offline bank transfer without
 * touching the plan.
 */
export const UpdateSubscriptionSchema = z
  .object({
    planId: z.string().uuid().optional(),
    status: SubscriptionStatusEnum.optional(),
    trialEndsAt: z.coerce.date().optional().nullable(),
    currentPeriodStart: z.coerce.date().optional(),
    currentPeriodEnd: z.coerce.date().optional().nullable(),
    cancelAtPeriodEnd: z.boolean().optional(),
    billingEmail: z.string().email().optional().nullable(),
    billingNotes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine(
    (value) =>
      !value.currentPeriodStart ||
      !value.currentPeriodEnd ||
      value.currentPeriodStart < value.currentPeriodEnd,
    {
      message: "Period end must be after period start",
      path: ["currentPeriodEnd"],
    },
  );

/**
 * Per-organization feature overrides.
 *
 * Sent as the COMPLETE set for that organization: keys omitted here are removed,
 * which is what makes "revert this customer to plan terms" expressible. A patch
 * semantic would leave no way to delete an override.
 */
export const UpdateFeatureOverridesSchema = z.object({
  overrides: z
    .array(FeatureOverrideSchema)
    .refine(uniqueFeatureKeys, "Each feature may only be overridden once"),
});

export const CancelSubscriptionSchema = z.object({
  /**
   * Default true — cancelling mid-period should not confiscate time the customer
   * already paid for. Set false only for a deliberate immediate termination.
   */
  atPeriodEnd: z.boolean().default(true),
  reason: z.string().trim().max(500).optional(),
});

/** Assign the first subscription to an organization that has none. */
export const AssignInitialPlanSchema = z.object({
  planId: z.string().uuid("A valid plan must be selected"),
});

export const SubscriptionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.preprocess(
    parseQueryArray,
    z.union([SubscriptionStatusEnum, z.array(SubscriptionStatusEnum)]).optional(),
  ),
  planId: z.string().uuid().optional(),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;
export type PlanFilterInput = z.infer<typeof PlanFilterSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type UpdateFeatureOverridesInput = z.infer<
  typeof UpdateFeatureOverridesSchema
>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
export type AssignInitialPlanInput = z.infer<typeof AssignInitialPlanSchema>;
export type SubscriptionFilterInput = z.infer<typeof SubscriptionFilterSchema>;
