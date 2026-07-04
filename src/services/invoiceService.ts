/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId, paginate, logActivity, logAudit } from '@/lib/database';
import type { Invoice, LineItem, InvoiceStatus } from '@/types';

interface InvoiceRow {
  id: string;
  companyId: string;
  customerId: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  amountPaid: string;
  balance: string;
  notes: string | null;
  terms: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface InvoiceItemRow {
  id: string;
  invoiceId: string;
  description: string;
  hsnCode: string | null;
  quantity: string;
  rate: string;
  discount: string;
  taxRate: string;
  amount: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceWithCustomer extends InvoiceRow {
  customers: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    businessName: string;
  };
}

function transformItem(row: InvoiceItemRow): LineItem {
  return {
    id: row.id,
    description: row.description,
    quantity: parseFloat(row.quantity) || 0,
    rate: parseFloat(row.rate) || 0,
    discount: parseFloat(row.discount) || 0,
    taxRate: parseFloat(row.taxRate) || 0,
    amount: parseFloat(row.amount) || 0,
  };
}

function transformInvoice(row: InvoiceWithCustomer, items: InvoiceItemRow[]): Invoice {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customerId,
    customerName: row.customers.name,
    customerEmail: row.customers.email,
    status: row.status.toLowerCase() as InvoiceStatus,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    lineItems: items.map(transformItem),
    subtotal: parseFloat(row.subtotal) || 0,
    taxAmount: parseFloat(row.taxAmount) || 0,
    discountAmount: parseFloat(row.discountAmount) || 0,
    total: parseFloat(row.total) || 0,
    amountPaid: parseFloat(row.amountPaid) || 0,
    balance: parseFloat(row.balance) || 0,
    notes: row.notes || undefined,
    terms: row.terms || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function fetchInvoiceItems(invoiceId: string): Promise<InvoiceItemRow[]> {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoiceId', invoiceId)
    .order('sortOrder', { ascending: true });

  if (error) throw error;
  return (data || []) as InvoiceItemRow[];
}

async function generateInvoiceNumber(): Promise<string> {
  const companyId = await getCurrentCompanyId();

  const { data: settings, error: settingsError } = await supabase
    .from('invoice_settings')
    .select('*')
    .eq('companyId', companyId)
    .maybeSingle();

  if (settingsError) throw settingsError;

  if (settings) {
    const nextNumber = settings.nextNumber || 1001;
    const prefix = settings.prefix || 'INV';

    const { error: updateSettingsError } = await supabase
      .from('invoice_settings')
      .update({ nextNumber: nextNumber + 1 })
      .eq('companyId', companyId);

    if (updateSettingsError) throw updateSettingsError;

    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
  }

  // Fallback: Generate based on count
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('companyId', companyId);

  return `INV-${String((count || 0) + 1001).padStart(6, '0')}`;
}

export const invoiceService = {
  async list(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Invoice[]; total: number; page: number; limit: number; totalPages: number }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    let query = supabase
      .from('invoices')
      .select('*, customers!invoices_customerId_fkey(id, name, email, mobile, businessName)', { count: 'exact' })
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (params?.search) {
     	const searchTerm = params.search;
      query = query.or(`number.ilike.%${searchTerm}%`);
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    const result = await paginate<InvoiceWithCustomer>(query, page, limit);

    // Fetch items for all invoices
    const invoicesWithItems = await Promise.all(
      result.data.map(async (invoice) => {
        const items = await fetchInvoiceItems(invoice.id);
        return transformInvoice(invoice as InvoiceWithCustomer, items);
      })
    );

    return {
      ...result,
      data: invoicesWithItems,
    };
  },

  async get(id: string): Promise<Invoice> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('invoices')
      .select('*, customers!invoices_customerId_fkey(id, name, email, mobile, businessName)')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invoice not found');

    const items = await fetchInvoiceItems(id);
    return transformInvoice(data as InvoiceWithCustomer, items);
  },

  async create(input: {
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
  }): Promise<Invoice> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    // Defensive guard: ensure items is always an array. If the caller passes
    // undefined (e.g. due to a stale state closure), default to [] so the
    // for...of loop below never throws a TypeError. We then validate that at
    // least one item exists — this is the single source of truth for the
    // "Please add at least one line item" rule.
    //
    // IMPORTANT: we do NOT filter by description. A line item is valid simply
    // by existing in the array — the Review page renders every item (showing
    // '—' for empty descriptions), so the service layer must accept the same
    // collection. Filtering by description here caused a false "Please add at
    // least one line item" error for items that had qty/rate but no text.
    const safeItems = Array.isArray(input.items) ? input.items : [];
    if (safeItems.length === 0) {
      throw new Error('Please add at least one line item');
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const invoiceItems: Array<{
      description: string;
      quantity: number;
      rate: number;
      discount: number;
      taxRate: number;
      amount: number;
    }> = [];

    for (const item of safeItems) {
      const qty = item.quantity || 1;
      const rate = item.rate || 0;
      const discount = item.discount || 0;
      const taxRate = item.taxRate || 0;
      const lineTotal = qty * rate - discount;
      const lineTax = lineTotal * (taxRate / 100);
      const amount = lineTotal + lineTax;

      subtotal += lineTotal;
      taxAmount += lineTax;
      invoiceItems.push({
        description: item.description,
        quantity: qty,
        rate,
        discount,
        taxRate,
        amount,
      });
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
    if (!customer) throw new Error('Customer not found');

    const invoiceNumber = await generateInvoiceNumber();

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
      .select()
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
        sortOrder: i,
      });

      if (itemError) throw itemError;
    }

    const { error: activityError } = await supabase.from('invoice_activities').insert({
      invoiceId: invoice.id,
      userId,
      action: 'created',
      description: 'Invoice created',
    });

    if (activityError) throw activityError;

    const result = await this.get(invoice.id);

    await logActivity('create', 'invoice', invoice.id, `Created invoice ${invoiceNumber}`, { invoice: result });
    await logAudit('create', 'invoices', invoice.id, invoiceNumber, `Created invoice ${invoiceNumber}`);

    return result;
  },

  async update(id: string, input: Partial<{
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
  }>): Promise<Invoice> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data: existing, error: existingError } = await supabase
      .from('invoices')
      .select('*')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Invoice not found');

    if (input.customerId) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('companyId', companyId)
        .eq('id', input.customerId)
        .is('deletedAt', null)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) throw new Error('Customer not found');
    }

    if (existing.status !== 'DRAFT') {
      // Only allow updating notes and terms for invoices that are already issued.
      const allowedUpdates: Record<string, any> = { updatedById: userId };
      if (input.notes !== undefined) allowedUpdates.notes = input.notes;
      if (input.terms !== undefined) allowedUpdates.terms = input.terms;

      if (Object.keys(allowedUpdates).length > 1) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update(allowedUpdates)
          .eq('companyId', companyId)
          .eq('id', id);

        if (updateError) throw updateError;
      }

      return this.get(id);
    }

    // Recalculate totals if items changed
    let updateData: Record<string, any> = { updatedById: userId };

    if (input.items) {
      let subtotal = 0;
      let taxAmount = 0;
      const invoiceItems: Array<{
        description: string;
        quantity: number;
        rate: number;
        discount: number;
        taxRate: number;
        amount: number;
      }> = [];

      for (const item of input.items) {
        const qty = item.quantity || 1;
        const rate = item.rate || 0;
        const discount = item.discount || 0;
        const taxRate = item.taxRate || 0;
        const lineTotal = qty * rate - discount;
        const lineTax = lineTotal * (taxRate / 100);
        const amount = lineTotal + lineTax;

        subtotal += lineTotal;
        taxAmount += lineTax;
        invoiceItems.push({
          description: item.description,
          quantity: qty,
          rate,
          discount,
          taxRate,
          amount,
        });
      }

      const discountAmount = input.discountAmount ?? existing.discountAmount;
      const total = subtotal + taxAmount - discountAmount;

      updateData = {
        ...updateData,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        balance: total - parseFloat(existing.amountPaid),
      };

      if (input.customerId) updateData.customerId = input.customerId;
      if (input.issueDate) updateData.issueDate = input.issueDate;
      if (input.dueDate) updateData.dueDate = input.dueDate;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.terms !== undefined) updateData.terms = input.terms;

      // Replace line items only after the invoice ownership has been verified above.
      const { error: deleteItemsError } = await supabase.from('invoice_items').delete().eq('invoiceId', id);
      if (deleteItemsError) throw deleteItemsError;

      for (let i = 0; i < invoiceItems.length; i++) {
        const item = invoiceItems[i];
        const { error: itemError } = await supabase.from('invoice_items').insert({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount,
          taxRate: item.taxRate,
          amount: item.amount,
          sortOrder: i,
        });

        if (itemError) throw itemError;
      }

      const { error: activityError } = await supabase.from('invoice_activities').insert({
        invoiceId: id,
        userId,
        action: 'updated',
        description: 'Invoice items updated',
      });

      if (activityError) throw activityError;
    } else {
      if (input.customerId) updateData.customerId = input.customerId;
      if (input.issueDate) updateData.issueDate = input.issueDate;
      if (input.dueDate) updateData.dueDate = input.dueDate;
      if (input.discountAmount !== undefined) {
        updateData.discountAmount = input.discountAmount;
        updateData.total = parseFloat(existing.subtotal) + parseFloat(existing.taxAmount) - input.discountAmount;
        updateData.balance = updateData.total - parseFloat(existing.amountPaid);
      }
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.terms !== undefined) updateData.terms = input.terms;
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('companyId', companyId)
      .eq('id', id);

    if (updateError) throw updateError;

    return this.get(id);
  },

  async delete(id: string): Promise<boolean> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data: existing, error: existingError } = await supabase
      .from('invoices')
      .select('*')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Invoice not found');

    const { error } = await supabase
      .from('invoices')
      .update({ deletedAt: new Date().toISOString(), updatedById: userId })
      .eq('companyId', companyId)
      .eq('id', id);

    if (error) throw error;

    await logActivity('delete', 'invoice', id, `Deleted invoice ${existing.number}`);
    await logAudit('delete', 'invoices', id, existing.number, `Deleted invoice ${existing.number}`, existing);

    return true;
  },

  async send(id: string): Promise<Invoice> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'SENT',
        sentAt: new Date().toISOString(),
        updatedById: userId,
      })
      .eq('companyId', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { error: activityError } = await supabase.from('invoice_activities').insert({
      invoiceId: id,
      userId,
      action: 'sent',
      description: 'Invoice sent to customer',
    });

    if (activityError) throw activityError;

    return this.get(id);
  },

  async markAsPaid(id: string): Promise<Invoice> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error('Invoice not found');

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'PAID',
        paidAt: new Date().toISOString(),
        amountPaid: invoice.total,
        balance: 0,
        updatedById: userId,
      })
      .eq('companyId', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { error: activityError } = await supabase.from('invoice_activities').insert({
      invoiceId: id,
      userId,
      action: 'paid',
      description: 'Invoice marked as paid',
    });

    if (activityError) throw activityError;

    // Update customer stats only for the invoice's company-scoped customer.
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('totalInvoices, totalRevenue')
      .eq('companyId', companyId)
      .eq('id', invoice.customerId)
      .single();

    if (customerError) throw customerError;

    const { error: customerUpdateError } = await supabase
      .from('customers')
      .update({
        totalInvoices: (customer.totalInvoices || 0) + 1,
        totalRevenue: parseFloat(customer.totalRevenue || 0) + parseFloat(invoice.total),
      })
      .eq('companyId', companyId)
      .eq('id', invoice.customerId);

    if (customerUpdateError) throw customerUpdateError;

    return this.get(id);
  },

  async cancel(id: string): Promise<Invoice> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
        updatedById: userId,
      })
      .eq('companyId', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { error: activityError } = await supabase.from('invoice_activities').insert({
      invoiceId: id,
      userId,
      action: 'cancelled',
      description: 'Invoice cancelled',
    });

    if (activityError) throw activityError;

    return this.get(id);
  },

  async duplicate(id: string): Promise<Invoice> {
    const existing = await this.get(id);

    return this.create({
      customerId: existing.customerId,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: existing.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        taxRate: item.taxRate,
      })),
      discountAmount: existing.discountAmount,
      notes: existing.notes,
      terms: existing.terms,
    });
  },

  async getByCustomerId(customerId: string): Promise<Invoice[]> {
    const companyId = await getCurrentCompanyId();

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('companyId', companyId)
      .eq('id', customerId)
      .is('deletedAt', null)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!customer) throw new Error('Customer not found');

    const { data, error } = await supabase
      .from('invoices')
      .select('*, customers!invoices_customerId_fkey(id, name, email, mobile, businessName)')
      .eq('companyId', companyId)
      .eq('customerId', customerId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    const invoices = await Promise.all(
      (data || []).map(async (invoice) => {
        const items = await fetchInvoiceItems(invoice.id);
        return transformInvoice(invoice as InvoiceWithCustomer, items);
      })
    );

    return invoices;
  },
};
