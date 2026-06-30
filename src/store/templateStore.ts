import { create } from 'zustand';
import type { InvoiceTemplate, TemplateVersion, UserInvoiceTemplate } from '@/types';
import { templatesApi } from '@/utils/api';

interface TemplateState {
  templates: InvoiceTemplate[];
  versions: TemplateVersion[];
  userTemplates: UserInvoiceTemplate[];
  selectedTemplateId: string | null;
  selectedUserId: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  fetchTemplates: () => Promise<void>;
  fetchVersions: (templateId: string) => Promise<void>;
  fetchUserTemplates: () => Promise<void>;
  createTemplate: (data: any) => Promise<InvoiceTemplate>;
  addTemplate: (template: InvoiceTemplate) => void;
  updateTemplate: (id: string, data: Partial<InvoiceTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  removeTemplate: (id: string) => void;
  setAsDefault: (id: string) => Promise<void>;
  activateTemplate: (id: string) => Promise<void>;
  deactivateTemplate: (id: string) => Promise<void>;
  rollbackVersion: (templateId: string, versionId: string) => Promise<void>;
  assignTemplate: (userId: string, templateId: string) => void;
  setSelectedTemplate: (id: string | null) => void;
  setSelectedUser: (id: string | null) => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  versions: [],
  userTemplates: [],
  selectedTemplateId: null,
  selectedUserId: null,
  isLoading: false,
  isInitialized: false,

  fetchTemplates: async () => {
    set({ isLoading: true });
    try {
      const response = await templatesApi.getTemplates();
      const templates: InvoiceTemplate[] = response.map((t: any) => ({
        id: t.id,
        name: t.name,
        type: t.type.toLowerCase() as InvoiceTemplate['type'],
        version: t.version,
        content: t.content || undefined,
        config: t.config,
        status: t.status.toLowerCase() as InvoiceTemplate['status'],
        isDefault: t.isDefault,
        uploadedBy: t.uploadedBy?.name || 'Unknown',
        uploadedAt: t.uploadedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
      set({ templates, isLoading: false, isInitialized: true });
    } catch (error) {
      set({ isLoading: false, isInitialized: true });
    }
  },

  fetchVersions: async (templateId: string) => {
    try {
      const response = await templatesApi.getVersions(templateId);
      const versions: TemplateVersion[] = response.map((v: any) => ({
        id: v.id,
        templateId: v.templateId,
        version: v.version,
        content: v.content || undefined,
        config: v.config,
        uploadedBy: v.uploadedBy?.name || 'Unknown',
        uploadedAt: v.uploadedAt,
        createdAt: v.createdAt,
      }));
      set({ versions });
    } catch (error) {
      // Handle error
    }
  },

  fetchUserTemplates: async () => {
    try {
      const response = await templatesApi.getUserAssignments();
      const userTemplates: UserInvoiceTemplate[] = response.map((ut: any) => ({
        id: ut.id,
        userId: ut.userId,
        userEmail: ut.user?.email || '',
        userName: ut.user?.name || '',
        companyName: ut.company?.name,
        templateId: ut.templateId,
        isActive: ut.isActive,
        assignedAt: ut.assignedAt,
        assignedBy: ut.assignedBy?.name || 'System',
        createdAt: ut.createdAt,
        updatedAt: ut.updatedAt,
      }));
      set({ userTemplates });
    } catch (error) {
      // Handle error
    }
  },

  createTemplate: async (data) => {
    const response = await templatesApi.createTemplate(data);
    const template: InvoiceTemplate = {
      id: response.id,
      name: response.name,
      type: response.type.toLowerCase() as InvoiceTemplate['type'],
      version: response.version,
      content: response.content || undefined,
      config: response.config,
      status: response.status.toLowerCase() as InvoiceTemplate['status'],
      isDefault: response.isDefault,
      uploadedBy: 'You',
      uploadedAt: response.uploadedAt,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
    set((state) => ({ templates: [template, ...state.templates] }));
    return template;
  },

  updateTemplate: async (id, data) => {
    await templatesApi.updateTemplate(id, data);
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  deleteTemplate: async (id) => {
    await templatesApi.deleteTemplate(id);
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
      userTemplates: state.userTemplates.map((ut) =>
        ut.templateId === id ? { ...ut, templateId: null, isActive: false } : ut
      ),
    }));
  },

  setAsDefault: async (id) => {
    await templatesApi.setAsDefault(id);
    set((state) => ({
      templates: state.templates.map((t) => ({
        ...t,
        isDefault: t.id === id,
      })),
    }));
  },

  activateTemplate: async (id) => {
    await templatesApi.activateTemplate(id);
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, status: 'active' } : t
      ),
    }));
  },

  deactivateTemplate: async (id) => {
    await templatesApi.deactivateTemplate(id);
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, status: 'disabled' } : t
      ),
    }));
  },

  addTemplate: (template) => {
    set((state) => ({ templates: [template, ...state.templates] }));
  },

  removeTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));
  },

  assignTemplate: (userId, templateId) => {
    set((state) => ({
      userTemplates: state.userTemplates.map((ut) =>
        ut.userId === userId ? { ...ut, templateId, isActive: true, updatedAt: new Date().toISOString() } : ut
      ),
    }));
  },

  rollbackVersion: async (templateId, versionId) => {
    await templatesApi.rollbackToVersion(templateId, versionId);
    // Refresh versions after rollback
    await get().fetchVersions(templateId);
  },

  setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
  setSelectedUser: (id) => set({ selectedUserId: id }),
}));
