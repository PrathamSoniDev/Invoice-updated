import { z } from 'zod';

export const commonValidators = {
  id: z.string().uuid('Invalid ID format'),
  email: z.string().email('Invalid email format').toLowerCase(),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/, 'Invalid GST number format')
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format')
    .optional()
    .or(z.literal('')),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid pincode'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().nonnegative('Must be non-negative'),
  currency: z.enum(['INR', 'USD', 'EUR'], { errorMap: () => ({ message: 'Invalid currency' }) }),
  date: z.string().datetime({ message: 'Invalid date format' }).or(z.date()),
  optionalString: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
};

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
