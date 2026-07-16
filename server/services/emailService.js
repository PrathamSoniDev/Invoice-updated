//This module reads the Resend API key from process.env only.
// It must NEVER be imported by frontend code. All email sending happens in backend

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  // Fail fast at startup so misconfiguration is obvious during development.
    console.error('[emailService] WARNING: RESEND_API_KEY is not set. Email sending will fail.');
}

const resend = new Resend(process.env.RESEND_API_KEY);

// The "from" address uses the verified sending domain configured on Resend.
const FROM_ADDRESS = `InvoiceGen <invoices@${process.env.RESEND_DOMAIN || 'selltechindproductions.in'}>`;

/**
 * Format a number as Indian Rupee currency for display in the email.
 * Falls back gracefully if Intl is unavailable.
 *
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  const num = Number(value) || 0;
  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }
  return `₹${num.toFixed(2)}`;
}

/**
 * Format an ISO date string as a readable date (e.g. "5 July 2026").
 *
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Escape a string for safe insertion into HTML text content.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  // Build entities via concatenation so the literal characters are not
  // decoded/mangled by tooling. Each replacement maps a character to its
  // HTML entity equivalent.
  const AMP = '&' + 'amp;';
  const LT = '&' + 'lt;';
  const GT = '&' + 'gt;';
  const QUOT = '&' + 'quot;';
  const APOS = '&' + '#39;';
  return String(str)
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT)
    .replace(/'/g, APOS);
}

/**
 * Build the HTML email body for an invoice.
 *
 * @param {string} customerName
 * @param {object} invoice
 * @returns {string}
 */
function buildInvoiceHtml(customerName, invoice) {
  const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

  const rowsHtml = items
    .map((item) => {
      const description = escapeHtml(item.description || item.name || '—');
      const qty = Number(item.quantity ?? 0);
      const rate = Number(item.rate ?? 0);
      const amount = Number(item.amount ?? qty * rate);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;">${description}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;text-align:center;">${qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;text-align:right;">${formatCurrency(rate)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;text-align:right;">${formatCurrency(amount)}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${escapeHtml(invoice.number)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#4f46e5;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">InvoiceGen</h1>
              <p style="margin:4px 0 0;color:#e0e7ff;font-size:13px;">Invoice #${escapeHtml(invoice.number)}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:16px;">Hi <strong>${escapeHtml(customerName)}</strong>,</p>
              <p style="margin:8px 0 0;font-size:14px;color:#4b5563;">Please find your invoice details below.</p>
            </td>
          </tr>

          <!-- Invoice meta -->
          <tr>
            <td style="padding:8px 32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Invoice Number</td>
                  <td style="font-size:13px;color:#6b7280;text-align:right;">Due Date</td>
                </tr>
                <tr>
                  <td style="font-size:15px;font-weight:600;color:#1f2937;">#${escapeHtml(invoice.number)}</td>
                  <td style="font-size:15px;font-weight:600;color:#1f2937;text-align:right;">${escapeHtml(formatDate(invoice.dueDate))}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items table -->
          <tr>
            <td style="padding:0 32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Description</th>
                    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Rate</th>
                    <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || `
                    <tr>
                      <td colspan="4" style="padding:16px 12px;text-align:center;color:#9ca3af;font-size:13px;">No items</td>
                    </tr>`}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-left:auto;max-width:280px;">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#4b5563;">Subtotal</td>
                  <td style="padding:6px 0;font-size:14px;color:#1f2937;text-align:right;">${formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#4b5563;">Tax</td>
                  <td style="padding:6px 0;font-size:14px;color:#1f2937;text-align:right;">${formatCurrency(invoice.taxAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#1f2937;border-top:2px solid #4f46e5;">Total</td>
                  <td style="padding:12px 0 0;font-size:18px;font-weight:700;color:#4f46e5;border-top:2px solid #4f46e5;text-align:right;">${formatCurrency(invoice.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #eef0f3;">
              <p style="margin:0;font-size:14px;color:#4b5563;">Thank you for your business</p>
              <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">This is an automated email from InvoiceGen.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send an invoice email to a customer via Resend.
 *
 * @param {object} params
 * @param {string} params.to            Recipient email address.
 * @param {string} params.customerName   Customer's display name for the greeting.
 * @param {object} params.invoice        Invoice object (number, lineItems, subtotal, taxAmount, total, dueDate).
 * @returns {Promise<{ id: string }>}    Resend message id on success.
 * @throws {Error} If Resend returns an error or the API key is missing.
 */
export async function sendInvoiceEmail({ to, customerName, invoice }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured on the server.');
  }
  if (!to || typeof to !== 'string') {
    throw new Error('A valid recipient email address ("to") is required.');
  }
  if (!invoice || !invoice.number) {
    throw new Error('A valid invoice object with a "number" is required.');
  }

  const html = buildInvoiceHtml(customerName, invoice);

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Invoice #${invoice.number}`,
    html,
  });

  if (error) {
    console.error('[emailService] Resend send failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`[emailService] Invoice #${invoice.number} sent to ${to} (id: ${data?.id})`);
  return { id: data?.id };
}

/**
 * Sends a welcome/invite email to a newly-created user, with a link to log
 * in. Does NOT include the admin-set password in plaintext — the recipient
 * uses "Forgot password" on first login if they weren't told it separately,
 * which is the safer default for anything sent over email.
 *
 * @param {{ to: string, name: string, companyName: string, loginUrl: string }} params
 */
export async function sendInviteEmail({ to, name, companyName, loginUrl }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured on the server.');
  }
  if (!to || typeof to !== 'string') {
    throw new Error('A valid recipient email address ("to") is required.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f8fafc; padding:32px 0; margin:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#a855f7); height:6px;"></td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">You've been invited to InvoiceGen</h1>
                    <p style="margin:0 0 8px; font-size:14px; color:#374151;">Hi ${name || 'there'},</p>
                    <p style="margin:0 0 20px; font-size:14px; color:#374151; line-height:1.6;">
                      You've been added as a user${companyName ? ` for <strong>${companyName}</strong>` : ''} on InvoiceGen.
                      Click below to log in. If this is your first time signing in, use "Forgot password" on the login page to set your own password.
                    </p>
                    <a href="${loginUrl}" style="display:inline-block; background:#7c3aed; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:8px; font-size:14px; font-weight:600;">
                      Log in to InvoiceGen
                    </a>
                    <p style="margin:24px 0 0; font-size:12px; color:#9ca3af;">
                      If you weren't expecting this invite, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `You've been invited to InvoiceGen`,
    html,
  });

  if (error) {
    console.error('[emailService] Invite email failed:', error.message);
    throw new Error(`Failed to send invite email: ${error.message}`);
  }

  console.log(`[emailService] Invite sent to ${to} (id: ${data?.id})`);
  return { id: data?.id };
}

/**
 * Build the HTML email body for a payment link.
 *
 * @param {string} customerName
 * @param {object} paymentLink  { linkId, amount, currency, url, expiryDate, description }
 * @returns {string}
 */
function buildPaymentLinkHtml(customerName, paymentLink) {
  const description = escapeHtml(paymentLink.description || 'Payment request');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#4f46e5;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">InvoiceGen</h1>
              <p style="margin:4px 0 0;color:#e0e7ff;font-size:13px;">Payment Request</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:16px;">Hi <strong>${escapeHtml(customerName)}</strong>,</p>
              <p style="margin:8px 0 0;font-size:14px;color:#4b5563;">You have a pending payment request${description ? `: ${description}` : ''}.</p>
            </td>
          </tr>

          <!-- Amount -->
          <tr>
            <td style="padding:16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Amount Due</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#4f46e5;">${formatCurrency(paymentLink.amount)}</p>
                    ${paymentLink.expiryDate ? `<p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Valid until ${escapeHtml(formatDate(paymentLink.expiryDate))}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:8px 32px 28px;text-align:center;">
              <a href="${paymentLink.url}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Pay Now
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">${escapeHtml(paymentLink.url)}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #eef0f3;">
              <p style="margin:0;font-size:14px;color:#4b5563;">Thank you for your business</p>
              <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">This is an automated email from InvoiceGen.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a payment link email to a customer via Resend.
 *
 * @param {object} params
 * @param {string} params.to            Recipient email address.
 * @param {string} params.customerName  Customer's display name for the greeting.
 * @param {object} params.paymentLink   { linkId, amount, currency, url, expiryDate, description }
 * @returns {Promise<{ id: string }>}   Resend message id on success.
 * @throws {Error} If Resend returns an error or the API key is missing.
 */
export async function sendPaymentLinkEmail({ to, customerName, paymentLink }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured on the server.');
  }
  if (!to || typeof to !== 'string') {
    throw new Error('A valid recipient email address ("to") is required.');
  }
  if (!paymentLink || !paymentLink.url) {
    throw new Error('A valid paymentLink object with a "url" is required.');
  }

  const html = buildPaymentLinkHtml(customerName, paymentLink);

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Payment Request — ${formatCurrency(paymentLink.amount)}`,
    html,
  });

  if (error) {
    console.error('[emailService] Payment link send failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`[emailService] Payment link ${paymentLink.linkId} sent to ${to} (id: ${data?.id})`);
  return { id: data?.id };
}

export default { sendInvoiceEmail, sendInviteEmail, sendPaymentLinkEmail };
