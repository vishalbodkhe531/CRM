import { z } from "zod";
import {
  LEAD_INDUSTRY_VALUES,
  LEAD_SOURCE_VALUES,
  LEAD_STATUS_VALUES,
  LEAD_TYPE_VALUES,
} from "../constants";

const LeadSourceEnum = z.enum(LEAD_SOURCE_VALUES);
const LeadIndustryEnum = z.enum(LEAD_INDUSTRY_VALUES);
const LeadTypeEnum = z.enum(LEAD_TYPE_VALUES);
const LeadStatusEnum = z.enum(LEAD_STATUS_VALUES);

export const CreateLeadSchema = z.object({
  firstName: z.string().max(20, "Max 20 characters").min(1, "First Name is required"),
  lastName: z
    .string()
    .min(2, "Min 2 characters")
    .max(100, "Max 100 characters")
    .regex(/^[A-Za-z]+$/, "Only letters allowed"),
  profilePicture: z.string().optional().nullable(),
  mobile: z
    .string()
    .regex(/^[0-9]{10}$/, "Enter valid mobile number")
    .optional()
    .nullable(),
  alternateMobile: z
    .string()
    .regex(/^[0-9]{10}$/, "Enter valid mobile number")
    .optional()
    .nullable(),
  companyName: z
    .string()
    .min(1, "Min 1 character")
    .max(100, "Max 100 characters")
    .optional()
    .nullable(),
  gstin: z.string().max(20, "Max 20 characters").optional().nullable(),
  email: z.string().email("Enter valid email address").optional().nullable(),
  website: z.string().url("Enter only URL format").optional().nullable(),
  linkedInProfile: z.string().url("Enter only URL format").optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pinCode: z.string().regex(/^[0-9]{6}$/, "Must be 6 digits").optional().nullable(),
  source: LeadSourceEnum.optional().nullable(),
  industry: LeadIndustryEnum.optional().nullable(),
  customIndustry: z.string().optional().nullable(),
  leadType: LeadTypeEnum.optional().nullable(),
  productInterested: z.string().uuid().optional().nullable(),
  requiredDescription: z.string().optional().nullable(),
  status: LeadStatusEnum.optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  createdAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export const UpdateLeadSchema = CreateLeadSchema.partial();

export const UpdateLeadStatusSchema = z.object({
  status: LeadStatusEnum,
});

export const AssignLeadSchema = z.object({
  executiveId: z.string().min(1, "Please select an executive"),
});

export const LeadFilterSchema = z.object({
  status: z.union([LeadStatusEnum, z.array(LeadStatusEnum)]).optional(),
  source: z.union([LeadSourceEnum, z.array(LeadSourceEnum)]).optional(),
  industry: z.union([LeadIndustryEnum, z.array(LeadIndustryEnum)]).optional(),
  productInterested: z.union([z.string(), z.array(z.string())]).optional(),
  assignedToId: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusSchema>;
export type AssignLeadInput = z.infer<typeof AssignLeadSchema>;
export type LeadFilterInput = z.infer<typeof LeadFilterSchema>;
