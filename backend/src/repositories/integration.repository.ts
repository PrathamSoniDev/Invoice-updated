import prisma from '../config/database';
import { IntegrationStatus, SyncStatus, IntegrationProvider } from '@prisma/client';

interface IntegrationFindManyParams {
  search?: string;
  status?: string;
  provider?: string;
}

export class IntegrationRepository {
  async findMany(companyId: string, params: IntegrationFindManyParams) {
    const where: any = { companyId };
    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }
    if (params.provider && params.provider !== 'all') {
      where.provider = params.provider;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    return prisma.externalIntegration.findMany({
      where,
      include: {
        logs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        syncHistory: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    return prisma.externalIntegration.findFirst({
      where: { id, companyId },
      include: {
        logs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        syncHistory: {
          take: 20,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  async findByProvider(companyId: string, provider: IntegrationProvider) {
    return prisma.externalIntegration.findFirst({
      where: { companyId, provider },
    });
  }

  async create(data: {
    companyId: string;
    name: string;
    provider: IntegrationProvider;
    description?: string;
    status?: IntegrationStatus;
    config?: object;
    syncOptions?: object;
  }) {
    return prisma.externalIntegration.create({ data });
  }

  async update(id: string, companyId: string, data: {
    name?: string;
    description?: string;
    status?: IntegrationStatus;
    config?: object;
    syncOptions?: object;
    lastSyncAt?: Date;
    nextSyncAt?: Date;
  }) {
    return prisma.externalIntegration.updateMany({
      where: { id, companyId },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    return prisma.externalIntegration.deleteMany({
      where: { id, companyId },
    });
  }

  // Integration Logs
  async createLog(integrationId: string, level: string, message: string, details?: object) {
    return prisma.integrationLog.create({
      data: {
        integrationId,
        level,
        message,
        details: details as any,
      },
    });
  }

  async getLogs(integrationId: string, params: { level?: string; page: number; limit: number }) {
    const where: any = { integrationId };
    if (params.level && params.level !== 'all') {
      where.level = params.level;
    }

    const [data, total] = await Promise.all([
      prisma.integrationLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.integrationLog.count({ where }),
    ]);

    return { data, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
  }

  // Sync History
  async createSyncHistory(data: {
    integrationId: string;
    syncType: string;
    entityType: string;
    status: SyncStatus;
    recordsCount?: number;
    errorMessage?: string;
    completedAt?: Date;
  }) {
    return prisma.syncHistory.create({ data });
  }

  async updateSyncHistory(id: string, data: {
    status?: SyncStatus;
    recordsCount?: number;
    errorMessage?: string;
    completedAt?: Date;
  }) {
    return prisma.syncHistory.update({
      where: { id },
      data,
    });
  }

  async getSyncHistory(integrationId: string, params: { entityType?: string; status?: string; page: number; limit: number }) {
    const where: any = { integrationId };
    if (params.entityType && params.entityType !== 'all') {
      where.entityType = params.entityType;
    }
    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    const [data, total] = await Promise.all([
      prisma.syncHistory.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.syncHistory.count({ where }),
    ]);

    return { data, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
  }
}

export const integrationRepository = new IntegrationRepository();
