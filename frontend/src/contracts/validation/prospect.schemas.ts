import { z } from "zod";
import {
  PROSPECT_ACTIVITY_TYPE_VALUES,
  PROSPECT_FOLLOW_UP_TYPE_VALUES,
  PROSPECT_REMINDER_VALUES,
  PROSPECT_STAGE_VALUES,
} from "../constants";

const ProspectStageEnum = z.enum(PROSPECT_STAGE_VALUES);
const ProspectFollowUpTypeEnum = z.enum(PROSPECT_FOLLOW_UP_TYPE_VALUES);
const ProspectReminderEnum = z.enum(PROSPECT_REMINDER_VALUES);
const ProspectActivityTypeEnum = z.enum(PROSPECT_ACTIVITY_TYPE_VALUES);

const OptionalDateString = z.string().datetime().optional().nullable();
const OptionalText = z.string().trim().optional().nullable();
const OptionalUuid = z.string().uuid().optional().nullable();

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

export const ProspectFilterSchema = z.object({
  stage: z.preprocess(
    parseQueryArray,
    z.union([ProspectStageEnum, z.array(ProspectStageEnum)]).optional(),
  ),
  assignedToId: z.preprocess(
    parseQueryArray,
    z.union([z.string().uuid(), z.array(z.string().uuid())]).optional(),
  ),
  search: z.string().trim().min(3).optional(),
  createdFrom: z.string().date().optional(),
  createdTo: z.string().date().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).optional().default(10),
  status: z.preprocess(
    parseQueryArray,
    z.union([z.enum(["ACTIVE", "INACTIVE"]), z.array(z.enum(["ACTIVE", "INACTIVE"]))]).optional(),
  ),
});

export const ProspectFollowUpSchema = z.object({
  date: z.string().date().optional().nullable(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format")
    .optional()
    .nullable(),
  type: ProspectFollowUpTypeEnum.optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  reminder: ProspectReminderEnum.optional().nullable(),
  assignedToId: OptionalUuid,
});

const ProspectBaseFieldsSchema = z.object({
  stage: ProspectStageEnum.optional().default("REQUIREMENT"),
  expectedValue: z.number().min(0).optional().nullable(),
  closeDate: OptionalDateString,
  notes: OptionalText,
  assignedToId: OptionalUuid,
  followUp: ProspectFollowUpSchema.optional().nullable(),
});

export const ConvertLeadToProspectSchema = ProspectBaseFieldsSchema.extend({
  leadId: z.string().uuid(),
});

export const ConvertLeadToProspectFromLeadSchema =
  ProspectBaseFieldsSchema;

export const UpdateProspectSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  mobile: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Phone number must be 10-15 digits"),
  companyName: z.string().trim().min(1).max(150),
  expectedValue: z.number().min(0).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  assignedToId: OptionalUuid,
});

export const UpdateProspectStageSchema = z.object({
  stage: ProspectStageEnum,
  comment: z.string().trim().min(10).max(500),
});

export const UpdateProspectFollowUpSchema = ProspectFollowUpSchema.superRefine(
  (value, ctx) => {
    if (!value.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Next follow-up date is required",
        path: ["date"],
      });
    }

    if (!value.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up type is required",
        path: ["type"],
      });
    }
  },
);

export const CreateProspectActivitySchema = z.object({
  type: ProspectActivityTypeEnum.extract(["CALL", "MEETING", "EMAIL"]),
  occurredAt: z.string().datetime(),
  title: z.string().trim().min(1).max(150),
  outcome: z.string().trim().max(150).optional().nullable(),
  durationMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  attendees: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ProspectFilterInput = z.infer<typeof ProspectFilterSchema>;
export type ConvertLeadToProspectInput = z.infer<
  typeof ConvertLeadToProspectSchema
>;
export type ConvertLeadToProspectFromLeadInput = z.infer<
  typeof ConvertLeadToProspectFromLeadSchema
>;
export type UpdateProspectInput = z.infer<typeof UpdateProspectSchema>;
export type UpdateProspectStageInput = z.infer<
  typeof UpdateProspectStageSchema
>;
export type UpdateProspectFollowUpInput = z.infer<
  typeof UpdateProspectFollowUpSchema
>;
export type CreateProspectActivityInput = z.infer<
  typeof CreateProspectActivitySchema
>;
