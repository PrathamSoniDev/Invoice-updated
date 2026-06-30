import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import prisma from '../config/database';
import path from 'path';
import fs from 'fs';

export type ExportFormat = 'json' | 'csv' | 'excel' | 'pdf';

export interface ExportJobData {
  companyId: string;
  userId: string;
  reportType: string;
  format: ExportFormat;
  dateRange?: { startDate: string; endDate: string };
  filters?: Record<string, unknown>;
}

export interface ExportResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filePath?: string;
  fileSize?: number;
  errorMessage?: string;
}

const EXPORT_DIR = path.join(process.cwd(), 'exports');

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

export const exportQueue = new Queue<ExportJobData>('export:queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

const exportWorker = new Worker<ExportJobData, ExportResult>(
  'export:queue',
  async (job: Job<ExportJobData>) => {
    const { companyId, userId, reportType, format, dateRange, filters } = job.data;

    try {
      const data = await fetchReportData(companyId, reportType, dateRange, filters);
      const fileName = `${reportType}_${Date.now()}.${format}`;
      const filePath = path.join(EXPORT_DIR, fileName);

      let fileContent: string | Buffer;
      let mimeType: string;

      switch (format) {
        case 'json':
          fileContent = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          break;
        case 'csv':
          fileContent = convertToCSV(data);
          mimeType = 'text/csv';
          break;
        case 'excel':
          fileContent = convertToCSV(data);
          mimeType = 'application/vnd.ms-excel';
          break;
        case 'pdf':
          fileContent = generateSimplePDF(data, reportType);
          mimeType = 'application/pdf';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      fs.writeFileSync(filePath, fileContent);
      const stats = fs.statSync(filePath);

      await prisma.exportHistory.update({
        where: { id: job.id || '' },
        data: {
          status: 'completed',
          filePath: fileName,
          fileSize: stats.size,
        },
      });

      return {
        id: job.id || '',
        status: 'completed',
        filePath: fileName,
        fileSize: stats.size,
      };
    } catch (error) {
      await prisma.exportHistory.update({
        where: { id: job.id || '' },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

exportWorker.on('completed', (job) => {
  console.log(`Export job ${job.id} completed successfully`);
});

exportWorker.on('failed', (job, err) => {
  console.error(`Export job ${job?.id} failed:`, err.message);
});

async function fetchReportData(
  companyId: string,
  reportType: string,
  dateRange?: { startDate: string; endDate: string },
  filters?: Record<string, unknown>
): Promise<unknown[]> {
  const where: Record<string, unknown> = { companyId };

  if (dateRange) {
    where.createdAt = {
      gte: new Date(dateRange.startDate),
      lte: new Date(dateRange.endDate),
    };
  }

  switch (reportType) {
    case 'invoices':
      return prisma.invoice.findMany({
        where: { ...where, deletedAt: null },
        include: {
          customer: { select: { name: true, businessName: true, email: true } },
          items: true,
        },
      });
    case 'customers':
      return prisma.customer.findMany({
        where: { ...where, deletedAt: null },
      });
    case 'payments':
      return prisma.payment.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true } },
          invoice: { select: { number: true } },
        },
      });
    case 'payment_links':
      return prisma.paymentLink.findMany({
        where: { ...where, deletedAt: null },
        include: {
          customer: { select: { name: true, email: true } },
        },
      });
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

function convertToCSV(data: unknown[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const firstItem = data[0] as Record<string, unknown>;
  const headers = Object.keys(firstItem);

  const rows = data.map((item) => {
    const record = item as Record<string, unknown>;
    return headers.map((header) => {
      let value = record[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function generateSimplePDF(data: unknown[], reportType: string): string {
  return `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${reportType.length + 50} >>
stream
BT
/F1 12 Tf
100 700 Td
(${reportType} Report - ${data.length} records) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${300 + reportType.length}
%%EOF
  `;
}

class ExportService {
  async queueExport(
    companyId: string,
    userId: string,
    reportType: string,
    format: ExportFormat,
    dateRange?: { startDate: Date; endDate: Date },
    filters?: Record<string, unknown>
  ): Promise<{ jobId: string; message: string }> {
    const exportRecord = await prisma.exportHistory.create({
      data: {
        companyId,
        userId,
        reportType,
        format,
        parameters: { dateRange, filters } as any,
        status: 'PENDING',
      },
    });

    const job = await exportQueue.add(
      'export',
      {
        companyId,
        userId,
        reportType,
        format,
        dateRange: dateRange ? {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        } : undefined,
        filters,
      },
      { jobId: exportRecord.id }
    );

    return {
      jobId: exportRecord.id,
      message: 'Export queued for processing',
    };
  }

  async getExportStatus(companyId: string, exportId: string): Promise<ExportResult | null> {
    const record = await prisma.exportHistory.findFirst({
      where: { id: exportId, companyId },
    });

    if (!record) return null;

    return {
      id: record.id,
      status: record.status.toLowerCase() as ExportResult['status'],
      filePath: record.filePath || undefined,
      fileSize: record.fileSize || undefined,
      errorMessage: record.errorMessage || undefined,
    };
  }

  async getExportHistory(companyId: string, limit: number = 20): Promise<Array<{
    id: string;
    reportType: string;
    format: string;
    status: string;
    createdAt: Date;
    fileSize?: number;
  }>> {
    const records = await prisma.exportHistory.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      reportType: r.reportType,
      format: r.format,
      status: r.status,
      createdAt: r.createdAt,
      fileSize: r.fileSize || undefined,
    }));
  }

  async downloadExport(companyId: string, exportId: string): Promise<{ filePath: string; fileName: string; mimeType: string } | null> {
    const record = await prisma.exportHistory.findFirst({
      where: { id: exportId, companyId, status: 'completed' },
    });

    if (!record || !record.filePath) return null;

    const filePath = path.join(EXPORT_DIR, record.filePath);
    if (!fs.existsSync(filePath)) return null;

    const mimeTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      excel: 'application/vnd.ms-excel',
      pdf: 'application/pdf',
    };

    return {
      filePath,
      fileName: `${record.reportType}.${record.format}`,
      mimeType: mimeTypes[record.format] || 'application/octet-stream',
    };
  }

  async cleanupOldExports(maxAgeHours: number = 24): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const oldExports = await prisma.exportHistory.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['completed', 'failed'] },
      },
    });

    let deletedCount = 0;
    for (const exp of oldExports) {
      if (exp.filePath) {
        const filePath = path.join(EXPORT_DIR, exp.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await prisma.exportHistory.delete({ where: { id: exp.id } });
      deletedCount++;
    }

    return deletedCount;
  }
}

export const exportService = new ExportService();
