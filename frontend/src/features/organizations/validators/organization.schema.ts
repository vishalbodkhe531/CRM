import { z } from "zod";
import {
  CreateOrganizationSchema as SharedCreateOrganizationSchema,
  UpdateOrganizationSchema as SharedUpdateOrganizationSchema,
} from "@/contracts/validation";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const dateInputSchema = z.string().trim().refine((val) => !isNaN(Date.parse(val)), {
  message: "Invalid date",
});

export const createOrganizationSchema = SharedCreateOrganizationSchema
  .omit({ dateOfRegistration: true })
  .extend({
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((val) => val === "" || GSTIN_REGEX.test(val), "Invalid GSTIN format")
      .optional(),
    dateOfRegistration: dateInputSchema,
  });

export const updateOrganizationSchema = SharedUpdateOrganizationSchema
  .omit({ dateOfRegistration: true })
  .extend({
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((val) => val === "" || GSTIN_REGEX.test(val), "Invalid GSTIN format")
      .optional(),
    dateOfRegistration: dateInputSchema.optional(),
  });

export const organizationFormSchema = updateOrganizationSchema.extend({
  // Optional at the shared-editor-type level so edit mode (which never sends it)
  // stays valid; the create path uses createOrganizationSchema, where planId is
  // required. The create form additionally guards the empty string below.
  planId: z
    .string()
    .uuid("Select a subscription plan")
    .or(z.literal(""))
    .optional(),
  adminEmail: z.union([
    z.literal(""),
    z.string().trim().email("Invalid admin email"),
  ]).optional(),
  adminPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .or(z.literal(""))
    .optional(),
  adminFirstName: z
    .string()
    .trim()
    .min(1, "First name required")
    .or(z.literal(""))
    .optional(),
  adminLastName: z
    .string()
    .trim()
    .min(1, "Last name required")
    .or(z.literal(""))
    .optional(),
  adminMobile: z.union([
    z.literal(""),
    z.string().trim().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  ]).optional(),
});

export type OrganizationFormState = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationFormState = z.infer<typeof updateOrganizationSchema>;
export type OrganizationEditorState = z.infer<typeof organizationFormSchema>;
