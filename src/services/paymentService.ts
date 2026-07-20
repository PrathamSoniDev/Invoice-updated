/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId, paginate, logActivity, sanitizeSearchTerm, findMatchingCustomerIds } from '@/lib/database';
import { invoiceService } from '@/services/invoiceService';
import { sendPaymentLinkEmail } from '@/services/emailService';
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
    mobile: string;
    whatsapp: string | null;
  };
  invoices?: {
    id: string;
    number: string;
  } | null;
}

const PAYMENT_LINK_SELECT =
  '*, customers!payment_links_customerId_fkey(id, name, email, businessName, mobile, whatsapp), invoices!payment_links_invoiceId_fkey(id, number)';

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
    customerEmail: row.customers.email,
    amount: parseFloat(row.amount) || 0,
    currency: row.currency,
    gateway: row.gateway?.toLowerCase() as PaymentLink['gateway'] || 'razorpay',
    status: row.status.toLowerCase() as PaymentLink['status'],
    url: row.gatewayLinkUrl || `/pay/${row.slug}`,
    expiryDate: row.expiresAt || '',
    createdAt: row.createdAt,
    paidAt: row.status === 'PAID' ? row.updatedAt : undefined,
    description: row.description || undefined,
    invoiceId: row.invoiceId || undefined,
    invoiceNumber: row.invoices?.number || undefined,
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
      .select(PAYMENT_LINK_SELECT, { count: 'exact' })
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (params?.search) {
      const searchTerm = sanitizeSearchTerm(params.search);
      if (searchTerm) {
        // slug/title/description are plain text columns — ILIKE is safe.
        // status and gateway are Postgres ENUM columns ("PaymentLinkStatus",
        // "GatewayType"): ILIKE against an enum throws a DB-level type
        // error ("operator does not exist"), which previously went uncaught
        // and left the payment links page stuck on its loading spinner for
        // any non-empty search. Enums can only ever equal one of their
        // known values, so we match those with an exact (case-insensitive)
        // comparison instead of a pattern match.
        const orParts = [
          `slug.ilike.%${searchTerm}%`,
          `title.ilike.%${searchTerm}%`,
          `description.ilike.%${searchTerm}%`,
        ];

        const upperTerm = searchTerm.toUpperCase();
        const PAYMENT_LINK_STATUSES = ['PENDING', 'PAID', 'FAILED', 'EXPIRED'];
        const GATEWAY_TYPES = ['RAZORPAY', 'PAYTM'];
        if (PAYMENT_LINK_STATUSES.includes(upperTerm)) {
          orParts.push(`status.eq.${upperTerm}`);
        }
        if (GATEWAY_TYPES.includes(upperTerm)) {
          orParts.push(`gateway.eq.${upperTerm}`);
        }

        const numericAmount = Number(searchTerm);
        if (searchTerm !== '' && !Number.isNaN(numericAmount)) {
          orParts.push(`amount.eq.${numericAmount}`);
        }

        const matchingCustomerIds = await findMatchingCustomerIds(companyId, searchTerm);
        if (matchingCustomerIds.length > 0) {
          orParts.push(`customerId.in.(${matchingCustomerIds.join(',')})`);
        }

        query = query.or(orParts.join(','));
      }
    }

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
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payment_links')
      .select(PAYMENT_LINK_SELECT)
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Payment link not found');

    return transformPaymentLink(data as PaymentLinkWithCustomer);
  },

  async getLinkBySlug(slug: string): Promise<PaymentLink | null> {
    const { data, error } = await supabase
      .from('payment_links')
      .select(PAYMENT_LINK_SELECT)
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
    invoiceId?: string;
  }): Promise<PaymentLink> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('companyId', companyId)
      .eq('id', input.customerId)
      .is('deletedAt', null)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!customer) throw new Error('Customer not found');

    const slug = generateSlug();
    const expiresAt = input.expiryDays
      ? new Date(Date.now() + input.expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('payment_links')
      .insert({
        companyId,
        customerId: input.customerId,
        invoiceId: input.invoiceId || null,
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
      .select(PAYMENT_LINK_SELECT)
      .single();

    if (error) throw error;

    await logActivity('create', 'payment_link', data.id, `Created payment link for ${input.amount}`);

    // Only auto-generate a matching invoice when the user didn't already
    // attach an existing one (input.invoiceId) — linking an invoice is
    // optional; when skipped, the link still needs its own invoice so it
    // shows up in the Invoice tab. A failure here shouldn't block the
    // payment link itself from being created, so we log and continue.
    let resultLink: PaymentLink;
    if (input.invoiceId) {
      resultLink = transformPaymentLink(data as PaymentLinkWithCustomer);
    } else {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const dueDate = (input.expiryDays
          ? new Date(Date.now() + input.expiryDays * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ).toISOString().slice(0, 10);

        const invoice = await invoiceService.create({
          customerId: input.customerId,
          issueDate: today,
          dueDate,
          items: [
            {
              description: input.description || `Payment link ${slug}`,
              quantity: 1,
              rate: input.amount,
              taxRate: 0,
            },
          ],
          notes: `Auto-generated from payment link ${slug}.`,
        });

        const { error: linkUpdateError } = await supabase
          .from('payment_links')
          .update({ invoiceId: invoice.id })
          .eq('companyId', companyId)
          .eq('id', data.id);

        if (linkUpdateError) throw linkUpdateError;

        const { data: refreshed, error: refreshedError } = await supabase
          .from('payment_links')
          .select(PAYMENT_LINK_SELECT)
          .eq('companyId', companyId)
          .eq('id', data.id)
          .single();

        if (refreshedError) throw refreshedError;

        resultLink = transformPaymentLink(refreshed as PaymentLinkWithCustomer);
      } catch (invoiceGenerationError) {
        console.error('Failed to auto-generate invoice for payment link:', invoiceGenerationError);
        resultLink = transformPaymentLink(data as PaymentLinkWithCustomer);
      }
    }

    // Automatically email the payment link to the customer right away,
    // rather than requiring a manual click after creation. Best-effort: a
    // failed/misconfigured send shouldn't block the payment link itself
    // from being created — the "Email" button on the details page remains
    // available to resend.
    const absoluteUrl = resultLink.url.startsWith('http')
      ? resultLink.url
      : `${(typeof window !== 'undefined' && window.location?.origin) || ''}${resultLink.url}`;

    if (resultLink.customerEmail) {
      try {
        await sendPaymentLinkEmail({
          customerEmail: resultLink.customerEmail,
          customerName: resultLink.customerName,
          paymentLink: {
            linkId: resultLink.linkId,
            amount: resultLink.amount,
            currency: resultLink.currency,
            url: absoluteUrl,
            expiryDate: resultLink.expiryDate,
            description: resultLink.description,
          },
          paymentLinkId: resultLink.id,
          customerId: resultLink.customerId,
        });
      } catch (emailSendError) {
        console.error('Failed to auto-send payment link email:', emailSendError);
      }
    }

    return resultLink;
  },

  async updateLink(id: string, input: {
    amount?: number;
    description?: string;
    expiryDays?: number;
    gateway?: string;
  }): Promise<PaymentLink> {
    const companyId = await getCurrentCompanyId();

    const { data: existing, error: existingError } = await supabase
      .from('payment_links')
      .select('status, amount')
      .eq('companyId', companyId)
      .eq('id', id)
      .single();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Payment link not found');
    if (existing.status === 'PAID') {
      throw new Error('A paid payment link cannot be edited');
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.gateway) updates.gateway = input.gateway.toUpperCase();
    if (input.expiryDays !== undefined) {
      updates.expiresAt = new Date(Date.now() + input.expiryDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data, error } = await supabase
      .from('payment_links')
      .update(updates)
      .eq('companyId', companyId)
      .eq('id', id)
      .select(PAYMENT_LINK_SELECT)
      .single();

    if (error) throw error;

    await logActivity('update', 'payment_link', id, 'Updated payment link');

    const updatedLink = transformPaymentLink(data as PaymentLinkWithCustomer);

    // Whenever the amount changes, the customer's copy of the link is now
    // stale (wrong amount due), so re-send it automatically by email rather
    // than relying on someone to remember to hit "Email" again. Best-effort:
    // a failed/misconfigured send shouldn't block the edit itself — the
    // "Email" button on the details page remains available to retry.
    const amountChanged = input.amount !== undefined && parseFloat(existing.amount) !== input.amount;
    if (amountChanged && updatedLink.customerEmail) {
      const absoluteUrl = updatedLink.url.startsWith('http')
        ? updatedLink.url
        : `${(typeof window !== 'undefined' && window.location?.origin) || ''}${updatedLink.url}`;
      try {
        await sendPaymentLinkEmail({
          customerEmail: updatedLink.customerEmail,
          customerName: updatedLink.customerName,
          paymentLink: {
            linkId: updatedLink.linkId,
            amount: updatedLink.amount,
            currency: updatedLink.currency,
            url: absoluteUrl,
            expiryDate: updatedLink.expiryDate,
            description: updatedLink.description,
          },
          paymentLinkId: updatedLink.id,
          customerId: updatedLink.customerId,
        });
      } catch (emailSendError) {
        console.error('Failed to auto-send updated payment link email:', emailSendError);
      }
    }

    return updatedLink;
  },

  async updateLinkStatus(id: string, status: 'paid' | 'expired' | 'failed' | 'pending'): Promise<PaymentLink> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payment_links')
      .update({
        status: status.toUpperCase(),
        updatedAt: new Date().toISOString(),
      })
      .eq('companyId', companyId)
      .eq('id', id)
      .select(PAYMENT_LINK_SELECT)
      .single();

    if (error) throw error;

    return transformPaymentLink(data as PaymentLinkWithCustomer);
  },

  async expireLink(id: string): Promise<PaymentLink> {
    return this.updateLinkStatus(id, 'expired');
  },

  async cancelLink(id: string): Promise<PaymentLink> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('payment_links')
      .update({
        deletedAt: new Date().toISOString(),
        updatedById: userId,
      })
      .eq('companyId', companyId)
      .eq('id', id)
      .select(PAYMENT_LINK_SELECT)
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
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payments')
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .eq('companyId', companyId)
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
    gateway?: 'razorpay' | 'paytm';
  }): Promise<Payment> {
    const companyId = await getCurrentCompanyId();

    const transactionId = generateTransactionId();

    let resolvedInvoiceId = input.invoiceId || null;
    if (!resolvedInvoiceId && input.paymentLinkId) {
      const { data: linkRow } = await supabase
        .from('payment_links')
        .select('invoiceId')
        .eq('companyId', companyId)
        .eq('id', input.paymentLinkId)
        .maybeSingle();
      resolvedInvoiceId = linkRow?.invoiceId || null;
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        companyId,
        invoiceId: resolvedInvoiceId,
        paymentLinkId: input.paymentLinkId || null,
        customerId: input.customerId,
        amount: input.amount,
        method: input.method.toUpperCase(),
        status: 'PAID',
        gateway: input.gateway ? input.gateway.toUpperCase() : (input.paymentLinkId ? 'RAZORPAY' : null),
        transactionId,
        date: new Date().toISOString(),
      })
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .single();

    if (error) throw error;

    // Update invoice if provided (or resolved from the payment link)
    if (resolvedInvoiceId) {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('amountPaid, balance, total')
        .eq('companyId', companyId)
        .eq('id', resolvedInvoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      if (invoice) {
        const newAmountPaid = parseFloat(invoice.amountPaid) + input.amount;
        const newBalance = parseFloat(invoice.total) - newAmountPaid;
        const isPaid = newBalance <= 0;

        const { error: invoiceUpdateError } = await supabase
          .from('invoices')
          .update({
            amountPaid: newAmountPaid,
            balance: Math.max(0, newBalance),
            status: isPaid ? 'PAID' : 'SENT',
            paidAt: isPaid ? new Date().toISOString() : null,
          })
          .eq('companyId', companyId)
          .eq('id', resolvedInvoiceId);

        if (invoiceUpdateError) throw invoiceUpdateError;
      }
    }

    // Update payment link if provided
    if (input.paymentLinkId) {
      const { error: linkUpdateError } = await supabase
        .from('payment_links')
        .update({
          status: 'PAID',
          paymentCount: 1,
          updatedAt: new Date().toISOString(),
        })
        .eq('companyId', companyId)
        .eq('id', input.paymentLinkId);

      if (linkUpdateError) throw linkUpdateError;
    }

    // Update customer stats
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('outstandingAmount')
      .eq('companyId', companyId)
      .eq('id', input.customerId)
      .single();

    if (customerError) throw customerError;
    if (customer) {
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          outstandingAmount: Math.max(0, parseFloat(customer.outstandingAmount || 0) - input.amount),
        })
        .eq('companyId', companyId)
        .eq('id', input.customerId);

      if (customerUpdateError) throw customerUpdateError;
    }

    await logActivity('create', 'payment', data.id, `Recorded payment of ${input.amount}`, { payment: data });

    return transformPayment(data as PaymentWithCustomer);
  },

  async refundPayment(id: string): Promise<Payment> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'REFUNDED',
        updatedAt: new Date().toISOString(),
      })
      .eq('companyId', companyId)
      .eq('id', id)
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .single();

    if (error) throw error;

    await logActivity('update', 'payment', id, `Payment refunded`);

    return transformPayment(data as PaymentWithCustomer);
  },

  async getPaymentsByCustomerId(customerId: string): Promise<Payment[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payments')
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .eq('companyId', companyId)
      .eq('customerId', customerId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformPayment);
  },

  async getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payments')
      .select('*, customers!payments_customerId_fkey(id, name, email, businessName), invoices!payments_invoiceId_fkey(id, number)')
      .eq('companyId', companyId)
      .eq('invoiceId', invoiceId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformPayment);
  },
};
