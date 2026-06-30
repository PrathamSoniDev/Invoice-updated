import { z } from 'zod';
import { commonValidators } from './common.validator';

export const loginSchema = z.object({
  email: commonValidators.email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: commonValidators.email,
  password: commonValidators.password,
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER']).optional(),
  phone: commonValidators.phone.optional().or(z.literal('')),
  companyId: z.string().uuid().optional(),
});

export const forgotPasswordSchema = z.object({
  email: commonValidators.email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: commonValidators.password,
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: commonValidators.password,
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: commonValidators.phone.optional().or(z.literal('')),
  avatar: z.string().url().optional().or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
