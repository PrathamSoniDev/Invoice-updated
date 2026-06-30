import { z } from 'zod';
import { commonValidators } from './common.validator';

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid('Invalid customer ID'),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'CASH', 'CHEQUE']),
  gateway: z.enum(['RAZORPAY', 'PAYTM']).optional(),
  transactionId: z.string().optional(),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createPaymentLinkSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  invoiceId: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive'),
  gateway: z.enum(['RAZORPAY', 'PAYTM']),
  description: z.string().max(500).optional(),
  expiryDays: z.number().int().min(1).max(30).default(7),
});

export const paymentLinkQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'EXPIRED']).optional(),
  customerId: z.string().uuid().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const razorpayCredentialsSchema = z.object({
  keyId: z.string().min(1, 'Key ID is required'),
  keySecret: z.string().min(1, 'Key Secret is required'),
  webhookSecret: z.string().optional(),
});

export const paytmCredentialsSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  merchantKey: z.string().min(1, 'Merchant Key is required'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;
export type PaymentLinkQueryInput = z.infer<typeof paymentLinkQuerySchema>;
