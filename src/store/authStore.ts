/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, ModuleKey } from '@/types';

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*, companies!users_companyId_fkey(*)')
          .eq('id', session.user.id)
          .single();

        if (!error && userData) {
          const company = userData.companies as any;
          const user: User = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role.toLowerCase() as User['role'],
            status: userData.status.toLowerCase() as User['status'],
            avatar: userData.avatar || generateAvatar(userData.name),
            phone: userData.phone || undefined,
            companyName: company?.name,
            permissions: (userData.permissions as ModuleKey[]) || [],
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
          set({ user, isAuthenticated: true, isInitialized: true });
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*, companies!users_companyId_fkey(*)')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          set({ isLoading: false });
          return { success: false, error: 'User profile not found' };
        }

        const company = userData.companies as any;
        const user: User = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role.toLowerCase() as User['role'],
          status: userData.status.toLowerCase() as User['status'],
          avatar: userData.avatar || generateAvatar(userData.name),
          phone: userData.phone || undefined,
          companyName: company?.name,
          permissions: (userData.permissions as ModuleKey[]) || [],
          lastActive: new Date().toISOString(),
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

        // Update last login
        await supabase
          .from('users')
          .update({
            lastLoginAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          })
          .eq('id', userData.id);

        set({ user, isAuthenticated: true, isLoading: false });
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

      const { data: userData, error } = await supabase
        .from('users')
        .select('*, companies!users_companyId_fkey(*)')
        .eq('id', authUser.id)
        .single();

      if (error || !userData) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      const company = userData.companies as any;
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role.toLowerCase() as User['role'],
        status: userData.status.toLowerCase() as User['status'],
        avatar: userData.avatar || generateAvatar(userData.name),
        phone: userData.phone || undefined,
        companyName: company?.name,
        permissions: (userData.permissions as ModuleKey[]) || [],
        lastActive: new Date().toISOString(),
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

      set({ user, isAuthenticated: true });
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  },
}));
