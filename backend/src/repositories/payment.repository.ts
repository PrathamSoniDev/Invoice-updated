import prisma from '../config/database';
import { Payment, PaymentStatus, Prisma, PaymentMethod, GatewayType } from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentSearchParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  invoiceId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class PaymentRepository {
  async findById(id: string, companyId: string): Promise<Payment | null> {
    return prisma.payment.findFirst({
      where: { id, companyId },
    });
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { transactionId },
    });
  }

  async findMany(companyId: string, params: PaymentSearchParams = {}): Promise<PaginatedResult<Payment>> {
    const {
      page = 1,
      limit = 20,
      status,
      invoiceId,
      customerId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      companyId,
      ...(status && { status }),
      ...(invoiceId && { invoiceId }),
      ...(customerId && { customerId }),
      ...(startDate && endDate && {
        date: { gte: startDate, lte: endDate },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: { id: true, name: true, email: true, mobile: true },
          },
          invoice: {
            select: { id: true, number: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: {
    companyId: string;
    invoiceId?: string;
    paymentLinkId?: string;
    customerId: string;
    amount: number;
    method: string;
    gateway?: string;
    transactionId: string;
    status?: PaymentStatus;
    gatewayResponse?: any;
  }): Promise<Payment> {
    return prisma.payment.create({
      data: {
        companyId: data.companyId,
        invoiceId: data.invoiceId,
        paymentLinkId: data.paymentLinkId,
        customerId: data.customerId,
        amount: data.amount,
        method: data.method as PaymentMethod,
        gateway: data.gateway as GatewayType | null,
        transactionId: data.transactionId,
        status: data.status || 'PENDING',
        gatewayResponse: data.gatewayResponse,
      },
    });
  }

  async updateStatus(id: string, status: PaymentStatus, gatewayResponse?: any): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
        gatewayResponse,
        updatedAt: new Date(),
      },
    });
  }

  async getStats(companyId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
    totalAmount: number;
  }> {
    const [total, completed, pending, failed, refunded, amountSum] = await Promise.all([
      prisma.payment.count({ where: { companyId } }),
      prisma.payment.count({ where: { companyId, status: 'PAID' } }),
      prisma.payment.count({ where: { companyId, status: 'PENDING' } }),
      prisma.payment.count({ where: { companyId, status: 'FAILED' } }),
      prisma.payment.count({ where: { companyId, status: 'REFUNDED' } }),
      prisma.payment.aggregate({
        where: { companyId, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      completed,
      pending,
      failed,
      refunded,
      totalAmount: Number(amountSum._sum.amount || 0),
    };
  }
}

export const paymentRepository = new PaymentRepository();
