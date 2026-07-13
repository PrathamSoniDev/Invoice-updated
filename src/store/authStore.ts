/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase, ensureUserProfile, fetchUserProfile, type UserProfile } from '@/lib/supabase';
import type { User } from '@/types';
import { DEFAULT_ADMIN_PERMISSIONS, normalizePermissions } from '@/utils/permissions';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

/**
 * Calls the check-login-attempts Edge Function. Used two ways:
 *   - callLoginAttemptsGuard({ email })                      -> pre-check
 *   - callLoginAttemptsGuard({ email, outcome: 'success' })   -> post-record
 * Never throws — a guard failure should never itself block login (see the
 * "fail open" comment in the Edge Function), so this resolves to a safe
 * default on any network/parse error instead of rejecting.
 */
async function callLoginAttemptsGuard(
  payload: { email: string; outcome?: 'success' | 'failure' },
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-login-attempts`;
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (response.status === 429) {
      return { allowed: false, message: result.message || 'Too many login attempts. Please wait a minute before trying again.' };
    }
    return { allowed: result.allowed !== false };
  } catch (error) {
    console.error('[authStore] check-login-attempts call failed (failing open):', error);
    return { allowed: true };
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function generateAvatar(name: string): string {
  const initials = getInitials(name);
  const colors = ['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${colors[colorIndex]}&color=fff&size=128`;
}

/**
 * Map a raw `public.users` profile row (joined with its company) into the
 * frontend `User` shape. Centralised here so every auth entry point
 * (initialize / login / refreshUser) maps profiles identically.
 */
function mapProfileToUser(userData: UserProfile): User {
  const company = userData.companies as any;
  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role.toLowerCase() as User['role'],
    status: userData.status.toLowerCase() as User['status'],
    avatar: userData.avatar || generateAvatar(userData.name),
    phone: userData.phone || undefined,
    companyName: company?.name,
    permissions:
    userData.role === 'SUPER_ADMIN'
    ? DEFAULT_ADMIN_PERMISSIONS
    : normalizePermissions(userData.permissions),
    lastActive: userData.lastActiveAt || new Date().toISOString(),
    createdAt: userData.createdAt,
    companyInfo: company ? {
      name: company.name,
      legalName: company.legalName,
      gstNumber: company.gstNumber || '',
      panNumber: company.panNumber || '',
      email: company.email,
      phone: company.phone || '',
      website: company.website || '',
      address: {
        line1: company.addressLine1,
        line2: company.addressLine2 || '',
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        country: company.country,
      },
      logo: company.logo || undefined,
      signature: company.signature || undefined,
      primaryColor: company.primaryColor || undefined,
      footerText: company.footerText || undefined,
      showLogo: company.showLogo ?? true,
    } : undefined,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Ensure a profile exists (fixes the 406 error for users whose
        // auth.users row has no matching public.users profile).
        const profile = await ensureUserProfile(session.user);

        if (profile) {
          const mappedUser = mapProfileToUser(profile);
          set({
            user: mappedUser,
            isAuthenticated: true,
            isInitialized: true,
          });
        } else {
          set({ isInitialized: true });
        }
      } else {
        set({ isInitialized: true });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isInitialized: true });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, isAuthenticated: false });
      } else if (event === 'SIGNED_IN' && session?.user) {
        // User signed in, fetch profile
        get().refreshUser();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed, make sure we have user data
        if (!get().user) {
          get().refreshUser();
        }
      }
    });
  },

  login: async (email: string, password: string, rememberMe?: boolean) => {
    // Note: rememberMe is not directly supported by Supabase - session persistence is automatic
    void rememberMe; // Acknowledge parameter
    set({ isLoading: true });
    try {
      const guard = await callLoginAttemptsGuard({ email });
      if (!guard.allowed) {
        set({ isLoading: false });
        return { success: false, error: guard.message || 'Too many login attempts. Please wait a minute before trying again.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        void callLoginAttemptsGuard({ email, outcome: 'failure' });
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      if (data.user) {
        void callLoginAttemptsGuard({ email, outcome: 'success' });

        // Ensure a profile exists for this user (covers existing auth users
        // that never received a public.users row, e.g. invited users).
        const profile = await ensureUserProfile(data.user);

        if (!profile) {
          set({ isLoading: false });
          return { success: false, error: 'Unable to load user profile. Please contact support.' };
        }

        // Update last login (non-blocking; failure is logged, not fatal)
        await supabase
          .from('users')
          .update({
            lastLoginAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          })
          .eq('id', profile.id);

        set({ user: mapProfileToUser(profile), isAuthenticated: true, isLoading: false });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...userData } : null;
      return { user: updated };
    });
  },

  refreshUser: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      // Use maybeSingle() via fetchUserProfile so a missing profile returns
      // null instead of throwing a 406, then ensure one exists.
      let profile = await fetchUserProfile(authUser.id);
      if (!profile) {
        profile = await ensureUserProfile(authUser);
      }

      if (!profile) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      set({ user: mapProfileToUser(profile), isAuthenticated: true });
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  },
}));
