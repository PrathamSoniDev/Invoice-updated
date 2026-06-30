import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']),
  subject: z.string().max(500).optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const sendEmailSchema = z.object({
  recipient: z.string().email(),
  recipientName: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  templateId: z.string().uuid().optional(),
  templateName: z.string().max(255).optional(),
  relatedType: z.string().max(50).optional(),
  relatedId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

export const sendWhatsAppSchema = z.object({
  recipient: z.string().min(1).max(50),
  recipientName: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  templateId: z.string().uuid().optional(),
  templateName: z.string().max(255).optional(),
  relatedType: z.string().max(50).optional(),
  relatedId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

export const logQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  channel: z.enum(['all', 'WHATSAPP', 'EMAIL', 'SMS']).optional(),
  status: z.enum(['all', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type SendWhatsAppInput = z.infer<typeof sendWhatsAppSchema>;
export type LogQueryInput = z.infer<typeof logQuerySchema>;
