import { z } from "zod";
import {
  passwordRegex,
  passwordRuleMessage,
  mobileRegex,
} from "../constants";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters long"),
});

export const SignupSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters long")
      .max(80, "First name cannot exceed 80 characters"),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters long")
      .max(80, "Last name cannot exceed 80 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Work email is required")
      .email("Invalid work email address"),
    companyName: z
      .string()
      .trim()
      .min(2, "Company name must be at least 2 characters long")
      .max(120, "Company name cannot exceed 120 characters"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters long")
      .regex(passwordRegex, passwordRuleMessage),
  })
  .strict();

export const SignupRequestSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters long")
      .max(80, "First name cannot exceed 80 characters"),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters long")
      .max(80, "Last name cannot exceed 80 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Work email is required")
      .email("Invalid work email address"),
    phone: z
      .string()
      .regex(mobileRegex, "Invalid phone number")
      .optional()
      .or(z.literal("")),
    companyName: z
      .string()
      .trim()
      .min(2, "Company name must be at least 2 characters long")
      .max(120, "Company name cannot exceed 120 characters"),
  })
  .strict();

const mobileSchema = z
  .union([
    z.string().regex(mobileRegex, "Invalid mobile number"),
    z.string().length(0).transform(() => null),
    z.null(),
  ])
  .optional();

export const UpdateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters long")
    .optional(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters long")
    .optional(),
  mobile: mobileSchema,
  profileImage: z.string().optional().nullable(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().nonempty("Current password is required"),
    newPassword: z
      .string()
      .nonempty("New password is required")
      .min(8, "New password must be at least 8 characters long")
      .regex(passwordRegex, passwordRuleMessage),
    confirmPassword: z.string().nonempty("Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password must match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const ForgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Invalid email address"),
  })
  .strict();

export const ResetPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Invalid email address"),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "OTP must be a 6-digit code"),
    newPassword: z
      .string()
      .nonempty("New password is required")
      .min(8, "New password must be at least 8 characters long")
      .max(128, "New password cannot exceed 128 characters")
      .regex(passwordRegex, passwordRuleMessage),
    confirmPassword: z
      .string()
      .nonempty("Confirm password is required")
      .max(128, "Confirm password cannot exceed 128 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password must match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type SignupRequestInput = z.infer<typeof SignupRequestSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
