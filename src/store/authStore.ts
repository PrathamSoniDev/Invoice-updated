import { create } from 'zustand';
import type { User } from '@/types';
import { authApi } from '@/utils/api';

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

const AUTH_STORAGE_KEY = 'invoicegen-auth';

const getStoredAuth = (): { user: User | null; accessToken: string | null; refreshToken: string | null } => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
};

const setStoredAuth = (data: { user: User | null; accessToken?: string | null; refreshToken?: string | null }) => {
  if (data.user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const stored = getStoredAuth();
    if (stored.accessToken && stored.user) {
      // Set the token for API calls
      localStorage.setItem('accessToken', stored.accessToken);
      localStorage.setItem('refreshToken', stored.refreshToken || '');

      // Verify token is still valid
      try {
        const profile = await authApi.getProfile();
        const user: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role.toLowerCase() as User['role'],
          status: 'active',
          permissions: profile.permissions as User['permissions'],
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true, isInitialized: true });
      } catch {
        // Token invalid, clear storage
        setStoredAuth({ user: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },

  login: async (email: string, password: string, rememberMe = false) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login({ email, password, rememberMe });

      const user: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role.toLowerCase() as User['role'],
        status: 'active',
        permissions: response.user.permissions as User['permissions'],
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Store tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      setStoredAuth({
        user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.error?.message || 'Invalid email or password';
      return { success: false, error: message };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    setStoredAuth({ user: null });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...userData } : null;
      if (updated) {
        const stored = getStoredAuth();
        setStoredAuth({ ...stored, user: updated });
      }
      return { user: updated };
    });
  },

  refreshUser: async () => {
    try {
      const profile = await authApi.getProfile();
      const user: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role.toLowerCase() as User['role'],
        status: 'active',
        permissions: profile.permissions as User['permissions'],
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const stored = getStoredAuth();
      setStoredAuth({ ...stored, user });
      set({ user });
    } catch (error) {
      // Failed to refresh, might need to re-login
    }
  },
}));
