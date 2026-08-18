import { z } from "zod";
import {
  USER_ROLES,
  USER_STATUSES,
  passwordRegex,
  passwordRuleMessage,
} from "../constants";

export const RoleEnum = z.enum(USER_ROLES);
export const UserStatusEnum = z.enum(USER_STATUSES);

export const CreateUserSchema = z.object({
  role: RoleEnum,
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number").optional().nullable(),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, passwordRuleMessage),
  profileImage: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  joiningDate: z.union([z.coerce.date(), z.string()]).optional().nullable(),
  managerId: z.string().uuid("Invalid manager ID").optional().nullable(),
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  status: UserStatusEnum.optional(),
});

export const UserFilterSchema = z.object({
  role: z.union([RoleEnum, z.array(RoleEnum)]).optional(),
  status: z.union([UserStatusEnum, z.array(UserStatusEnum)]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).optional().default(10),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserFilterInput = z.infer<typeof UserFilterSchema>;
