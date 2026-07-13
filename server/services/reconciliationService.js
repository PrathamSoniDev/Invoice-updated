// Shared payment reconciliation logic.
//
// There are (deliberately) two ways this gets triggered for the same
// payment: the gateway's async webhook (source of truth, works even if the
// customer closes their browser mid-checkout) and the synchronous
// redirect/verify flow the browser hits right after paying (faster UX —
// the invoice can flip to PAID before the webhook round-trip completes).
// Both call `reconcilePayment` below so there's exactly one code path that
// writes to `payments` / `invoices` / `payment_links` / `customers`, and the
// unique constraint on `payments.transactionId` makes it safe to call this
// twice for the same payment (see the idempotency check first).

import { getSupabaseAdmin } from './supabaseAdmin.js';

// Maps a gateway's own method vocabulary onto our narrower PaymentMethod
// Postgres enum (CARD | UPI | NETBANKING | WALLET | CASH | CHEQUE).
function mapRazorpayMethod(method) {
  switch ((method || '').toLowerCase()) {
    case 'upi': return 'UPI';
    case 'netbanking': return 'NETBANKING';
    case 'wallet': return 'WALLET';
    case 'card':
    case 'emi':
    default:
      return 'CARD';
  }
}

function mapPaytmMethod(paymentMode) {
  switch ((paymentMode || '').toUpperCase()) {
    case 'UPI': return 'UPI';
    case 'NB': return 'NETBANKING';
    case 'PPI':
    case 'WALLET':
      return 'WALLET';
    case 'CC':
    case 'DC':
    default:
      return 'CARD';
  }
}

export const methodMappers = { razorpay: mapRazorpayMethod, paytm: mapPaytmMethod };

/**
 * @param {object} input
 * @param {'RAZORPAY'|'PAYTM'} input.gateway
 * @param {'captured'|'failed'} input.outcome
 * @param {string} input.transactionId  Gateway's own payment/transaction id — globally unique, used for idempotency.
 * @param {number} input.amount         Rupees (already divided down from paise for Razorpay).
 * @param {string} input.method         One of the PaymentMethod enum values (use methodMappers above).
 * @param {string|null} input.invoiceId
 * @param {string|null} input.paymentLinkId
 * @param {unknown} input.rawPayload    Full webhook/verify payload, stored on payments.gatewayResponse for audit/debugging.
 * @returns {Promise<{ status: 'reconciled'|'already-reconciled'|'recorded-failure'|'skipped', reason?: string, paymentId?: string }>}
 */
export async function reconcilePayment(input) {
  const {
    gateway,
    outcome,
    transactionId,
    amount,
    method,
    invoiceId = null,
    paymentLinkId = null,
    rawPayload = null,
  } = input;

  if (!transactionId) {
    return { status: 'skipped', reason: 'missing transactionId' };
  }
  if (!invoiceId && !paymentLinkId) {
    return { status: 'skipped', reason: 'no invoiceId or paymentLinkId — order was not created with reconciliation metadata' };
  }

  const supabase = getSupabaseAdmin();

  // ---- Idempotency: gateways retry webhooks, and the redirect-flow /
  // webhook flow can both fire for the same payment. transactionId is
  // UNIQUE on `payments`, so a prior successful reconciliation is enough
  // to short-circuit here without touching invoices/payment_links again. ----
  const { data: existing, error: existingError } = await supabase
    .from('payments')
    .select('id, status')
    .eq('transactionId', transactionId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    return { status: 'already-reconciled', paymentId: existing.id };
  }

  // ---- Resolve the invoice or payment link and its company/customer. ----
  let companyId;
  let customerId;
  let resolvedInvoice = null;
  let resolvedLink = null;

  if (invoiceId) {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice) return { status: 'skipped', reason: `invoice ${invoiceId} not found` };
    resolvedInvoice = invoice;
    companyId = invoice.companyId;
    customerId = invoice.customerId;
  }

  if (paymentLinkId) {
    const { data: link, error: linkError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('id', paymentLinkId)
      .maybeSingle();
    if (linkError) throw linkError;
    if (!link) return { status: 'skipped', reason: `payment link ${paymentLinkId} not found` };
    resolvedLink = link;
    companyId = companyId || link.companyId;
    customerId = customerId || link.customerId;
  }

  if (outcome === 'failed') {
    // Record the failed attempt for the audit trail, but don't touch
    // invoice/payment_link/customer state — nothing succeeded.
    const { data: failedPayment, error: insertError } = await supabase
      .from('payments')
      .insert({
        companyId,
        invoiceId,
        paymentLinkId,
        customerId,
        amount,
        method,
        status: 'FAILED',
        gateway,
        transactionId,
        gatewayResponse: rawPayload,
        date: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    await supabase.from('activity_logs').insert({
      companyId,
      userId: null,
      action: 'payment_failed',
      entityType: invoiceId ? 'invoice' : 'payment_link',
      entityId: invoiceId || paymentLinkId,
      description: `${gateway} payment failed (transaction ${transactionId})`,
      metadata: { gateway, transactionId },
    });

    return { status: 'recorded-failure', paymentId: failedPayment.id };
  }

  // ---- outcome === 'captured': record the payment, then cascade updates. ----
  const { data: payment, error: paymentInsertError } = await supabase
    .from('payments')
    .insert({
      companyId,
      invoiceId,
      paymentLinkId,
      customerId,
      amount,
      method,
      status: 'PAID',
      gateway,
      transactionId,
      gatewayResponse: rawPayload,
      date: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (paymentInsertError) throw paymentInsertError;

  if (resolvedInvoice) {
    const newAmountPaid = parseFloat(resolvedInvoice.amountPaid || 0) + amount;
    const newBalance = Math.max(0, parseFloat(resolvedInvoice.total) - newAmountPaid);
    const isPaid = newBalance <= 0;

    const { error: invoiceUpdateError } = await supabase
      .from('invoices')
      .update({
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: isPaid ? 'PAID' : resolvedInvoice.status,
        paidAt: isPaid ? new Date().toISOString() : resolvedInvoice.paidAt,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', resolvedInvoice.id);
    if (invoiceUpdateError) throw invoiceUpdateError;

    await supabase.from('invoice_activities').insert({
      invoiceId: resolvedInvoice.id,
      userId: null,
      action: 'paid',
      description: `Payment of ${amount} received via ${gateway} (auto-reconciled)`,
      metadata: { gateway, transactionId },
    });

    if (isPaid) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('totalInvoices, totalRevenue, outstandingAmount')
        .eq('id', resolvedInvoice.customerId)
        .maybeSingle();
      if (customerError) throw customerError;
      if (customer) {
        const { error: customerUpdateError } = await supabase
          .from('customers')
          .update({
            totalInvoices: (customer.totalInvoices || 0) + 1,
            totalRevenue: parseFloat(customer.totalRevenue || 0) + parseFloat(resolvedInvoice.total),
            outstandingAmount: Math.max(0, parseFloat(customer.outstandingAmount || 0) - amount),
          })
          .eq('id', resolvedInvoice.customerId);
        if (customerUpdateError) throw customerUpdateError;
      }
    }
  }

  if (resolvedLink) {
    const { error: linkUpdateError } = await supabase
      .from('payment_links')
      .update({
        status: 'PAID',
        paymentCount: (resolvedLink.paymentCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', resolvedLink.id);
    if (linkUpdateError) throw linkUpdateError;

    // A payment link not tied to an invoice still needs its own outstanding
    // amount / activity trail touched.
    if (!resolvedInvoice) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('outstandingAmount')
        .eq('id', resolvedLink.customerId)
        .maybeSingle();
      if (customerError) throw customerError;
      if (customer) {
        await supabase
          .from('customers')
          .update({ outstandingAmount: Math.max(0, parseFloat(customer.outstandingAmount || 0) - amount) })
          .eq('id', resolvedLink.customerId);
      }
    }
  }

  await supabase.from('activity_logs').insert({
    companyId,
    userId: null,
    action: 'payment_reconciled',
    entityType: invoiceId ? 'invoice' : 'payment_link',
    entityId: invoiceId || paymentLinkId,
    description: `${gateway} payment of ${amount} auto-reconciled (transaction ${transactionId})`,
    metadata: { gateway, transactionId, amount },
  });

  return { status: 'reconciled', paymentId: payment.id };
}
