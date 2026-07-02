/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId, paginate, logActivity } from '@/lib/database';
import type { InvoiceTemplate, TemplateVersion, UserInvoiceTemplate, ExternalIntegration, IntegrationLog, SyncHistory } from '@/types';

// Templates Service
export const templatesService = {
  async getTemplates(params?: { search?: string; status?: string; type?: string }): Promise<InvoiceTemplate[]> {
    const companyId = await getCurrentCompanyId();

    let query = supabase
      .from('invoice_templates')
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (params?.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type.toLowerCase() as any,
      version: String(t.version),
      content: t.content,
      config: t.config,
      status: t.status.toLowerCase() as any,
      isDefault: t.isDefault,
      uploadedBy: t.uploadedById,
      uploadedAt: t.createdAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  },

  async getTemplate(id: string): Promise<InvoiceTemplate | null> {
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.type.toLowerCase() as any,
      version: String(data.version),
      content: data.content,
      config: data.config,
      status: data.status.toLowerCase() as any,
      isDefault: data.isDefault,
      uploadedBy: data.uploadedById,
      uploadedAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async getDefaultTemplate(): Promise<InvoiceTemplate | null> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('companyId', companyId)
      .eq('isDefault', true)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.type.toLowerCase() as any,
      version: String(data.version),
      content: data.content,
      config: data.config,
      status: data.status.toLowerCase() as any,
      isDefault: data.isDefault,
      uploadedBy: data.uploadedById,
      uploadedAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async createTemplate(input: { name: string; type: string; content?: string; config?: any }): Promise<InvoiceTemplate> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('invoice_templates')
      .insert({
        companyId,
        name: input.name,
        type: input.type?.toUpperCase() || 'HTML',
        content: input.content || '',
        config: input.config || {},
        status: 'DRAFT',
        isDefault: false,
        version: 1,
        uploadedById: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial version
    await supabase.from('template_versions').insert({
      templateId: data.id,
      version: 1,
      content: input.content || '',
      changedBy: userId,
    });

    await logActivity('create', 'template', data.id, `Created template ${input.name}`);

    return {
      id: data.id,
      name: data.name,
      type: data.type.toLowerCase() as any,
      version: String(data.version),
      content: data.content,
      config: data.config,
      status: data.status.toLowerCase() as any,
      isDefault: data.isDefault,
      uploadedBy: data.uploadedById,
      uploadedAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async updateTemplate(id: string, input: Partial<{ name: string; content: string; config: any }>): Promise<InvoiceTemplate> {
    const userId = await getCurrentUserId();

    const { data: existing } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) throw new Error('Template not found');

    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.config !== undefined) updateData.config = input.config;
    updateData.version = existing.version + 1;

    const { data, error } = await supabase
      .from('invoice_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Create new version
    await supabase.from('template_versions').insert({
      templateId: id,
      version: updateData.version,
      content: input.content || existing.content,
      changedBy: userId,
    });

    return {
      id: data.id,
      name: data.name,
      type: data.type.toLowerCase() as any,
      version: String(data.version),
      content: data.content,
      config: data.config,
      status: data.status.toLowerCase() as any,
      isDefault: data.isDefault,
      uploadedBy: data.uploadedById,
      uploadedAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async deleteTemplate(id: string): Promise<void> {
    await supabase
      .from('invoice_templates')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', id);
  },

  async setAsDefault(id: string): Promise<InvoiceTemplate> {
    const companyId = await getCurrentCompanyId();

    // Unset current default
    await supabase
      .from('invoice_templates')
      .update({ isDefault: false })
      .eq('companyId', companyId);

    // Set new default
    const { data, error } = await supabase
      .from('invoice_templates')
      .update({ isDefault: true, status: 'ACTIVE' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      type: data.type.toLowerCase() as any,
      version: String(data.version),
      content: data.content,
      config: data.config,
      status: data.status.toLowerCase() as any,
      isDefault: data.isDefault,
      uploadedBy: data.uploadedById,
      uploadedAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async activateTemplate(id: string): Promise<InvoiceTemplate> {
    const { data, error } = await supabase
      .from('invoice_templates')
      .update({ status: 'ACTIVE' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      type: data.type.toLowerCase() as any,
      version: String(data.version),
      content: data.content,
      config: data.config,
      status: data.status.toLowerCase() as any,
      isDefault: data.isDefault,
      uploadedBy: data.uploadedById,
      uploadedAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async deactivateTemplate(id: string): Promise<InvoiceTemplate> {
    const { data, error } = await supabase
      .from('invoice_templates')
      .update({ status: 'DISABLED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      type: data.type.toLowerCase() as any,
      version: String(data.version),
      content: data.content,
      config: data.config,
      status: data.status.toLowerCase() as any,
      isDefault: data.isDefault,
      uploadedBy: data.uploadedById,
      uploadedAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async getVersions(templateId: string): Promise<TemplateVersion[]> {
    const { data, error } = await supabase
      .from('template_versions')
      .select('*')
      .eq('templateId', templateId)
      .order('version', { ascending: false });

    if (error) throw error;

    return (data || []).map((v) => ({
      id: v.id,
      templateId: v.templateId,
      version: String(v.version),
      content: v.content,
      uploadedBy: v.changedBy,
      uploadedAt: v.createdAt,
      createdAt: v.createdAt,
    }));
  },

  async rollbackToVersion(templateId: string, versionId: string): Promise<InvoiceTemplate> {
    const { data: version } = await supabase
      .from('template_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (!version) throw new Error('Version not found');

    return this.updateTemplate(templateId, { content: version.content });
  },

  async previewTemplate(id: string): Promise<any> {
    const template = await this.getTemplate(id);
    if (!template) throw new Error('Template not found');
    return { preview: template.content, template };
  },

  async getUserAssignments(): Promise<UserInvoiceTemplate[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('user_invoice_templates')
      .select('*, users!user_invoice_templates_userId_fkey(name, email), invoice_templates!user_invoice_templates_templateId_fkey(name)')
      .eq('companyId', companyId);

    if (error) throw error;

    return (data || []).map((a) => ({
      id: a.id,
      userId: a.userId,
      userEmail: (a.users as any)?.email,
      userName: (a.users as any)?.name,
      templateId: a.templateId,
      isActive: a.isDefault,
      assignedAt: a.createdAt,
      assignedBy: '',
      createdAt: a.createdAt,
      updatedAt: a.createdAt,
    }));
  },

  async getMyTemplate(): Promise<InvoiceTemplate | null> {
    const userId = await getCurrentUserId();

    const { data: assignment } = await supabase
      .from('user_invoice_templates')
      .select('templateId')
      .eq('userId', userId)
      .eq('isDefault', true)
      .maybeSingle();

    if (!assignment?.templateId) return this.getDefaultTemplate();

    return this.getTemplate(assignment.templateId);
  },

  async getStats(): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { count: total } = await supabase
      .from('invoice_templates')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .is('deletedAt', null);

    const { count: active } = await supabase
      .from('invoice_templates')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .eq('status', 'ACTIVE')
      .is('deletedAt', null);

    return { total: total || 0, active: active || 0 };
  },
};

// Integrations Service
export const integrationsService = {
  async getIntegrations(params?: { search?: string; status?: string; provider?: string }): Promise<ExternalIntegration[]> {
    const companyId = await getCurrentCompanyId();

    let query = supabase
      .from('external_integrations')
      .select('*')
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false });

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status.toUpperCase());
    }

    if (params?.provider && params.provider !== 'all') {
      query = query.eq('provider', params.provider.toUpperCase());
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((i) => ({
      id: i.id,
      name: i.name,
      provider: i.provider.toLowerCase() as any,
      description: i.description || '',
      status: i.status.toLowerCase() as any,
      config: i.config || {},
      syncOptions: i.syncOptions || {},
      lastSyncAt: i.lastSyncAt,
      nextSyncAt: i.nextSyncAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  },

  async getIntegration(id: string): Promise<ExternalIntegration | null> {
    const { data, error } = await supabase
      .from('external_integrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;

    return {
      id: data.id,
      name: data.name,
      provider: data.provider.toLowerCase() as any,
      description: data.description || '',
      status: data.status.toLowerCase() as any,
      config: data.config || {},
      syncOptions: data.syncOptions || {},
      lastSyncAt: data.lastSyncAt,
      nextSyncAt: data.nextSyncAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async createIntegration(input: {
    provider: string;
    name: string;
    description?: string;
    config?: any;
    syncOptions?: any;
  }): Promise<ExternalIntegration> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('external_integrations')
      .insert({
        companyId,
        provider: input.provider.toUpperCase(),
        name: input.name,
        description: input.description || null,
        config: input.config || {},
        syncOptions: input.syncOptions || {},
        status: 'DISCONNECTED',
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('create', 'integration', data.id, `Created integration ${input.name}`);

    return {
      id: data.id,
      name: data.name,
      provider: data.provider.toLowerCase() as any,
      description: data.description || '',
      status: data.status.toLowerCase() as any,
      config: data.config || {},
      syncOptions: data.syncOptions || {},
      lastSyncAt: data.lastSyncAt,
      nextSyncAt: data.nextSyncAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async updateIntegration(id: string, input: Partial<{
    name: string;
    description: string;
    config: any;
    syncOptions: any;
    status: string;
  }>): Promise<ExternalIntegration> {
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.config !== undefined) updateData.config = input.config;
    if (input.syncOptions !== undefined) updateData.syncOptions = input.syncOptions;
    if (input.status !== undefined) updateData.status = input.status.toUpperCase();

    const { data, error } = await supabase
      .from('external_integrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      provider: data.provider.toLowerCase() as any,
      description: data.description || '',
      status: data.status.toLowerCase() as any,
      config: data.config || {},
      syncOptions: data.syncOptions || {},
      lastSyncAt: data.lastSyncAt,
      nextSyncAt: data.nextSyncAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async deleteIntegration(id: string): Promise<void> {
    await supabase.from('external_integrations').delete().eq('id', id);
  },

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.getIntegration(id);
    if (!integration) return { success: false, message: 'Integration not found' };

    // Mock connection test - in real app, this would actually test the connection
    const success = Math.random() > 0.3;
    await this.updateIntegration(id, { status: success ? 'connected' : 'error' });

    return {
      success,
      message: success ? 'Connection successful' : 'Connection failed - please check your credentials',
    };
  },

  async startSync(id: string, input: { syncType: string; entityTypes: string[] }): Promise<any> {
    const integration = await this.getIntegration(id);
    if (!integration) throw new Error('Integration not found');

    // Create sync history entry
    const { data, error } = await supabase
      .from('sync_history')
      .insert({
        integrationId: id,
        syncType: input.syncType,
        entityType: input.entityTypes.join(','),
        status: 'RUNNING',
      })
      .select()
      .single();

    if (error) throw error;

    // Update integration last sync
    await this.updateIntegration(id, { status: 'connected' });

    return {
      id: data.id,
      status: data.status,
      startedAt: data.startedAt,
    };
  },

  async getLogs(id: string, params?: { level?: string; page?: number; limit?: number }): Promise<{ data: IntegrationLog[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    let query = supabase
      .from('integration_logs')
      .select('*', { count: 'exact' })
      .eq('integrationId', id)
      .order('createdAt', { ascending: false });

    if (params?.level) {
      query = query.eq('level', params.level.toUpperCase());
    }

    const result = await paginate<any>(query, page, limit);

    return {
      data: result.data.map((l) => ({
        id: l.id,
        integrationId: l.integrationId,
        level: l.level.toLowerCase() as any,
        message: l.message,
        details: l.details,
        createdAt: l.createdAt,
      })),
      total: result.total,
    };
  },

  async getSyncHistory(id: string, params?: { entityType?: string; status?: string; page?: number; limit?: number }): Promise<{ data: SyncHistory[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    let query = supabase
      .from('sync_history')
      .select('*', { count: 'exact' })
      .eq('integrationId', id)
      .order('startedAt', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status.toUpperCase());
    }

    const result = await paginate<any>(query, page, limit);

    return {
      data: result.data.map((s) => ({
        id: s.id,
        integrationId: s.integrationId,
        syncType: s.syncType,
        entityType: s.entityType,
        status: s.status.toLowerCase() as any,
        recordsCount: s.recordsCount,
        errorMessage: s.errorMessage,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
      total: result.total,
    };
  },

  async getQueueStatus(): Promise<any> {
    // Return mock queue status
    return {
      pending: 0,
      processing: 0,
      completed: 12,
      failed: 0,
    };
  },
};

// Export for backwards compatibility
export const templatesApi = templatesService;
export const integrationsApi = integrationsService;
