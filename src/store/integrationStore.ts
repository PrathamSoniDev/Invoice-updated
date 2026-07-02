/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import type { ExternalIntegration, IntegrationLog, SyncHistory } from '@/types';
import { integrationsApi } from '@/utils/api';

interface IntegrationState {
  integrations: ExternalIntegration[];
  logs: IntegrationLog[];
  syncHistory: SyncHistory[];
  selectedIntegrationId: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  fetchIntegrations: () => Promise<void>;
  fetchLogs: (id: string) => Promise<void>;
  fetchSyncHistory: (id: string) => Promise<void>;
  createIntegration: (data: any) => Promise<ExternalIntegration>;
  updateIntegration: (id: string, data: Partial<ExternalIntegration>) => Promise<void>;
  deleteIntegration: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<{ success: boolean; message: string }>;
  startSync: (id: string, entityTypes: string[]) => Promise<void>;
  setSelectedIntegration: (id: string | null) => void;
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],
  logs: [],
  syncHistory: [],
  selectedIntegrationId: null,
  isLoading: false,
  isInitialized: false,

  fetchIntegrations: async () => {
    set({ isLoading: true });
    try {
      const response = await integrationsApi.getIntegrations();
      const integrations: ExternalIntegration[] = response.map((i: any) => ({
        id: i.id,
        name: i.name,
        provider: i.provider.toLowerCase() as ExternalIntegration['provider'],
        description: i.description || '',
        status: i.status.toLowerCase() as ExternalIntegration['status'],
        config: i.config || {},
        syncOptions: i.syncOptions || {
          customers: false,
          invoices: false,
          products: false,
          taxes: false,
          payments: false,
          chartOfAccounts: false,
        },
        lastSyncAt: i.lastSyncAt,
        nextSyncAt: i.nextSyncAt,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }));
      set({ integrations, isLoading: false, isInitialized: true });
    } catch {
      set({ isLoading: false, isInitialized: true });
    }
  },

  fetchLogs: async (id: string) => {
    try {
      const response = await integrationsApi.getLogs(id);
      const logs: IntegrationLog[] = response.data.map((l: any) => ({
        id: l.id,
        integrationId: l.integrationId,
        level: l.level,
        message: l.message,
        details: l.details,
        createdAt: l.createdAt,
      }));
      set({ logs });
    } catch {
      // Handle error
    }
  },

  fetchSyncHistory: async (id: string) => {
    try {
      const response = await integrationsApi.getSyncHistory(id);
      const syncHistory: SyncHistory[] = response.data.map((s: any) => ({
        id: s.id,
        integrationId: s.integrationId,
        syncType: s.syncType.toLowerCase() as SyncHistory['syncType'],
        entityType: s.entityType,
        status: s.status.toLowerCase() as SyncHistory['status'],
        recordsCount: s.recordsCount,
        errorMessage: s.errorMessage,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      }));
      set({ syncHistory });
    } catch {
      // Handle error
    }
  },

  createIntegration: async (data) => {
    const response = await integrationsApi.createIntegration({
      name: data.name,
      provider: data.provider.toUpperCase(),
      description: data.description,
      config: data.config,
      syncOptions: data.syncOptions,
    });
    const integration: ExternalIntegration = {
      id: response.id,
      name: response.name,
      provider: response.provider.toLowerCase() as ExternalIntegration['provider'],
      description: response.description || '',
      status: response.status.toLowerCase() as ExternalIntegration['status'],
      config: response.config || {},
      syncOptions: response.syncOptions || {},
      lastSyncAt: response.lastSyncAt,
      nextSyncAt: response.nextSyncAt,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
    set((state) => ({ integrations: [integration, ...state.integrations] }));
    return integration;
  },

  updateIntegration: async (id, data) => {
    await integrationsApi.updateIntegration(id, {
      name: data.name,
      description: data.description,
      config: data.config,
      syncOptions: data.syncOptions,
    });
    set((state) => ({
      integrations: state.integrations.map((i) =>
        i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i
      ),
    }));
  },

  deleteIntegration: async (id) => {
    await integrationsApi.deleteIntegration(id);
    set((state) => ({
      integrations: state.integrations.filter((i) => i.id !== id),
    }));
  },

  testConnection: async (id) => {
    return integrationsApi.testConnection(id);
  },

  startSync: async (id, entityTypes) => {
    await integrationsApi.startSync(id, { syncType: 'manual', entityTypes });
    // Refresh sync history
    await get().fetchSyncHistory(id);
  },

  setSelectedIntegration: (id) => set({ selectedIntegrationId: id }),
}));
