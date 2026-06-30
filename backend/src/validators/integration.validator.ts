import { z } from 'zod';

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(255),
  provider: z.enum(['TALLY', 'BUSY', 'ZOHO_BOOKS', 'MARG', 'SAP', 'DYNAMICS', 'QUICKBOOKS', 'XERO']),
  description: z.string().max(2000).optional(),
  config: z.record(z.unknown()),
  syncOptions: z.object({
    customers: z.boolean().default(false),
    invoices: z.boolean().default(false),
    products: z.boolean().default(false),
    taxes: z.boolean().default(false),
    payments: z.boolean().default(false),
    chartOfAccounts: z.boolean().default(false),
  }).default({
    customers: false,
    invoices: false,
    products: false,
    taxes: false,
    payments: false,
    chartOfAccounts: false,
  }),
});

export const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  config: z.record(z.unknown()).optional(),
  syncOptions: z.object({
    customers: z.boolean().optional(),
    invoices: z.boolean().optional(),
    products: z.boolean().optional(),
    taxes: z.boolean().optional(),
    payments: z.boolean().optional(),
    chartOfAccounts: z.boolean().optional(),
  }).optional(),
});

export const startSyncSchema = z.object({
  syncType: z.enum(['manual', 'scheduled']).default('manual'),
  entityTypes: z.array(z.string()).min(1),
});

export const integrationQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING']).optional(),
  provider: z.enum(['all', 'TALLY', 'BUSY', 'ZOHO_BOOKS', 'MARG', 'SAP', 'DYNAMICS', 'QUICKBOOKS', 'XERO']).optional(),
});

export const logQuerySchema = z.object({
  level: z.enum(['all', 'info', 'warn', 'error']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const syncHistoryQuerySchema = z.object({
  entityType: z.string().optional(),
  status: z.enum(['all', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
export type StartSyncInput = z.infer<typeof startSyncSchema>;
