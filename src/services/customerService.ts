/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId, paginate, logActivity, logAudit, sanitizeSearchTerm } from '@/lib/database';
import type { Customer } from '@/types';

interface CustomerRow {
  id: string;
  companyId: string;
  name: string;
  businessName: string;
  gstNumber: string | null;
  email: string;
  mobile: string;
  whatsapp: string | null;
  notes: string | null;
  status: string;
  billingLine1: string;
  billingLine2: string | null;
  billingCity: string;
  billingState: string;
  billingPincode: string;
  billingCountry: string;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPincode: string | null;
  shippingCountry: string | null;
  totalInvoices: number;
  totalRevenue: string;
  outstandingAmount: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Phase 4: CSV import. One parsed+mapped CSV row, ready for bulkImport().
// All fields are strings (raw from CSV / the mapping UI) — bulkImport()
// does its own trimming/validation.
export interface CustomerImportRow {
  name: string;
  businessName?: string;
  email: string;
  mobile: string;
  gstNumber?: string;
  whatsapp?: string;
  billingLine1?: string;
  billingLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  billingCountry?: string;
}

export interface CustomerImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

function transformCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    businessName: row.businessName,
    gstNumber: row.gstNumber || '',
    email: row.email,
    mobile: row.mobile,
    whatsapp: row.whatsapp || '',
    billingAddress: {
      line1: row.billingLine1,
      line2: row.billingLine2 || undefined,
      city: row.billingCity,
      state: row.billingState,
      pincode: row.billingPincode,
      country: row.billingCountry,
    },
    shippingAddress: row.shippingLine1 ? {
      line1: row.shippingLine1,
      line2: row.shippingLine2 || undefined,
      city: row.shippingCity || '',
      state: row.shippingState || '',
      pincode: row.shippingPincode || '',
      country: row.shippingCountry || '',
    } : {
      line1: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
    },
    notes: row.notes || undefined,
    status: row.status === 'active' ? 'active' : 'inactive',
    totalInvoices: row.totalInvoices,
    totalRevenue: parseFloat(row.totalRevenue) || 0,
    outstandingAmount: parseFloat(row.outstandingAmount) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

function assertExactDigits(value: string | undefined, digits: number, message: string, required = false) {
  if (!value && !required) return;
  if (!value || !new RegExp(`^\\d{${digits}}$`).test(value)) {
    throw new Error(message);
  }
}

function validateCustomerNumbers(customer: Partial<Customer> & { mobile?: string }, requireRequiredFields = false) {
  const mobile = customer.mobile !== undefined ? digitsOnly(customer.mobile) : undefined;
  const whatsapp = customer.whatsapp !== undefined ? digitsOnly(customer.whatsapp) : undefined;
  const billingPincode = customer.billingAddress?.pincode !== undefined ? digitsOnly(customer.billingAddress.pincode) : undefined;
  const shippingPincode = customer.shippingAddress?.pincode !== undefined ? digitsOnly(customer.shippingAddress.pincode) : undefined;

  assertExactDigits(mobile, 10, 'Mobile number must be exactly 10 digits.', requireRequiredFields);
  assertExactDigits(whatsapp, 10, 'WhatsApp number must be exactly 10 digits.', requireRequiredFields);
  assertExactDigits(billingPincode, 6, 'Pincode must be exactly 6 digits.', requireRequiredFields || Boolean(customer.billingAddress));
  assertExactDigits(shippingPincode, 6, 'Pincode must be exactly 6 digits.');
}

function toDbFormat(customer: Partial<Customer> & { name: string; businessName: string; email: string; mobile: string }) {
  return {
    name: customer.name,
    businessName: customer.businessName,
    gstNumber: customer.gstNumber || null,
    email: customer.email,
    mobile: digitsOnly(customer.mobile),
    whatsapp: customer.whatsapp ? digitsOnly(customer.whatsapp) : null,
    notes: customer.notes || null,
    billingLine1: customer.billingAddress?.line1 || '',
    billingLine2: customer.billingAddress?.line2 || null,
    billingCity: customer.billingAddress?.city || '',
    billingState: customer.billingAddress?.state || '',
    billingPincode: customer.billingAddress?.pincode ? digitsOnly(customer.billingAddress.pincode) : '',
    billingCountry: customer.billingAddress?.country || 'India',
    shippingLine1: customer.shippingAddress?.line1 || null,
    shippingLine2: customer.shippingAddress?.line2 || null,
    shippingCity: customer.shippingAddress?.city || null,
    shippingState: customer.shippingAddress?.state || null,
    shippingPincode: customer.shippingAddress?.pincode ? digitsOnly(customer.shippingAddress.pincode) : null,
    shippingCountry: customer.shippingAddress?.country || null,
  };
}

function toDbUpdateFormat(customer: Partial<Customer>) {
  const update: Record<string, any> = {};

  if (customer.name !== undefined) update.name = customer.name;
  if (customer.businessName !== undefined) update.businessName = customer.businessName;
  if (customer.gstNumber !== undefined) update.gstNumber = customer.gstNumber || null;
  if (customer.email !== undefined) update.email = customer.email;
  if (customer.mobile !== undefined) update.mobile = digitsOnly(customer.mobile);
  if (customer.whatsapp !== undefined) update.whatsapp = customer.whatsapp ? digitsOnly(customer.whatsapp) : null;
  if (customer.notes !== undefined) update.notes = customer.notes || null;
  if (customer.billingAddress) {
    update.billingLine1 = customer.billingAddress.line1 || '';
    update.billingLine2 = customer.billingAddress.line2 || null;
    update.billingCity = customer.billingAddress.city || '';
    update.billingState = customer.billingAddress.state || '';
    update.billingPincode = customer.billingAddress.pincode ? digitsOnly(customer.billingAddress.pincode) : '';
    update.billingCountry = customer.billingAddress.country || 'India';
  }
  if (customer.shippingAddress) {
    update.shippingLine1 = customer.shippingAddress.line1 || null;
    update.shippingLine2 = customer.shippingAddress.line2 || null;
    update.shippingCity = customer.shippingAddress.city || null;
    update.shippingState = customer.shippingAddress.state || null;
    update.shippingPincode = customer.shippingAddress.pincode ? digitsOnly(customer.shippingAddress.pincode) : null;
    update.shippingCountry = customer.shippingAddress.country || null;
  }

  return update;
}

export const customerService = {
  async list(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Customer[]; total: number; page: number; limit: number; totalPages: number }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (params?.search) {
      const searchTerm = sanitizeSearchTerm(params.search);
      if (searchTerm) {
        query = query.or(
          [
            `name.ilike.%${searchTerm}%`,
            `businessName.ilike.%${searchTerm}%`,
            `email.ilike.%${searchTerm}%`,
            `mobile.ilike.%${searchTerm}%`,
            `whatsapp.ilike.%${searchTerm}%`,
            `gstNumber.ilike.%${searchTerm}%`,
            `billingLine1.ilike.%${searchTerm}%`,
            `billingCity.ilike.%${searchTerm}%`,
            `billingState.ilike.%${searchTerm}%`,
            `billingPincode.ilike.%${searchTerm}%`,
            `notes.ilike.%${searchTerm}%`,
          ].join(','),
        );
      }
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    const result = await paginate<CustomerRow>(query, page, limit);

    return {
      ...result,
      data: result.data.map(transformCustomer),
    };
  },

  async get(id: string): Promise<Customer> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Customer not found');

    return transformCustomer(data as CustomerRow);
  },

  async create(input: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalInvoices' | 'totalRevenue' | 'outstandingAmount'>): Promise<Customer> {
    validateCustomerNumbers(input, true);

    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const dbData = {
      ...toDbFormat(input),
      companyId,
      createdById: userId,
      updatedById: userId,
      status: input.status || 'active',
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    const customer = transformCustomer(data as CustomerRow);

    await logActivity('create', 'customer', customer.id, `Created customer ${customer.name}`, { customer });
    await logAudit('create', 'customers', customer.id, customer.name, `Created customer ${customer.name}`);

    return customer;
  },

  async update(id: string, input: Partial<Customer>): Promise<Customer> {
    validateCustomerNumbers(input);

    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('*')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Customer not found');

    const updateData: Record<string, any> = {
      ...toDbUpdateFormat(input),
      updatedById: userId,
    };

    if (input.status) {
      updateData.status = input.status;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('companyId', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const customer = transformCustomer(data as CustomerRow);

    await logActivity('update', 'customer', customer.id, `Updated customer ${customer.name}`, { changes: input });
    await logAudit('update', 'customers', customer.id, customer.name, `Updated customer ${customer.name}`, existing, data);

    return customer;
  },

  async delete(id: string): Promise<boolean> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('*')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Customer not found');

    const { error } = await supabase
      .from('customers')
      .update({ deletedAt: new Date().toISOString(), updatedById: userId })
      .eq('companyId', companyId)
      .eq('id', id);

    if (error) throw error;

    await logActivity('delete', 'customer', id, `Deleted customer ${existing.name}`);
    await logAudit('delete', 'customers', id, existing.name, `Deleted customer ${existing.name}`, existing);

    return true;
  },

  async restore(id: string): Promise<Customer> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('customers')
      .update({ deletedAt: null, updatedById: userId })
      .eq('companyId', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return transformCustomer(data as CustomerRow);
  },

  async getByEmail(email: string): Promise<Customer | null> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('companyId', companyId)
      .eq('email', email)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return transformCustomer(data as CustomerRow);
  },

  async search(searchTerm: string, limit: number = 10): Promise<Customer[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .or(`name.ilike.%${searchTerm}%,businessName.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) throw error;

    return (data || []).map(transformCustomer);
  },

  async getTopCustomers(limit: number = 5): Promise<{ id: string; name: string; revenue: number }[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, totalRevenue')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('totalRevenue', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      revenue: parseFloat(c.totalRevenue) || 0,
    }));
  },

  // Phase 4: bulk CSV import with duplicate detection. Duplicates are
  // matched on email OR gstNumber against existing customers in the same
  // company (case-insensitive email match, exact gstNumber match — blank
  // gstNumbers never match each other). `duplicateStrategy` controls what
  // happens on a match: 'skip' (default) leaves the existing record
  // untouched, 'update' overwrites it with the CSV row's values. Every row
  // is processed independently — one bad row doesn't abort the rest — and
  // per-row failures are collected into `errors` for the UI to display.
  //
  // NOTE: this takes companyId from getCurrentCompanyId() like every other
  // method in this file, rather than as a parameter — kept consistent with
  // the rest of the service rather than plumbing it through from the caller.
  async bulkImport(
    rows: CustomerImportRow[],
    options?: { duplicateStrategy?: 'skip' | 'update' },
  ): Promise<CustomerImportResult> {
    const duplicateStrategy = options?.duplicateStrategy ?? 'skip';
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const result: CustomerImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    if (rows.length === 0) return result;

    // Pull existing customers once up front and index them for O(1)
    // duplicate lookups, rather than querying per row.
    const { data: existingRows, error: existingError } = await supabase
      .from('customers')
      .select('id, email, gstNumber')
      .eq('companyId', companyId)
      .is('deletedAt', null);

    if (existingError) throw existingError;

    const byEmail = new Map<string, string>(); // lowercased email -> id
    const byGst = new Map<string, string>(); // gstNumber -> id
    for (const row of existingRows || []) {
      if (row.email) byEmail.set(row.email.toLowerCase(), row.id);
      if (row.gstNumber) byGst.set(row.gstNumber, row.id);
    }

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +1 for 0-index, +1 for the CSV header row
      const raw = rows[i];

      try {
        const name = raw.name?.trim();
        const email = raw.email?.trim();
        const mobile = raw.mobile?.trim();

        if (!name || !email || !mobile) {
          throw new Error('name, email, and mobile are required');
        }

        const candidate: Partial<Customer> & { name: string; businessName: string; email: string; mobile: string } = {
          name,
          businessName: raw.businessName?.trim() || name,
          email,
          mobile,
          gstNumber: raw.gstNumber?.trim() || undefined,
          whatsapp: raw.whatsapp?.trim() || undefined,
          billingAddress: {
            line1: raw.billingLine1?.trim() || '',
            line2: raw.billingLine2?.trim() || undefined,
            city: raw.billingCity?.trim() || '',
            state: raw.billingState?.trim() || '',
            pincode: raw.billingPincode?.trim() || '',
            country: raw.billingCountry?.trim() || 'India',
          },
        };

        const normalizedEmail = email.toLowerCase();
        const gst = candidate.gstNumber;
        const existingId = byEmail.get(normalizedEmail) || (gst ? byGst.get(gst) : undefined);

        if (existingId) {
          if (duplicateStrategy === 'skip') {
            result.skipped++;
            continue;
          }

          // duplicateStrategy === 'update'
          validateCustomerNumbers(candidate, false);
          const { data, error } = await supabase
            .from('customers')
            .update({ ...toDbUpdateFormat(candidate), updatedById: userId })
            .eq('companyId', companyId)
            .eq('id', existingId)
            .select()
            .single();

          if (error) throw error;
          result.updated++;
          if (data.email) byEmail.set(data.email.toLowerCase(), data.id);
          if (data.gstNumber) byGst.set(data.gstNumber, data.id);
        } else {
          validateCustomerNumbers(candidate, true);
          const { data, error } = await supabase
            .from('customers')
            .insert({
              ...toDbFormat(candidate),
              companyId,
              createdById: userId,
              updatedById: userId,
              status: 'active',
            })
            .select()
            .single();

          if (error) throw error;
          result.created++;
          // Register immediately so a later duplicate row within the same
          // CSV file is caught too.
          byEmail.set(data.email.toLowerCase(), data.id);
          if (data.gstNumber) byGst.set(data.gstNumber, data.id);
        }
      } catch (err) {
        result.errors.push({
          row: rowNumber,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await logActivity(
      'import',
      'customer',
      companyId,
      `Imported customers: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} failed`,
      result,
    );

    return result;
  },
};
