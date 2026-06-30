import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['TSX', 'HTML', 'JSON']),
  version: z.string().max(20).optional(),
  content: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'DRAFT']).default('DRAFT'),
  isDefault: z.boolean().default(false),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'DRAFT']).optional(),
});

export const templateQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'ACTIVE', 'DISABLED', 'DRAFT']).optional(),
  type: z.enum(['all', 'TSX', 'HTML', 'JSON']).optional(),
});

export const userAssignmentSchema = z.object({
  userId: z.string().uuid(),
  templateId: z.string().uuid().nullable(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type UserAssignmentInput = z.infer<typeof userAssignmentSchema>;
