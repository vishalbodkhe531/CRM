import { SignupRequestStatus } from "@prisma/client";
import { z } from "zod";

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

const SignupRequestStatusEnum = z.enum(SignupRequestStatus);
const ReviewableSignupRequestStatusEnum = z.enum([
  SignupRequestStatus.CONTACTED,
  SignupRequestStatus.APPROVED,
  SignupRequestStatus.REJECTED,
]);

export const SignupRequestListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.preprocess(
    parseQueryArray,
    z
      .union([
        SignupRequestStatusEnum,
        z.array(SignupRequestStatusEnum),
      ])
      .optional(),
  ),
});

export const SignupRequestStatusUpdateSchema = z
  .object({
    status: ReviewableSignupRequestStatusEnum,
    adminNotes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export type SignupRequestListInput = z.infer<typeof SignupRequestListSchema>;
export type SignupRequestStatusUpdateInput = z.infer<
  typeof SignupRequestStatusUpdateSchema
>;
