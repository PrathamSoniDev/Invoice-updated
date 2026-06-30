import prisma from '../config/database';
import { Customer, Prisma } from '@prisma/client';
import { cache } from '../config/redis';
import config from '../config';

export interface CustomerSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerWithStats extends Customer {
  invoiceCount: number;
  totalPaid: number;
  totalPending: number;
}

export class CustomerRepository {
  private getCacheKey(companyId: string, id?: string): string {
    return id
      ? `${config.redis.prefix}customer:${companyId}:${id}`
      : `${config.redis.prefix}customers:${companyId}`;
  }

  async findById(id: string, companyId: string): Promise<Customer | null> {
    const cacheKey = this.getCacheKey(companyId, id);
    const cached = await cache.get<Customer>(cacheKey);
    if (cached) return cached;

    const customer = await prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (customer) {
      await cache.set(cacheKey, customer, 300);
    }
    return customer;
  }

  async findByEmail(email: string, companyId: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { email: email.toLowerCase(), companyId, deletedAt: null },
    });
  }

  async findByGST(gstNumber: string, companyId: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { gstNumber, companyId, deletedAt: null },
    });
  }

  async findMany(companyId: string, params: CustomerSearchParams = {}): Promise<PaginatedResult<Customer>> {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      companyId,
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { businessName: { contains: search } },
          { email: { contains: search } },
          { mobile: { contains: search } },
          { gstNumber: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createCustomer(data: {
    companyId: string;
    name: string;
    businessName: string;
    email: string;
    mobile: string;
    gstNumber?: string;
    whatsapp?: string;
    notes?: string;
    billingLine1: string;
    billingLine2?: string;
    billingCity: string;
    billingState: string;
    billingPincode: string;
    billingCountry?: string;
    shippingLine1?: string;
    shippingLine2?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPincode?: string;
    shippingCountry?: string;
    createdById?: string;
  }): Promise<Customer> {
    const customer = await prisma.customer.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        status: 'active',
      },
    });

    await cache.del(this.getCacheKey(data.companyId));
    return customer;
  }

  async updateCustomer(id: string, companyId: string, data: Partial<{
    name: string;
    businessName: string;
    email: string;
    mobile: string;
    gstNumber: string;
    whatsapp: string;
    notes: string;
    status: string;
    billingLine1: string;
    billingLine2: string;
    billingCity: string;
    billingState: string;
    billingPincode: string;
    billingCountry: string;
    shippingLine1: string;
    shippingLine2: string;
    shippingCity: string;
    shippingState: string;
    shippingPincode: string;
    shippingCountry: string;
    updatedById: string;
  }>): Promise<Customer> {
    const updateData: Prisma.CustomerUpdateInput = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.email) {
      (updateData as any).email = data.email.toLowerCase();
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    await cache.del(this.getCacheKey(companyId, id));
    await cache.del(this.getCacheKey(companyId));
    return customer;
  }

  async softDeleteCustomer(id: string, companyId: string): Promise<Customer> {
    const customer = await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await cache.del(this.getCacheKey(companyId, id));
    await cache.del(this.getCacheKey(companyId));
    return customer;
  }

  async restoreCustomer(id: string, companyId: string): Promise<Customer> {
    const customer = await prisma.customer.update({
      where: { id },
      data: { deletedAt: null },
    });

    await cache.del(this.getCacheKey(companyId, id));
    await cache.del(this.getCacheKey(companyId));
    return customer;
  }

  async updateStats(id: string, companyId: string): Promise<void> {
    const stats = await prisma.invoice.aggregate({
      where: {
        customerId: id,
        companyId,
        deletedAt: null,
      },
      _count: { id: true },
      _sum: {
        total: true,
        amountPaid: true,
      },
    });

    const totalRevenue = Number(stats._sum.total || 0);
    const totalPaid = Number(stats._sum.amountPaid || 0);
    const outstanding = totalRevenue - totalPaid;

    await prisma.customer.update({
      where: { id },
      data: {
        totalInvoices: stats._count.id,
        totalRevenue,
        outstandingAmount: outstanding,
      },
    });

    await cache.del(this.getCacheKey(companyId, id));
  }

  async getStats(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    withOutstanding: number;
    totalOutstanding: number;
  }> {
    const [total, active, inactive, withOutstanding, outstandingSum] = await Promise.all([
      prisma.customer.count({ where: { companyId, deletedAt: null } }),
      prisma.customer.count({ where: { companyId, deletedAt: null, status: 'active' } }),
      prisma.customer.count({ where: { companyId, deletedAt: null, status: 'inactive' } }),
      prisma.customer.count({ where: { companyId, deletedAt: null, outstandingAmount: { gt: 0 } } }),
      prisma.customer.aggregate({
        where: { companyId, deletedAt: null },
        _sum: { outstandingAmount: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      withOutstanding,
      totalOutstanding: Number(outstandingSum._sum.outstandingAmount || 0),
    };
  }

  async existsByEmail(email: string, companyId: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CustomerWhereInput = {
      email: email.toLowerCase(),
      companyId,
      deletedAt: null,
      ...(excludeId && { id: { not: excludeId } }),
    };
    const count = await prisma.customer.count({ where });
    return count > 0;
  }

  async search(companyId: string, query: string, limit: number = 10): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { name: { contains: query } },
          { businessName: { contains: query } },
          { email: { contains: query } },
          { gstNumber: { contains: query } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }
}

export const customerRepository = new CustomerRepository();
