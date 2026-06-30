import { z } from 'zod';
import { commonValidators } from './common.validator';

export const updateCompanyProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  legalName: z.string().min(1).max(255).optional(),
  gstNumber: z.string().max(15).optional(),
  panNumber: z.string().max(10).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().max(255).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  country: z.string().max(100).optional(),
  logo: z.string().max(500).optional(),
  signature: z.string().max(500).optional(),
  primaryColor: z.string().max(20).optional(),
  footerText: z.string().max(2000).optional(),
  showLogo: z.boolean().optional(),
});

export const updateCompanySettingsSchema = z.object({
  timezone: z.string().max(50).optional(),
  dateFormat: z.string().max(20).optional(),
  currency: z.string().max(10).optional(),
  language: z.string().max(10).optional(),
  numberFormat: z.string().max(10).optional(),
});

export const upsertBankInfoSchema = z.object({
  bankName: z.string().min(1).max(255),
  accountName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(50),
  ifsc: z.string().min(1).max(20),
  branch: z.string().max(255).optional(),
  upiId: z.string().max(100).optional(),
});

export const updateInvoiceSettingsSchema = z.object({
  prefix: z.string().min(1).max(10).optional(),
  nextNumber: z.number().int().min(1).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  defaultCurrency: z.string().max(10).optional(),
  defaultTerms: z.string().max(2000).optional(),
  defaultNotes: z.string().max(2000).optional(),
  autoNumbering: z.boolean().optional(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
});

export const updateCommunicationSettingsSchema = z.object({
  whatsappEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  email: z.string().email().max(255).optional(),
  whatsappNumber: z.string().max(20).optional(),
});

export const updateUserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  notifications: z.record(z.unknown()).optional(),
  dashboardLayout: z.record(z.unknown()).optional(),
});

export const createTaxConfigurationSchema = z.object({
  name: z.string().min(1).max(100),
  taxType: z.enum(['GST', 'CGST', 'SGST', 'IGST', 'CESS', 'TDS', 'TCS']),
  rate: z.number().min(0).max(100),
  isIntraState: z.boolean().default(true),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const updateTaxConfigurationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  taxType: z.enum(['GST', 'CGST', 'SGST', 'IGST', 'CESS', 'TDS', 'TCS']).optional(),
  rate: z.number().min(0).max(100).optional(),
  isIntraState: z.boolean().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;
export type UpsertBankInfoInput = z.infer<typeof upsertBankInfoSchema>;
export type UpdateInvoiceSettingsInput = z.infer<typeof updateInvoiceSettingsSchema>;
export type UpdateCommunicationSettingsInput = z.infer<typeof updateCommunicationSettingsSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
export type CreateTaxConfigurationInput = z.infer<typeof createTaxConfigurationSchema>;
export type UpdateTaxConfigurationInput = z.infer<typeof updateTaxConfigurationSchema>;
