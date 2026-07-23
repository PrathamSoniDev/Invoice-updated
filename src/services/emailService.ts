// Frontend service that calls the backend Express server to send invoice
// emails. The actual email delivery (Resend API) happens entirely on the
// backend so the API key never reaches the browser.

import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId } from '@/lib/database';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';


async function logEmailSent(entry: {
  recipient: string;
  recipientName: string;
  subject: string;
  body: string;
  templateName: string;
  relatedType: 'invoice' | 'payment_link';
  relatedId?: string;
  customerId?: string;
}) {
  try {
    const companyId = await getCurrentCompanyId();
    const { error } = await supabase.from('communication_logs').insert({
      companyId,
      channel: 'EMAIL',
      recipient: entry.recipient,
      recipientName: entry.recipientName,
      subject: entry.subject,
      body: entry.body,
      status: 'SENT',
      templateName: entry.templateName,
      sentAt: new Date().toISOString(),
      relatedType: entry.relatedType,
      relatedId: entry.relatedId || null,
      customerId: entry.customerId || null,
    });
    if (error) throw error;
  } catch (logError) {
    console.error('[emailService] Failed to record email in communication_logs:', logError);
  }
}

export interface SendInvoiceEmailInput {
  customerEmail: string;
  customerName: string;
  invoice: {
    id: string,
    number: string;
    lineItems: Array<{
      description?: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    subtotal: number;
    taxAmount: number;
    total: number;
    dueDate: string;
  };
  customerId?: string;
}

export interface SendInvoiceEmailResult {
  success: boolean;
  message: string;
  messageId?: string;
}

/**
 * Sends an invoice email via the backend Resend integration.
 *
 * @throws {Error} if the network request fails or the backend returns a
 *   non-success response. The error message is safe to display to the user.
 */
export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendInvoiceEmailResult> {
  console.debug('[emailService] Sending invoice email via backend:', {
    to: input.customerEmail,
    invoiceNumber: input.invoice.number,
    itemCount: input.invoice.lineItems.length,
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/invoices/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    // fetch() only rejects for network-level failures (server unreachable,
    // CORS blocked, DNS failure, etc.) — not for HTTP error status codes.
    console.error('[emailService] Network error contacting backend:', networkError);
    throw new Error(
      'Could not reach the email server. Please ensure the backend is running on port 4000.',
    );
  }

  let data: SendInvoiceEmailResult;
  try {
    data = (await response.json()) as SendInvoiceEmailResult;
  } catch {
    console.error('[emailService] Backend returned non-JSON response:', response.status);
    throw new Error('The email server returned an unexpected response.');
  }

  if (!response.ok || !data.success) {
    console.error('[emailService] Backend rejected email send:', response.status, data);
    throw new Error(data.message || `Email server error (HTTP ${response.status})`);
  }

  console.debug('[emailService] Invoice email sent successfully:', data);

  await logEmailSent({
    recipient: input.customerEmail,
    recipientName: input.customerName,
    subject: `Invoice ${input.invoice.number}`,
    body: `Invoice ${input.invoice.number} for ${input.invoice.total} sent to ${input.customerEmail}.`,
    templateName: 'Invoice Created',
    relatedType: 'invoice',
    relatedId: input.invoice.id,
    customerId: input.customerId,
  });

  return data;
}

export interface SendPaymentLinkEmailInput {
  customerEmail: string;
  customerName: string;
  paymentLink: {
    linkId: string;
    amount: number;
    currency: string;
    url: string;
    expiryDate?: string;
    description?: string;
  };
  paymentLinkId?: string;
  customerId?: string;
}

export interface SendPaymentLinkEmailResult {
  success: boolean;
  message: string;
  messageId?: string;
}

/**
 * Sends a payment link email via the backend Resend integration.
 *
 * @throws {Error} if the network request fails or the backend returns a
 *   non-success response. The error message is safe to display to the user.
 */
export async function sendPaymentLinkEmail(
  input: SendPaymentLinkEmailInput,
): Promise<SendPaymentLinkEmailResult> {
  console.debug('[emailService] Sending payment link email via backend:', {
    to: input.customerEmail,
    linkId: input.paymentLink.linkId,
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/payment-links/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    console.error('[emailService] Network error contacting backend:', networkError);
    throw new Error(
      'Could not reach the email server. Please ensure the backend is running on port 4000.',
    );
  }

  let data: SendPaymentLinkEmailResult;
  try {
    data = (await response.json()) as SendPaymentLinkEmailResult;
  } catch {
    console.error('[emailService] Backend returned non-JSON response:', response.status);
    throw new Error('The email server returned an unexpected response.');
  }

  if (!response.ok || !data.success) {
    console.error('[emailService] Backend rejected payment link email send:', response.status, data);
    throw new Error(data.message || `Email server error (HTTP ${response.status})`);
  }

  console.debug('[emailService] Payment link email sent successfully:', data);

  await logEmailSent({
    recipient: input.customerEmail,
    recipientName: input.customerName,
    subject: `Payment Request — ${input.paymentLink.amount} ${input.paymentLink.currency}`,
    body: `Payment link for ${input.paymentLink.amount} ${input.paymentLink.currency} sent to ${input.customerEmail}.`,
    templateName: 'Payment Link',
    relatedType: 'payment_link',
    relatedId: input.paymentLinkId,
    customerId: input.customerId,
  });

  return data;
}

export default { sendInvoiceEmail, sendPaymentLinkEmail };
