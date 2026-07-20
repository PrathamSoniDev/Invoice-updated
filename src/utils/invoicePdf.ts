import type { Invoice, CompanyInfo, Customer, BankInfo } from '@/types';
import { formatCurrency, formatDate } from '@/utils';
import { summarizeGst } from '@/utils/gst';
import { toast } from 'sonner';

function escapeHTML(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAddress(address?: { line1: string; line2?: string; city: string; state: string; pincode: string; country: string }): string {
  if (!address) return '';
  return [address.line1, address.line2, [address.city, address.state].filter(Boolean).join(', '), address.pincode, address.country]
    .filter(Boolean)
    .map(escapeHTML)
    .join('<br/>');
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  paid: { bg: '#dcfce7', fg: '#166534' },
  sent: { bg: '#dbeafe', fg: '#1e40af' },
  viewed: { bg: '#e0e7ff', fg: '#3730a3' },
  overdue: { bg: '#fee2e2', fg: '#991b1b' },
  draft: { bg: '#f3f4f6', fg: '#374151' },
  cancelled: { bg: '#f3f4f6', fg: '#6b7280' },
};

/**
 * Builds a standalone, printable HTML tax-invoice document for the given
 * invoice/company/customer. Does not touch the DOM — callers pass the
 * result to a new window (see printInvoicePDF below) or use it directly
 * (e.g. for a future server-side PDF route).
 */
export function buildInvoicePDFHTML(invoice: Invoice, company: CompanyInfo | null, customer: Customer | null, bank?: BankInfo | null): string {
  const safeCompanyName = escapeHTML(company?.name || 'Your Company');
  const logoHTML = company?.logo
    ? `<img src="${escapeHTML(company.logo)}" style="height:52px;object-fit:contain" alt="Logo" />`
    : `<div style="width:52px;height:52px;background:#876CD4;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:22px;">${safeCompanyName[0]}</div>`;

  const status = invoice.status?.toLowerCase() || 'draft';
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.draft;

  const billToName = escapeHTML(customer?.businessName || customer?.name || invoice.customerName || 'Customer');
  const billToContact = customer && customer.businessName && customer.name !== customer.businessName ? `Attn: ${escapeHTML(customer.name)}<br/>` : '';
  const billToAddress = customer?.billingAddress ? formatAddress(customer.billingAddress) : '';
  const billToGst = customer?.gstNumber ? `GSTIN: ${escapeHTML(customer.gstNumber)}<br/>` : '';
  const billToEmail = customer?.email || invoice.customerEmail;
  const billToMobile = customer?.mobile;

  const gst = summarizeGst(invoice.lineItems);
  const hasGstBreakdown = gst.cgstAmount + gst.sgstAmount + gst.igstAmount > 0;
  const taxSummaryRowsHTML = hasGstBreakdown
    ? `${gst.cgstAmount > 0 ? `<tr><td class="label">CGST</td><td class="value">${formatCurrency(gst.cgstAmount)}</td></tr>` : ''}
       ${gst.sgstAmount > 0 ? `<tr><td class="label">SGST</td><td class="value">${formatCurrency(gst.sgstAmount)}</td></tr>` : ''}
       ${gst.igstAmount > 0 ? `<tr><td class="label">IGST</td><td class="value">${formatCurrency(gst.igstAmount)}</td></tr>` : ''}`
    : `<tr><td class="label">Tax</td><td class="value">${formatCurrency(invoice.taxAmount)}</td></tr>`;

  const lineItemsHTML = invoice.lineItems
    .map(
      (item, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9f8fc'};border-bottom:1px solid #e5e7eb;page-break-inside:avoid;">
          <td style="padding:10px 12px;color:#374151;">${escapeHTML(item.description)}</td>
          <td style="padding:10px 12px;color:#374151;text-align:right;">${item.quantity}</td>
          <td style="padding:10px 12px;color:#374151;text-align:right;">${formatCurrency(item.rate)}</td>
          <td style="padding:10px 12px;color:#374151;text-align:right;">${item.discount ? formatCurrency(item.discount) : '-'}</td>
          <td style="padding:10px 12px;color:#374151;text-align:right;">${item.taxRate ? item.taxRate + '%' : '-'}</td>
          <td style="padding:10px 12px;color:#1f2937;text-align:right;font-weight:600;">${formatCurrency(item.amount)}</td>
        </tr>`,
    )
    .join('');

  const bankHTML =
    bank && bank.accountNumber
      ? `
    <div style="margin-top:28px;padding:14px 16px;background:#f8f7fc;border:1px solid #e9e5f5;border-radius:8px;font-size:11px;color:#374151;">
      <div style="font-weight:600;color:#1f2937;margin-bottom:6px;">Payment Details</div>
      Bank: ${escapeHTML(bank.bankName)} &nbsp;|&nbsp; A/C Name: ${escapeHTML(bank.accountName)}<br/>
      A/C No: ${escapeHTML(bank.accountNumber)} &nbsp;|&nbsp; IFSC: ${escapeHTML(bank.ifsc)} &nbsp;|&nbsp; Branch: ${escapeHTML(bank.branch)}
      ${bank.upiId ? `<br/>UPI: ${escapeHTML(bank.upiId)}` : ''}
    </div>`
      : '';

  const notesTermsHTML =
    invoice.notes || invoice.terms
      ? `
    <div style="margin-top:24px;display:flex;gap:24px;">
      ${invoice.notes ? `<div style="flex:1;"><div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Notes</div><div style="font-size:12px;color:#374151;white-space:pre-wrap;">${escapeHTML(invoice.notes)}</div></div>` : ''}
      ${invoice.terms ? `<div style="flex:1;"><div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Terms &amp; Conditions</div><div style="font-size:12px;color:#374151;white-space:pre-wrap;">${escapeHTML(invoice.terms)}</div></div>` : ''}
    </div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHTML(invoice.number)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: #1f2937; padding: 40px; }
    @page { margin: 30px; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #876CD4; padding-bottom: 20px; margin-bottom: 24px; }
    .company-info { font-size: 12px; color: #6b7280; line-height: 1.6; margin-top: 12px; }
    .company-info strong { color: #1f2937; font-size: 18px; display: block; margin-bottom: 4px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 26px; font-weight: bold; color: #1f2937; letter-spacing: 0.5px; }
    .invoice-title .number { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .status-pill { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: ${statusColor.bg}; color: ${statusColor.fg}; }
    .meta-row { display: flex; justify-content: space-between; margin-top: 24px; gap: 24px; }
    .meta-block { flex: 1; }
    .meta-block .label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .meta-block .value { font-size: 12px; color: #374151; line-height: 1.6; }
    table.items { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 24px; }
    table.items thead tr { background: #876CD4; color: white; }
    table.items thead th { padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    table.items thead th.num { text-align: right; }
    .summary { display: flex; justify-content: flex-end; margin-top: 20px; }
    .summary table { width: 280px; font-size: 12px; border-collapse: collapse; }
    .summary td { padding: 6px 4px; color: #374151; }
    .summary td.label { color: #6b7280; }
    .summary td.value { text-align: right; }
    .summary tr.total td { border-top: 2px solid #876CD4; padding-top: 10px; font-size: 15px; font-weight: bold; color: #1f2937; }
    .summary tr.balance td { font-weight: 700; color: #876CD4; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #e5e7eb; padding: 12px 40px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print { .footer { position: fixed; bottom: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoHTML}
      <div class="company-info">
        <strong>${safeCompanyName}</strong>
        ${escapeHTML(company?.legalName || '')}<br/>
        ${formatAddress(company?.address)}<br/>
        GSTIN: ${escapeHTML(company?.gstNumber || '-')} | PAN: ${escapeHTML(company?.panNumber || '-')}<br/>
        ${escapeHTML(company?.email || '')} ${company?.phone ? '| ' + escapeHTML(company.phone) : ''}
      </div>
    </div>
    <div class="invoice-title">
      <h1>TAX INVOICE</h1>
      <div class="number">${escapeHTML(invoice.number)}</div>
      <div class="status-pill">${escapeHTML(status)}</div>
    </div>
  </div>

  <div class="meta-row">
    <div class="meta-block">
      <div class="label">Bill To</div>
      <div class="value">
        <strong style="color:#1f2937;font-size:13px;">${billToName}</strong><br/>
        ${billToContact}
        ${billToGst}
        ${billToAddress}${billToAddress ? '<br/>' : ''}
        ${billToEmail ? escapeHTML(billToEmail) + '<br/>' : ''}
        ${billToMobile ? escapeHTML(billToMobile) : ''}
      </div>
    </div>
    <div class="meta-block" style="max-width:220px;">
      <div class="label">Invoice Details</div>
      <div class="value">
        Issue Date: ${escapeHTML(formatDate(invoice.issueDate))}<br/>
        Due Date: ${escapeHTML(formatDate(invoice.dueDate))}<br/>
        ${invoice.amountPaid ? `Amount Paid: ${formatCurrency(invoice.amountPaid)}<br/>` : ''}
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Discount</th>
        <th class="num">Tax</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML}
    </tbody>
  </table>

  <div class="summary">
    <table>
      <tr><td class="label">Subtotal</td><td class="value">${formatCurrency(invoice.subtotal)}</td></tr>
      ${invoice.discountAmount ? `<tr><td class="label">Discount</td><td class="value">-${formatCurrency(invoice.discountAmount)}</td></tr>` : ''}
      ${taxSummaryRowsHTML}
      <tr class="total"><td>Total</td><td class="value">${formatCurrency(invoice.total)}</td></tr>
      ${invoice.amountPaid ? `<tr><td class="label">Paid</td><td class="value">-${formatCurrency(invoice.amountPaid)}</td></tr>` : ''}
      <tr class="balance"><td>Balance Due</td><td class="value">${formatCurrency(invoice.balance)}</td></tr>
    </table>
  </div>

  ${notesTermsHTML}
  ${bankHTML}

  <div class="footer">
    <span>${safeCompanyName} ${company?.footerText ? '- ' + escapeHTML(company.footerText) : ''}</span>
    <span>Generated ${escapeHTML(new Date().toLocaleString('en-IN'))}</span>
  </div>
</body>
</html>`;
}

/**
 * Opens the invoice PDF HTML in a new window and triggers window.print()
 * (same pattern as exportPDF in reportExport.ts). Used for both the
 * "Download PDF" and "Print" actions — the browser's print dialog offers
 * "Save as PDF" as a destination, which is what actually produces the file.
 */
export function printInvoicePDF(invoice: Invoice, company: CompanyInfo | null, customer: Customer | null, bank?: BankInfo | null): void {
  const html = buildInvoicePDFHTML(invoice, company, customer, bank);
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Please allow popups to download the invoice PDF');
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.print();
  }, 500);
}
