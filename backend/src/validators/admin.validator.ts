import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER']).default('STAFF'),
  phone: z.string().max(20).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER']).optional(),
  phone: z.string().max(20).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateModuleSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateModuleRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER']),
  permissions: z.object({
    canRead: z.boolean().default(true),
    canCreate: z.boolean().default(false),
    canUpdate: z.boolean().default(false),
    canDelete: z.boolean().default(false),
    canExport: z.boolean().default(false),
    canConfigure: z.boolean().default(false),
  }),
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'ACTIVE', 'SUSPENDED', 'INVITED', 'INACTIVE']).optional(),
  role: z.enum(['all', 'ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditLogQuerySchema = z.object({
  search: z.string().optional(),
  action: z.enum(['all', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'SETTINGS', 'VIEW']).optional(),
  module: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const activityLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type UpdateModuleRoleInput = z.infer<typeof updateModuleRoleSchema>;
