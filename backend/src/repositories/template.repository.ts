import prisma from '../config/database';
import { TemplateStatus, TemplateType } from '@prisma/client';

interface TemplateFindManyParams {
  search?: string;
  status?: string;
  type?: string;
}

export class TemplateRepository {
  async findMany(companyId: string, params: TemplateFindManyParams) {
    const where: any = { companyId, deletedAt: null };
    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }
    if (params.type && params.type !== 'all') {
      where.type = params.type;
    }
    if (params.search) {
      where.name = { contains: params.search };
    }

    return prisma.invoiceTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string, companyId: string) {
    return prisma.invoiceTemplate.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        versions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findDefault(companyId: string) {
    return prisma.invoiceTemplate.findFirst({
      where: { companyId, isDefault: true, status: 'ACTIVE', deletedAt: null },
    });
  }

  async create(data: {
    companyId: string;
    name: string;
    type: TemplateType;
    version: string;
    content?: string;
    config?: object;
    status?: TemplateStatus;
    isDefault?: boolean;
    uploadedById: string;
  }) {
    return prisma.invoiceTemplate.create({ data });
  }

  async update(id: string, companyId: string, data: {
    name?: string;
    content?: string;
    config?: object;
    status?: TemplateStatus;
    isDefault?: boolean;
  }) {
    return prisma.invoiceTemplate.updateMany({
      where: { id, companyId },
      data,
    });
  }

  async softDelete(id: string, companyId: string) {
    return prisma.invoiceTemplate.updateMany({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
  }

  async setAsDefault(id: string, companyId: string) {
    await prisma.$transaction([
      prisma.invoiceTemplate.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.invoiceTemplate.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
  }

  // Template Versions
  async createVersion(templateId: string, data: {
    version: string;
    content?: string;
    config?: object;
    uploadedById: string;
  }) {
    return prisma.templateVersion.create({
      data: { templateId, ...data },
    });
  }

  async getVersions(templateId: string) {
    return prisma.templateVersion.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVersion(id: string, templateId: string) {
    return prisma.templateVersion.findFirst({
      where: { id, templateId },
    });
  }

  // User Template Assignments
  async getUserTemplateAssignments(companyId: string) {
    return prisma.userInvoiceTemplate.findMany({
      where: { companyId },
      include: {
        template: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserTemplateAssignment(userId: string, companyId: string) {
    return prisma.userInvoiceTemplate.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: {
        template: { select: { id: true, name: true, status: true, content: true, config: true } },
      },
    });
  }

  async setUserTemplateAssignment(companyId: string, userId: string, templateId: string | null, assignedById: string) {
    return prisma.userInvoiceTemplate.upsert({
      where: { companyId_userId: { companyId, userId } },
      update: { templateId, assignedById, assignedAt: new Date() },
      create: { companyId, userId, templateId, assignedById },
    });
  }

  async removeUserTemplateAssignment(companyId: string, userId: string) {
    return prisma.userInvoiceTemplate.delete({
      where: { companyId_userId: { companyId, userId } },
    });
  }

  // Template stats
  async getStats(companyId: string) {
    const [total, active, byType] = await Promise.all([
      prisma.invoiceTemplate.count({ where: { companyId, deletedAt: null } }),
      prisma.invoiceTemplate.count({ where: { companyId, status: 'ACTIVE', deletedAt: null } }),
      prisma.invoiceTemplate.groupBy({
        by: ['type'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),
    ]);

    return { total, active, byType };
  }
}

export const templateRepository = new TemplateRepository();
