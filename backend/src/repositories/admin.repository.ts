import prisma from '../config/database';
import { UserStatus, UserRole } from '@prisma/client';

interface UserFindManyParams {
  search?: string;
  status?: string;
  role?: string;
  page: number;
  limit: number;
}

interface AuditLogFindManyParams {
  search?: string;
  action?: string;
  module?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export class AdminRepository {
  // Users
  async getUsers(companyId: string, params: UserFindManyParams) {
    const { search, status, role, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = { companyId, deletedAt: null };
    if (status && status !== 'all') {
      where.status = status;
    }
    if (role && role !== 'all') {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatar: true,
          phone: true,
          lastLoginAt: true,
          lastActiveAt: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(id: string, companyId: string) {
    return prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        permissions: true,
        lastLoginAt: true,
        lastActiveAt: true,
        loginCount: true,
        failedLoginCount: true,
        lockedUntil: true,
        createdAt: true,
        company: {
          select: { name: true },
        },
        settings: true,
        accountSecurity: true,
      },
    });
  }

  async createUser(data: {
    companyId: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
    status?: UserStatus;
    phone?: string;
    permissions?: string[];
  }) {
    return prisma.user.create({
      data: {
        ...data,
        permissions: data.permissions || [],
      } as any,
    });
  }

  async updateUser(id: string, companyId: string, data: {
    name?: string;
    role?: UserRole;
    status?: UserStatus;
    phone?: string;
    permissions?: string[];
  }) {
    return prisma.user.updateMany({
      where: { id, companyId },
      data,
    });
  }

  async softDeleteUser(id: string, companyId: string) {
    return prisma.user.updateMany({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
  }

  async restoreUser(id: string, companyId: string) {
    return prisma.user.updateMany({
      where: { id, companyId },
      data: { deletedAt: null },
    });
  }

  // Modules
  async getModules() {
    return prisma.module.findMany({
      include: {
        roles: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getModule(id: string) {
    return prisma.module.findUnique({
      where: { id },
      include: { roles: true },
    });
  }

  async getModuleByKey(key: string) {
    return prisma.module.findUnique({
      where: { key: key as any },
      include: { roles: true },
    });
  }

  async createModule(data: {
    key: string;
    label: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }) {
    return prisma.module.create({
      data: {
        key: data.key as any,
        label: data.label,
        description: data.description,
        icon: data.icon || 'Settings',
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async updateModule(id: string, data: {
    label?: string;
    description?: string;
    icon?: string;
    enabled?: boolean;
    sortOrder?: number;
  }) {
    return prisma.module.update({
      where: { id },
      data,
    });
  }

  async upsertModuleRole(moduleId: string, role: UserRole, permissions: {
    canRead?: boolean;
    canCreate?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
    canExport?: boolean;
    canConfigure?: boolean;
  }) {
    return prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId, role } },
      update: permissions,
      create: { moduleId, role, ...permissions },
    });
  }

  async deleteModuleRole(moduleId: string, role: UserRole) {
    return prisma.moduleRole.delete({
      where: { moduleId_role: { moduleId, role } },
    });
  }

  // Audit Logs
  async getAuditLogs(companyId: string, params: AuditLogFindManyParams) {
    const { search, action, module, userId, startDate, endDate, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (action && action !== 'all') {
      where.action = action;
    }
    if (module && module !== 'all') {
      where.module = module;
    }
    if (userId) {
      where.userId = userId;
    }
    if (startDate && endDate) {
      where.timestamp = { gte: startDate, lte: endDate };
    }
    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { description: { contains: search } },
        { entityName: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuditLogStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };
    if (startDate && endDate) {
      where.timestamp = { gte: startDate, lte: endDate };
    }

    const [total, byAction, byModule, byUser] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['module'],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return { total, byAction, byModule, byUser };
  }

  // Activity Logs
  async getActivityLogs(companyId: string, params: { page: number; limit: number }) {
    const skip = (params.page - 1) * params.limit;

    const [data, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { companyId },
        skip,
        take: params.limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.activityLog.count({ where: { companyId } }),
    ]);

    return {
      data,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  // API Usage
  async getApiUsageStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };
    if (startDate && endDate) {
      where.timestamp = { gte: startDate, lte: endDate };
    }

    const [totalRequests, errors, byEndpoint, byStatusCode, dailyRequests] = await Promise.all([
      prisma.apiUsageLog.count({ where }),
      prisma.apiUsageLog.count({ where: { ...where, statusCode: { gte: 400 } } }),
      prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        where,
        _count: true,
        _avg: { duration: true },
        orderBy: { _count: { endpoint: 'desc' } },
        take: 20,
      }),
      prisma.apiUsageLog.groupBy({
        by: ['statusCode'],
        where,
        _count: true,
      }),
      prisma.apiUsageLog.groupBy({
        by: ['timestamp'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalRequests,
      errors,
      errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
      byEndpoint,
      byStatusCode,
      dailyRequests,
    };
  }

  // User Stats
  async getUserStats(companyId: string) {
    const [total, active, byRole, byStatus] = await Promise.all([
      prisma.user.count({ where: { companyId, deletedAt: null } }),
      prisma.user.count({ where: { companyId, status: 'ACTIVE', deletedAt: null } }),
      prisma.user.groupBy({
        by: ['role'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),
      prisma.user.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),
    ]);

    return { total, active, byRole, byStatus };
  }

  // Check email exists
  async emailExists(email: string, companyId?: string, excludeId?: string) {
    const where: any = { email };
    if (companyId) {
      where.companyId = companyId;
    }
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return prisma.user.findFirst({ where });
  }
}

export const adminRepository = new AdminRepository();
