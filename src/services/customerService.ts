/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId, paginate, logActivity, logAudit } from '@/lib/database';
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

function toDbFormat(customer: Partial<Customer> & { name: string; businessName: string; email: string; mobile: string }) {
  return {
    name: customer.name,
    businessName: customer.businessName,
    gstNumber: customer.gstNumber || null,
    email: customer.email,
    mobile: customer.mobile,
    whatsapp: customer.whatsapp || null,
    notes: customer.notes || null,
    billingLine1: customer.billingAddress?.line1 || '',
    billingLine2: customer.billingAddress?.line2 || null,
    billingCity: customer.billingAddress?.city || '',
    billingState: customer.billingAddress?.state || '',
    billingPincode: customer.billingAddress?.pincode || '',
    billingCountry: customer.billingAddress?.country || 'India',
    shippingLine1: customer.shippingAddress?.line1 || null,
    shippingLine2: customer.shippingAddress?.line2 || null,
    shippingCity: customer.shippingAddress?.city || null,
    shippingState: customer.shippingAddress?.state || null,
    shippingPincode: customer.shippingAddress?.pincode || null,
    shippingCountry: customer.shippingAddress?.country || null,
  };
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
      const searchTerm = params.search;
      query = query.or(`name.ilike.%${searchTerm}%,businessName.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%`);
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
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Customer not found');

    return transformCustomer(data as CustomerRow);
  },

  async create(input: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalInvoices' | 'totalRevenue' | 'outstandingAmount'>): Promise<Customer> {
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
    const userId = await getCurrentUserId();

    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) throw new Error('Customer not found');

    const updateData: Record<string, any> = {
      ...toDbFormat(input as any),
      updatedById: userId,
    };

    if (input.status) {
      updateData.status = input.status;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
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
    const userId = await getCurrentUserId();

    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) throw new Error('Customer not found');

    const { error } = await supabase
      .from('customers')
      .update({ deletedAt: new Date().toISOString(), updatedById: userId })
      .eq('id', id);

    if (error) throw error;

    await logActivity('delete', 'customer', id, `Deleted customer ${existing.name}`);
    await logAudit('delete', 'customers', id, existing.name, `Deleted customer ${existing.name}`, existing);

    return true;
  },

  async restore(id: string): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({ deletedAt: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return transformCustomer(data as CustomerRow);
  },

  async getByEmail(email: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
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
};
