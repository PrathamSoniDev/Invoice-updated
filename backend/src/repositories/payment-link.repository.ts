import prisma from '../config/database';
import { PaymentLink, PaymentLinkStatus, GatewayType, Prisma } from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentLinkSearchParams {
  page?: number;
  limit?: number;
  status?: PaymentLinkStatus;
  customerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class PaymentLinkRepository {
  async findById(id: string, companyId: string): Promise<PaymentLink | null> {
    return prisma.paymentLink.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, email: true, mobile: true } },
      },
    });
  }

  async findByLinkId(linkId: string): Promise<PaymentLink | null> {
    return prisma.paymentLink.findUnique({
      where: { linkId },
      include: {
        customer: true,
        company: { select: { id: true, name: true } },
      },
    });
  }

  async findMany(companyId: string, params: PaymentLinkSearchParams = {}): Promise<PaginatedResult<PaymentLink>> {
    const { page = 1, limit = 20, status, customerId, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentLinkWhereInput = {
      companyId,
      deletedAt: null,
      ...(status && { status }),
      ...(customerId && { customerId }),
    };

    const [data, total] = await Promise.all([
      prisma.paymentLink.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: { select: { id: true, name: true, email: true, mobile: true } },
        },
      }),
      prisma.paymentLink.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: {
    companyId: string;
    linkId: string;
    customerId: string;
    invoiceId?: string;
    amount: number;
    gateway: string;
    description?: string;
    expiryDate: Date;
    gatewayLinkId?: string;
    url?: string;
  }): Promise<PaymentLink> {
    return prisma.paymentLink.create({
      data: {
        companyId: data.companyId,
        linkId: data.linkId,
        customerId: data.customerId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        gateway: data.gateway as GatewayType,
        description: data.description,
        expiryDate: data.expiryDate,
        gatewayLinkId: data.gatewayLinkId,
        url: data.url,
      },
    });
  }

  async updateStatus(id: string, status: PaymentLinkStatus): Promise<PaymentLink> {
    return prisma.paymentLink.update({
      where: { id },
      data: {
        status,
        ...(status === 'PAID' && { paidAt: new Date() }),
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id: string): Promise<PaymentLink> {
    return prisma.paymentLink.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(companyId: string): Promise<{
    total: number;
    pending: number;
    paid: number;
    expired: number;
    totalAmount: number;
  }> {
    const [total, pending, paid, expired, amountSum] = await Promise.all([
      prisma.paymentLink.count({ where: { companyId, deletedAt: null } }),
      prisma.paymentLink.count({ where: { companyId, deletedAt: null, status: 'PENDING' } }),
      prisma.paymentLink.count({ where: { companyId, deletedAt: null, status: 'PAID' } }),
      prisma.paymentLink.count({ where: { companyId, deletedAt: null, status: 'EXPIRED' } }),
      prisma.paymentLink.aggregate({
        where: { companyId, deletedAt: null, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      pending,
      paid,
      expired,
      totalAmount: Number(amountSum._sum.amount || 0),
    };
  }

  async markExpired(): Promise<number> {
    const result = await prisma.paymentLink.updateMany({
      where: {
        status: 'PENDING',
        expiryDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }
}

export const paymentLinkRepository = new PaymentLinkRepository();
