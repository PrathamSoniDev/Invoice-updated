/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, paginate, logAudit } from '@/lib/database';
import type { User, ActivityLog, ModuleKey } from '@/types';

function transformUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role.toLowerCase() as User['role'],
    status: row.status.toLowerCase() as User['status'],
    avatar: row.avatar || undefined,
    phone: row.phone || undefined,
    lastActive: row.lastActiveAt || undefined,
    createdAt: row.createdAt,
    permissions: (row.permissions as ModuleKey[]) || [],
    companyName: row.companies?.name,
  };
}

export const adminService = {
  // User Management
  async getUsers(params?: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 10;

    let query = supabase
      .from('users')
      .select('*, companies!users_companyId_fkey(id, name)', { count: 'exact' })
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (params?.search) {
      const searchTerm = params.search;
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    if (params?.role && params.role !== 'all') {
      query = query.eq('role', params.role.toUpperCase());
    }

    const result = await paginate<any>(query, page, limit);

    return {
      ...result,
      data: result.data.map(transformUser),
    };
  },

  async getUser(id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*, companies!users_companyId_fkey(id, name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('User not found');

    return transformUser(data);
  },

  async createUser(input: { name: string; email: string; role: string; phone?: string; status?: string; companyName?: string; permissions?: string[] }): Promise<User> {
    const companyId = await getCurrentCompanyId();

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: tempPassword,
      options: {
        data: {
          name: input.name,
          companyId,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create the user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        companyId,
        name: input.name,
        email: input.email,
        role: input.role.toUpperCase(),
        status: input.status ? input.status.toUpperCase() : 'INVITED',
        phone: input.phone || null,
        permissions: input.permissions || [],
      })
      .select('*, companies!users_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logAudit('create', 'users', data.id, input.name, `Created user ${input.name}`);

    return transformUser(data);
  },

  async updateUser(id: string, input: Partial<{ name: string; role: string; status: string; phone: string }>): Promise<User> {
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.role !== undefined) updateData.role = input.role.toUpperCase();
    if (input.status !== undefined) updateData.status = input.status.toUpperCase();
    if (input.phone !== undefined) updateData.phone = input.phone;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*, companies!users_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logAudit('update', 'users', id, data.name, `Updated user ${data.name}`);

    return transformUser(data);
  },

  async suspendUser(id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ status: 'SUSPENDED' })
      .eq('id', id)
      .select('*, companies!users_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logAudit('update', 'users', id, data.name, `Suspended user ${data.name}`);

    return transformUser(data);
  },

  async activateUser(id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ status: 'ACTIVE' })
      .eq('id', id)
      .select('*, companies!users_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    await logAudit('update', 'users', id, data.name, `Activated user ${data.name}`);

    return transformUser(data);
  },

  async deleteUser(id: string): Promise<void> {
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', id)
      .single();

    await supabase
      .from('users')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', id);

    await logAudit('delete', 'users', id, user?.name || 'Unknown', `Deleted user`);

    // Sign out the user
    await supabase.auth.admin.deleteUser(id);
  },

  async restoreUser(id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ deletedAt: null, status: 'ACTIVE' })
      .eq('id', id)
      .select('*, companies!users_companyId_fkey(id, name)')
      .single();

    if (error) throw error;

    return transformUser(data);
  },

  async getUserStats(): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .is('deletedAt', null);

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .eq('status', 'ACTIVE')
      .is('deletedAt', null);

    const { count: invitedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .eq('status', 'INVITED')
      .is('deletedAt', null);

    const { count: suspendedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .eq('status', 'SUSPENDED')
      .is('deletedAt', null);

    return {
      total: totalUsers || 0,
      active: activeUsers || 0,
      invited: invitedUsers || 0,
      suspended: suspendedUsers || 0,
    };
  },

  // Audit Logs
  async getAuditLogs(params?: {
    search?: string;
    action?: string;
    module?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false });

    if (params?.search) {
      const searchTerm = params.search;
      query = query.or(`userName.ilike.%${searchTerm}%,entityName.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    if (params?.action && params.action !== 'all') {
      query = query.eq('action', params.action.toUpperCase());
    }

    if (params?.module && params.module !== 'all') {
      query = query.eq('module', params.module);
    }

    return paginate<any>(query, page, limit);
  },

  async getAuditLogStats(): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data: recentLogs } = await supabase
      .from('audit_logs')
      .select('action')
      .eq('companyId', companyId)
      .gte('createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const stats: Record<string, number> = {};
    (recentLogs || []).forEach((log) => {
      stats[log.action.toLowerCase()] = (stats[log.action.toLowerCase()] || 0) + 1;
    });

    return stats;
  },

  // Activity Logs
  async getActivityLogs(params?: { page?: number; limit?: number }): Promise<{ data: ActivityLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    const query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false });

    const result = await paginate<any>(query, page, limit);

    return {
      ...result,
      data: result.data.map((log) => ({
        id: log.id,
        userId: log.userId || '',
        userName: log.userName,
        action: log.action,
        entity: log.entityType,
        entityId: log.entityId,
        description: log.description,
        timestamp: log.createdAt,
        metadata: log.metadata,
      })),
    };
  },

  // Module Management
  async getModules(): Promise<any[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('module_configs')
      .select('*')
      .eq('companyId', companyId);

    if (error) throw error;

    // Default modules if none exist
    if (!data || data.length === 0) {
      const defaultModules = [
        { key: 'dashboard', label: 'Dashboard', description: 'Analytics overview', enabled: true, icon: 'LayoutDashboard', roles: ['admin', 'manager', 'staff', 'viewer'] },
        { key: 'customers', label: 'Customers', description: 'Customer management', enabled: true, icon: 'Users', roles: ['admin', 'manager', 'staff'] },
        { key: 'invoices', label: 'Invoices', description: 'Invoice management', enabled: true, icon: 'FileText', roles: ['admin', 'manager', 'staff'] },
        { key: 'payment_links', label: 'Payment Links', description: 'Payment links', enabled: true, icon: 'CreditCard', roles: ['admin', 'manager', 'staff'] },
        { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp communication', enabled: true, icon: 'MessageCircle', roles: ['admin', 'manager', 'staff'] },
        { key: 'email', label: 'Email', description: 'Email communication', enabled: true, icon: 'Mail', roles: ['admin', 'manager', 'staff'] },
        { key: 'reports', label: 'Reports', description: 'Business reports', enabled: true, icon: 'BarChart3', roles: ['admin', 'manager', 'viewer'] },
        { key: 'settings', label: 'Settings', description: 'Company settings', enabled: true, icon: 'Settings', roles: ['admin', 'manager'] },
        { key: 'admin', label: 'Admin', description: 'Administration', enabled: true, icon: 'ShieldCheck', roles: ['admin'] },
      ];

      // Insert default modules
      for (const module of defaultModules) {
        await supabase.from('module_configs').insert({
          companyId,
          module: module.key.toUpperCase(),
          enabled: module.enabled,
          roles: module.roles,
        });
      }

      return defaultModules;
    }

    return data.map((m) => ({
      key: m.module.toLowerCase(),
      label: m.module.charAt(0) + m.module.slice(1).toLowerCase().replace('_', ' '),
      enabled: m.enabled,
      roles: m.roles || [],
    }));
  },

  async updateModule(key: string, input: { enabled?: boolean; roles?: string[] }): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const updateData: Record<string, any> = {};
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.roles !== undefined) updateData.roles = input.roles;

    const { data, error } = await supabase
      .from('module_configs')
      .update(updateData)
      .eq('companyId', companyId)
      .eq('module', key.toUpperCase())
      .select()
      .single();

    if (error) throw error;

    return {
      key: data.module.toLowerCase(),
      enabled: data.enabled,
      roles: data.roles || [],
    };
  },

  // API Usage Stats
  async getApiUsageStats(): Promise<any> {
    const companyId = await getCurrentCompanyId();

    // Count various entities as API usage proxy
    const [invoices, customers, payments, activities] = await Promise.all([
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
    ]);

    return {
      totalRequests: (invoices.count || 0) + (customers.count || 0) + (payments.count || 0) + (activities.count || 0),
      invoices: invoices.count || 0,
      customers: customers.count || 0,
      payments: payments.count || 0,
      activities: activities.count || 0,
    };
  },

  async getApiUsage(): Promise<{ data: any[] }> {
    // Return mock daily usage since we don't track individual API calls
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push({
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 500) + 100,
        errors: Math.floor(Math.random() * 10),
      });
    }
    return { data: last7Days };
  },

  async getFeatureUsage(): Promise<{ data: any[] }> {
    const companyId = await getCurrentCompanyId();

    const [invoices, customers, payments, reports] = await Promise.all([
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('saved_reports').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
    ]);

    return {
      data: [
        { feature: 'Invoices', usage: invoices.count || 0 },
        { feature: 'Customers', usage: customers.count || 0 },
        { feature: 'Payments', usage: payments.count || 0 },
        { feature: 'Reports', usage: reports.count || 0 },
      ],
    };
  },

  async getStorageUsage(): Promise<{ data: any[] }> {
    // Return mock storage usage since we don't have file storage tracking
    return {
      data: [
        { category: 'Documents', used: 45, total: 100 },
        { category: 'Images', used: 28, total: 50 },
        { category: 'Exports', used: 12, total: 25 },
      ],
    };
  },

  async getCompanyStats(): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const [users, customers, invoices, payments] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('companyId', companyId).is('deletedAt', null),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('companyId', companyId).is('deletedAt', null),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('companyId', companyId).is('deletedAt', null),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('companyId', companyId),
    ]);

    return {
      users: users.count || 0,
      customers: customers.count || 0,
      invoices: invoices.count || 0,
      payments: payments.count || 0,
    };
  },

  async getDashboard(): Promise<any> {
    const [userStats, companyStats, apiUsage] = await Promise.all([
      this.getUserStats(),
      this.getCompanyStats(),
      this.getApiUsageStats(),
    ]);

    return {
      users: userStats,
      company: companyStats,
      apiUsage,
    };
  },
};

// Export with expected names for backwards compatibility
export const userService = {
  list: adminService.getUsers.bind(adminService),
  create: adminService.createUser.bind(adminService),
  update: adminService.updateUser.bind(adminService),
  suspend: adminService.suspendUser.bind(adminService),
  delete: adminService.deleteUser.bind(adminService),
};

export const auditService = {
  list: adminService.getAuditLogs.bind(adminService),
};

export const activityService = {
  list: async (limit = 10) => {
    const result = await adminService.getActivityLogs({ limit });
    return result.data;
  },
};

export const modulesApi = {
  getModules: adminService.getModules.bind(adminService),
  updateModule: adminService.updateModule.bind(adminService),
  updateModuleRole: async (moduleId: string, data: { roles: string[] }) => {
    return adminService.updateModule(moduleId, { roles: data.roles });
  },
};

export const adminApi = adminService;
