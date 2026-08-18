import { z } from "zod";
import { PLAN_INTERVALS, SUBSCRIPTION_STATUSES } from "../types/billing.types";

/**
 * Form-side schemas for the super-admin billing console.
 *
 * Numeric and date fields are kept as STRINGS because that is what the inputs
 * produce; they are converted at submit time. Binding a number to an input makes
 * clearing it produce NaN, and binding a Date to a date input fights the
 * browser's local formatting on every render.
 */

const PlanIntervalEnum = z.enum(PLAN_INTERVALS);
const SubscriptionStatusEnum = z.enum(SUBSCRIPTION_STATUSES);

/** Blank means "unlimited"; anything else must be a non-negative whole number. */
const optionalLimitString = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d+$/.test(value),
    "Enter a whole number, or leave blank for unlimited",
  );

/**
 * One row of the feature editor.
 *
 * Both value shapes are carried because a single form renders limits and
 * toggles together; which one is used is decided by the key's `kind`, which the
 * server supplies.
 */
export const FeatureFieldSchema = z.object({
  featureKey: z.string(),
  kind: z.enum(["limit", "toggle"]),
  /** Limit rows. "" = unlimited. */
  limitValue: optionalLimitString,
  /** Toggle rows. */
  toggleValue: z.boolean(),
  /** Override rows only: is this key overridden at all? */
  enabled: z.boolean().optional(),
  note: z.string().trim().max(300).optional(),
});

export type FeatureFieldValues = z.infer<typeof FeatureFieldSchema>;

export const PlanFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(40)
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers and underscores only"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  name: z.string().trim().min(2, "Name is required").max(80),
  description: z.string().trim().max(500).optional(),
  /**
   * Entered in RUPEES for the operator's sanity — nobody wants to type 200000
   * for ₹2,000. Converted to paise at submit; see toPaise().
   */
  priceRupees: z
    .string()
    .trim()
    .refine(
      (value) => /^\d+(\.\d{1,2})?$/.test(value),
      "Enter an amount like 2000 or 1999.50",
    ),
  billingCycle: PlanIntervalEnum,
  trialDays: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), "Enter a whole number of days")
    .refine((value) => Number(value) <= 365, "Trial cannot exceed 365 days"),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), "Enter a whole number"),
  features: z.array(FeatureFieldSchema),
});

export type PlanFormValues = z.infer<typeof PlanFormSchema>;

export const SubscriptionFormSchema = z
  .object({
    planId: z.string().min(1, "Select a plan"),
    status: SubscriptionStatusEnum,
    trialEndsAt: z.string(),
    currentPeriodStart: z.string(),
    currentPeriodEnd: z.string(),
    cancelAtPeriodEnd: z.boolean(),
    billingEmail: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || z.string().email().safeParse(value).success,
        "Enter a valid email address",
      ),
    billingNotes: z.string().trim().max(2000),
  })
  .refine(
    (value) =>
      !value.currentPeriodStart ||
      !value.currentPeriodEnd ||
      new Date(value.currentPeriodStart) < new Date(value.currentPeriodEnd),
    { message: "Period end must be after period start", path: ["currentPeriodEnd"] },
  )
  .refine(
    // A trial with no end date never expires, which is almost never intended.
    (value) => value.status !== "TRIALING" || value.trialEndsAt !== "",
    { message: "A trial needs an end date, or it never expires", path: ["trialEndsAt"] },
  );

export type SubscriptionFormValues = z.infer<typeof SubscriptionFormSchema>;

export const FeatureOverridesFormSchema = z.object({
  features: z.array(FeatureFieldSchema),
});

export type FeatureOverridesFormValues = z.infer<
  typeof FeatureOverridesFormSchema
>;

/**
 * Rupees → paise.
 *
 * Multiplying a float by 100 can land on 199998.99999 for "1999.99", so round.
 * Never store the unrounded product.
 */
export const toPaise = (rupees: string): number =>
  Math.round(Number(rupees) * 100);

/** Paise → the rupee string the form input expects. */
export const toRupeeInput = (priceMinor: number): string => {
  const rupees = priceMinor / 100;
  return rupees % 1 === 0 ? String(rupees) : rupees.toFixed(2);
};

/** "" means unlimited, which the API represents as null. */
export const toNullableNumber = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

/** ISO timestamp → the `yyyy-MM-dd` a date input expects, in LOCAL time. */
export const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Date input → ISO, or null when cleared. */
export const fromDateInput = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;
