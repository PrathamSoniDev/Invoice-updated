import prisma from '../config/database';
import { InvoiceStatus, PaymentStatus, PaymentLinkStatus } from '@prisma/client';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardSummary {
  revenue: {
    total: number;
    monthly: number;
    weekly: number;
    today: number;
  };
  outstanding: number;
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  invoices: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    partial: number;
    overdue: number;
    cancelled: number;
  };
  paymentLinks: {
    total: number;
    active: number;
    expired: number;
  };
  payments: {
    total: number;
    successful: number;
    pending: number;
    failed: number;
  };
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  invoiceCount: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  count?: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  businessName: string;
  email: string;
  totalRevenue: number;
  invoiceCount: number;
  outstandingAmount: number;
}

export interface RecentActivity {
  id: string;
  type: 'invoice' | 'payment' | 'customer' | 'payment_link';
  action: string;
  description: string;
  amount?: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export class DashboardRepository {
  async getSummary(companyId: string, dateRange?: DateRange): Promise<DashboardSummary> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      todayRevenue,
      outstandingSum,
      customerStats,
      invoiceStats,
      paymentLinkStats,
      paymentStats,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId, deletedAt: null, status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: monthStart },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: weekStart },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: todayStart },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
        _sum: { balance: true },
      }),
      this.getCustomerStats(companyId, monthStart),
      this.getInvoiceStats(companyId),
      this.getPaymentLinkStats(companyId),
      this.getPaymentStats(companyId),
    ]);

    return {
      revenue: {
        total: Number(totalRevenue._sum.total || 0),
        monthly: Number(monthlyRevenue._sum.total || 0),
        weekly: Number(weeklyRevenue._sum.total || 0),
        today: Number(todayRevenue._sum.total || 0),
      },
      outstanding: Number(outstandingSum._sum.balance || 0),
      customers: customerStats,
      invoices: invoiceStats,
      paymentLinks: paymentLinkStats,
      payments: paymentStats,
    };
  }

  private async getCustomerStats(companyId: string, monthStart: Date) {
    const [total, active, newThisMonth] = await Promise.all([
      prisma.customer.count({ where: { companyId, deletedAt: null } }),
      prisma.customer.count({ where: { companyId, deletedAt: null, status: 'active' } }),
      prisma.customer.count({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    return { total, active, newThisMonth };
  }

  private async getInvoiceStats(companyId: string) {
    const [total, draft, sent, paid, partial, overdue, cancelled] = await Promise.all([
      prisma.invoice.count({ where: { companyId, deletedAt: null } }),
      prisma.invoice.count({ where: { companyId, deletedAt: null, status: 'DRAFT' } }),
      prisma.invoice.count({ where: { companyId, deletedAt: null, status: 'SENT' } }),
      prisma.invoice.count({ where: { companyId, deletedAt: null, status: 'PAID' } }),
      prisma.invoice.count({
        where: {
          companyId,
          deletedAt: null,
          amountPaid: { gt: 0 },
          status: 'SENT',
        },
      }),
      prisma.invoice.count({
        where: {
          companyId,
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
      }),
      prisma.invoice.count({ where: { companyId, deletedAt: null, status: 'CANCELLED' } }),
    ]);

    return { total, draft, sent, paid, partial, overdue, cancelled };
  }

  private async getPaymentLinkStats(companyId: string) {
    const [total, active, expired] = await Promise.all([
      prisma.paymentLink.count({ where: { companyId, deletedAt: null } }),
      prisma.paymentLink.count({
        where: { companyId, deletedAt: null, status: 'PENDING', expiryDate: { gte: new Date() } },
      }),
      prisma.paymentLink.count({
        where: { companyId, deletedAt: null, status: 'EXPIRED' },
      }),
    ]);

    return { total, active, expired };
  }

  private async getPaymentStats(companyId: string) {
    const [total, successful, pending, failed] = await Promise.all([
      prisma.payment.count({ where: { companyId } }),
      prisma.payment.count({ where: { companyId, status: 'PAID' } }),
      prisma.payment.count({ where: { companyId, status: 'PENDING' } }),
      prisma.payment.count({ where: { companyId, status: 'FAILED' } }),
    ]);

    return { total, successful, pending, failed };
  }

  async getRevenueTrend(companyId: string, startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<RevenueTrend[]> {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: 'PAID',
        paidAt: { gte: startDate, lte: endDate },
      },
      select: {
        total: true,
        paidAt: true,
      },
    });

    const grouped = new Map<string, { revenue: number; count: number }>();

    for (const invoice of invoices) {
      if (!invoice.paidAt) continue;
      const date = this.formatDate(invoice.paidAt, groupBy);
      const existing = grouped.get(date) || { revenue: 0, count: 0 };
      grouped.set(date, {
        revenue: existing.revenue + Number(invoice.total),
        count: existing.count + 1,
      });
    }

    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        invoiceCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getInvoiceTrend(companyId: string, startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ChartDataPoint[]> {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, status: true },
    });

    const grouped = new Map<string, number>();

    for (const invoice of invoices) {
      const date = this.formatDate(invoice.createdAt, groupBy);
      grouped.set(date, (grouped.get(date) || 0) + 1);
    }

    return Array.from(grouped.entries())
      .map(([label, count]) => ({ label, value: count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  async getCustomerGrowthTrend(companyId: string, startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ChartDataPoint[]> {
    const customers = await prisma.customer.findMany({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    });

    const grouped = new Map<string, number>();

    for (const customer of customers) {
      const date = this.formatDate(customer.createdAt, groupBy);
      grouped.set(date, (grouped.get(date) || 0) + 1);
    }

    return Array.from(grouped.entries())
      .map(([label, count]) => ({ label, value: count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  async getPaymentTrend(companyId: string, startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ChartDataPoint[]> {
    const payments = await prisma.payment.findMany({
      where: {
        companyId,
        status: 'PAID',
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, amount: true },
    });

    const grouped = new Map<string, number>();

    for (const payment of payments) {
      const dateStr = this.formatDate(payment.date, groupBy);
      grouped.set(dateStr, (grouped.get(dateStr) || 0) + Number(payment.amount));
    }

    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  async getInvoiceStatusDistribution(companyId: string): Promise<ChartDataPoint[]> {
    const statuses = await prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId, deletedAt: null },
      _count: { id: true },
    });

    return statuses.map((s) => ({
      label: s.status,
      value: s._count.id,
    }));
  }

  async getPaymentGatewayUsage(companyId: string): Promise<ChartDataPoint[]> {
    const payments = await prisma.payment.groupBy({
      by: ['gateway'],
      where: { companyId },
      _count: { id: true },
      _sum: { amount: true },
    });

    return payments.map((p) => ({
      label: p.gateway || 'Manual',
      value: Number(p._sum.amount || 0),
      count: p._count.id,
    }));
  }

  async getTopCustomersByRevenue(companyId: string, limit: number = 10): Promise<TopCustomer[]> {
    const customers = await prisma.customer.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        businessName: true,
        email: true,
        totalRevenue: true,
        totalInvoices: true,
        outstandingAmount: true,
      },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      businessName: c.businessName,
      email: c.email,
      totalRevenue: Number(c.totalRevenue),
      invoiceCount: c.totalInvoices,
      outstandingAmount: Number(c.outstandingAmount),
    }));
  }

  async getTopOutstandingCustomers(companyId: string, limit: number = 10): Promise<TopCustomer[]> {
    const customers = await prisma.customer.findMany({
      where: {
        companyId,
        deletedAt: null,
        outstandingAmount: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        businessName: true,
        email: true,
        totalRevenue: true,
        totalInvoices: true,
        outstandingAmount: true,
      },
      orderBy: { outstandingAmount: 'desc' },
      take: limit,
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      businessName: c.businessName,
      email: c.email,
      totalRevenue: Number(c.totalRevenue),
      invoiceCount: c.totalInvoices,
      outstandingAmount: Number(c.outstandingAmount),
    }));
  }

  async getRecentActivities(companyId: string, limit: number = 20): Promise<RecentActivity[]> {
    const [recentInvoices, recentPayments, recentCustomers, recentLinks] = await Promise.all([
      prisma.invoice.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, number: true, status: true, total: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.payment.findMany({
        where: { companyId },
        select: { id: true, amount: true, status: true, createdAt: true, invoice: { select: { number: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.customer.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, name: true, businessName: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.paymentLink.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, linkId: true, amount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const activities: RecentActivity[] = [];

    for (const inv of recentInvoices) {
      activities.push({
        id: inv.id,
        type: 'invoice',
        action: 'created',
        description: `Invoice ${inv.number} created (${inv.status})`,
        amount: Number(inv.total),
        createdAt: inv.createdAt,
        metadata: { number: inv.number, status: inv.status },
      });
    }

    for (const pay of recentPayments) {
      activities.push({
        id: pay.id,
        type: 'payment',
        action: 'received',
        description: `Payment of ₹${Number(pay.amount)} received for invoice ${pay.invoice?.number || 'N/A'}`,
        amount: Number(pay.amount),
        createdAt: pay.createdAt,
        metadata: { status: pay.status },
      });
    }

    for (const cust of recentCustomers) {
      activities.push({
        id: cust.id,
        type: 'customer',
        action: 'created',
        description: `Customer ${cust.name} (${cust.businessName}) added`,
        createdAt: cust.createdAt,
      });
    }

    for (const link of recentLinks) {
      activities.push({
        id: link.id,
        type: 'payment_link',
        action: 'created',
        description: `Payment link ${link.linkId} created for ₹${Number(link.amount)}`,
        amount: Number(link.amount),
        createdAt: link.createdAt,
        metadata: { status: link.status },
      });
    }

    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  async getCollectionTrend(companyId: string, startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ChartDataPoint[]> {
    const payments = await prisma.payment.findMany({
      where: {
        companyId,
        status: 'PAID',
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, amount: true },
    });

    const grouped = new Map<string, number>();

    for (const payment of payments) {
      const date = this.formatDate(payment.date, groupBy);
      grouped.set(date, (grouped.get(date) || 0) + Number(payment.amount));
    }

    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  async getOutstandingTrend(companyId: string, months: number = 6): Promise<ChartDataPoint[]> {
    const result: ChartDataPoint[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i, 0);
      const outstanding = await prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          dueDate: { lte: monthEnd },
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
        _sum: { balance: true },
      });

      result.push({
        label: monthEnd.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: Number(outstanding._sum.balance || 0),
      });
    }

    return result;
  }

  async getMonthlyComparison(companyId: string): Promise<{ current: number; previous: number; change: number }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [current, previous] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: currentMonthStart },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
        _sum: { total: true },
      }),
    ]);

    const currentValue = Number(current._sum.total || 0);
    const previousValue = Number(previous._sum.total || 0);
    const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

    return { current: currentValue, previous: previousValue, change };
  }

  async getYearlyComparison(companyId: string): Promise<{ current: number; previous: number; change: number }> {
    const now = new Date();
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    const [current, previous] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: currentYearStart },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: previousYearStart, lte: previousYearEnd },
        },
        _sum: { total: true },
      }),
    ]);

    const currentValue = Number(current._sum.total || 0);
    const previousValue = Number(previous._sum.total || 0);
    const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

    return { current: currentValue, previous: previousValue, change };
  }

  private formatDate(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    switch (groupBy) {
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'week':
        const weekNum = this.getWeekNumber(d);
        return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0] || '';
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}

export const dashboardRepository = new DashboardRepository();
