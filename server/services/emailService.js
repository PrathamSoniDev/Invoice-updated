// Email delivery service built on Resend.
//
//This module reads the Resend API key from process.env only.
// It must NEVER be imported by frontend code. All email sending happens in backend

import { createClient } from "@supabase/supabase-js";
import { Resend } from 'resend';
import sanitizeHtml from 'sanitize-html';

if (!process.env.RESEND_API_KEY) {
  // Fail fast at startup so misconfiguration is obvious during development.
    console.error('[emailService] WARNING: RESEND_API_KEY is not set. Email sending will fail.');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
 * THE single default email template shared by every transactional event
 * (invoice, payment link, invite, and anything added later). Instead of
 * each event owning its own full HTML document, every event now just
 * supplies dynamic pieces — heading, message, an optional content block
 * (an items table, an amount box, etc.), and an optional CTA button — into
 * this one shell. Change the branding/layout here once and every event's
 * email updates automatically.
 *
 * @param {object} params
 * @param {string} params.previewTitle  Shown in the browser tab title and as the small eyebrow line under the logo (e.g. "Invoice #INV-1001", "Payment Request", "You're invited").
 * @param {string} params.greetingName  Name used in the "Hi <name>," line. Falls back to "there".
 * @param {string} [params.heading]     Optional bold headline under the greeting (e.g. "Your invoice is ready").
 * @param {string} [params.introHtml]   Optional short paragraph (pre-built HTML, already escaped by the caller where needed) under the heading.
 * @param {string} [params.contentHtml] Optional dynamic HTML block rendered below the intro — this is where per-event content (invoice table, amount box, etc.) plugs in.
 * @param {string} [params.ctaLabel]    Optional CTA button label. CTA only renders when both ctaLabel and ctaUrl are given.
 * @param {string} [params.ctaUrl]      Optional CTA button destination URL.
 * @param {string} [params.footerNote]  Optional override for the small footer line. Defaults to the standard automated-email note.
 * @param {string} [params.companyName] The sending company's display name — shown in the header and footer instead of a hardcoded brand.
 * @param {string} [params.companyLogo] Optional URL to the company's logo. Rendered in the header in place of the text wordmark when present.
 * @returns {string} A complete HTML email document.
 */
function buildDefaultEmailHtml({ previewTitle, greetingName, heading, introHtml, contentHtml, ctaLabel, ctaUrl, footerNote, companyName, companyLogo }) {
  const brandName = companyName || 'InvoiceGen';

  // Gmail and most other major email clients strip/refuse to load
  // `data:` URI images in HTML email for security reasons — logos
  // uploaded via Settings are stored as base64 data URLs (fine for
  // in-app use, since browsers render those natively), so an <img>
  // pointed at one will simply fail to load in an email and fall back
  // to unstyled alt text. Only use the logo in emails when it's a real
  // hosted URL; otherwise always use the styled white text heading,
  // which is guaranteed to render everywhere.
  const isEmailSafeLogoUrl = typeof companyLogo === 'string' && /^https?:\/\//i.test(companyLogo);

  const headerBrandBlock = isEmailSafeLogoUrl
    ? `<img src="${escapeHtml(companyLogo)}" alt="${escapeHtml(brandName)}" style="display:block;max-height:40px;max-width:220px;" />`
    : `<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${escapeHtml(brandName)}</h1>`;

  const ctaBlock = (ctaLabel && ctaUrl) ? `
          <!-- CTA -->
          <tr>
            <td style="padding:8px 32px 28px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                ${escapeHtml(ctaLabel)}
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">${escapeHtml(ctaUrl)}</p>
            </td>
          </tr>` : '';

  const contentBlock = contentHtml ? `
          <!-- Dynamic content -->
          <tr>
            <td style="padding:8px 32px 8px;">
              ${contentHtml}
            </td>
          </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(previewTitle || brandName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#4f46e5;padding:24px 32px;">
              ${headerBrandBlock}
              <p style="margin:4px 0 0;color:#e0e7ff;font-size:13px;">${escapeHtml(previewTitle || '')}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:16px;">Hi <strong>${escapeHtml(greetingName || 'there')}</strong>,</p>
              ${heading ? `<p style="margin:10px 0 0;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(heading)}</p>` : ''}
              ${introHtml ? `<p style="margin:8px 0 0;font-size:14px;color:#4b5563;line-height:1.6;">${introHtml}</p>` : ''}
            </td>
          </tr>
${contentBlock}
${ctaBlock}
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #eef0f3;">
              <p style="margin:0;font-size:14px;color:#4b5563;">Thank you for your business</p>
              <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">${footerNote ? escapeHtml(footerNote) : `This is an automated email from ${escapeHtml(brandName)}.`}</p>
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
 * Looks up the sending company's display name and logo, used to brand the
 * single default email template dynamically. Falls back to the InvoiceGen
 * name when the company can't be found or has no logo set.
 *
 * @param {string|undefined} companyId
 * @returns {Promise<{ name: string, logo: string|null }>}
 */
async function getCompanyBranding(companyId) {
  if (!companyId) return { name: 'InvoiceGen', logo: null };

  const { data, error } = await supabase
    .from('companies')
    .select('name, logo')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !data) {
    return { name: 'InvoiceGen', logo: null };
  }

  return { name: data.name || 'InvoiceGen', logo: data.logo || null };
}

/**
 * Builds just the dynamic inner content block for an invoice email (meta
 * row, line-items table, totals) — the piece that plugs into
 * buildDefaultEmailHtml's `contentHtml` slot.
 *
 * @param {object} invoice
 * @returns {string}
 */
function buildInvoiceContentBlock(invoice) {
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

  return `
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-left:auto;max-width:280px;margin-top:8px;">
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
    </table>`;
}

/**
 * Builds just the dynamic inner content block for a payment-link email (the
 * amount-due box) — plugs into buildDefaultEmailHtml's `contentHtml` slot.
 *
 * @param {object} paymentLink  { amount, expiryDate, ... }
 * @returns {string}
 */
function buildPaymentLinkContentBlock(paymentLink) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Amount Due</p>
          <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#4f46e5;">${formatCurrency(paymentLink.amount)}</p>
          ${paymentLink.expiryDate ? `<p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Valid until ${escapeHtml(formatDate(paymentLink.expiryDate))}</p>` : ''}
        </td>
      </tr>
    </table>`;
}

// {variables}

// reminderVariables:{
// customer_name,
// invoice_number,
// amount,
// due_date
// }

// paymentReceiveVariables:{
// customer_name,
// amount,
// invoice_number
// }

// const invoiceVariables = {
//   customer_name: customerName,
//   invoice_number: invoice.number,
//   amount: formatCurrency(invoice.total),
//   due_date: formatDate(invoice.dueDate),
//   company_name: "InvoiceGen",
//   payment_link: invoice.paymentLink || "",
// }

/**
 * Looks up the company's currently active custom email template, if any.
 * A company can have at most 2 custom templates per channel, of which at
 * most one is active at a time (enforced in reportsCommunicationService.ts
 * when activating a template). When none is active — including a company
 * that has never created a custom template — this returns null, which
 * every send function below treats as "use the single default template."
 *
 * @param {string|undefined} companyId
 * @returns {Promise<object|null>}
 */
async function getActiveEmailTemplate(companyId) {
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("companyId", companyId)
    .eq("channel", "EMAIL")
    .eq("isActive", true)
    .order("updatedAt", { ascending: false })
    .limit(1);

  if (error) {
    console.log('[emailService] Failed to look up active email template:', error.message);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

function replaceVariables(text, variables) {
  if (!text) return "";

  let result = text;

  Object.entries(variables).forEach(([key, value]) => {
    result = result.replaceAll(
      `{{${key}}}`,
      value == null ? "" : String(value)
    );
  });

  // Strip any variables that weren't applicable to this event (e.g. a
  // template written for invoices also gets used for a payment link, so
  // {{invoice_number}} has nothing to substitute) — better to silently drop
  // an unresolved placeholder than send a customer a literal "{{...}}".
  result = result.replace(/\{\{\s*[\w.-]+\s*\}\}/g, "");

  return result;
}

// Tags/attributes a company is allowed to use when formatting a custom
// template's message — enough for basic rich text (bold, italic, links,
// lists, headings) without allowing anything that could execute script or
// load remote trackers via event handlers.
const TEMPLATE_HTML_OPTIONS = {
  allowedTags: [
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'br', 'p',
    'ul', 'ol', 'li', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'hr', 'a',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    span: ['style'],
    div: ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Any link a company adds should open in a new tab and not leak referrer
  // info back to InvoiceGen.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};

function textToHtml(text) {
  if (!text) return "";

  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p>${sanitizeHtml(line, TEMPLATE_HTML_OPTIONS)}</p>`)
    .join("");
}

/**
 * Renders the final subject/html for a transactional email event (invoice,
 * invite, payment link, ...). Every event always gets the same branded
 * envelope from buildDefaultEmailHtml — header with the company's name and
 * logo, greeting, structured content (an invoice's line-item table, a
 * payment link's amount-due box), a CTA button (e.g. "Pay Now"), and the
 * footer — regardless of which template governs the wording.
 *
 * The company's active custom template (if any) only replaces the message
 * copy itself (the heading + intro paragraph) with its own subject/body,
 * {{variable}}-substituted. It can NOT omit the structured content block or
 * the CTA button — those are always rendered from the real event data, so a
 * custom "Payment Received" template still gets the item table / amount
 * box and "Pay Now" button just like the default template does.
 *
 * @param {object} params
 * @param {string|undefined} params.companyId
 * @param {object} [params.branding]          Pre-fetched company branding (avoids a duplicate lookup if the caller already has it).
 * @param {object} params.templateVariables   Variables for {{substitution}} in a custom template.
 * @param {string} params.previewTitle
 * @param {string} params.greetingName
 * @param {string} params.defaultSubject      Subject used when there's no active custom template.
 * @param {string} [params.defaultHeading]    Heading used when there's no active custom template.
 * @param {string} [params.defaultIntroHtml]  Intro copy used when there's no active custom template.
 * @param {string} [params.contentHtml]       Always-rendered structured content (item table, amount box) — independent of which template is active.
 * @param {string} [params.ctaLabel]          Always-rendered CTA label (e.g. "Pay Now").
 * @param {string} [params.ctaUrl]            Always-rendered CTA destination — independent of which template is active.
 * @param {string} [params.footerNote]
 * @returns {Promise<{ subject: string, html: string }>}
 */
async function renderEventEmail({
  companyId,
  branding: brandingOverride,
  templateVariables,
  previewTitle,
  greetingName,
  defaultSubject,
  defaultHeading,
  defaultIntroHtml,
  contentHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}) {
  const branding = brandingOverride || await getCompanyBranding(companyId);
  const template = await getActiveEmailTemplate(companyId);

  let subject = defaultSubject;
  let heading = defaultHeading;
  let introHtml = defaultIntroHtml;

  if (template) {
    const templateBodyHtml = textToHtml(replaceVariables(template.body, templateVariables));
    // Only override the default copy if the custom template actually
    // resolved to something — an empty/misconfigured template still falls
    // back to the default wording rather than sending a blank message.
    if (templateBodyHtml) {
      const templateSubject = replaceVariables(template.subject, templateVariables);
      subject = templateSubject || defaultSubject;
      heading = undefined;
      introHtml = templateBodyHtml;
    }
  }

  const html = buildDefaultEmailHtml({
    previewTitle,
    greetingName,
    heading,
    introHtml,
    contentHtml,
    ctaLabel,
    ctaUrl,
    footerNote,
    companyName: branding.name,
    companyLogo: branding.logo,
  });

  return { subject, html };
}

/**
 * Send an invoice email to a customer via Resend.
 *
 * Tries the company's own configured EMAIL template first (Settings ->
 * Communication templates). If the company hasn't configured/activated one,
 * falls back to the single shared default template (buildDefaultEmailHtml)
 * so the email always sends instead of failing outright.
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

  const { data: invoiceDb } = await supabase
    .from("invoices")
    .select("companyId")
    .eq("id", invoice.id)
    .single();

  const companyId = invoiceDb?.companyId;
  const branding = await getCompanyBranding(companyId);

  const templateVariables = {
    customer_name: customerName,
    invoice_number: invoice.number,
    amount: formatCurrency(invoice.total),
    due_date: formatDate(invoice.dueDate),
    company_name: branding.name,
    payment_link: invoice.paymentLink || "",
  }; 

  const templateResult = await renderEventEmail({
    companyId,
    branding,
    templateVariables,
    previewTitle: `Invoice #${invoice.number}`,
    greetingName: customerName,
    defaultSubject: `Invoice #${invoice.number} from ${branding.name}`,
    defaultHeading: 'Your invoice is ready',
    defaultIntroHtml: 'Please find your invoice details below.',
    contentHtml: buildInvoiceContentBlock(invoice),
    ctaLabel: invoice.paymentLink ? 'View & Pay Invoice' : undefined,
    ctaUrl: invoice.paymentLink || undefined,
  });

  const { subject, html } = templateResult;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
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
 * Tries the company's own configured EMAIL template first, and falls back
 * to the single shared default template (buildDefaultEmailHtml) — same
 * pattern as sendInvoiceEmail / sendPaymentLinkEmail — so new companies
 * without a configured template still get a working invite email.
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

  const { data: userDb } = await supabase
    .from("users")
    .select("companyId")
    .eq("email", to)
    .single();

  const companyId = userDb?.companyId;
  const branding = await getCompanyBranding(companyId);
  const brandName = companyName || branding.name;

  const templateVariables = {
    customer_name: name,
    company_name: brandName,
    login_link: loginUrl
  }; 

  // Company-specific templates (message_templates) replace the message
  // copy only — the "Log in" CTA below always renders regardless, so a
  // custom "Welcome" template can't accidentally leave out the login link.
  const templateResult = await renderEventEmail({
    companyId,
    branding,
    templateVariables,
    previewTitle: `You're invited`,
    greetingName: name,
    defaultSubject: `You've been invited to ${brandName}`,
    defaultHeading: `You've been invited to ${brandName}`,
    defaultIntroHtml: `You've been added as a user${brandName ? ` for <strong>${escapeHtml(brandName)}</strong>` : ''}. Click below to log in. If this is your first time signing in, use "Forgot password" on the login page to set your own password.`,
    ctaLabel: `Log in to ${brandName}`,
    ctaUrl: loginUrl,
    footerNote: "If you weren't expecting this invite, you can safely ignore this email.",
  });

  const { subject, html } = templateResult;
   
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
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
 * Send a payment link email to a customer via Resend.
 *
 * Tries the company's own configured EMAIL template first, and falls back
 * to the single shared default template (buildDefaultEmailHtml) — same
 * pattern as sendInvoiceEmail / sendInviteEmail — so payment link emails
 * always send instead of failing when no template is configured.
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

  // paymentLink.linkId is the payment_links.slug (see paymentService.ts),
  // not the row id — look the company up by slug.
  const { data: linkDb } = await supabase
    .from("payment_links")
    .select("companyId")
    .eq("slug", paymentLink.linkId)
    .maybeSingle();

  const companyId = linkDb?.companyId;
  const branding = await getCompanyBranding(companyId);

  const templateVariables = {
    customer_name: customerName,
    amount: formatCurrency(paymentLink.amount),
    payment_link: paymentLink.url,
    company_name: branding.name,
  };

  const description = paymentLink.description || 'Payment request';

  const templateResult = await renderEventEmail({
    companyId,
    branding,
    templateVariables,
    previewTitle: 'Payment Request',
    greetingName: customerName,
    defaultSubject: `Payment Request — ${formatCurrency(paymentLink.amount)}`,
    defaultIntroHtml: `You have a pending payment request${description ? `: ${escapeHtml(description)}` : ''}.`,
    contentHtml: buildPaymentLinkContentBlock(paymentLink),
    ctaLabel: 'Pay Now',
    ctaUrl: paymentLink.url,
  });

  const { subject, html } = templateResult;
  
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
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
