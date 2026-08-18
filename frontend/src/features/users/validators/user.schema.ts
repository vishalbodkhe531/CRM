import { z } from "zod";
import { mobileRegex } from "@/contracts/constants";
import {
  CreateUserSchema as SharedCreateUserSchema,
  UpdateUserSchema as SharedUpdateUserSchema,
} from "@/contracts/validation";

export const userRoleSchema = z.enum(["ADMIN", "MANAGER", "EXECUTIVE"]);

const formOnlyFields = {
  role: userRoleSchema,
  mobile: z.string().regex(mobileRegex, "Mobile number must be 10 digits"),
  joiningDate: z.string().min(1, "Joining date is required"),
  employeeId: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
};

export const createUserSchema = SharedCreateUserSchema.extend({
  ...formOnlyFields,
  confirmPassword: z.string().min(1, "Please confirm your password"),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateUserSchema = SharedUpdateUserSchema.extend({
  ...formOnlyFields,
  role: userRoleSchema.optional(),
}).omit({ employeeId: true });

export type CreateUserForm = z.infer<typeof createUserSchema>;
export type UpdateUserForm = z.infer<typeof updateUserSchema>;
