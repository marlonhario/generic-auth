import { z } from "zod";
import type { PermissionString } from "./types";

const emailSchema = z.email({ message: "Must be a valid email address" });

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const registerInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

export const verifyEmailInputSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const permissionStringSchema = z
  .string()
  .regex(/^[^.\s]+\.[^.\s]+$/, 'Permissions must use "resource.action" format')
  .transform((value) => value as PermissionString);

export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;
