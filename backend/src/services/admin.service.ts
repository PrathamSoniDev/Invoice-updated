import { adminRepository } from '../repositories/admin.repository';
import { cache } from '../config/redis';
import { emitToCompany } from '../socket';
import config from '../config';
import prisma from '../config/database';
import { hashPassword } from '../utils/hash';
import { UserStatus, UserRole } from '@prisma/client';

class AdminService {
  private getCacheKey(companyId: string | 'global', suffix: string): string {
    return `${config.redis.prefix}admin:${companyId}:${suffix}`;
  }

  private async invalidateCache(companyId: string): Promise<void> {
    await cache.delPattern(`${config.redis.prefix}admin:${companyId}:*`);
    await cache.delPattern(`${config.redis.prefix}modules:*`);
  }

  // Users
  async getUsers(companyId: string, params: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    return adminRepository.getUsers(companyId, {
      search: params.search,
      status: params.status,
      role: params.role,
      page,
      limit,
    });
  }

  async getUser(id: string, companyId: string) {
    return adminRepository.getUser(id, companyId);
  }

  async createUser(companyId: string, userId: string, data: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    phone?: string;
    permissions?: string[];
  }) {
    // Check email exists
    const existing = await adminRepository.emailExists(data.email, companyId);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await adminRepository.createUser({
      companyId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role || 'STAFF',
      status: 'INVITED',
      phone: data.phone,
      permissions: data.permissions,
    });

    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'CREATE',
        module: 'Admin',
        entityId: user.id,
        entityName: data.name,
        description: `Created user: ${data.email}`,
      },
    }).catch(() => {});

    emitToCompany(companyId, 'user:created', { id: user.id, email: user.email });

    return user;
  }

  async updateUser(id: string, companyId: string, userId: string, data: {
    name?: string;
    role?: UserRole;
    phone?: string;
    permissions?: string[];
  }) {
    await adminRepository.updateUser(id, companyId, data);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Admin',
        entityId: id,
        entityName: data.name || 'User',
        description: 'Updated user profile',
      },
    }).catch(() => {});

    emitToCompany(companyId, 'user:updated', { id });

    return adminRepository.getUser(id, companyId);
  }

  async updateUserStatus(id: string, companyId: string, userId: string, status: UserStatus) {
    await adminRepository.updateUser(id, companyId, { status });
    await this.invalidateCache(companyId);

    const user = await adminRepository.getUser(id, companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Admin',
        entityId: id,
        entityName: user?.name || 'User',
        description: `Changed user status to ${status}`,
      },
    }).catch(() => {});

    emitToCompany(companyId, 'user:statusChanged', { id, status });

    return user;
  }

  async suspendUser(id: string, companyId: string, userId: string) {
    return this.updateUserStatus(id, companyId, userId, 'SUSPENDED');
  }

  async activateUser(id: string, companyId: string, userId: string) {
    return this.updateUserStatus(id, companyId, userId, 'ACTIVE');
  }

  async deleteUser(id: string, companyId: string, userId: string) {
    const user = await adminRepository.getUser(id, companyId);
    if (!user) return null;

    await adminRepository.softDeleteUser(id, companyId);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'DELETE',
        module: 'Admin',
        entityId: id,
        entityName: user.name,
        description: `Deleted user: ${user.email}`,
      },
    }).catch(() => {});

    emitToCompany(companyId, 'user:deleted', { id });

    return true;
  }

  async restoreUser(id: string, companyId: string, userId: string) {
    await adminRepository.restoreUser(id, companyId);
    await this.invalidateCache(companyId);

    const user = await adminRepository.getUser(id, companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Admin',
        entityId: id,
        entityName: user?.name || 'User',
        description: 'Restored deleted user',
      },
    }).catch(() => {});

    return user;
  }

  // Modules
  async getModules() {
    const cacheKey = `${config.redis.prefix}modules:all`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const modules = await adminRepository.getModules();
    await cache.set(cacheKey, modules, 300);
    return modules;
  }

  async getModule(id: string) {
    return adminRepository.getModule(id);
  }

  async getModuleByKey(key: string) {
    return adminRepository.getModuleByKey(key);
  }

  async updateModule(id: string, userId: string, data: {
    label?: string;
    description?: string;
    icon?: string;
    enabled?: boolean;
    sortOrder?: number;
  }) {
    const module = await adminRepository.updateModule(id, data);
    await cache.delPattern(`${config.redis.prefix}modules:*`);

    await prisma.auditLog.create({
      data: {
        companyId: 'global',
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'SETTINGS',
        module: 'Admin',
        entityId: id,
        entityName: data.label || module.label,
        description: `Updated module: ${module.key}`,
      },
    }).catch(() => {});

    return module;
  }

  async updateModuleRole(moduleId: string, role: UserRole, userId: string, permissions: {
    canRead?: boolean;
    canCreate?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
    canExport?: boolean;
    canConfigure?: boolean;
  }) {
    const moduleRole = await adminRepository.upsertModuleRole(moduleId, role, permissions);
    await cache.delPattern(`${config.redis.prefix}modules:*`);

    await prisma.auditLog.create({
      data: {
        companyId: 'global',
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'SETTINGS',
        module: 'Admin',
        entityId: moduleId,
        entityName: role,
        description: `Updated ${role} permissions for module`,
      },
    }).catch(() => {});

    return moduleRole;
  }

  // Audit Logs
  async getAuditLogs(companyId: string, params: {
    search?: string;
    action?: string;
    module?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    return adminRepository.getAuditLogs(companyId, {
      ...params,
      page,
      limit,
    });
  }

  async getAuditLogStats(companyId: string, startDate?: Date, endDate?: Date) {
    const cacheKey = this.getCacheKey(companyId, `audit-stats:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const stats = await adminRepository.getAuditLogStats(companyId, startDate, endDate);
    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  // Activity Logs
  async getActivityLogs(companyId: string, page: number = 1, limit: number = 20) {
    const cacheKey = this.getCacheKey(companyId, `activity:${page}:${limit}`);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const logs = await adminRepository.getActivityLogs(companyId, { page, limit });
    await cache.set(cacheKey, logs, 60);
    return logs;
  }

  // API Usage Stats
  async getApiUsageStats(companyId: string, startDate?: Date, endDate?: Date) {
    const cacheKey = this.getCacheKey(companyId, `api-usage:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const stats = await adminRepository.getApiUsageStats(companyId, startDate, endDate);
    await cache.set(cacheKey, stats, 60);
    return stats;
  }

  // User Stats
  async getUserStats(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'user-stats');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const stats = await adminRepository.getUserStats(companyId);
    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  // Company Stats
  async getCompanyStats(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'company-stats');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const [users, invoices, customers, payments] = await Promise.all([
      prisma.user.count({ where: { companyId, deletedAt: null } }),
      prisma.invoice.count({ where: { companyId, deletedAt: null } }),
      prisma.customer.count({ where: { companyId, deletedAt: null } }),
      prisma.payment.count({ where: { companyId } }),
    ]);

    const stats = { users, invoices, customers, payments };
    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  // Dashboard Overview
  async getAdminDashboard(companyId: string) {
    const [userStats, companyStats, auditStats, apiStats] = await Promise.all([
      this.getUserStats(companyId),
      this.getCompanyStats(companyId),
      this.getAuditLogStats(companyId),
      this.getApiUsageStats(companyId),
    ]);

    return {
      users: userStats,
      company: companyStats,
      audit: auditStats,
      api: apiStats,
    };
  }
}

export const adminService = new AdminService();
