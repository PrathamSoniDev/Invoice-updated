import prisma from '../config/database';
import { InvoiceStatus, PaymentStatus, TaxType } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface InvoiceReport {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  customer: {
    id: string;
    name: string;
    businessName: string;
    email: string;
    gstNumber: string | null;
  };
  items: Array<{
    id: string;
    description: string;
    hsnCode: string | null;
    quantity: number;
    rate: number;
    taxRate: number;
    amount: number;
  }>;
}

export interface InvoiceAging {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91plus: number;
}

export interface CustomerRevenueReport {
  id: string;
  name: string;
  businessName: string;
  email: string;
  gstNumber: string | null;
  totalRevenue: number;
  totalInvoices: number;
  outstandingAmount: number;
  paidInvoices: number;
  pendingInvoices: number;
  lastInvoiceDate: Date | null;
  lastPaymentDate: Date | null;
}

export interface PaymentReport {
  id: string;
  transactionId: string;
  amount: number;
  method: string;
  gateway: string | null;
  status: PaymentStatus;
  date: Date;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  invoice: {
    id: string;
    number: string;
  } | null;
}

export interface TaxReport {
  taxType: TaxType;
  taxableAmount: number;
  taxAmount: number;
  invoiceCount: number;
}

export interface GatewaySuccessRate {
  gateway: string;
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
}

export class ReportsRepository {
  async getRevenueReport(companyId: string, dateRange: DateRange): Promise<{
    totalRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    averageInvoiceValue: number;
    revenueByMonth: Array<{ month: string; revenue: number; count: number }>;
  }> {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: 'PAID',
        paidAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: {
        total: true,
        paidAt: true,
      },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.length;
    const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    for (const invoice of invoices) {
      if (!invoice.paidAt) continue;
      const month = invoice.paidAt.toISOString().slice(0, 7);
      const existing = monthlyMap.get(month) || { revenue: 0, count: 0 };
      monthlyMap.set(month, {
        revenue: existing.revenue + Number(invoice.total),
        count: existing.count + 1,
      });
    }

    const revenueByMonth = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, revenue: data.revenue, count: data.count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { totalRevenue, totalInvoices, paidInvoices, averageInvoiceValue, revenueByMonth };
  }

  async getInvoiceReport(companyId: string, dateRange: DateRange, status?: InvoiceStatus): Promise<InvoiceReport[]> {
    const whereClause: Prisma.InvoiceWhereInput = {
      companyId,
      deletedAt: null,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      ...(status && { status }),
    };

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            gstNumber: true,
          },
        },
        items: {
          select: {
            id: true,
            description: true,
            hsnCode: true,
            quantity: true,
            rate: true,
            taxRate: true,
            amount: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      total: Number(inv.total),
      amountPaid: Number(inv.amountPaid),
      balance: Number(inv.balance),
      customer: inv.customer,
      items: inv.items.map((item) => ({
        id: item.id,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        taxRate: Number(item.taxRate),
        amount: Number(item.amount),
      })),
    }));
  }

  async getInvoiceAging(companyId: string): Promise<InvoiceAging> {
    const now = new Date();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [current, aged1to30, aged31to60, aged61to90, aged91plus] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { gte: now },
        },
        _sum: { balance: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { gte: days30, lt: now },
        },
        _sum: { balance: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { gte: days60, lt: days30 },
        },
        _sum: { balance: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { gte: days90, lt: days60 },
        },
        _sum: { balance: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { lt: days90 },
        },
        _sum: { balance: true },
      }),
    ]);

    return {
      current: Number(current._sum.balance || 0),
      days1to30: Number(aged1to30._sum.balance || 0),
      days31to60: Number(aged31to60._sum.balance || 0),
      days61to90: Number(aged61to90._sum.balance || 0),
      days91plus: Number(aged91plus._sum.balance || 0),
    };
  }

  async getCustomerRevenueReport(companyId: string, dateRange: DateRange): Promise<CustomerRevenueReport[]> {
    const customers = await prisma.customer.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        businessName: true,
        email: true,
        gstNumber: true,
        totalRevenue: true,
        totalInvoices: true,
        outstandingAmount: true,
        invoices: {
          where: {
            createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
          },
          select: {
            id: true,
            status: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          where: {
            date: { gte: dateRange.startDate, lte: dateRange.endDate },
          },
          select: { date: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    return customers.map((customer) => {
      const paidInvoices = customer.invoices.filter((i) => i.status === 'PAID').length;
      const pendingInvoices = customer.invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED').length;
      const lastInvoice = customer.invoices[0];
      const lastPayment = customer.payments[0];

      return {
        id: customer.id,
        name: customer.name,
        businessName: customer.businessName,
        email: customer.email,
        gstNumber: customer.gstNumber,
        totalRevenue: Number(customer.totalRevenue),
        totalInvoices: customer.totalInvoices,
        outstandingAmount: Number(customer.outstandingAmount),
        paidInvoices,
        pendingInvoices,
        lastInvoiceDate: lastInvoice?.createdAt || null,
        lastPaymentDate: lastPayment?.date || null,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getOutstandingCustomersReport(companyId: string): Promise<CustomerRevenueReport[]> {
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
        gstNumber: true,
        totalRevenue: true,
        totalInvoices: true,
        outstandingAmount: true,
        invoices: {
          where: {
            status: { notIn: ['PAID', 'CANCELLED'] },
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          select: { date: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { outstandingAmount: 'desc' },
    });

    return customers.map((customer) => {
      const paidInvoices = customer.invoices.filter((i) => i.status === 'PAID').length;
      const pendingInvoices = customer.invoices.length;
      const lastInvoice = customer.invoices[0];
      const lastPayment = customer.payments[0];

      return {
        id: customer.id,
        name: customer.name,
        businessName: customer.businessName,
        email: customer.email,
        gstNumber: customer.gstNumber,
        totalRevenue: Number(customer.totalRevenue),
        totalInvoices: customer.totalInvoices,
        outstandingAmount: Number(customer.outstandingAmount),
        paidInvoices,
        pendingInvoices,
        lastInvoiceDate: lastInvoice?.createdAt || null,
        lastPaymentDate: lastPayment?.date || null,
      };
    });
  }

  async getPaymentReport(companyId: string, dateRange: DateRange, status?: PaymentStatus): Promise<PaymentReport[]> {
    const whereClause: Prisma.PaymentWhereInput = {
      companyId,
      date: { gte: dateRange.startDate, lte: dateRange.endDate },
      ...(status && { status }),
    };

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        invoice: {
          select: { id: true, number: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      transactionId: p.transactionId,
      amount: Number(p.amount),
      method: p.method,
      gateway: p.gateway,
      status: p.status,
      date: p.date,
      customer: p.customer,
      invoice: p.invoice,
    }));
  }

  async getTaxReport(companyId: string, dateRange: DateRange): Promise<TaxReport[]> {
    const taxes = await prisma.invoiceTax.findMany({
      where: {
        invoice: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          paidAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      },
      select: {
        taxType: true,
        taxableAmount: true,
        taxAmount: true,
        invoiceId: true,
      },
    });

    const taxMap = new Map<TaxType, { taxableAmount: number; taxAmount: number; invoices: Set<string> }>();

    for (const tax of taxes) {
      const existing = taxMap.get(tax.taxType) || { taxableAmount: 0, taxAmount: 0, invoices: new Set() };
      existing.taxableAmount += Number(tax.taxableAmount);
      existing.taxAmount += Number(tax.taxAmount);
      existing.invoices.add(tax.invoiceId);
      taxMap.set(tax.taxType, existing);
    }

    return Array.from(taxMap.entries()).map(([taxType, data]) => ({
      taxType,
      taxableAmount: data.taxableAmount,
      taxAmount: data.taxAmount,
      invoiceCount: data.invoices.size,
    }));
  }

  async getGatewayReport(companyId: string, dateRange: DateRange): Promise<GatewaySuccessRate[]> {
    const payments = await prisma.payment.groupBy({
      by: ['gateway'],
      where: {
        companyId,
        date: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    const statusCounts = await prisma.payment.groupBy({
      by: ['gateway', 'status'],
      where: {
        companyId,
        date: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      _count: { id: true },
    });

    const gatewayStats = new Map<string, { total: number; successful: number; failed: number; pending: number }>();

    for (const p of payments) {
      const gateway = p.gateway || 'manual';
      gatewayStats.set(gateway, {
        total: p._count.id,
        successful: 0,
        failed: 0,
        pending: 0,
      });
    }

    for (const sc of statusCounts) {
      const gateway = sc.gateway || 'manual';
      const stats = gatewayStats.get(gateway);
      if (stats) {
        if (sc.status === 'PAID') stats.successful = sc._count.id;
        else if (sc.status === 'FAILED') stats.failed = sc._count.id;
        else if (sc.status === 'PENDING') stats.pending = sc._count.id;
      }
    }

    return Array.from(gatewayStats.entries()).map(([gateway, stats]) => ({
      gateway,
      total: stats.total,
      successful: stats.successful,
      failed: stats.failed,
      pending: stats.pending,
      successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
    }));
  }

  async getRefundReport(companyId: string, dateRange: DateRange): Promise<{
    totalRefunded: number;
    refundCount: number;
    refunds: Array<{ id: string; transactionId: string; amount: number; date: Date; reason?: string }>;
  }> {
    const refunds = await prisma.payment.findMany({
      where: {
        companyId,
        status: 'REFUNDED',
        updatedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: {
        id: true,
        transactionId: true,
        amount: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      totalRefunded: refunds.reduce((sum, r) => sum + Number(r.amount), 0),
      refundCount: refunds.length,
      refunds: refunds.map((r) => ({
        id: r.id,
        transactionId: r.transactionId,
        amount: Number(r.amount),
        date: r.updatedAt,
      })),
    };
  }

  async getInactiveCustomers(companyId: string, months: number = 6): Promise<CustomerRevenueReport[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const customers = await prisma.customer.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { invoices: { none: { createdAt: { gte: cutoffDate } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        businessName: true,
        email: true,
        gstNumber: true,
        totalRevenue: true,
        totalInvoices: true,
        outstandingAmount: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, createdAt: true },
        },
        payments: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true },
        },
      },
    });

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      businessName: customer.businessName,
      email: customer.email,
      gstNumber: customer.gstNumber,
      totalRevenue: Number(customer.totalRevenue),
      totalInvoices: customer.totalInvoices,
      outstandingAmount: Number(customer.outstandingAmount),
      paidInvoices: 0,
      pendingInvoices: 0,
      lastInvoiceDate: customer.invoices[0]?.createdAt || null,
      lastPaymentDate: customer.payments[0]?.date || null,
    }));
  }

  async getMonthlyFinancialSummary(companyId: string, year: number): Promise<Array<{
    month: number;
    revenue: number;
    expenses: number;
    taxCollected: number;
    invoicesIssued: number;
    invoicesPaid: number;
    outstanding: number;
  }>> {
    const result = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const [revenue, invoicesIssued, invoicesPaid, outstanding, taxCollected] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            companyId,
            deletedAt: null,
            status: 'PAID',
            paidAt: { gte: startDate, lte: endDate },
          },
          _sum: { total: true },
        }),
        prisma.invoice.count({
          where: {
            companyId,
            deletedAt: null,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.invoice.count({
          where: {
            companyId,
            deletedAt: null,
            status: 'PAID',
            paidAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.invoice.aggregate({
          where: {
            companyId,
            deletedAt: null,
            status: { notIn: ['PAID', 'CANCELLED'] },
            issueDate: { lte: endDate },
          },
          _sum: { balance: true },
        }),
        prisma.invoiceTax.aggregate({
          where: {
            invoice: {
              companyId,
              deletedAt: null,
              status: 'PAID',
              paidAt: { gte: startDate, lte: endDate },
            },
          },
          _sum: { taxAmount: true },
        }),
      ]);

      result.push({
        month: month + 1,
        revenue: Number(revenue._sum.total || 0),
        expenses: 0,
        taxCollected: Number(taxCollected._sum.taxAmount || 0),
        invoicesIssued,
        invoicesPaid,
        outstanding: Number(outstanding._sum.balance || 0),
      });
    }

    return result;
  }
}

export const reportsRepository = new ReportsRepository();
