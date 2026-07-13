/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, paginate, logAudit } from '@/lib/database';
import type { User, ActivityLog, ModuleConfig, AuditLog, UserRole } from '@/types';
import { normalizeModuleKey, normalizePermissions, normalizeRoles, toDbModuleKey } from '@/utils/permissions';
import { assertValidEmail, isValidEmail } from '@/utils/validation';

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
    permissions: normalizePermissions(row.permissions),
    companyName: row.companies?.name,
  };
}

// Raw `audit_logs` rows don't carry userName/userRole/module/entityName/
// description/timestamp/changes directly — this maps the actual columns
// (plus the joined `users` relation) onto the shape AuditLogsPage expects.
function transformAuditLog(row: any): AuditLog {
  const changes =
    row.oldValues || row.newValues
      ? Object.keys({ ...(row.oldValues || {}), ...(row.newValues || {}) }).reduce(
          (acc, field) => {
            acc[field] = { from: row.oldValues?.[field], to: row.newValues?.[field] };
            return acc;
          },
          {} as Record<string, { from: unknown; to: unknown }>
        )
      : undefined;

  return {
    id: row.id,
    userId: row.userId,
    userName: row.users?.name || 'Unknown user',
    userRole: (row.users?.role?.toLowerCase() as UserRole) || 'viewer',
    action: row.action?.toLowerCase() as AuditLog['action'],
    module: row.entityType,
    entityId: row.entityId,
    entityName: row.entityId || row.entityType,
    description: `${row.action?.toLowerCase() || 'unknown'} on ${row.entityType || 'record'}`,
    ipAddress: row.ipAddress || '—',
    timestamp: row.createdAt,
    changes,
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
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('User not found');

    return transformUser(data);
  },

  async createUser(input: { name: string; email: string; password?: string; role: string; phone?: string; status?: string; companyName?: string; permissions?: string[] }): Promise<User> {
    const companyId = await getCurrentCompanyId();

    // [DEBUG:email-validation] Point 3 — raw email value as received by the
    // service layer (before any validation/normalization). Reveals trailing
    // whitespace, quotes, or encoding introduced by middleware.
    console.debug('[adminService.createUser] Point 3 — raw input.email:', JSON.stringify(input.email));

    // Validate email format before reaching Supabase auth.signUp(), which
    // otherwise surfaces a generic "Email address is invalid" error. This keeps
    // backend validation consistent with the frontend form.
    assertValidEmail(input.email);

    // Normalize the email once so every downstream call (auth.signUp, the
    // duplicate check and the profile insert) uses the exact same value. This
    // prevents subtle mismatches caused by surrounding whitespace.
    const normalizedEmail = input.email.trim();

    // [DEBUG:email-validation] Point 4 — validation passed; show the normalized
    // value that will be sent to Supabase auth.signUp().
    console.debug('[adminService.createUser] Point 4 — normalizedEmail:', JSON.stringify(normalizedEmail), '| isValidEmail:', isValidEmail(normalizedEmail));

    // Fail fast with a clear message when a user with this email already exists
    // for the current company. The `users` table enforces
    // `UNIQUE("companyId", email)`, but surfacing that constraint violation as a
    // raw Postgres error ("duplicate key value violates unique constraint") is
    // not user-friendly. Checking first also avoids creating an orphaned
    // auth.users row when the profile insert would later fail.
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('companyId', companyId)
      .eq('email', normalizedEmail)
      .is('deletedAt', null)
      .maybeSingle();

    if (existing) {
      throw new Error('Email already exists');
    }

    // Create the auth user via a secure Supabase Edge Function.
    //
    // We intentionally do NOT call `supabase.auth.signUp()` here. That endpoint
    // is rate-limited per-IP/email and sends a confirmation email, which causes
    // `429 email rate limit exceeded` errors when an admin creates several
    // users in quick succession.
    //
    // The Edge Function (`supabase/functions/admin-create-user`) uses the
    // Supabase Admin API (`auth.admin.createUser`) with the service role key,
    // which bypasses the rate limit and sets `email_confirm: true` so the new
    // user can sign in immediately. The service role key never reaches the
    // browser.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error('You must be signed in to create a user');
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;

    // [DEBUG:email-validation] Point 4b — payload sent to the Edge Function.
    // `role` and `companyName` let the function create a brand-new company
    // when creating an Admin, instead of always reusing the caller's own
    // company — see admin-create-user/index.ts for why.
    const edgePayload = {
      email: normalizedEmail,
      password: input.password,
      name: input.name,
      companyId,
      role: input.role,
      companyName: input.companyName,
      status: input.status,
      phone: input.phone,
      permissions: input.permissions,
    };
    console.debug('[adminService.createUser] Point 4b — Edge Function payload:', JSON.stringify({ email: edgePayload.email, name: edgePayload.name, companyId: edgePayload.companyId, role: edgePayload.role, companyName: edgePayload.companyName }));

    const edgeResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(edgePayload),
    });

    const edgeResult = await edgeResponse.json();

    // [DEBUG:email-validation] Point 4c — Edge Function response.
    console.debug('[adminService.createUser] Point 4c — Edge Function result:', edgeResponse.ok ? { userId: edgeResult.userId, companyId: edgeResult.companyId } : { status: edgeResponse.status, error: edgeResult.error });

    if (!edgeResponse.ok) {
      // The Edge Function returns Supabase's error message directly. If the
      // email is a genuine duplicate, GoTrue's message is surfaced here.
      if (/already.*registered|already.*exists|user.*already/i.test(edgeResult.error || '')) {
        throw new Error('User already exists. Please reuse or reset password.');
      }
      throw new Error(edgeResult.error || 'Failed to create auth user');
    }

    const authUserId = edgeResult.userId as string;
    if (!authUserId) throw new Error('Failed to create user');

    // The Edge Function creates the `public.users` profile row itself using
    // the service role (see admin-create-user/index.ts). Doing that insert
    // from the browser with the caller's own session used to fail — or
    // silently fall back to the caller's own company — because the
    // `insert_own_users` RLS policy only allows
    // `"companyId" = public.get_company_id()`, which a brand-new Admin's
    // brand-new company never satisfies. The service-role insert bypasses
    // that mismatch entirely, so we just consume the profile it returns.
    const data = edgeResult.profile;
    if (!data) {
      throw new Error(
        'Server did not return the created user profile. This usually means the ' +
        '"admin-create-user" Edge Function on Supabase is out of date — redeploy it ' +
        '(supabase functions deploy admin-create-user) and try again.'
      );
    }

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
    // Fetch the user profile first (we need the name/email for the audit log
    // and to pass to the Edge Function).
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // ---- Single API call to the delete-user Edge Function -------------------
    // The Edge Function (supabase/functions/delete-user) handles EVERYTHING
    // server-side using the service role key:
    //   1. Deletes the auth.users row (auth.admin.deleteUser)
    //   2. Nullifies FK references in no-cascade tables
    //   3. Hard-deletes the public.users row (frees the email constraint)
    //
    // The browser NEVER touches the service role key. No manual Supabase
    // dashboard deletion is required.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error('You must be signed in to delete a user');
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;

    console.debug('[adminService.deleteUser] calling delete-user Edge Function for:', id);

    const edgeResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ userId: id, email: user?.email }),
    });

    const edgeResult = await edgeResponse.json();

    console.debug('[adminService.deleteUser] Edge Function result:', edgeResponse.ok ? edgeResult : { status: edgeResponse.status, error: edgeResult.error });

    if (!edgeResponse.ok) {
      throw new Error(edgeResult.error || 'Failed to delete user');
    }

    await logAudit('delete', 'users', id, user?.name || 'Unknown', `Deleted user`);
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

    // Raw `audit_logs` columns (companyId, userId, action, entityType,
    // entityId, oldValues, newValues, ipAddress, userAgent, createdAt) don't
    // match what the AuditLogsPage UI expects (userName, userRole, module,
    // entityName, description, timestamp, changes) — join `users` for the
    // denormalized name/role, and map the rest below in transformAuditLog().
    let query = supabase
      .from('audit_logs')
      .select('*, users!userId(name, role)', { count: 'exact' })
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false });

    if (params?.search) {
      const searchTerm = params.search;
      // entityId/ipAddress are the only free-text columns actually on this
      // table; searching by user name would require filtering on the
      // joined `users` relation, which PostgREST .or() can't combine with
      // top-level columns in one call — left out rather than referencing
      // nonexistent columns.
      query = query.or(`entityType.ilike.%${searchTerm}%,entityId.ilike.%${searchTerm}%,ipAddress.ilike.%${searchTerm}%`);
    }

    if (params?.action && params.action !== 'all') {
      query = query.eq('action', params.action.toUpperCase());
    }

    if (params?.module && params.module !== 'all') {
      // No `module` column exists; `entityType` is the closest real
      // equivalent (e.g. 'invoice', 'customer', 'user').
      query = query.eq('entityType', params.module);
    }

    const result = await paginate<any>(query, page, limit);
    return { ...result, data: result.data.map(transformAuditLog) };
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
  async getModules(): Promise<ModuleConfig[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('module_configs')
      .select('*')
      .eq('companyId', companyId);

    if (error) throw error;

    // Default modules if none exist
    if (!data || data.length === 0) {
      const defaultModules: ModuleConfig[] = [
        { key: 'dashboard', label: 'Dashboard', description: 'Analytics overview', enabled: true, icon: 'LayoutDashboard', roles: ['admin', 'manager', 'staff', 'viewer'] },
        { key: 'customers', label: 'Customers', description: 'Customer management', enabled: true, icon: 'Users', roles: ['admin', 'manager', 'staff'] },
        { key: 'invoices', label: 'Invoices', description: 'Invoice management', enabled: true, icon: 'FileText', roles: ['admin', 'manager', 'staff'] },
        { key: 'payment-links', label: 'Payment Links', description: 'Payment links', enabled: true, icon: 'CreditCard', roles: ['admin', 'manager', 'staff'] },
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
          module: toDbModuleKey(module.key),
          enabled: module.enabled,
          roles: module.roles,
        });
      }

      return defaultModules;
    }

    return data
      .map((m) => {
        const key = normalizeModuleKey(m.module);
        if (!key) return null;

        return {
          key,
          label: m.module.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
          description: '',
          enabled: m.enabled,
          icon: '',
          roles: normalizeRoles(m.roles),
        } satisfies ModuleConfig;
      })
      .filter((module): module is ModuleConfig => module !== null);
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
      .eq('module', toDbModuleKey(key))
      .select()
      .single();

    if (error) throw error;

    const moduleKey = normalizeModuleKey(data.module);
    if (!moduleKey) throw new Error(`Unknown module key returned by database: ${data.module}`);

    return {
      key: moduleKey,
      enabled: data.enabled,
      roles: normalizeRoles(data.roles),
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
