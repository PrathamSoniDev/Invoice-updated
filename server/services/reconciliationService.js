// Shared payment reconciliation logic.

import { getSupabaseAdmin } from './supabaseAdmin.js';
import { sendInvoiceEmail } from './emailService.js';

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


async function generateInvoiceNumberForCompany(supabase, companyId) {
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

  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('companyId', companyId);

  return `INV-${String((count || 0) + 1001).padStart(6, '0')}`;
}


async function createInvoiceForPaymentLink(supabase, link) {
  const number = await generateInvoiceNumberForCompany(supabase, link.companyId);
  const now = new Date().toISOString();

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      companyId: link.companyId,
      customerId: link.customerId,
      number,
      status: 'DRAFT', // flipped to PAID by the normal reconciliation flow just below
      issueDate: now,
      dueDate: now,
      subtotal: link.amount,
      taxAmount: 0,
      discountAmount: 0,
      total: link.amount,
      amountPaid: 0,
      balance: link.amount,
      notes: link.description || null,
      createdById: link.createdById || null,
      updatedById: link.createdById || null,
    })
    .select()
    .single();
  if (invoiceError) throw invoiceError;

  const { error: itemError } = await supabase.from('invoice_items').insert({
    invoiceId: invoice.id,
    description: link.title || link.description || 'Payment',
    quantity: 1,
    rate: link.amount,
    discount: 0,
    taxRate: 0,
    amount: link.amount,
    sortOrder: 0,
  });
  if (itemError) throw itemError;

  await supabase.from('invoice_activities').insert({
    invoiceId: invoice.id,
    userId: null,
    action: 'created',
    description: `Invoice auto-created from payment link "${link.title || link.slug}"`,
  });

  // Attach the invoice to the link so the UI/future lookups reflect it too,
  // not just this one payment's reconciliation.
  const { error: linkAttachError } = await supabase
    .from('payment_links')
    .update({ invoiceId: invoice.id, updatedAt: now })
    .eq('id', link.id);
  if (linkAttachError) {
    console.error('[createInvoiceForPaymentLink] failed to attach invoiceId to payment link:', linkAttachError.message);
  }

  console.log(`[createInvoiceForPaymentLink] created invoice #${number} (${invoice.id}) for payment link ${link.id}`);
  return invoice;
}

// Best-effort email delivery of a paid invoice — never throws, so a
// notification failure can't undo the payment/invoice records already
// committed in reconcilePayment above. Every branch logs explicitly (no
// silent returns) so a missing email is always explainable from the server
// terminal instead of just... not happening with no trace.
async function notifyInvoicePaid(supabase, invoice) {
  try {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name, email, whatsapp, mobile')
      .eq('id', invoice.customerId)
      .maybeSingle();

    if (customerError) {
      console.error('[notifyInvoicePaid] customer lookup failed:', customerError.message);
      return;
    }
    if (!customer) {
      console.error(`[notifyInvoicePaid] no customer found for customerId ${invoice.customerId} — cannot notify`);
      return;
    }
    if (!customer.email) {
      console.error(`[notifyInvoicePaid] customer ${invoice.customerId} (${customer.name}) has no email on file — skipping invoice email`);
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoiceId', invoice.id);

    if (itemsError) {
      console.error('[notifyInvoicePaid] failed to load invoice_items:', itemsError.message);
    }

    const invoicePayload = {
      id: invoice.id,
      number: invoice.number,
      lineItems: items || [],
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      dueDate: invoice.dueDate,
    };

    try {
      await sendInvoiceEmail({ to: customer.email, customerName: customer.name, invoice: invoicePayload });
      console.log(`[notifyInvoicePaid] invoice #${invoice.number} emailed to ${customer.email}`);
    } catch (emailError) {
      console.error('[notifyInvoicePaid] invoice email failed:', emailError.message);
    }
  } catch (notifyError) {
    console.error('[notifyInvoicePaid] unexpected failure:', notifyError.message);
  }
}

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
    invoiceId: inputInvoiceId = null,
    paymentLinkId = null,
    rawPayload = null,
  } = input;

  // Mutable — gets set to the auto-created invoice's id below if a
  // standalone payment link (no invoice attached) is what got paid.
  let invoiceId = inputInvoiceId;

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
    // invoice/payment_link/customer state — nothing succeeded. (No
    // invoice auto-creation here either — no reason to generate an
    // invoice for a payment that never went through.)
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

    // Company-wide (userId: null) — a webhook has no specific logged-in
    // user to attribute this to. Best-effort: a notification write failing
    // should never undo the payment record we already committed above.
    try {
      await supabase.from('notifications').insert({
        companyId,
        userId: null,
        type: 'payment_failed',
        title: 'Payment failed',
        message: resolvedInvoice
          ? `A ${gateway} payment of ₹${amount.toFixed(2)} for invoice ${resolvedInvoice.number || resolvedInvoice.id} failed.`
          : `A ${gateway} payment of ₹${amount.toFixed(2)} failed.`,
        data: { gateway, transactionId, invoiceId, paymentLinkId },
      });
    } catch (notifyError) {
      console.error('[reconcilePayment] failed to write payment_failed notification:', notifyError.message);
    }

    return { status: 'recorded-failure', paymentId: failedPayment.id };
  }

  // ---- outcome === 'captured' ----

  // A standalone payment link (never attached to an invoice) just got paid.
  // Auto-create an invoice for it now, before recording the payment, so the
  // rest of this function (amountPaid/balance/status updates, customer
  // stats, notifications, and the invoice email below) all run exactly as
  // they would for a normal invoice payment — no separate code path needed.
  if (resolvedLink && !resolvedInvoice) {
    try {
      const newInvoice = await createInvoiceForPaymentLink(supabase, resolvedLink);
      resolvedInvoice = newInvoice;
      invoiceId = newInvoice.id;
    } catch (autoInvoiceError) {
      console.error('[reconcilePayment] auto invoice creation for payment link failed:', autoInvoiceError.message);
    }
  }

  // ---- record the payment, then cascade updates. ----
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

  let isPaid = false;

  if (resolvedInvoice) {
    const newAmountPaid = parseFloat(resolvedInvoice.amountPaid || 0) + amount;
    const newBalance = Math.max(0, parseFloat(resolvedInvoice.total) - newAmountPaid);
    isPaid = newBalance <= 0;

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
      // customers.totalInvoices / totalRevenue / outstandingAmount are kept
      // in sync automatically by the `invoices_sync_customer_stats` DB
      // trigger (see migration 20260716120000_customer_invoice_stats_sync.sql)
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

  try {
    if (resolvedInvoice && isPaid) {
      await supabase.from('notifications').insert({
        companyId,
        userId: null,
        type: 'invoice_paid',
        title: 'Invoice paid',
        message: `Invoice ${resolvedInvoice.number || resolvedInvoice.id} was paid in full via ${gateway} (₹${amount.toFixed(2)}).`,
        data: { gateway, transactionId, invoiceId, amount },
      });
    } else if (resolvedLink) {
      await supabase.from('notifications').insert({
        companyId,
        userId: null,
        type: 'payment_received',
        title: 'Payment received',
        message: `A payment of ₹${amount.toFixed(2)} was received via ${gateway}${resolvedLink.title ? ` for "${resolvedLink.title}"` : ''}.`,
        data: { gateway, transactionId, paymentLinkId, amount },
      });
    }
  } catch (notifyError) {
    console.error('[reconcilePayment] failed to write payment notification:', notifyError.message);
  }

  // Once an invoice is fully paid, email it to the customer automatically —
  // this now fires for standalone payment links too, since one gets
  // auto-created for them above before this point.
  if (resolvedInvoice && isPaid) {
    await notifyInvoicePaid(supabase, resolvedInvoice);
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
