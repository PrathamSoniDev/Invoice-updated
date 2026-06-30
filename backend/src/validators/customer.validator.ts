import { z } from 'zod';
import { commonValidators } from './common.validator';

const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: z.string().min(1, 'Pincode is required').max(10),
  country: z.string().max(100).default('India'),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  businessName: z.string().min(1, 'Business name is required').max(255),
  email: commonValidators.email,
  mobile: commonValidators.phone,
  gstNumber: commonValidators.gstNumber.optional(),
  whatsapp: commonValidators.phone.optional(),
  notes: z.string().max(2000).optional(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema.optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  businessName: z.string().min(1, 'Business name is required').max(255).optional(),
  email: commonValidators.email.optional(),
  mobile: commonValidators.phone.optional(),
  gstNumber: commonValidators.gstNumber.optional(),
  whatsapp: commonValidators.phone.optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  billingAddress: addressSchema.partial().optional(),
  shippingAddress: addressSchema.partial().optional(),
});

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
