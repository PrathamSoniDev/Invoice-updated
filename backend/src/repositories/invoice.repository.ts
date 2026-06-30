import prisma from '../config/database';
import { Invoice, InvoiceItem, InvoiceStatus, Prisma } from '@prisma/client';
import { cache } from '../config/redis';
import config from '../config';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  customer: {
    id: string;
    name: string;
    businessName: string;
    email: string;
    mobile: string;
    gstNumber: string | null;
  };
}

export interface CreateInvoiceData {
  companyId: string;
  customerId: string;
  number: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  total: number;
  balance: number;
  notes?: string;
  terms?: string;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  createdById?: string;
  items: Array<{
    description: string;
    hsnCode?: string;
    quantity: number;
    rate: number;
    discount?: number;
    taxRate: number;
    amount: number;
  }>;
}

export class InvoiceRepository {
  private getCacheKey(companyId: string, id?: string): string {
    return id
      ? `${config.redis.prefix}invoice:${companyId}:${id}`
      : `${config.redis.prefix}invoices:${companyId}`;
  }

  async findById(id: string, companyId: string): Promise<InvoiceWithItems | null> {
    const cacheKey = this.getCacheKey(companyId, id);
    const cached = await cache.get<InvoiceWithItems>(cacheKey);
    if (cached) return cached;

    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        customer: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            mobile: true,
            gstNumber: true,
          },
        },
      },
    });

    if (invoice) {
      await cache.set(cacheKey, invoice, 300);
    }
    return invoice as InvoiceWithItems | null;
  }

  async findByNumber(number: string, companyId: string): Promise<Invoice | null> {
    return prisma.invoice.findFirst({
      where: { number, companyId, deletedAt: null },
    });
  }

  async findMany(companyId: string, params: InvoiceSearchParams = {}): Promise<PaginatedResult<InvoiceWithItems>> {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      customerId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      deletedAt: null,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(startDate && endDate && {
        issueDate: { gte: startDate, lte: endDate },
      }),
      ...(search && {
        OR: [
          { number: { contains: search } },
          { customer: { name: { contains: search } } },
          { customer: { businessName: { contains: search } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          items: true,
          customer: {
            select: {
              id: true,
              name: true,
              businessName: true,
              email: true,
              mobile: true,
              gstNumber: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    const invoice = await prisma.invoice.create({
      data: {
        companyId: data.companyId,
        customerId: data.customerId,
        number: data.number,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount || 0,
        total: data.total,
        amountPaid: 0,
        balance: data.balance,
        notes: data.notes,
        terms: data.terms,
        placeOfSupply: data.placeOfSupply,
        reverseCharge: data.reverseCharge || false,
        createdById: data.createdById,
        status: 'DRAFT',
        items: {
          create: data.items.map((item, index) => ({
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount || 0,
            taxRate: item.taxRate,
            amount: item.amount,
            sortOrder: index,
          })),
        },
      },
    });

    await cache.del(this.getCacheKey(data.companyId));
    return invoice;
  }

  async updateInvoice(id: string, companyId: string, data: Partial<{
    customerId: string;
    issueDate: Date;
    dueDate: Date;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    balance: number;
    notes: string;
    terms: string;
    placeOfSupply: string;
    reverseCharge: boolean;
    updatedById: string;
    status: InvoiceStatus;
    sentAt: Date;
    viewedAt: Date;
    paidAt: Date;
  }>): Promise<Invoice> {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    await cache.del(this.getCacheKey(companyId, id));
    await cache.del(this.getCacheKey(companyId));
    return invoice;
  }

  async softDelete(id: string, companyId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await cache.del(this.getCacheKey(companyId, id));
    await cache.del(this.getCacheKey(companyId));
    return invoice;
  }

  async updateStatus(id: string, companyId: string, status: InvoiceStatus): Promise<Invoice> {
    const updateData: Prisma.InvoiceUpdateInput = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'SENT') {
      updateData.sentAt = new Date();
    }
    if (status === 'VIEWED') {
      updateData.viewedAt = new Date();
    }
    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    await cache.del(this.getCacheKey(companyId, id));
    await cache.del(this.getCacheKey(companyId));
    return invoice;
  }

  async recordPayment(id: string, companyId: string, amount: number): Promise<Invoice> {
    const invoice = await prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findUnique({ where: { id } });
      if (!current) throw new Error('Invoice not found');

      const newAmountPaid = Number(current.amountPaid) + amount;
      const newBalance = Number(current.total) - newAmountPaid;

      let newStatus: InvoiceStatus = current.status;
      if (newBalance <= 0) {
        newStatus = 'PAID';
      } else if (newAmountPaid > 0) {
        newStatus = 'SENT';
      }

      return tx.invoice.update({
        where: { id },
        data: {
          amountPaid: newAmountPaid,
          balance: Math.max(0, newBalance),
          status: newStatus,
          updatedAt: new Date(),
          ...(newStatus === 'PAID' && { paidAt: new Date() }),
        },
      });
    });

    await cache.del(this.getCacheKey(companyId, id));
    await cache.del(this.getCacheKey(companyId));
    return invoice;
  }

  async getNextInvoiceNumber(companyId: string, prefix: string): Promise<string> {
    const settings = await prisma.invoiceSettings.findUnique({
      where: { companyId },
    });

    const nextNumber = settings?.nextNumber || 1001;
    const number = `${prefix}-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

    await prisma.invoiceSettings.update({
      where: { companyId },
      data: { nextNumber: nextNumber + 1 },
    });

    return number;
  }

  async existsByNumber(number: string, companyId: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.InvoiceWhereInput = {
      number,
      companyId,
      deletedAt: null,
      ...(excludeId && { id: { not: excludeId } }),
    };
    const count = await prisma.invoice.count({ where });
    return count > 0;
  }

  async duplicate(id: string, companyId: string, createdById?: string): Promise<Invoice> {
    const original = await this.findById(id, companyId);
    if (!original) throw new Error('Invoice not found');

    const newNumber = await this.getNextInvoiceNumber(companyId, 'INV');

    return this.createInvoice({
      companyId,
      customerId: original.customerId,
      number: newNumber,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: Number(original.subtotal),
      taxAmount: Number(original.taxAmount),
      discountAmount: Number(original.discountAmount),
      total: Number(original.total),
      balance: Number(original.total),
      notes: original.notes || undefined,
      terms: original.terms || undefined,
      placeOfSupply: original.placeOfSupply ?? undefined,
      reverseCharge: original.reverseCharge,
      createdById,
      items: original.items.map(item => ({
        description: item.description,
        hsnCode: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
        amount: Number(item.amount),
      })),
    });
  }

  async getStats(companyId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    totalRevenue: number;
    totalOutstanding: number;
  }> {
    const [total, draft, sent, paid, overdue, revenue, outstanding] = await Promise.all([
      prisma.invoice.count({ where: { companyId, deletedAt: null } }),
      prisma.invoice.count({ where: { companyId, deletedAt: null, status: 'DRAFT' } }),
      prisma.invoice.count({ where: { companyId, deletedAt: null, status: 'SENT' } }),
      prisma.invoice.count({ where: { companyId, deletedAt: null, status: 'PAID' } }),
      prisma.invoice.count({
        where: {
          companyId,
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
      }),
      prisma.invoice.aggregate({
        where: { companyId, deletedAt: null, status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { companyId, deletedAt: null, status: { notIn: ['PAID', 'CANCELLED'] } },
        _sum: { balance: true },
      }),
    ]);

    return {
      total,
      draft,
      sent,
      paid,
      overdue,
      totalRevenue: Number(revenue._sum.total || 0),
      totalOutstanding: Number(outstanding._sum.balance || 0),
    };
  }

  async addActivity(invoiceId: string, action: string, description: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await prisma.invoiceActivity.create({
      data: {
        invoiceId,
        action,
        description,
        userId,
        metadata: (metadata || {}) as any,
      },
    });
  }
}

export const invoiceRepository = new InvoiceRepository();
