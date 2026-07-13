/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import type { ModuleConfig, ModuleKey } from '@/types';
import { modulesApi } from '@/utils/api';
import { DEFAULT_ADMIN_PERMISSIONS, normalizeModuleKey, normalizeRoles, toDbModuleKey } from '@/utils/permissions';

interface ModuleState {
  modules: ModuleConfig[];
  isLoading: boolean;
  isInitialized: boolean;
  fetchModules: () => Promise<void>;
  toggleModule: (key: ModuleKey) => Promise<void>;
  isModuleEnabled: (key: ModuleKey) => boolean;
  setModuleRoles: (key: ModuleKey, roles: ModuleConfig['roles']) => Promise<void>;
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  isLoading: false,
  isInitialized: false,

  fetchModules: async () => {
    set({ isLoading: true });
    try {
      const response = await modulesApi.getModules();
      const modules: ModuleConfig[] = response
        .map((m: any) => {
          const key = normalizeModuleKey(m.key ?? m.module);
          if (!key) return null;

          return {
            key,
            label: m.label,
            description: m.description || '',
            enabled: m.enabled,
            icon: m.icon,
            roles: normalizeRoles(m.roles),
          } satisfies ModuleConfig;
        })
        .filter((module): module is ModuleConfig => module !== null);
      set({ modules, isLoading: false, isInitialized: true });
    } catch {
      // Fallback to default modules if API fails
      const defaultModules: ModuleConfig[] = [
        { key: 'dashboard', label: 'Dashboard', description: 'Analytics overview', enabled: true, icon: 'LayoutDashboard', roles: ['super_admin', 'admin', 'manager', 'staff', 'viewer'] },
        { key: 'customers', label: 'Customers', description: 'Customer management', enabled: true, icon: 'Users', roles: ['super_admin', 'admin', 'manager', 'staff'] },
        { key: 'invoices', label: 'Invoices', description: 'Invoice management', enabled: true, icon: 'FileText', roles: ['super_admin', 'admin', 'manager', 'staff'] },
        { key: 'payment-links', label: 'Payment Links', description: 'Payment links', enabled: true, icon: 'CreditCard', roles: ['super_admin', 'admin', 'manager', 'staff'] },
        { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp communication', enabled: true, icon: 'MessageCircle', roles: ['super_admin', 'admin', 'manager', 'staff'] },
        { key: 'email', label: 'Email', description: 'Email communication', enabled: true, icon: 'Mail', roles: ['super_admin', 'admin', 'manager', 'staff'] },
        { key: 'reports', label: 'Reports', description: 'Business reports', enabled: true, icon: 'BarChart3', roles: ['super_admin', 'admin', 'manager', 'viewer'] },
        { key: 'settings', label: 'Settings', description: 'Company settings', enabled: true, icon: 'Settings', roles: ['super_admin', 'admin', 'manager'] },
        { key: 'admin', label: 'Admin', description: 'Administration', enabled: true, icon: 'ShieldCheck', roles: ['super_admin', 'admin'] },
      ];
      set({ modules: defaultModules, isLoading: false, isInitialized: true });
    }
  },

  toggleModule: async (key: ModuleKey) => {
    if (key === 'admin') return;
    const module = get().modules.find((m) => m.key === key);
    if (!module) return;

    try {
      await modulesApi.updateModule(toDbModuleKey(key), { enabled: !module.enabled });
      set((state) => ({
        modules: state.modules.map((m) =>
          m.key === key ? { ...m, enabled: !m.enabled } : m
        ),
      }));
    } catch (error) {
      console.error('[moduleStore] Failed to toggle module:', error);
      throw error;
    }
  },

  isModuleEnabled: (key: ModuleKey) => {
    if (key === 'admin') return true;
    const mod = get().modules.find((m) => m.key === key);
    return mod ? mod.enabled : DEFAULT_ADMIN_PERMISSIONS.includes(key);
  },

  setModuleRoles: async (key: ModuleKey, roles: ModuleConfig['roles']) => {
    try {
      await modulesApi.updateModuleRole(toDbModuleKey(key), { roles: roles.map((r) => r.toUpperCase()) });
      set((state) => ({
        modules: state.modules.map((m) =>
          m.key === key ? { ...m, roles } : m
        ),
      }));
    } catch (error) {
      console.error('[moduleStore] Failed to update module roles:', error);
      throw error;
    }
  },
}));
