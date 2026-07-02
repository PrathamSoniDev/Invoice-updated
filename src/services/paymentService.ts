/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId, paginate, logActivity } from '@/lib/database';
import type { PaymentLink, Payment, PaymentStatus } from '@/types';

interface PaymentLinkRow {
  id: string;
  companyId: string;
  customerId: string;
  invoiceId: string | null;
  slug: string;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  status: string;
  expiresAt: string | null;
  maxPayments: number | null;
  paymentCount: number;
  gateway: string | null;
  gatewayLinkId: string | null;
  gatewayLinkUrl: string | null;
  metadata: any;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PaymentRow {
  id: string;
  companyId: string;
  invoiceId: string | null;
  paymentLinkId: string | null;
  customerId: string;
  amount: string;
  method: string;
  status: string;
  gateway: string | null;
  transactionId: string;
  gatewayResponse: any;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentLinkWithCustomer extends PaymentLinkRow {
  customers: {
    id: string;
    name: string;
    email: string;
    businessName: string;
  };
}

interface PaymentWithCustomer extends PaymentRow {
  customers: {
    id: string;
    name: string;
    email: string;
    businessName: string;
  };
  invoices?: {
    id: string;
    number: string;
  } | null;
}

function generateSlug(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 12; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `TXN_${timestamp}_${random}`.toUpperCase();
}

function transformPaymentLink(row: PaymentLinkWithCustomer): PaymentLink {
  return {
    id: row.id,
    linkId: row.slug,
    customerId: row.customerId,
    customerName: row.customers.name,
    amount: parseFloat(row.amount) || 0,
    currency: row.currency,
    gateway: row.gateway?.toLowerCase() as PaymentLink['gateway'] || 'razorpay',
    status: row.status.toLowerCase() as PaymentLink['status'],
    url: row.gatewayLinkUrl || `/pay/${row.slug}`,
    expiryDate: row.expiresAt || '',
    createdAt: row.createdAt,
    paidAt: row.status === 'PAID' ? row.updatedAt : undefined,
    description: row.description || undefined,
  };
}

function transformPayment(row: PaymentWithCustomer): Payment {
  return {
    id: row.id,
    invoiceId: row.invoiceId || '',
    invoiceNumber: row.invoices?.number || '',
    customerId: row.customerId,
    customerName: row.customers.name,
    amount: parseFloat(row.amount) || 0,
    method: row.method.toLowerCase() as Payment['method'],
    status: row.status.toLowerCase() as PaymentStatus,
    gateway: row.gateway?.toLowerCase() as Payment['gateway'] | undefined,
    transactionId: row.transactionId,
    date: row.date,
  };
}

export const paymentService = {
  // Payment Links
  async listLinks(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PaymentLink[]; total: number; page: number; limit: number; totalPages: number }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    let query = supabase
      .from('payment_links')
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName)', { count: 'exact' })
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    const result = await paginate<PaymentLinkWithCustomer>(query, page, limit);

    return {
      ...result,
      data: result.data.map(transformPaymentLink),
    };
  },

  async getLink(id: string): Promise<PaymentLink> {
    const { data, error } = await supabase
      .from('payment_links')
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Payment link not found');

    return transformPaymentLink(data as PaymentLinkWithCustomer);
  },

  async getLinkBySlug(slug: string): Promise<PaymentLink | null> {
    const { data, error } = await supabase
      .from('payment_links')
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName)')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    if (!data) return null;

    return transformPaymentLink(data as PaymentLinkWithCustomer);
  },

  async createLink(input: {
    customerId: string;
    amount: number;
    gateway: string;
    description?: string;
    expiryDays?: number;
  }): Promise<PaymentLink> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

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
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName)')
      .single();

    if (error) throw error;

    await logActivity('create', 'payment_link', data.id, `Created payment link for ${input.amount}`);

    return transformPaymentLink(data as PaymentLinkWithCustomer);
  },

  async updateLinkStatus(id: string, status: 'paid' | 'expired' | 'failed' | 'pending'): Promise<PaymentLink> {
    const { data, error } = await supabase
      .from('payment_links')
      .update({
        status: status.toUpperCase(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName)')
      .single();

    if (error) throw error;

    return transformPaymentLink(data as PaymentLinkWithCustomer);
  },

  async expireLink(id: string): Promise<PaymentLink> {
    return this.updateLinkStatus(id, 'expired');
  },

  async cancelLink(id: string): Promise<PaymentLink> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('payment_links')
      .update({
        deletedAt: new Date().toISOString(),
        updatedById: userId,
      })
      .eq('id', id)
      .select('*, customers!payment_links_customerId_fkey(id, name, email, businessName)')
      .single();

    if (error) throw error;

    return transformPaymentLink(data as PaymentLinkWithCustomer);
  },

  // Payments
  async listPayments(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Payment[]; total: number; page: number; limit: number; totalPages: number }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    let query = supabase
      .from('payments')
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)', { count: 'exact' })
      .eq('companyId', companyId)
      .order('date', { ascending: false });

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    const result = await paginate<PaymentWithCustomer>(query, page, limit);

    return {
      ...result,
      data: result.data.map(transformPayment),
    };
  },

  async getPayment(id: string): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Payment not found');

    return transformPayment(data as PaymentWithCustomer);
  },

  async recordPayment(input: {
    invoiceId?: string;
    paymentLinkId?: string;
    customerId: string;
    amount: number;
    method: string;
  }): Promise<Payment> {
    const companyId = await getCurrentCompanyId();

    const transactionId = generateTransactionId();

    const { data, error } = await supabase
      .from('payments')
      .insert({
        companyId,
        invoiceId: input.invoiceId || null,
        paymentLinkId: input.paymentLinkId || null,
        customerId: input.customerId,
        amount: input.amount,
        method: input.method.toUpperCase(),
        status: 'PAID',
        gateway: input.paymentLinkId ? 'RAZORPAY' : null,
        transactionId,
        date: new Date().toISOString(),
      })
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .single();

    if (error) throw error;

    // Update invoice if provided
    if (input.invoiceId) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('amountPaid, balance, total')
        .eq('id', input.invoiceId)
        .single();

      if (invoice) {
        const newAmountPaid = parseFloat(invoice.amountPaid) + input.amount;
        const newBalance = parseFloat(invoice.total) - newAmountPaid;
        const isPaid = newBalance <= 0;

        await supabase
          .from('invoices')
          .update({
            amountPaid: newAmountPaid,
            balance: Math.max(0, newBalance),
            status: isPaid ? 'PAID' : 'SENT',
            paidAt: isPaid ? new Date().toISOString() : null,
          })
          .eq('id', input.invoiceId);
      }
    }

    // Update payment link if provided
    if (input.paymentLinkId) {
      await supabase
        .from('payment_links')
        .update({
          status: 'PAID',
          paymentCount: 1,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.paymentLinkId);
    }

    // Update customer stats
    const { data: customer } = await supabase
      .from('customers')
      .select('outstandingAmount')
      .eq('id', input.customerId)
      .single();

    if (customer) {
      await supabase
        .from('customers')
        .update({
          outstandingAmount: Math.max(0, parseFloat(customer.outstandingAmount || 0) - input.amount),
        })
        .eq('id', input.customerId);
    }

    await logActivity('create', 'payment', data.id, `Recorded payment of ${input.amount}`, { payment: data });

    return transformPayment(data as PaymentWithCustomer);
  },

  async refundPayment(id: string): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'REFUNDED',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .single();

    if (error) throw error;

    await logActivity('update', 'payment', id, `Payment refunded`);

    return transformPayment(data as PaymentWithCustomer);
  },

  async getPaymentsByCustomerId(customerId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .eq('customerId', customerId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformPayment);
  },

  async getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .eq('invoiceId', invoiceId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformPayment);
  },
};
