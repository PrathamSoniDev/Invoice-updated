 
import { supabase, ensureUserProfile, fetchUserProfile } from '@/lib/supabase';
import { normalizePermissions } from '@/utils/permissions';

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

    // Ensure a profile exists (fixes 406 for users without a public.users row)
    const userData = await ensureUserProfile(authData.user);
    if (!userData) throw new Error('User profile not found and could not be created');

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        name: userData.name,
        role: userData.role.toLowerCase(),
        companyId: userData.companyId,
        permissions: normalizePermissions(userData.permissions),
      },
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in || 3600,
    };
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    // Create the auth user. Company/profile creation is delegated to
    // ensureUserProfile() so it is idempotent and never creates duplicates.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          companyName: data.companyName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    // Ensure the profile (and company) exist. ensureUserProfile is idempotent:
    // if a profile already exists it is returned unchanged.
    const userData = await ensureUserProfile(authData.user);
    if (!userData) throw new Error('Failed to create user profile');

    const companyId = userData.companyId;

    // Create default settings for the company (best-effort; failures logged)
    await supabase.from('invoice_settings').insert({ companyId }).then(({ error }) => {
      if (error) console.error('[register] invoice_settings insert failed:', error.message);
    });

    await supabase.from('communication_settings').insert({ companyId }).then(({ error }) => {
      if (error) console.error('[register] communication_settings insert failed:', error.message);
    });

    await supabase.from('gateway_settings').insert({ companyId }).then(({ error }) => {
      if (error) console.error('[register] gateway_settings insert failed:', error.message);
    });

    // Create default modules
    const modules = [
      'DASHBOARD', 'CUSTOMERS', 'INVOICES', 'PAYMENT_LINKS', 'WHATSAPP', 'EMAIL', 'REPORTS', 'SETTINGS', 'ADMIN'
    ];

    for (const module of modules) {
      const { error: moduleError } = await supabase.from('module_configs').insert({
        companyId,
        module,
        enabled: true,
        roles: module === 'ADMIN' ? ['ADMIN'] : ['ADMIN', 'MANAGER', 'STAFF'],
      });
      if (moduleError) {
        console.error(`[register] module_configs insert failed for ${module}:`, moduleError.message);
      }
    }

    if (!authData.session) throw new Error('Session not created');

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        name: userData.name,
        role: userData.role.toLowerCase(),
        companyId,
        permissions: normalizePermissions(userData.permissions),
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

    // Use maybeSingle() via fetchUserProfile so a missing profile returns null
    // instead of throwing a 406, then ensure one exists.
    let data = await fetchUserProfile(user.id);
    if (!data) {
      data = await ensureUserProfile(user);
    }
    if (!data) throw new Error('User profile not found and could not be created');

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role.toLowerCase(),
      permissions: normalizePermissions(data.permissions),
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
