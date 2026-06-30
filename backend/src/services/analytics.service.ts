import prisma from '../config/database';
import { cache } from '../config/redis';
import config from '../config';

export interface AnalyticsResult {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PeriodComparison {
  currentPeriod: { total: number; count: number; average: number };
  previousPeriod: { total: number; count: number; average: number };
  growth: { total: number; percent: number };
  periodType: string;
}

export interface MovingAverage {
  date: string;
  value: number;
  average: number;
}

class AnalyticsService {
  private getCacheKey(companyId: string, suffix: string): string {
    return `${config.redis.prefix}analytics:${companyId}:${suffix}`;
  }

  async calculateRevenueAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<AnalyticsResult> {
    const cacheKey = this.getCacheKey(companyId, `revenue:${period}`);
    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { currentStart, previousStart, end } = this.getPeriodDates(period);

    const [current, previous] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: currentStart, lt: end },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: previousStart, lt: currentStart },
        },
        _sum: { total: true },
      }),
    ]);

    const currentValue = Number(current._sum.total || 0);
    const previousValue = Number(previous._sum.total || 0);
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    const result: AnalyticsResult = {
      current: currentValue,
      previous: previousValue,
      change,
      changePercent,
      trend,
    };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  async calculateInvoiceAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<AnalyticsResult> {
    const cacheKey = this.getCacheKey(companyId, `invoices:${period}`);
    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { currentStart, previousStart, end } = this.getPeriodDates(period);

    const [current, previous] = await Promise.all([
      prisma.invoice.count({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { gte: currentStart, lt: end },
        },
      }),
      prisma.invoice.count({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { gte: previousStart, lt: currentStart },
        },
      }),
    ]);

    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    const result: AnalyticsResult = {
      current,
      previous,
      change,
      changePercent,
      trend,
    };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  async calculateCustomerAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<AnalyticsResult> {
    const cacheKey = this.getCacheKey(companyId, `customers:${period}`);
    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { currentStart, previousStart, end } = this.getPeriodDates(period);

    const [current, previous] = await Promise.all([
      prisma.customer.count({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { gte: currentStart, lt: end },
        },
      }),
      prisma.customer.count({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { gte: previousStart, lt: currentStart },
        },
      }),
    ]);

    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    const result: AnalyticsResult = {
      current,
      previous,
      change,
      changePercent,
      trend,
    };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  async calculatePaymentAnalytics(companyId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<AnalyticsResult> {
    const cacheKey = this.getCacheKey(companyId, `payments:${period}`);
    const cached = await cache.get<AnalyticsResult>(cacheKey);
    if (cached) return cached;

    const { currentStart, previousStart, end } = this.getPeriodDates(period);

    const [current, previous] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          companyId,
          status: 'PAID',
          date: { gte: currentStart, lt: end },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          companyId,
          status: 'PAID',
          date: { gte: previousStart, lt: currentStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentValue = Number(current._sum.amount || 0);
    const previousValue = Number(previous._sum.amount || 0);
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    const result: AnalyticsResult = {
      current: currentValue,
      previous: previousValue,
      change,
      changePercent,
      trend,
    };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  async calculateAverageInvoiceValue(companyId: string, period: 'month' | 'quarter' | 'year'): Promise<{ value: number; trend: string }> {
    const { currentStart, previousStart, end } = this.getPeriodDates(period);

    const [currentAvg, previousAvg] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: currentStart, lt: end },
        },
        _avg: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: previousStart, lt: currentStart },
        },
        _avg: { total: true },
      }),
    ]);

    const current = Number(currentAvg._avg.total || 0);
    const previous = Number(previousAvg._avg.total || 0);
    const trend = current > previous ? 'up' : current < previous ? 'down' : 'stable';

    return { value: current, trend };
  }

  async calculateCollectionRate(companyId: string, period: 'month' | 'quarter' | 'year'): Promise<{ rate: number; invoicesToTotal: number }> {
    const { currentStart, end } = this.getPeriodDates(period);

    const [invoiced, collected] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          issueDate: { gte: currentStart, lt: end },
        },
        _sum: { total: true },
      }),
      prisma.payment.aggregate({
        where: {
          companyId,
          status: 'PAID',
          date: { gte: currentStart, lt: end },
        },
        _sum: { amount: true },
      }),
    ]);

    const invoiceTotal = Number(invoiced._sum.total || 0);
    const collectionTotal = Number(collected._sum.amount || 0);
    const rate = invoiceTotal > 0 ? (collectionTotal / invoiceTotal) * 100 : 0;

    return { rate, invoicesToTotal: invoiceTotal };
  }

  async calculateOutstandingAnalytics(companyId: string): Promise<{
    total: number;
    byBucket: Array<{ bucket: string; amount: number; count: number }>;
  }> {
    const now = new Date();

    const buckets = [
      { name: 'current', days: 0 },
      { name: '1-30 days', days: 30 },
      { name: '31-60 days', days: 60 },
      { name: '61-90 days', days: 90 },
      { name: '90+ days', days: 999 },
    ];

    const outstandingInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { notIn: ['PAID', 'CANCELLED'] },
        balance: { gt: 0 },
      },
      select: { balance: true, dueDate: true },
    });

    const byBucket = buckets.map((bucket, index) => {
      const prevDays = index > 0 ? buckets[index - 1]!.days : 0;
      let invoices: typeof outstandingInvoices;

      if (bucket.days === 0) {
        invoices = outstandingInvoices.filter((inv) => inv.dueDate >= now);
      } else if (bucket.days === 999) {
        const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        invoices = outstandingInvoices.filter((inv) => inv.dueDate < cutoff);
      } else {
        const start = new Date(now.getTime() - bucket.days * 24 * 60 * 60 * 1000);
        const end = new Date(now.getTime() - prevDays * 24 * 60 * 60 * 1000);
        invoices = outstandingInvoices.filter((inv) => inv.dueDate >= start && inv.dueDate < end);
      }

      return {
        bucket: bucket.name,
        amount: invoices.reduce((sum, inv) => sum + Number(inv.balance), 0),
        count: invoices.length,
      };
    });

    const total = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

    return { total, byBucket };
  }

  async getMovingAverage(companyId: string, metric: 'revenue' | 'payments', window: number = 7): Promise<MovingAverage[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    let data: Array<{ date: Date; value: number }>;

    if (metric === 'revenue') {
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: startDate },
        },
        select: { paidAt: true, total: true },
      });

      data = invoices
        .filter((inv) => inv.paidAt)
        .map((inv) => ({ date: inv.paidAt!, value: Number(inv.total) }));
    } else {
      const payments = await prisma.payment.findMany({
        where: {
          companyId,
          status: 'PAID',
          date: { gte: startDate },
        },
        select: { date: true, amount: true },
      });

      data = payments.map((p) => ({ date: p.date, value: Number(p.amount) }));
    }

    const dailyMap = new Map<string, number>();
    for (const item of data) {
      const dateKey = item.date.toISOString().split('T')[0] || '';
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + item.value);
    }

    const sortedDates = Array.from(dailyMap.keys()).sort();
    const result: MovingAverage[] = [];
    const values: number[] = [];

    for (const date of sortedDates) {
      const value = dailyMap.get(date) || 0;
      values.push(value);

      if (values.length >= window) {
        const windowValues = values.slice(-window);
        const average = windowValues.reduce((a, b) => a + b, 0) / window;
        result.push({ date, value, average });
      } else {
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        result.push({ date, value, average });
      }
    }

    return result;
  }

  async getPeriodComparison(
    companyId: string,
    periodType: 'week' | 'month' | 'quarter' | 'year',
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<PeriodComparison> {
    const [currentData, previousData] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: currentStart, lt: currentEnd },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: previousStart, lt: previousEnd },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    const currentTotal = Number(currentData._sum.total || 0);
    const currentCount = currentData._count.id;
    const previousTotal = Number(previousData._sum.total || 0);
    const previousCount = previousData._count.id;

    return {
      currentPeriod: {
        total: currentTotal,
        count: currentCount,
        average: currentCount > 0 ? currentTotal / currentCount : 0,
      },
      previousPeriod: {
        total: previousTotal,
        count: previousCount,
        average: previousCount > 0 ? previousTotal / previousCount : 0,
      },
      growth: {
        total: currentTotal - previousTotal,
        percent: previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0,
      },
      periodType,
    };
  }

  private getPeriodDates(period: 'week' | 'month' | 'quarter' | 'year'): { currentStart: Date; previousStart: Date; end: Date } {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;

    switch (period) {
      case 'week':
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        currentStart = new Date(now.getFullYear(), quarterMonth, 1);
        previousStart = new Date(now.getFullYear(), quarterMonth - 3, 1);
        break;
      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        break;
    }

    return { currentStart, previousStart, end: now };
  }
}

export const analyticsService = new AnalyticsService();
