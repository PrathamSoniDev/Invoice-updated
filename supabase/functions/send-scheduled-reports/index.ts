// Intended to run on a timer via pg_cron + pg_net (see the cron.schedule()
// snippet at the bottom of


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Mirrors src/utils/reportExport.ts's exportCSV/escapeCSVValue — this
// function runs on Deno, not the browser, so it can't import that file
// directly; same escaping logic, copied.
function escapeCSVValue(value: unknown): string {
  const stringValue = String(value ?? '');
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function buildCSV(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  return [
    columns.map((c) => escapeCSVValue(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => escapeCSVValue(row[c.key])).join(',')),
  ].join('\n');
}

function computeNextSendAt(frequency: string, from: Date): string {
  const next = new Date(from);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

const REPORT_COLUMNS: Record<string, { key: string; label: string }[]> = {
  invoices: [
    { key: 'number', label: 'Invoice #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total' },
    { key: 'balance', label: 'Balance' },
    { key: 'dueDate', label: 'Due Date' },
  ],
  customers: [
    { key: 'name', label: 'Name' },
    { key: 'businessName', label: 'Business' },
    { key: 'email', label: 'Email' },
    { key: 'totalRevenue', label: 'Total Revenue' },
    { key: 'outstandingAmount', label: 'Outstanding' },
  ],
  payments: [
    { key: 'transactionId', label: 'Transaction ID' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' },
  ],
  overview: [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ],
  tax: [
    { key: 'number', label: 'Invoice #' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'taxAmount', label: 'Tax' },
    { key: 'total', label: 'Total' },
  ],
};

// deno-lint-ignore no-explicit-any
async function buildReportRows(
  supabase: any,
  companyId: string,
  reportType: string,
  filters: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const dateRange = filters.dateRange as { from?: string; to?: string } | undefined;
  const dateFrom = dateRange?.from || null;
  const dateTo = dateRange?.to || null;

  if (reportType === 'customers') {
    const { data } = await supabase
      .from('customers')
      .select('name, businessName, email, totalRevenue, outstandingAmount')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .limit(500);
    return data || [];
  }

  if (reportType === 'payments') {
    let query = supabase
      .from('payments')
      .select('transactionId, amount, method, status, date')
      .eq('companyId', companyId)
      .order('date', { ascending: false })
      .limit(500);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    const { data } = await query;
    return data || [];
  }

  if (reportType === 'tax') {
    let query = supabase
      .from('invoices')
      .select('number, subtotal, taxAmount, total')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(500);
    if (dateFrom) query = query.gte('issueDate', dateFrom);
    if (dateTo) query = query.lte('issueDate', dateTo);
    const { data } = await query;
    return data || [];
  }

  if (reportType === 'overview') {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total, status')
      .eq('companyId', companyId)
      .is('deletedAt', null);
    const rows = invoices || [];
    const totalRevenue = rows.reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0);
    const paidRevenue = rows
      .filter((r: any) => r.status === 'PAID')
      .reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0);
    return [
      { metric: 'Total Invoices', value: rows.length },
      { metric: 'Total Revenue', value: totalRevenue.toFixed(2) },
      { metric: 'Paid Revenue', value: paidRevenue.toFixed(2) },
      { metric: 'Outstanding', value: (totalRevenue - paidRevenue).toFixed(2) },
    ];
  }

  // Default / 'invoices'
  let query = supabase
    .from('invoices')
    .select('number, status, total, balance, dueDate, customers!invoices_customerId_fkey(name)')
    .eq('companyId', companyId)
    .is('deletedAt', null)
    .order('createdAt', { ascending: false })
    .limit(500);
  if (dateFrom) query = query.gte('issueDate', dateFrom);
  if (dateTo) query = query.lte('issueDate', dateTo);
  const { data } = await query;
  return (data || []).map((row: any) => ({
    number: row.number,
    customerName: row.customers?.name || '',
    status: row.status,
    total: row.total,
    balance: row.balance,
    dueDate: row.dueDate,
  }));
}

async function sendEmailWithAttachment(params: {
  resendApiKey: string;
  fromAddress: string;
  to: string[];
  subject: string;
  html: string;
  filename: string;
  csvContent: string;
}): Promise<{ id?: string; error?: string }> {
  const base64Content = btoa(unescape(encodeURIComponent(params.csvContent)));

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: [{ filename: params.filename, content: base64Content }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { error: `Resend API error: ${errText}` };
  }
  const result = await response.json();
  return { id: result?.id };
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
    console.error('[send-scheduled-reports] Missing server-side Supabase env vars');
    return json({ error: 'Server misconfiguration' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowIso = new Date().toISOString();
  const { data: dueSchedules, error: dueError } = await supabase
    .from('scheduled_reports')
    .select('*, companies!scheduled_reports_companyId_fkey(name)')
    .eq('isActive', true)
    .lte('nextSendAt', nowIso);

  if (dueError) {
    console.error('[send-scheduled-reports] Failed to query due schedules:', dueError.message);
    return json({ error: 'Failed to query due schedules' }, 500);
  }

  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const schedule of dueSchedules || []) {
    try {
      const columns = REPORT_COLUMNS[schedule.reportType] || REPORT_COLUMNS.invoices;
      const rows = await buildReportRows(supabase, schedule.companyId, schedule.reportType, schedule.filters || {});
      const csv = buildCSV(columns, rows);
      const companyName = schedule.companies?.name || 'InvoiceGen';
      const reportLabel = schedule.reportType.charAt(0).toUpperCase() + schedule.reportType.slice(1);

      let sendResult: { id?: string; error?: string } = {};
      if (resendApiKey) {
        sendResult = await sendEmailWithAttachment({
          resendApiKey,
          fromAddress,
          to: schedule.recipientEmails,
          subject: `${companyName} — ${reportLabel} Report (${schedule.frequency})`,
          html: `<p>Your scheduled <strong>${reportLabel}</strong> report is attached (${rows.length} rows).</p>`,
          filename: `${schedule.reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`,
          csvContent: csv,
        });
        if (sendResult.error) throw new Error(sendResult.error);
      } else {
        console.warn('[send-scheduled-reports] RESEND_API_KEY not set — skipping actual email send, logging only');
      }

      await supabase
        .from('scheduled_reports')
        .update({
          lastSentAt: nowIso,
          nextSendAt: computeNextSendAt(schedule.frequency, new Date()),
        })
        .eq('id', schedule.id);

      await supabase.from('communication_logs').insert({
        companyId: schedule.companyId,
        channel: 'EMAIL',
        recipient: schedule.recipientEmails.join(', '),
        recipientName: companyName,
        subject: `${reportLabel} Report`,
        body: `Scheduled ${reportLabel} report (${schedule.frequency}) — ${rows.length} rows.`,
        status: resendApiKey ? 'SENT' : 'FAILED',
        sentAt: resendApiKey ? nowIso : null,
        failedReason: resendApiKey ? null : 'RESEND_API_KEY not configured',
        relatedType: 'scheduled_report',
        relatedId: schedule.id,
      });

      results.push({ id: schedule.id, status: 'sent' });
    } catch (error) {
      console.error(`[send-scheduled-reports] Failed for schedule ${schedule.id}:`, error);
      results.push({ id: schedule.id, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return json({ processed: results.length, results }, 200);
});
