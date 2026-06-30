import { dashboardRepository, DateRange, DashboardSummary, RevenueTrend, ChartDataPoint, TopCustomer, RecentActivity } from '../repositories/dashboard.repository';
import { cache } from '../config/redis';
import config from '../config';
import { emitToCompany } from '../socket';

class DashboardService {
  private getCacheKey(companyId: string, suffix: string): string {
    return `${config.redis.prefix}dashboard:${companyId}:${suffix}`;
  }

  private getDefaultDateRange(type: string): DateRange {
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

  async getSummary(companyId: string, dateRangeType?: string, customDateRange?: DateRange): Promise<DashboardSummary> {
    const cacheKey = this.getCacheKey(companyId, 'summary');
    const cached = await cache.get<DashboardSummary>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || (dateRangeType ? this.getDefaultDateRange(dateRangeType) : undefined);
    const summary = await dashboardRepository.getSummary(companyId, dateRange);

    await cache.set(cacheKey, summary, 300);
    return summary;
  }

  async getRevenueTrend(
    companyId: string,
    dateRangeType: string = 'last30days',
    customDateRange?: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<RevenueTrend[]> {
    const cacheKey = this.getCacheKey(companyId, `revenue-trend:${dateRangeType}:${groupBy}`);
    const cached = await cache.get<RevenueTrend[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const trend = await dashboardRepository.getRevenueTrend(companyId, dateRange.startDate, dateRange.endDate, groupBy);

    await cache.set(cacheKey, trend, 300);
    return trend;
  }

  async getInvoiceTrend(
    companyId: string,
    dateRangeType: string = 'last30days',
    customDateRange?: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ChartDataPoint[]> {
    const cacheKey = this.getCacheKey(companyId, `invoice-trend:${dateRangeType}:${groupBy}`);
    const cached = await cache.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const trend = await dashboardRepository.getInvoiceTrend(companyId, dateRange.startDate, dateRange.endDate, groupBy);

    await cache.set(cacheKey, trend, 300);
    return trend;
  }

  async getCustomerGrowthTrend(
    companyId: string,
    dateRangeType: string = 'last30days',
    customDateRange?: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ChartDataPoint[]> {
    const cacheKey = this.getCacheKey(companyId, `customer-growth:${dateRangeType}:${groupBy}`);
    const cached = await cache.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const trend = await dashboardRepository.getCustomerGrowthTrend(companyId, dateRange.startDate, dateRange.endDate, groupBy);

    await cache.set(cacheKey, trend, 300);
    return trend;
  }

  async getPaymentTrend(
    companyId: string,
    dateRangeType: string = 'last30days',
    customDateRange?: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ChartDataPoint[]> {
    const cacheKey = this.getCacheKey(companyId, `payment-trend:${dateRangeType}:${groupBy}`);
    const cached = await cache.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const trend = await dashboardRepository.getPaymentTrend(companyId, dateRange.startDate, dateRange.endDate, groupBy);

    await cache.set(cacheKey, trend, 300);
    return trend;
  }

  async getCollectionTrend(
    companyId: string,
    dateRangeType: string = 'last30days',
    customDateRange?: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ChartDataPoint[]> {
    const cacheKey = this.getCacheKey(companyId, `collection-trend:${dateRangeType}:${groupBy}`);
    const cached = await cache.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const dateRange = customDateRange || this.getDefaultDateRange(dateRangeType);
    const trend = await dashboardRepository.getCollectionTrend(companyId, dateRange.startDate, dateRange.endDate, groupBy);

    await cache.set(cacheKey, trend, 300);
    return trend;
  }

  async getOutstandingTrend(companyId: string, months: number = 6): Promise<ChartDataPoint[]> {
    const cacheKey = this.getCacheKey(companyId, `outstanding-trend:${months}`);
    const cached = await cache.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const trend = await dashboardRepository.getOutstandingTrend(companyId, months);

    await cache.set(cacheKey, trend, 300);
    return trend;
  }

  async getInvoiceStatusDistribution(companyId: string): Promise<ChartDataPoint[]> {
    const cacheKey = this.getCacheKey(companyId, 'invoice-status-dist');
    const cached = await cache.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const distribution = await dashboardRepository.getInvoiceStatusDistribution(companyId);

    await cache.set(cacheKey, distribution, 300);
    return distribution;
  }

  async getPaymentGatewayUsage(companyId: string): Promise<ChartDataPoint[]> {
    const cacheKey = this.getCacheKey(companyId, 'payment-gateway-usage');
    const cached = await cache.get<ChartDataPoint[]>(cacheKey);
    if (cached) return cached;

    const usage = await dashboardRepository.getPaymentGatewayUsage(companyId);

    await cache.set(cacheKey, usage, 300);
    return usage;
  }

  async getTopCustomersByRevenue(companyId: string, limit: number = 10): Promise<TopCustomer[]> {
    const cacheKey = this.getCacheKey(companyId, `top-customers-revenue:${limit}`);
    const cached = await cache.get<TopCustomer[]>(cacheKey);
    if (cached) return cached;

    const customers = await dashboardRepository.getTopCustomersByRevenue(companyId, limit);

    await cache.set(cacheKey, customers, 300);
    return customers;
  }

  async getTopOutstandingCustomers(companyId: string, limit: number = 10): Promise<TopCustomer[]> {
    const cacheKey = this.getCacheKey(companyId, `top-customers-outstanding:${limit}`);
    const cached = await cache.get<TopCustomer[]>(cacheKey);
    if (cached) return cached;

    const customers = await dashboardRepository.getTopOutstandingCustomers(companyId, limit);

    await cache.set(cacheKey, customers, 300);
    return customers;
  }

  async getRecentActivities(companyId: string, limit: number = 20): Promise<RecentActivity[]> {
    const cacheKey = this.getCacheKey(companyId, `recent-activities:${limit}`);
    const cached = await cache.get<RecentActivity[]>(cacheKey);
    if (cached) return cached;

    const activities = await dashboardRepository.getRecentActivities(companyId, limit);

    await cache.set(cacheKey, activities, 60);
    return activities;
  }

  async getMonthlyComparison(companyId: string): Promise<{ current: number; previous: number; change: number }> {
    const cacheKey = this.getCacheKey(companyId, 'monthly-comparison');
    const cached = await cache.get<{ current: number; previous: number; change: number }>(cacheKey);
    if (cached) return cached;

    const comparison = await dashboardRepository.getMonthlyComparison(companyId);

    await cache.set(cacheKey, comparison, 300);
    return comparison;
  }

  async getYearlyComparison(companyId: string): Promise<{ current: number; previous: number; change: number }> {
    const cacheKey = this.getCacheKey(companyId, 'yearly-comparison');
    const cached = await cache.get<{ current: number; previous: number; change: number }>(cacheKey);
    if (cached) return cached;

    const comparison = await dashboardRepository.getYearlyComparison(companyId);

    await cache.set(cacheKey, comparison, 300);
    return comparison;
  }

  async invalidateDashboardCache(companyId: string): Promise<void> {
    const pattern = `${config.redis.prefix}dashboard:${companyId}:*`;
    await cache.delPattern(pattern);

    emitToCompany(companyId, 'dashboard:updated', { timestamp: new Date().toISOString() });
  }

  async refreshDashboard(companyId: string): Promise<void> {
    await this.invalidateDashboardCache(companyId);
  }

  async getChartData(
    companyId: string,
    chartType: string,
    dateRangeType: string = 'last30days',
    customDateRange?: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ChartDataPoint[] | RevenueTrend[]> {
    switch (chartType) {
      case 'revenue':
        return this.getRevenueTrend(companyId, dateRangeType, customDateRange, groupBy);
      case 'invoices':
        return this.getInvoiceTrend(companyId, dateRangeType, customDateRange, groupBy);
      case 'customers':
        return this.getCustomerGrowthTrend(companyId, dateRangeType, customDateRange, groupBy);
      case 'payments':
        return this.getPaymentTrend(companyId, dateRangeType, customDateRange, groupBy);
      case 'collections':
        return this.getCollectionTrend(companyId, dateRangeType, customDateRange, groupBy);
      case 'outstanding':
        return this.getOutstandingTrend(companyId);
      case 'invoiceStatus':
        return this.getInvoiceStatusDistribution(companyId);
      case 'paymentGateways':
        return this.getPaymentGatewayUsage(companyId);
      default:
        throw new Error(`Unknown chart type: ${chartType}`);
    }
  }
}

export const dashboardService = new DashboardService();
