import { z } from 'zod';

// Strong password validation for enterprise security
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const signupSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const requestEmailOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token must be a non-empty string').optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RequestEmailOtpInput = z.infer<typeof requestEmailOtpSchema>;
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
