// Supabase Edge Function: check-overdue-invoices
//
// Intended to run once a day via pg_cron + pg_net (see the cron.schedule()
// snippet in supabase/migrations/20260712140000_add_overdue_reminder_tracking.sql)
// or, if pg_cron isn't available on your plan, via Supabase's dashboard
// "Scheduled Functions" feature — either way, this function does the same
// two things every time it runs:
//
//   1. Flips any SENT/VIEWED invoice whose dueDate has passed to OVERDUE.
//   2. For every OVERDUE invoice, checks the owning company's configurable
//      "days overdue" reminder thresholds (company_settings.reminderThresholds,
//      default {3,7,14}) against how overdue the invoice actually is, and
//      sends a reminder email for the highest threshold newly crossed since
//      the last run — invoices.remindersSent tracks which thresholds have
//      already been handled so nothing is ever double-sent.
//
// Email sending: this reuses the SAME transactional email provider
// (Resend) and HTML-email style as server/services/emailService.js, but
// calls the Resend HTTP API directly rather than importing that file —
// emailService.js is a Node module (uses the `resend` npm SDK) and this
// function runs on Deno, so it can't be imported as-is. RESEND_API_KEY /
// RESEND_DOMAIN below are the same values already configured for the
// Express server.
//
// Auth: this endpoint is invoked by pg_cron/a scheduler, not a logged-in
// user, so there's no Supabase JWT to check. Instead it requires a shared
// secret header (`x-cron-secret`) matching this function's own
// CRON_SECRET environment secret — deploy this function with
// `--no-verify-jwt` and set CRON_SECRET via `supabase secrets set`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildReminderHtml(params: { customerName: string; companyName: string; invoiceNumber: string; dueDate: string; balance: number; daysOverdue: number }): string {
  const { customerName, companyName, invoiceNumber, dueDate, balance, daysOverdue } = params;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:#dc2626;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Payment Reminder</h1>
            <p style="margin:4px 0 0;color:#fee2e2;font-size:13px;">Invoice #${escapeHtml(invoiceNumber)} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 12px;font-size:15px;">Hi <strong>${escapeHtml(customerName)}</strong>,</p>
            <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6;">
              This is a reminder that invoice <strong>#${escapeHtml(invoiceNumber)}</strong> from
              <strong>${escapeHtml(companyName)}</strong>, due on ${escapeHtml(formatDate(dueDate))}, has not been paid yet.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#fef2f2;border-radius:8px;padding:16px;">
              <tr>
                <td style="font-size:13px;color:#6b7280;">Amount Due</td>
                <td style="font-size:18px;font-weight:700;color:#dc2626;text-align:right;">${formatCurrency(balance)}</td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#6b7280;">Please arrange payment at your earliest convenience. If you've already paid, kindly disregard this notice.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #eef0f3;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated reminder from ${escapeHtml(companyName)}.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface OverdueInvoiceRow {
  id: string;
  number: string;
  companyId: string;
  customerId: string;
  dueDate: string;
  balance: string;
  remindersSent: number[] | null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const resendDomain = Deno.env.get('RESEND_DOMAIN') || 'selltechindproductions.in';
  const fromAddress = `InvoiceGen <invoices@${resendDomain}>`;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[check-overdue-invoices] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfiguration' }, 500);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowIso = new Date().toISOString();

  // ---- 1. SENT/VIEWED + past due -> OVERDUE ----------------------------------
  const { data: justOverdue, error: markOverdueError } = await adminClient
    .from('invoices')
    .update({ status: 'OVERDUE' })
    .in('status', ['SENT', 'VIEWED'])
    .lt('dueDate', nowIso)
    .is('deletedAt', null)
    .select('id');

  if (markOverdueError) {
    console.error('[check-overdue-invoices] failed to mark invoices overdue:', markOverdueError.message);
    return json({ error: 'Failed to mark invoices overdue' }, 500);
  }

  // ---- 2. Load every currently-OVERDUE invoice --------------------------------
  const { data: overdueInvoices, error: overdueError } = await adminClient
    .from('invoices')
    .select('id, number, companyId, customerId, dueDate, balance, remindersSent')
    .eq('status', 'OVERDUE')
    .is('deletedAt', null);

  if (overdueError) {
    console.error('[check-overdue-invoices] failed to load overdue invoices:', overdueError.message);
    return json({ error: 'Failed to load overdue invoices' }, 500);
  }

  const invoices = (overdueInvoices || []) as OverdueInvoiceRow[];
  if (invoices.length === 0) {
    return json({ markedOverdue: justOverdue?.length || 0, remindersSent: 0, errors: [] }, 200);
  }

  const companyIds = Array.from(new Set(invoices.map((inv) => inv.companyId)));
  const customerIds = Array.from(new Set(invoices.map((inv) => inv.customerId)));

  const [{ data: settingsRows }, { data: companyRows }, { data: customerRows }] = await Promise.all([
    adminClient.from('company_settings').select('companyId, reminderThresholds').in('companyId', companyIds),
    adminClient.from('companies').select('id, name').in('id', companyIds),
    adminClient.from('customers').select('id, name, email').in('id', customerIds),
  ]);

  const thresholdsByCompany = new Map<string, number[]>();
  for (const row of settingsRows || []) {
    thresholdsByCompany.set(row.companyId, Array.isArray(row.reminderThresholds) && row.reminderThresholds.length > 0 ? row.reminderThresholds : [3, 7, 14]);
  }
  const companyNameById = new Map<string, string>((companyRows || []).map((c) => [c.id, c.name]));
  const customerById = new Map<string, { name: string; email: string }>((customerRows || []).map((c) => [c.id, { name: c.name, email: c.email }]));

  let remindersSentCount = 0;
  const errors: { invoiceId: string; message: string }[] = [];
  const nowMs = Date.now();

  for (const invoice of invoices) {
    try {
      const thresholds = [...(thresholdsByCompany.get(invoice.companyId) || [3, 7, 14])].sort((a, b) => a - b);
      const alreadySent = new Set(invoice.remindersSent || []);
      const daysOverdue = Math.floor((nowMs - new Date(invoice.dueDate).getTime()) / 86_400_000);

      const newlyCrossed = thresholds.filter((t) => daysOverdue >= t && !alreadySent.has(t));
      if (newlyCrossed.length === 0) continue;

      // Send ONE email per run even if multiple thresholds were crossed
      // since the last run (e.g. the cron didn't run for a week) — sending
      // a "3 days overdue" AND a "7 days overdue" email back-to-back would
      // be redundant. We still record every crossed threshold as handled
      // so none of them fire again later.
      const thresholdForEmail = newlyCrossed[newlyCrossed.length - 1];

      const customer = customerById.get(invoice.customerId);
      if (!customer?.email) {
        throw new Error('Customer has no email on file');
      }
      const companyName = companyNameById.get(invoice.companyId) || 'InvoiceGen';

      if (resendApiKey) {
        const html = buildReminderHtml({
          customerName: customer.name || 'Customer',
          companyName,
          invoiceNumber: invoice.number,
          dueDate: invoice.dueDate,
          balance: parseFloat(invoice.balance) || 0,
          daysOverdue,
        });

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: customer.email,
            subject: `Payment Reminder: Invoice ${invoice.number} - ${daysOverdue} Days Overdue`,
            html,
          }),
        });

        if (!resendRes.ok) {
          const errText = await resendRes.text();
          throw new Error(`Resend API error: ${errText}`);
        }
      } else {
        console.warn('[check-overdue-invoices] RESEND_API_KEY not set — skipping actual email send, logging only');
      }

      await adminClient.from('communication_logs').insert({
        companyId: invoice.companyId,
        channel: 'EMAIL',
        recipient: customer.email,
        recipientName: customer.name || 'Customer',
        subject: `Payment Reminder: Invoice ${invoice.number} - ${daysOverdue} Days Overdue`,
        body: `Reminder sent for invoice ${invoice.number}, ${daysOverdue} days overdue, balance ${invoice.balance}.`,
        status: resendApiKey ? 'SENT' : 'FAILED',
        sentAt: resendApiKey ? nowIso : null,
        failedReason: resendApiKey ? null : 'RESEND_API_KEY not configured',
        relatedType: 'invoice',
        relatedId: invoice.id,
        customerId: invoice.customerId,
      });

      await adminClient
        .from('invoices')
        .update({
          remindersSent: [...alreadySent, ...newlyCrossed].filter((v, i, arr) => arr.indexOf(v) === i),
          lastReminderSentAt: nowIso,
        })
        .eq('id', invoice.id);

      remindersSentCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[check-overdue-invoices] reminder failed for invoice ${invoice.id}:`, message);
      errors.push({ invoiceId: invoice.id, message });
    }
  }

  console.log(`[check-overdue-invoices] marked ${justOverdue?.length || 0} overdue, sent ${remindersSentCount} reminder(s), ${errors.length} error(s)`);

  return json(
    {
      markedOverdue: justOverdue?.length || 0,
      remindersSent: remindersSentCount,
      errors,
    },
    200,
  );
});
