 
import { supabase } from '@/lib/supabase';

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  companyName: string;
  companyGST?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyPincode?: string;
}

// Auth API using Supabase
export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.user || !authData.session) throw new Error('Login failed');

    // Get user profile from public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, companies!users_companyId_fkey(*)')
      .eq('id', authData.user.id)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error('User profile not found');

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        name: userData.name,
        role: userData.role.toLowerCase(),
        companyId: userData.companyId,
        permissions: (userData.permissions as string[]) || [],
      },
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in || 3600,
    };
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    // Create the company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: data.companyName,
        legalName: data.companyName,
        gstNumber: data.companyGST || null,
        phone: data.companyPhone || null,
        email: data.email,
        addressLine1: data.companyAddress || '',
        city: data.companyCity || '',
        state: data.companyState || '',
        pincode: data.companyPincode || '',
      })
      .select()
      .single();

    if (companyError) throw new Error('Failed to create company');

    // Create user profile with admin role
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        companyId: companyData.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: ['dashboard', 'customers', 'invoices', 'payment_links', 'whatsapp', 'email', 'reports', 'settings', 'admin'],
      });

    if (userError) throw new Error('Failed to create user profile');

    // Create default settings for the company
    await supabase.from('invoice_settings').insert({
      companyId: companyData.id,
    });

    await supabase.from('communication_settings').insert({
      companyId: companyData.id,
    });

    await supabase.from('gateway_settings').insert({
      companyId: companyData.id,
    });

    // Create default modules
    const modules = [
      'DASHBOARD', 'CUSTOMERS', 'INVOICES', 'PAYMENT_LINKS', 'WHATSAPP', 'EMAIL', 'REPORTS', 'SETTINGS', 'ADMIN'
    ];

    for (const module of modules) {
      await supabase.from('module_configs').insert({
        companyId: companyData.id,
        module,
        enabled: true,
        roles: module === 'ADMIN' ? ['ADMIN'] : ['ADMIN', 'MANAGER', 'STAFF'],
      });
    }

    if (!authData.session) throw new Error('Session not created');

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        name: data.name,
        role: 'admin',
        companyId: companyData.id,
        permissions: ['dashboard', 'customers', 'invoices', 'payment_links', 'whatsapp', 'email', 'reports', 'settings', 'admin'],
      },
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in || 3600,
    };
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async refreshToken(_refreshToken?: string) {
    // Note: refreshToken parameter is not needed - Supabase handles token refresh internally
    void _refreshToken;
    const { data, error } = await supabase.auth.refreshSession();

    if (error) throw error;
    if (!data.session) throw new Error('Session refresh failed');

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async getProfile() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, permissions')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('User not found');

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role.toLowerCase(),
      permissions: (data.permissions as string[]) || [],
    };
  },

  async forgotPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  async resetPassword(_token: string, password: string) {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;
  },

  async changePassword(_currentPassword: string, newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },
};

// Re-export all APIs from services for backwards compatibility
export { supabase } from '@/lib/supabase';
export { dashboardApi, dashboardService } from '@/services/dashboardService';
export { settingsApi, settingsService } from '@/services/settingsService';
export { adminApi, modulesApi, userService, auditService, activityService } from '@/services/adminService';
export { templatesApi, integrationsApi } from '@/services/templateIntegrationService';
export { reportsApi, communicationApi, exportsApi, analyticsApi } from '@/services/reportsCommunicationService';
