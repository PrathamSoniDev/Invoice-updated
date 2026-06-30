import prisma from '../config/database';
import { CommunicationChannel, CommunicationStatus } from '@prisma/client';

interface CommunicationLogFindManyParams {
  search?: string;
  channel?: string;
  status?: string;
  page: number;
  limit: number;
}

export class CommunicationRepository {
  // Message Templates
  async getTemplates(companyId: string) {
    return prisma.messageTemplate.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async getTemplate(id: string, companyId: string) {
    return prisma.messageTemplate.findFirst({
      where: { id, companyId },
    });
  }

  async getTemplateByName(name: string, companyId: string) {
    return prisma.messageTemplate.findFirst({
      where: { name, companyId },
    });
  }

  async createTemplate(data: {
    companyId: string;
    name: string;
    channel: CommunicationChannel;
    subject?: string;
    body: string;
    variables?: object;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    return prisma.messageTemplate.create({ data });
  }

  async updateTemplate(id: string, companyId: string, data: {
    name?: string;
    subject?: string;
    body?: string;
    variables?: object;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    return prisma.messageTemplate.updateMany({
      where: { id, companyId },
      data,
    });
  }

  async deleteTemplate(id: string, companyId: string) {
    return prisma.messageTemplate.deleteMany({
      where: { id, companyId },
    });
  }

  async setDefaultTemplate(id: string, companyId: string, channel: CommunicationChannel) {
    await prisma.$transaction([
      prisma.messageTemplate.updateMany({
        where: { companyId, channel, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.messageTemplate.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
  }

  // Communication Logs
  async getLogs(companyId: string, params: CommunicationLogFindManyParams) {
    const { search, channel, status, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (channel && channel !== 'all') {
      where.channel = channel;
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { recipientName: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true } },
        },
      }),
      prisma.communicationLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLog(id: string, companyId: string) {
    return prisma.communicationLog.findFirst({
      where: { id, companyId },
      include: {
        template: { select: { id: true, name: true } },
      },
    });
  }

  async createLog(data: {
    companyId: string;
    channel: CommunicationChannel;
    recipient: string;
    recipientName: string;
    subject: string;
    body: string;
    status: CommunicationStatus;
    templateId?: string;
    templateName?: string;
    relatedType?: string;
    relatedId?: string;
    customerId?: string;
  }) {
    return prisma.communicationLog.create({ data });
  }

  async updateLogStatus(id: string, status: CommunicationStatus, updates?: {
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    failedReason?: string;
  }) {
    return prisma.communicationLog.update({
      where: { id },
      data: { status, ...updates },
    });
  }

  // Stats
  async getStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };
    if (startDate && endDate) {
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const [total, sent, delivered, read, failed, byChannel] = await Promise.all([
      prisma.communicationLog.count({ where }),
      prisma.communicationLog.count({ where: { ...where, status: 'SENT' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'READ' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.communicationLog.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
    ]);

    return { total, sent, delivered, read, failed, byChannel };
  }
}

export const communicationRepository = new CommunicationRepository();
