/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { normalizePermissions } from '@/utils/permissions';
import { assertValidEmail } from '@/utils/validation';
import { isIntraStateTransaction, computeGstBreakdown } from '@/utils/gst';
import type { User, UserRole, UserStatus, InvoiceStatus, PaymentStatus, Address } from '@/types';

export interface MasterUserRow extends User {
  companyId: string;
}

export interface MasterCompanyRow {
  id: string;
  name: string;
  legalName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  billingCycleStart: string;
  invoiceQuota: number;
  userQuota: number;
  invoicesThisCycle: number;
}

export interface MasterPlan {
  id: string;
  name: string;
  priceMonthly: number;
  invoiceQuota: number;
  userQuota: number;
  features: string[];
}

export interface MasterInvoiceRow {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  balance: number;
  issueDate: string;
  dueDate: string;
  createdAt: string;
  customerName?: string;
  companyId: string;
  companyName?: string;
}

export interface MasterCustomerRow {
  id: string;
  name: string;
  businessName: string;
  email: string;
  mobile: string;
  createdAt: string;
  companyId: string;
  companyName?: string;
}

export interface MasterPaymentRow {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  transactionId: string;
  createdAt: string;
  companyId: string;
  companyName?: string;
  customerName?: string;
}

export interface MasterPaymentLinkRow {
  id: string;
  linkId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  url: string;
  expiryDate: string;
  createdAt: string;
  companyId: string;
  companyName?: string;
  description?: string;
}

/** Full customer record, used to populate the master console's edit form. */
export interface MasterCustomerDetail extends MasterCustomerRow {
  gstNumber: string;
  whatsapp: string;
  billingAddress: Address;
  status: 'active' | 'inactive';
}

function transformUser(row: any): MasterUserRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role.toLowerCase() as UserRole,
    status: row.status.toLowerCase() as UserStatus,
    avatar: row.avatar || undefined,
    phone: row.phone || undefined,
    lastActive: row.lastActiveAt || undefined,
    createdAt: row.createdAt,
    permissions: normalizePermissions(row.permissions),
    companyName: row.companies?.name,
    companyId: row.companyId,
  };
}

async function getCallerId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// The shared logActivity/logAudit helpers in `lib/database.ts` always resolve
// the CALLER's own company (i.e. the Platform Administration tenant), which
// is wrong here — a master console write affects the TARGET company's data,
// so the audit trail needs to live under that company for it to show up on
// that tenant's own Audit Log / Activity pages. These local variants accept
// the target companyId explicitly instead of looking it up.
async function logMasterActivity(
  companyId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const userId = await getCallerId();
    await supabase.from('activity_logs').insert({
      companyId,
      userId,
      userName: 'Master Administrator',
      action,
      entityType,
      entityId,
      description,
      metadata,
    });
  } catch (error) {
    console.error('[masterService] Failed to log activity:', error);
  }
}

async function logMasterAudit(
  companyId: string,
  action: 'create' | 'update' | 'delete',
  module: string,
  entityId: string,
  entityName: string,
  description: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): Promise<void> {
  try {
    const userId = await getCallerId();
    await supabase.from('audit_logs').insert({
      companyId,
      userId,
      action: action.toUpperCase(),
      entityType: module,
      entityId,
      oldValues: oldValues ?? null,
      newValues: { ...newValues, entityName, description },
    });
  } catch (error) {
    console.error('[masterService] Failed to log audit:', error);
  }
}

const digitsOnly = (value: string) => (value || '').replace(/\D/g, '');

function transformPaymentLink(row: any): MasterPaymentLinkRow {
  return {
    id: row.id,
    linkId: row.slug,
    customerId: row.customerId,
    customerName: row.customers?.name,
    amount: Number(row.amount) || 0,
    currency: row.currency,
    gateway: String(row.gateway || 'razorpay').toLowerCase(),
    status: String(row.status).toLowerCase(),
    url: row.gatewayLinkUrl || `/pay/${row.slug}`,
    expiryDate: row.expiresAt || '',
    createdAt: row.createdAt,
    companyId: row.companyId,
    companyName: row.companies?.name,
    description: row.description || undefined,
  };
}

function generateSlug(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 12; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

function customerToDbFormat(input: {
  name: string;
  businessName: string;
  gstNumber?: string;
  email: string;
  mobile: string;
  whatsapp?: string;
  notes?: string;
  status?: string;
  billingAddress?: Partial<Address>;
}) {
  return {
    name: input.name,
    businessName: input.businessName,
    gstNumber: input.gstNumber || null,
    email: input.email,
    mobile: digitsOnly(input.mobile),
    whatsapp: input.whatsapp ? digitsOnly(input.whatsapp) : null,
    notes: input.notes || null,
    status: input.status || 'active',
    billingLine1: input.billingAddress?.line1 || '',
    billingLine2: input.billingAddress?.line2 || null,
    billingCity: input.billingAddress?.city || '',
    billingState: input.billingAddress?.state || '',
    billingPincode: input.billingAddress?.pincode ? digitsOnly(input.billingAddress.pincode) : '',
    billingCountry: input.billingAddress?.country || 'India',
  };
}

export const masterService = {
 
  async getAllUsers(params?: { search?: string; role?: string }): Promise<MasterUserRow[]> {
    let query = supabase
      .from('users')
      .select('*, companies!users_companyId_fkey(id, name)')
      .is('deletedAt', null)
      .neq('role', 'SUPER_ADMIN')
      .order('createdAt', { ascending: false });

    if (params?.search) {
      const term = params.search;
      query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
    }
    if (params?.role && params.role !== 'all') {
      query = query.eq('role', params.role.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(transformUser);
  },

  /** Every tenant company, with a live headcount for the console overview. */
  async getAllCompanies(): Promise<MasterCompanyRow[]> {
    const { data, error } = await supabase
      .from('companies')
      .select(
        'id, name, legalName, email, isActive, createdAt, users(count), subscriptionPlan, subscriptionStatus, billingCycleStart, usageQuota'
      )
      .order('createdAt', { ascending: false });

    if (error) throw error;

    const rows = (data || []).filter((row: any) => row.email !== 'info@selltechindproductions.in');

    // Invoice count this billing cycle needs a per-company query (no
    // group-by via supabase-js without an RPC) — fine at admin-console
    // scale/frequency, not a hot path.
    const invoiceCounts = await Promise.all(
      rows.map((row: any) =>
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('companyId', row.id)
          .is('deletedAt', null)
          .gte('createdAt', row.billingCycleStart)
          .then(({ count }) => count ?? 0)
      )
    );

    return rows.map((row: any, i: number) => ({
      id: row.id,
      name: row.name,
      legalName: row.legalName,
      email: row.email,
      isActive: row.isActive,
      createdAt: row.createdAt,
      userCount: row.users?.[0]?.count ?? 0,
      subscriptionPlan: row.subscriptionPlan || 'free',
      subscriptionStatus: row.subscriptionStatus || 'active',
      billingCycleStart: row.billingCycleStart,
      invoiceQuota: row.usageQuota?.invoiceQuota ?? 0,
      userQuota: row.usageQuota?.userQuota ?? 0,
      invoicesThisCycle: invoiceCounts[i],
    }));
  },

  /** Reference list of subscription tiers (Free/Pro/Business, seeded via migration). */
  async getPlans(): Promise<MasterPlan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('priceMonthly', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      priceMonthly: Number(row.priceMonthly) || 0,
      invoiceQuota: row.invoiceQuota,
      userQuota: row.userQuota,
      features: Array.isArray(row.features) ? row.features : [],
    }));
  },

  /**
   * Change a company's subscription plan (Master Console only — a
   * `protect_billing_columns` trigger on `companies` silently reverts these
   * columns if anyone other than the master account or service_role tries
   * to write them, so this is the only path that actually takes effect).
   */
  async updateCompanyPlan(
    companyId: string,
    planId: string,
    status: 'active' | 'past_due' | 'cancelled' | 'trialing' = 'active'
  ): Promise<MasterCompanyRow> {
    const plans = await this.getPlans();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) throw new Error(`Unknown plan: ${planId}`);

    const { data: existing, error: existingError } = await supabase
      .from('companies')
      .select('subscriptionPlan, subscriptionStatus, name')
      .eq('id', companyId)
      .single();
    if (existingError) throw existingError;

    const { error } = await supabase
      .from('companies')
      .update({
        subscriptionPlan: planId,
        subscriptionStatus: status,
        usageQuota: { invoiceQuota: plan.invoiceQuota, userQuota: plan.userQuota },
      })
      .eq('id', companyId);
    if (error) throw error;

    await logMasterAudit(
      companyId,
      'update',
      'companies',
      companyId,
      existing.name,
      `Master changed plan from ${existing.subscriptionPlan || 'free'} to ${planId}`,
      { subscriptionPlan: existing.subscriptionPlan, subscriptionStatus: existing.subscriptionStatus },
      { subscriptionPlan: planId, subscriptionStatus: status }
    );

    const companies = await this.getAllCompanies();
    const updated = companies.find((c) => c.id === companyId);
    if (!updated) throw new Error('Company not found after update');
    return updated;
  },

  /** Every invoice across every company, most recent first. */
  async getAllInvoices(params?: { search?: string; status?: string }): Promise<MasterInvoiceRow[]> {
    let query = supabase
      .from('invoices')
      .select(
        '*, customers!invoices_customerId_fkey(name), companies!invoices_companyId_fkey(id, name)'
      )
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(500);

    if (params?.search) {
      query = query.ilike('number', `%${params.search}%`);
    }
    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      number: row.number,
      status: String(row.status).toLowerCase() as InvoiceStatus,
      total: Number(row.total),
      balance: Number(row.balance),
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      customerName: row.customers?.name,
      companyId: row.companyId,
      companyName: row.companies?.name,
    }));
  },

  /** Every customer across every company. */
  async getAllCustomers(params?: { search?: string }): Promise<MasterCustomerRow[]> {
    let query = supabase
      .from('customers')
      .select('*, companies!customers_companyId_fkey(id, name)')
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(500);

    if (params?.search) {
      const term = params.search;
      query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,businessName.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      businessName: row.businessName,
      email: row.email,
      mobile: row.mobile,
      createdAt: row.createdAt,
      companyId: row.companyId,
      companyName: row.companies?.name,
    }));
  },

  /** Every payment across every company. */
  async getAllPayments(params?: { status?: string }): Promise<MasterPaymentRow[]> {
    let query = supabase
      .from('payments')
      .select(
        '*, customers!payments_customerId_fkey(name), companies!payments_companyId_fkey(id, name)'
      )
      .order('createdAt', { ascending: false })
      .limit(500);

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      amount: Number(row.amount),
      status: String(row.status).toLowerCase() as PaymentStatus,
      method: String(row.method).toLowerCase(),
      transactionId: row.transactionId,
      createdAt: row.createdAt,
      companyId: row.companyId,
      companyName: row.companies?.name,
      customerName: row.customers?.name,
    }));
  },
  /** Every payment link across every company. */
  async getAllPaymentLinks(params?: { status?: string }): Promise<MasterPaymentLinkRow[]> {
    let query = supabase
      .from('payment_links')
      .select(
        '*, customers!payment_links_customerId_fkey(id, name, email, businessName), companies!payment_links_companyId_fkey(id, name)'
      )
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(500);

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(transformPaymentLink);
  },

  /** Full detail for one customer — used to prefill the master edit form. */
  async getCustomer(id: string): Promise<MasterCustomerDetail> {
    const { data, error } = await supabase
      .from('customers')
      .select('*, companies!customers_companyId_fkey(id, name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Customer not found');

    return {
      id: data.id,
      name: data.name,
      businessName: data.businessName,
      gstNumber: data.gstNumber || '',
      email: data.email,
      mobile: data.mobile,
      whatsapp: data.whatsapp || '',
      status: data.status === 'active' ? 'active' : 'inactive',
      billingAddress: {
        line1: data.billingLine1 || '',
        line2: data.billingLine2 || undefined,
        city: data.billingCity || '',
        state: data.billingState || '',
        pincode: data.billingPincode || '',
        country: data.billingCountry || 'India',
      },
      createdAt: data.createdAt,
      companyId: data.companyId,
      companyName: data.companies?.name,
    };
  },

  /** Create a customer under any tenant company (master console only). */
  async createCustomer(companyId: string, input: {
    name: string;
    businessName: string;
    gstNumber?: string;
    email: string;
    mobile: string;
    whatsapp?: string;
    notes?: string;
    status?: string;
    billingAddress?: Partial<Address>;
  }): Promise<MasterCustomerRow> {
    if (!companyId) throw new Error('Company is required');
    if (!input.name || !input.email || !input.mobile) {
      throw new Error('Name, email, and mobile are required');
    }

    const userId = await getCallerId();

    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...customerToDbFormat(input),
        companyId,
        createdById: userId,
        updatedById: userId,
      })
      .select('*, companies!customers_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logMasterActivity(companyId, 'create', 'customer', data.id, `Master created customer ${data.name}`);
    await logMasterAudit(companyId, 'create', 'customers', data.id, data.name, `Master created customer ${data.name}`);

    return {
      id: data.id,
      name: data.name,
      businessName: data.businessName,
      email: data.email,
      mobile: data.mobile,
      createdAt: data.createdAt,
      companyId: data.companyId,
      companyName: data.companies?.name,
    };
  },

  /** Update a customer belonging to any tenant company. */
  async updateCustomer(id: string, input: Partial<{
    name: string;
    businessName: string;
    gstNumber: string;
    email: string;
    mobile: string;
    whatsapp: string;
    notes: string;
    status: string;
    billingAddress: Partial<Address>;
  }>): Promise<MasterCustomerRow> {
    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Customer not found');

    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.businessName !== undefined) updateData.businessName = input.businessName;
    if (input.gstNumber !== undefined) updateData.gstNumber = input.gstNumber || null;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.mobile !== undefined) updateData.mobile = digitsOnly(input.mobile);
    if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp ? digitsOnly(input.whatsapp) : null;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.billingAddress) {
      updateData.billingLine1 = input.billingAddress.line1 || '';
      updateData.billingLine2 = input.billingAddress.line2 || null;
      updateData.billingCity = input.billingAddress.city || '';
      updateData.billingState = input.billingAddress.state || '';
      updateData.billingPincode = input.billingAddress.pincode ? digitsOnly(input.billingAddress.pincode) : '';
      updateData.billingCountry = input.billingAddress.country || 'India';
    }

    const userId = await getCallerId();
    updateData.updatedById = userId;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select('*, companies!customers_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logMasterActivity(data.companyId, 'update', 'customer', id, `Master updated customer ${data.name}`);
    await logMasterAudit(data.companyId, 'update', 'customers', id, data.name, `Master updated customer ${data.name}`, existing, data);

    return {
      id: data.id,
      name: data.name,
      businessName: data.businessName,
      email: data.email,
      mobile: data.mobile,
      createdAt: data.createdAt,
      companyId: data.companyId,
      companyName: data.companies?.name,
    };
  },

  /** Soft-delete a customer belonging to any tenant company. */
  async deleteCustomer(id: string): Promise<void> {
    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('id, name, companyId')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Customer not found');

    const userId = await getCallerId();

    const { error } = await supabase
      .from('customers')
      .update({ deletedAt: new Date().toISOString(), updatedById: userId })
      .eq('id', id);

    if (error) throw error;

    await logMasterActivity(existing.companyId, 'delete', 'customer', id, `Master deleted customer ${existing.name}`);
    await logMasterAudit(existing.companyId, 'delete', 'customers', id, existing.name, `Master deleted customer ${existing.name}`, existing);
  },

  /** Customers belonging to one company — used to populate dropdowns when creating an invoice/payment link on that company's behalf. */
  async getCompanyCustomers(companyId: string): Promise<{ id: string; name: string; email: string }[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /** Create an invoice on behalf of any tenant company. */
  async createInvoice(companyId: string, input: {
    customerId: string;
    issueDate: string;
    dueDate: string;
    items: Array<{
      description: string;
      quantity: number;
      rate: number;
      discount?: number;
      taxRate?: number;
    }>;
    discountAmount?: number;
    notes?: string;
    terms?: string;
  }): Promise<MasterInvoiceRow> {
    if (!companyId) throw new Error('Company is required');

    const userId = await getCallerId();

    const safeItems = Array.isArray(input.items) ? input.items : [];
    if (safeItems.length === 0) {
      throw new Error('Please add at least one line item');
    }

    let subtotal = 0;
    let taxAmount = 0;
    const invoiceItems: Array<{ description: string; quantity: number; rate: number; discount: number; taxRate: number; amount: number; cgstAmount: number; sgstAmount: number; igstAmount: number }> = [];

    const [{ data: companyRow, error: companyStateError }, { data: customerRow, error: customerStateError }] = await Promise.all([
      supabase.from('companies').select('state').eq('id', companyId).maybeSingle(),
      supabase.from('customers').select('billingState').eq('id', input.customerId).maybeSingle(),
    ]);
    if (companyStateError) throw companyStateError;
    if (customerStateError) throw customerStateError;
    const isIntraState = isIntraStateTransaction(companyRow?.state, customerRow?.billingState);

    for (const item of safeItems) {
      const qty = item.quantity || 1;
      const rate = item.rate || 0;
      const discount = item.discount || 0;
      const taxRate = item.taxRate || 0;
      const lineTotal = qty * rate - discount;
      const lineTax = lineTotal * (taxRate / 100);
      const amount = lineTotal + lineTax;
      const { cgstAmount, sgstAmount, igstAmount } = computeGstBreakdown(lineTax, isIntraState);

      subtotal += lineTotal;
      taxAmount += lineTax;
      invoiceItems.push({ description: item.description, quantity: qty, rate, discount, taxRate, amount, cgstAmount, sgstAmount, igstAmount });
    }

    const discountAmount = input.discountAmount || 0;
    const total = subtotal + taxAmount - discountAmount;

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('companyId', companyId)
      .eq('id', input.customerId)
      .is('deletedAt', null)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!customer) throw new Error('Customer not found for the selected company');

    // Invoice-number generation, scoped to the TARGET company's own
    // invoice_settings row/counter — not the master account's own company.
    const { data: settings, error: settingsError } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();
    if (settingsError) throw settingsError;

    let invoiceNumber: string;
    if (settings) {
      const nextNumber = settings.nextNumber || 1001;
      const prefix = settings.prefix || 'INV';
      const { error: updateSettingsError } = await supabase
        .from('invoice_settings')
        .update({ nextNumber: nextNumber + 1 })
        .eq('companyId', companyId);
      if (updateSettingsError) throw updateSettingsError;
      invoiceNumber = `${prefix}-${String(nextNumber).padStart(6, '0')}`;
    } else {
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', companyId);
      invoiceNumber = `INV-${String((count || 0) + 1001).padStart(6, '0')}`;
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        companyId,
        customerId: input.customerId,
        number: invoiceNumber,
        status: 'DRAFT',
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        amountPaid: 0,
        balance: total,
        notes: input.notes || null,
        terms: input.terms || null,
        createdById: userId,
        updatedById: userId,
      })
      .select('*, customers!invoices_customerId_fkey(name), companies!invoices_companyId_fkey(id, name)')
      .single();

    if (invoiceError) throw invoiceError;

    for (let i = 0; i < invoiceItems.length; i++) {
      const item = invoiceItems[i];
      const { error: itemError } = await supabase.from('invoice_items').insert({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        taxRate: item.taxRate,
        amount: item.amount,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        sortOrder: i,
      });
      if (itemError) throw itemError;
    }

    await supabase.from('invoice_activities').insert({
      invoiceId: invoice.id,
      userId,
      action: 'created',
      description: 'Invoice created by master administrator',
    });

    await logMasterActivity(companyId, 'create', 'invoice', invoice.id, `Master created invoice ${invoiceNumber}`);
    await logMasterAudit(companyId, 'create', 'invoices', invoice.id, invoiceNumber, `Master created invoice ${invoiceNumber}`);

    return {
      id: invoice.id,
      number: invoice.number,
      status: String(invoice.status).toLowerCase() as InvoiceStatus,
      total: Number(invoice.total),
      balance: Number(invoice.balance),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      customerName: invoice.customers?.name,
      companyId: invoice.companyId,
      companyName: invoice.companies?.name,
    };
  },

  /**
   * Update status/dates/notes on an invoice belonging to any tenant company.
   *
   * NOTE: as of the Phase 1 payment webhook work (see server/services/
   * reconciliationService.js), invoice status normally flips to PAID
   * automatically once Razorpay/Paytm confirms a payment — via
   * POST /api/webhooks/razorpay, POST /api/webhooks/paytm, or the
   * checksum/signature-verified redirect flows (/api/payment/verify,
   * /api/paytm/callback). This method is now the *manual override* path
   * (e.g. an offline/bank-transfer payment, or correcting a stuck invoice)
   * rather than the only way an invoice becomes PAID.
   */
  async updateInvoice(id: string, input: Partial<{
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    notes: string;
    terms: string;
  }>): Promise<MasterInvoiceRow> {
    const { data: existing, error: existingError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Invoice not found');

    const userId = await getCallerId();
    const updateData: Record<string, any> = { updatedById: userId };
    if (input.status !== undefined) updateData.status = input.status.toUpperCase();
    if (input.issueDate !== undefined) updateData.issueDate = input.issueDate;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.terms !== undefined) updateData.terms = input.terms || null;
    if (input.status === 'paid') {
      updateData.paidAt = new Date().toISOString();
      updateData.amountPaid = existing.total;
      updateData.balance = 0;
    }
    if (input.status === 'cancelled') {
      updateData.cancelledAt = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select('*, customers!invoices_customerId_fkey(name), companies!invoices_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logMasterActivity(data.companyId, 'update', 'invoice', id, `Master updated invoice ${data.number}`);
    await logMasterAudit(data.companyId, 'update', 'invoices', id, data.number, `Master updated invoice ${data.number}`, existing, data);

    return {
      id: data.id,
      number: data.number,
      status: String(data.status).toLowerCase() as InvoiceStatus,
      total: Number(data.total),
      balance: Number(data.balance),
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      createdAt: data.createdAt,
      customerName: data.customers?.name,
      companyId: data.companyId,
      companyName: data.companies?.name,
    };
  },

  /** Soft-delete an invoice belonging to any tenant company. */
  async deleteInvoice(id: string): Promise<void> {
    const { data: existing, error: existingError } = await supabase
      .from('invoices')
      .select('id, number, companyId')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Invoice not found');

    const userId = await getCallerId();

    const { error } = await supabase
      .from('invoices')
      .update({ deletedAt: new Date().toISOString(), updatedById: userId })
      .eq('id', id);

    if (error) throw error;

    await logMasterActivity(existing.companyId, 'delete', 'invoice', id, `Master deleted invoice ${existing.number}`);
    await logMasterAudit(existing.companyId, 'delete', 'invoices', id, existing.number, `Master deleted invoice ${existing.number}`, existing);
  },

  /** Create a payment link on behalf of any tenant company. */
  async createPaymentLink(companyId: string, input: {
    customerId: string;
    amount: number;
    gateway: string;
    description?: string;
    expiryDays?: number;
  }): Promise<MasterPaymentLinkRow> {
    if (!companyId) throw new Error('Company is required');

    const userId = await getCallerId();

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('companyId', companyId)
      .eq('id', input.customerId)
      .is('deletedAt', null)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!customer) throw new Error('Customer not found for the selected company');

    const slug = generateSlug();
    const expiresAt = input.expiryDays
      ? new Date(Date.now() + input.expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('payment_links')
      .insert({
        companyId,
        customerId: input.customerId,
        slug,
        title: `Payment for ${input.amount}`,
        description: input.description || null,
        amount: input.amount,
        currency: 'INR',
        status: 'PENDING',
        expiresAt,
        gateway: input.gateway?.toUpperCase() || 'RAZORPAY',
        createdById: userId,
      })
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName), companies!payment_links_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logMasterActivity(companyId, 'create', 'payment_link', data.id, `Master created payment link for ${input.amount}`);
    await logMasterAudit(companyId, 'create', 'payment_links', data.id, data.slug, `Master created payment link for ${input.amount}`);

    return transformPaymentLink(data);
  },

  /**
   * Update a payment link's status (any tenant company).
   *
   * NOTE: same caveat as `updateInvoice` above — once a public payment-link
   * checkout page exists and creates its Razorpay/Paytm order with this
   * link's id attached, the webhook reconciliation flow will normally flip
   * this to PAID automatically. Until then (and for manual corrections
   * afterward), this remains the only way a payment link's status changes.
   */
  async updatePaymentLinkStatus(id: string, status: 'paid' | 'expired' | 'failed' | 'pending' | 'cancelled'): Promise<MasterPaymentLinkRow> {
    const { data: existing, error: existingError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Payment link not found');

    const { data, error } = await supabase
      .from('payment_links')
      .update({ status: status.toUpperCase() })
      .eq('id', id)
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName), companies!payment_links_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logMasterActivity(data.companyId, 'update', 'payment_link', id, `Master updated payment link status to ${status}`);
    await logMasterAudit(data.companyId, 'update', 'payment_links', id, data.slug, `Master updated payment link status to ${status}`, existing, data);

    return transformPaymentLink(data);
  },

  /** Soft-delete a payment link belonging to any tenant company. */
  async deletePaymentLink(id: string): Promise<void> {
    const { data: existing, error: existingError } = await supabase
      .from('payment_links')
      .select('id, slug, companyId')
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Payment link not found');

    const { error } = await supabase
      .from('payment_links')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await logMasterActivity(existing.companyId, 'delete', 'payment_link', id, `Master deleted payment link ${existing.slug}`);
    await logMasterAudit(existing.companyId, 'delete', 'payment_links', id, existing.slug, `Master deleted payment link ${existing.slug}`, existing);
  },

  /**
   * Create a user (admin, business, manager, staff, or viewer) under any
   * tenant company. Goes through the same `admin-create-user` Edge Function
   * the regular Admin "Add User" flow uses — that function already treats
   * SUPER_ADMIN callers as authorized (see admin-create-user/index.ts) and
   * accepts an explicit companyId, so no server-side changes were needed
   * there. Pass `companyName` (instead of `companyId`) to spin up a brand
   * new tenant company for a new Admin, exactly like the per-tenant flow.
   */
  async createUser(input: {
    name: string;
    email: string;
    password: string;
    role: string;
    companyId?: string;
    companyName?: string;
    phone?: string;
    status?: string;
    permissions?: string[];
  }): Promise<MasterUserRow> {
    assertValidEmail(input.email);
    const normalizedEmail = input.email.trim();

    if (!input.companyId && !(input.role.toLowerCase() === 'admin' && input.companyName)) {
      throw new Error('Select a company, or provide a Company Name to create a new one for an Admin');
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('You must be signed in to create a user');

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;
    const edgePayload = {
      email: normalizedEmail,
      password: input.password,
      name: input.name,
      companyId: input.companyId || '',
      role: input.role,
      companyName: input.companyName,
      status: input.status,
      phone: input.phone,
      permissions: input.permissions,
    };

    const edgeResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(edgePayload),
    });

    const edgeResult = await edgeResponse.json();

    if (!edgeResponse.ok) {
      if (/already.*registered|already.*exists|user.*already/i.test(edgeResult.error || '')) {
        throw new Error('User already exists. Please reuse or reset password.');
      }
      throw new Error(edgeResult.error || 'Failed to create auth user');
    }

    const profile = edgeResult.profile;
    if (!profile) {
      throw new Error(
        'Server did not return the created user profile. This usually means the ' +
        '"admin-create-user" Edge Function on Supabase is out of date — redeploy it ' +
        '(supabase functions deploy admin-create-user) and try again.'
      );
    }

    const effectiveCompanyId = edgeResult.companyId || input.companyId || profile.companyId;
    await logMasterAudit(effectiveCompanyId, 'create', 'users', profile.id, input.name, `Master created user ${input.name}`);

    return transformUser(profile);
  },

  /** Update a user's name/role/status/phone (any tenant company). */
  async updateUser(id: string, input: Partial<{ name: string; role: string; status: string; phone: string }>): Promise<MasterUserRow> {
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.role !== undefined) updateData.role = input.role.toUpperCase();
    if (input.status !== undefined) updateData.status = input.status.toUpperCase();
    if (input.phone !== undefined) updateData.phone = input.phone;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*, companies!users_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logMasterAudit(data.companyId, 'update', 'users', id, data.name, `Master updated user ${data.name}`);

    return transformUser(data);
  },

  /**
   * Fully delete a user (auth + profile row), same as the regular Admin
   * "Delete User" flow. Routes through the `delete-user` Edge Function,
   * which now accepts SUPER_ADMIN callers in addition to ADMIN.
   */
  async deleteUser(id: string): Promise<void> {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('name, email, companyId')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('You must be signed in to delete a user');

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;

    const edgeResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ userId: id, email: user?.email }),
    });

    const edgeResult = await edgeResponse.json();

    if (!edgeResponse.ok) {
      throw new Error(edgeResult.error || 'Failed to delete user');
    }

    if (user?.companyId) {
      await logMasterAudit(user.companyId, 'delete', 'users', id, user?.name || 'Unknown', 'Master deleted user');
    }
  },
};

