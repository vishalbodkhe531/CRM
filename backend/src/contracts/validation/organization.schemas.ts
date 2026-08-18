import { z } from "zod";
import {
  ORGANIZATION_STATUS_FILTER_VALUES,
  ORGANIZATION_STATUS_VALUES,
  ORGANIZATION_TYPE_VALUES,
  passwordRegex,
  passwordRuleMessage,
} from "../constants";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const OrganizationStatusEnum = z.enum(ORGANIZATION_STATUS_VALUES);
/** Read-only filter enum — includes the virtual "ARCHIVED" value. */
const OrganizationStatusFilterEnum = z.enum(ORGANIZATION_STATUS_FILTER_VALUES);
const OrganizationTypeEnum = z.enum(ORGANIZATION_TYPE_VALUES);

export const OrganizationSlugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug can only contain lowercase letters, numbers, and hyphens",
  );

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

const OrganizationBaseSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  slug: OrganizationSlugSchema,
  prefix: z
    .string()
    .min(2, "Prefix must be at least 2 characters")
    .max(10, "Prefix cannot exceed 10 characters")
    .regex(
      /^[A-Z0-9]+$/,
      "Prefix can only contain uppercase letters and numbers",
    )
    .transform((val) => val.toUpperCase()),
  status: OrganizationStatusEnum.optional(),
  authorizedPerson: z.string().min(2, "Authorized person is required"),
  orgType: OrganizationTypeEnum,
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Mobile must be a valid 10-digit number"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => val === "" || GSTIN_REGEX.test(val),
      "GSTIN format is invalid",
    )
    .optional(),
  address: z.string().min(2, "Address is required"),
  dateOfRegistration: z.coerce.date(),
  email: z.string().email("Invalid email"),
  remark: z.string().max(500, "Remark cannot exceed 500 characters").optional(),
});

const OrganizationAdminSchema = z.object({
  adminEmail: z.string().email("Invalid admin email"),
  adminPassword: z
    .string()
    .min(8, "Admin password must be at least 8 characters long")
    .regex(passwordRegex, passwordRuleMessage),
  adminFirstName: z.string().min(2, "Admin first name is required"),
  adminLastName: z.string().min(2, "Admin last name is required"),
  adminMobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Admin mobile must be a valid 10-digit number"),
});

/**
 * Plan is chosen at creation and only at creation: a super-admin picks the plan
 * the new organization opens its subscription on. Plan CHANGES afterwards go
 * through the billing console, never the org update form — so this is merged
 * into Create only and is deliberately absent from Update.
 *
 * Optional: omitting it falls back to PlatformSetting.defaultPlanId, which is
 * what makes that setting mean anything and lets a scripted or API-driven
 * onboarding create an organization without naming a plan. The console still
 * asks explicitly — a plan carries a price, and picking one on purpose is worth
 * the extra click.
 */
const OrganizationPlanSchema = z.object({
  planId: z.string().uuid("A valid plan must be selected").optional(),
});

export const CreateOrganizationSchema = OrganizationBaseSchema.merge(
  OrganizationAdminSchema,
).merge(OrganizationPlanSchema);

export const UpdateOrganizationSchema = OrganizationBaseSchema.partial();

export const OrganizationSlugParamSchema = z.object({
  slug: OrganizationSlugSchema,
});

export const OrganizationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.preprocess(
    parseQueryArray,
    z
      .union([
        OrganizationStatusFilterEnum,
        z.array(OrganizationStatusFilterEnum),
      ])
      .optional(),
  ),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export type OrganizationFilterInput = z.infer<typeof OrganizationFilterSchema>;
