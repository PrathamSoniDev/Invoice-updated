import { z } from 'zod';
import { commonValidators } from './common.validator';

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  hsnCode: z.string().max(20).optional(),
  quantity: z.number().positive('Quantity must be positive'),
  rate: z.number().positive('Rate must be positive'),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  placeOfSupply: z.string().max(100).optional(),
  reverseCharge: z.boolean().default(false),
}).refine(data => data.dueDate >= data.issueDate, {
  message: 'Due date must be after or equal to issue date',
  path: ['dueDate'],
});

export const updateInvoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required').optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  placeOfSupply: z.string().max(100).optional(),
  reverseCharge: z.boolean().optional(),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const invoiceNumberSchema = z.object({
  prefix: z.string().min(1).max(10).default('INV'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
