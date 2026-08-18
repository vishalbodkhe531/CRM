import { z } from "zod";
import {
  LEAD_INDUSTRY_VALUES,
  LEAD_SOURCE_VALUES,
  LEAD_STATUS_VALUES,
  LEAD_TYPE_VALUES,
} from "@/contracts/constants";
import { CreateLeadSchema as SharedCreateLeadSchema } from "@/contracts/validation";

const optionalTextField = z.string().optional().or(z.literal(""));
const optionalUuidField = z.string().uuid().optional().or(z.literal(""));
const optionalUrlField = z.string().url("Enter only URL format").optional().or(z.literal(""));
const optionalMobileField = z
  .string()
  .regex(/^[0-9]{10}$/, "Enter valid mobile number")
  .optional()
  .or(z.literal(""));

export const createLeadSchema = SharedCreateLeadSchema.extend({
  mobile: optionalMobileField,
  email: z.string().email("Enter valid email address").optional().or(z.literal("")),
  profilePicture: optionalTextField,
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(100, "Max 100 characters"),
  gstin: optionalTextField,
  alternateMobile: optionalMobileField,
  website: optionalUrlField,
  linkedInProfile: optionalUrlField,
  address: optionalTextField,
  city: optionalTextField,
  state: optionalTextField,
  pinCode: z.string().regex(/^[0-9]{6}$/, "Must be 6 digits").optional().or(z.literal("")),
  source: z.enum(LEAD_SOURCE_VALUES),
  industry: z.enum(LEAD_INDUSTRY_VALUES).optional().or(z.literal("")),
  customIndustry: z.string().optional().or(z.literal("")),
  leadType: z.enum(LEAD_TYPE_VALUES),
  productInterested: optionalUuidField,
  assignedToId: optionalUuidField,
  requiredDescription: optionalTextField,
  status: z.enum(LEAD_STATUS_VALUES).optional().or(z.literal("")),
});

export const updateLeadSchema = createLeadSchema.partial();

export type CreateLeadForm = z.infer<typeof createLeadSchema>;
export type UpdateLeadForm = z.infer<typeof updateLeadSchema>;
