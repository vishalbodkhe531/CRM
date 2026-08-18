import { z } from "zod";

/**
 * Every field is optional: the console sends only what changed, so a PATCH that
 * omits a key must leave it alone rather than clearing it.
 *
 * Nullable where the model is nullable, because "no support phone" and "do not
 * change the support phone" are different instructions — null clears, absent
 * keeps.
 */
export const UpdatePlatformSettingsSchema = z
  .object({
    platformName: z.string().trim().min(1).max(60).optional(),

    supportEmail: z
      .string()
      .trim()
      .email("supportEmail must be a valid email address")
      .max(200)
      .nullable()
      .optional(),

    supportPhone: z.string().trim().min(4).max(30).nullable().optional(),

    /**
     * Bounded below at 30 days so a stray small value cannot quietly shred the
     * compliance trail, and above at ~10 years to keep the purge job's work
     * finite. Null keeps everything.
     */
    auditRetentionDays: z
      .number()
      .int()
      .min(30, "Retention must be at least 30 days")
      .max(3650, "Retention cannot exceed 3650 days")
      .nullable()
      .optional(),

    defaultPlanId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export type UpdatePlatformSettingsInput = z.infer<
  typeof UpdatePlatformSettingsSchema
>;
