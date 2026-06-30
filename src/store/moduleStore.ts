import { create } from 'zustand';
import type { ModuleConfig, ModuleKey } from '@/types';
import { modulesApi } from '@/utils/api';

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
      const modules: ModuleConfig[] = response.map((m: any) => ({
        key: m.key.toLowerCase() as ModuleKey,
        label: m.label,
        description: m.description || '',
        enabled: m.enabled,
        icon: m.icon,
        roles: m.roles?.map((r: any) => r.role?.toLowerCase() as ModuleConfig['roles'][number]) || [],
      }));
      set({ modules, isLoading: false, isInitialized: true });
    } catch (error) {
      // Fallback to default modules if API fails
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
      set({ modules: defaultModules, isLoading: false, isInitialized: true });
    }
  },

  toggleModule: async (key: ModuleKey) => {
    if (key === 'admin') return;
    const module = get().modules.find((m) => m.key === key);
    if (!module) return;

    try {
      await modulesApi.updateModule(key.toUpperCase(), { enabled: !module.enabled });
      set((state) => ({
        modules: state.modules.map((m) =>
          m.key === key ? { ...m, enabled: !m.enabled } : m
        ),
      }));
    } catch (error) {
      // Optimistically update anyway
      set((state) => ({
        modules: state.modules.map((m) =>
          m.key === key ? { ...m, enabled: !m.enabled } : m
        ),
      }));
    }
  },

  isModuleEnabled: (key: ModuleKey) => {
    if (key === 'admin') return true;
    const mod = get().modules.find((m) => m.key === key);
    return mod ? mod.enabled : true;
  },

  setModuleRoles: async (key: ModuleKey, roles: ModuleConfig['roles']) => {
    try {
      await modulesApi.updateModuleRole(key.toUpperCase(), { roles: roles.map((r) => r.toUpperCase()) });
      set((state) => ({
        modules: state.modules.map((m) =>
          m.key === key ? { ...m, roles } : m
        ),
      }));
    } catch (error) {
      // Optimistically update anyway
      set((state) => ({
        modules: state.modules.map((m) =>
          m.key === key ? { ...m, roles } : m
        ),
      }));
    }
  },
}));
