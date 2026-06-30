import { reportsRepository, DateRange, InvoiceReport, CustomerRevenueReport, PaymentReport, TaxReport, GatewaySuccessRate, InvoiceAging } from '../repositories/reports.repository';
import { cache } from '../config/redis';
import config from '../config';
import prisma from '../config/database';

export interface ReportFilters {
  dateRange: DateRange;
  status?: string;
  customerId?: string;
  gateway?: string;
}

class ReportsService {
  private getCacheKey(companyId: string, reportType: string, suffix?: string): string {
    return `${config.redis.prefix}reports:${companyId}:${reportType}${suffix ? `:${suffix}` : ''}`;
  }

  getDefaultDateRange(type: string): DateRange {
    const now = new Date();
    let startDate: Date;

    switch (type) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }

  async getRevenueReport(companyId: string, dateRangeType: string, customDateRange?: DateRange) {
    const cacheKey = this.getCacheKey(companyId, 'revenue', dateRangeType);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const report = await reportsRepository.getRevenueReport(companyId, dateRange);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getInvoiceReport(companyId: string, dateRangeType: string, customDateRange?: DateRange, status?: string): Promise<InvoiceReport[]> {
    const cacheKey = this.getCacheKey(companyId, 'invoices', `${dateRangeType}:${status || 'all'}`);
    const cached = await cache.get<InvoiceReport[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const report = await reportsRepository.getInvoiceReport(companyId, dateRange, status as any);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getInvoiceAgingReport(companyId: string): Promise<InvoiceAging> {
    const cacheKey = this.getCacheKey(companyId, 'invoice-aging');
    const cached = await cache.get<InvoiceAging>(cacheKey);
    if (cached) return cached;

    const aging = await reportsRepository.getInvoiceAging(companyId);

    await cache.set(cacheKey, aging, 300);
    return aging;
  }

  async getCustomerRevenueReport(companyId: string, dateRangeType: string, customDateRange?: DateRange): Promise<CustomerRevenueReport[]> {
    const cacheKey = this.getCacheKey(companyId, 'customer-revenue', dateRangeType);
    const cached = await cache.get<CustomerRevenueReport[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const report = await reportsRepository.getCustomerRevenueReport(companyId, dateRange);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getOutstandingCustomersReport(companyId: string): Promise<CustomerRevenueReport[]> {
    const cacheKey = this.getCacheKey(companyId, 'outstanding-customers');
    const cached = await cache.get<CustomerRevenueReport[]>(cacheKey);
    if (cached) return cached;

    const report = await reportsRepository.getOutstandingCustomersReport(companyId);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getPaymentReport(companyId: string, dateRangeType: string, customDateRange?: DateRange, status?: string): Promise<PaymentReport[]> {
    const cacheKey = this.getCacheKey(companyId, 'payments', `${dateRangeType}:${status || 'all'}`);
    const cached = await cache.get<PaymentReport[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const report = await reportsRepository.getPaymentReport(companyId, dateRange, status as any);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getTaxReport(companyId: string, dateRangeType: string, customDateRange?: DateRange): Promise<TaxReport[]> {
    const cacheKey = this.getCacheKey(companyId, 'tax', dateRangeType);
    const cached = await cache.get<TaxReport[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const report = await reportsRepository.getTaxReport(companyId, dateRange);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getGatewaySuccessReport(companyId: string, dateRangeType: string, customDateRange?: DateRange): Promise<GatewaySuccessRate[]> {
    const cacheKey = this.getCacheKey(companyId, 'gateway-success', dateRangeType);
    const cached = await cache.get<GatewaySuccessRate[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const report = await reportsRepository.getGatewayReport(companyId, dateRange);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getRefundReport(companyId: string, dateRangeType: string, customDateRange?: DateRange) {
    const cacheKey = this.getCacheKey(companyId, 'refunds', dateRangeType);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const report = await reportsRepository.getRefundReport(companyId, dateRange);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getInactiveCustomersReport(companyId: string, months: number = 6): Promise<CustomerRevenueReport[]> {
    const cacheKey = this.getCacheKey(companyId, `inactive-customers:${months}`);
    const cached = await cache.get<CustomerRevenueReport[]>(cacheKey);
    if (cached) return cached;

    const report = await reportsRepository.getInactiveCustomers(companyId, months);

    await cache.set(cacheKey, report, 300);
    return report;
  }

  async getMonthlyFinancialSummary(companyId: string, year: number) {
    const cacheKey = this.getCacheKey(companyId, `monthly-financial:${year}`);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const summary = await reportsRepository.getMonthlyFinancialSummary(companyId, year);

    await cache.set(cacheKey, summary, 300);
    return summary;
  }

  async invalidateReportsCache(companyId: string): Promise<void> {
    const pattern = `${config.redis.prefix}reports:${companyId}:*`;
    await cache.delPattern(pattern);
  }

  async saveReport(companyId: string, userId: string, reportType: string, config: Record<string, unknown>): Promise<{ id: string }> {
    const saved = await prisma.savedReport.create({
      data: {
        companyId,
        userId,
        name: `${reportType} - ${new Date().toISOString()}`,
        reportType,
        config: config as any,
      },
    });

    return { id: saved.id };
  }

  async getSavedReports(companyId: string): Promise<Array<{ id: string; name: string; reportType: string; lastRunAt: Date | null }>> {
    const reports = await prisma.savedReport.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        reportType: true,
        lastRunAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  async deleteSavedReport(companyId: string, reportId: string): Promise<void> {
    await prisma.savedReport.deleteMany({
      where: { id: reportId, companyId },
    });
  }
}

export const reportsService = new ReportsService();
