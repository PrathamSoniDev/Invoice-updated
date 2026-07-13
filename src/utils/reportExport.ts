import type { CompanyInfo } from '@/types';
import { toast } from 'sonner';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ReportConfig {
  title: string;
  dateRange?: string;
  userName: string;
  company: CompanyInfo;
  summaryCards?: { label: string; value: string; accent?: string }[];
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
  chartData?: { label: string; value: number }[];
}

export function exportCSV(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: { key: string; label: string }[]
): void {
  if (rows.length === 0) return;
  const headers = columns?.length ? columns : Object.keys(rows[0]).map((key) => ({ key, label: key }));
  const csvContent = [
    headers.map((header) => escapeCSVValue(header.label)).join(','),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCSVValue(row[header.key]))
        .join(',')
    ),
  ].join('\n');
  downloadBlob(filename, csvContent, 'text/csv;charset=utf-8;');
}

export function exportExcel(filename: string, config: ReportConfig): void {
  const { company, title, dateRange, userName, columns, rows, summaryCards } = config;
  const html = buildExcelHTML({ company, title, dateRange, userName, columns, rows, summaryCards });
  downloadBlob(filename.replace('.csv', '.xls'), html, 'application/vnd.ms-excel');
}

export function exportPDF(_filename: string, config: ReportConfig): void {
  const { company, title, dateRange, userName, columns, rows, summaryCards, chartData } = config;
  const html = buildPDFHTML({ company, title, dateRange, userName, columns, rows, summaryCards, chartData });
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Please allow popups to download the PDF');
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.print();
  }, 500);
}

function escapeHTML(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCSVValue(value: unknown): string {
  const stringValue = String(value ?? '');
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function buildPDFHTML(config: {
  company: CompanyInfo;
  title: string;
  dateRange?: string;
  userName: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
  summaryCards?: { label: string; value: string; accent?: string }[];
  chartData?: { label: string; value: number }[];
}): string {
  const { company, title, dateRange, userName, columns, rows, summaryCards, chartData } = config;
  const now = new Date().toLocaleString('en-IN');
  const safeCompanyName = escapeHTML(company.name || 'Company');
  const logoHTML = company.logo
    ? `<img src="${escapeHTML(company.logo)}" style="height:48px;object-fit:contain" alt="Logo" />`
    : `<div style="width:48px;height:48px;background:#876CD4;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:20px;">${safeCompanyName[0]}</div>`;

  const summaryHTML = summaryCards?.map((card) => `
    <div style="flex:1;background:#f8f7fc;border:1px solid #e9e5f5;border-radius:8px;padding:16px;margin-right:8px;">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${escapeHTML(card.label)}</div>
      <div style="font-size:20px;font-weight:bold;color:#1f2937;margin-top:4px;">${escapeHTML(card.value)}</div>
    </div>
  `).join('') || '';

  const chartHTML = chartData && chartData.length > 0 ? `
    <div style="margin-top:24px;">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Chart Data</h3>
      <div style="display:flex;align-items:flex-end;height:120px;gap:4px;border-bottom:1px solid #e5e7eb;padding-bottom:0;">
        ${chartData.map((d) => {
          const max = Math.max(...chartData.map((c) => c.value), 1);
          const height = (d.value / max) * 100;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
            <div style="width:100%;background:#876CD4;border-radius:4px 4px 0 0;height:${height}px;min-height:2px;"></div>
            <div style="font-size:9px;color:#6b7280;margin-top:4px;transform:rotate(-45deg);white-space:nowrap;">${escapeHTML(d.label)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  const tableHTML = rows.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:16px;">
      <thead>
        <tr style="background:#876CD4;color:white;">
          ${columns.map((c) => `<th style="padding:8px 12px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHTML(c.label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9f8fc'};border-bottom:1px solid #e5e7eb;page-break-inside:avoid;">
            ${columns.map((c) => `<td style="padding:8px 12px;color:#374151;">${escapeHTML(row[c.key] ?? '-')}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<div style="margin-top:24px;padding:18px;border:1px dashed #d1d5db;border-radius:8px;color:#6b7280;text-align:center;">No report data available for the selected filters.</div>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHTML(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: #1f2937; padding: 40px; }
    @page { margin: 30px; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #876CD4; padding-bottom: 20px; margin-bottom: 24px; }
    .company-info { font-size: 12px; color: #6b7280; line-height: 1.6; }
    .company-info strong { color: #1f2937; font-size: 18px; display: block; margin-bottom: 4px; }
    .report-title { text-align: right; }
    .report-title h1 { font-size: 24px; font-weight: bold; color: #1f2937; }
    .report-title .meta { font-size: 11px; color: #6b7280; margin-top: 8px; line-height: 1.6; }
    .summary { display: flex; margin-top: 24px; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #e5e7eb; padding: 12px 40px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print { .footer { position: fixed; bottom: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoHTML}
      <div class="company-info" style="margin-top:12px;">
        <strong>${safeCompanyName}</strong>
        ${escapeHTML(company.legalName || '')}<br/>
        ${escapeHTML(company.address?.line1 || '')}, ${escapeHTML(company.address?.city || '')}, ${escapeHTML(company.address?.state || '')} ${escapeHTML(company.address?.pincode || '')}<br/>
        GST: ${escapeHTML(company.gstNumber || '-')} | PAN: ${escapeHTML(company.panNumber || '-')}<br/>
        ${escapeHTML(company.website || '')} | ${escapeHTML(company.email || '')} | ${escapeHTML(company.phone || '')}
      </div>
    </div>
    <div class="report-title">
      <h1>${escapeHTML(title)}</h1>
      <div class="meta">
        Exported: ${escapeHTML(now)}<br/>
        ${dateRange ? `Applied Filters: ${escapeHTML(dateRange)}<br/>` : ''}
        Generated by: ${escapeHTML(userName)}
      </div>
    </div>
  </div>
  ${summaryHTML ? `<div class="summary">${summaryHTML}</div>` : ''}
  ${chartHTML}
  ${tableHTML}
  <div class="footer">
    <span>${safeCompanyName} - ${escapeHTML(company.footerText || 'Confidential Business Report')}</span>
    <span>Page <span class="page-num"></span></span>
  </div>
  <script>
    window.onload = function() {
      var pageNum = 1;
      var pageSpan = document.querySelector('.page-num');
      if (pageSpan) pageSpan.textContent = pageNum;
    };
  </script>
</body>
</html>`;
}

function buildExcelHTML(config: {
  company: CompanyInfo;
  title: string;
  dateRange?: string;
  userName: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
  summaryCards?: { label: string; value: string }[];
}): string {
  const { company, title, dateRange, userName, columns, rows, summaryCards } = config;
  const now = new Date().toLocaleString('en-IN');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"></head>
<body>
  <table border="0">
    <tr><td colspan="${columns.length}" style="font-size:18px;font-weight:bold;color:#876CD4;">${company.name}</td></tr>
    <tr><td colspan="${columns.length}" style="font-size:12px;color:#666;">${company.legalName} | GST: ${company.gstNumber} | PAN: ${company.panNumber}</td></tr>
    <tr><td colspan="${columns.length}" style="font-size:14px;font-weight:bold;padding-top:12px;">${title}</td></tr>
    <tr><td colspan="${columns.length}" style="font-size:11px;color:#666;">Generated: ${now} | ${dateRange ? 'Date Range: ' + dateRange + ' | ' : ''}By: ${userName}</td></tr>
    ${summaryCards?.map((c) => `<tr><td style="font-weight:bold;">${c.label}:</td><td>${c.value}</td></tr>`).join('') || ''}
    <tr><td></td></tr>
  </table>
  <table border="1" style="border-collapse:collapse;">
    <tr style="background:#876CD4;color:white;font-weight:bold;">
      ${columns.map((c) => `<td style="padding:6px 10px;">${c.label}</td>`).join('')}
    </tr>
    ${rows.map((row) => `<tr>${columns.map((c) => `<td style="padding:6px 10px;">${row[c.key] ?? '—'}</td>`).join('')}</tr>`).join('')}
  </table>
</body>
</html>`;
}

function downloadBlob(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

