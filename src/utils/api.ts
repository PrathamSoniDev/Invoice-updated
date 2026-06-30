import api, { ApiResponse, PaginatedResponse } from '@/utils/apiClient';

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

// Auth API
export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data.data;
  },

  async register(data: RegisterRequest) {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
    return response.data.data;
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async refreshToken(refreshToken: string) {
    const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
    return response.data.data;
  },

  async getProfile() {
    const response = await api.get<ApiResponse<LoginResponse['user']>>('/auth/me');
    return response.data.data;
  },

  async forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string) {
    await api.post('/auth/reset-password', { token, password });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },
};

// Dashboard API
export const dashboardApi = {
  async getSummary(dateRange?: string) {
    const response = await api.get<ApiResponse<any>>('/dashboard/summary', { params: { dateRange } });
    return response.data.data;
  },

  async getChartData(chartType: string, params?: Record<string, any>) {
    const response = await api.get<ApiResponse<any>>(`/dashboard/charts/${chartType}`, { params });
    return response.data.data;
  },

  async getTopCustomers(limit?: number) {
    const response = await api.get<ApiResponse<any>>('/dashboard/top-customers', { params: { limit } });
    return response.data.data;
  },

  async getRecentActivities(limit?: number) {
    const response = await api.get<ApiResponse<any>>('/dashboard/recent-activities', { params: { limit } });
    return response.data.data;
  },

  async refresh() {
    await api.post('/dashboard/refresh');
  },
};

// Settings API
export const settingsApi = {
  async getCompanyProfile() {
    const response = await api.get<ApiResponse<any>>('/settings/profile');
    return response.data.data;
  },

  async updateCompanyProfile(data: any) {
    const response = await api.put<ApiResponse<any>>('/settings/profile', data);
    return response.data.data;
  },

  async getCompanySettings() {
    const response = await api.get<ApiResponse<any>>('/settings/company');
    return response.data.data;
  },

  async updateCompanySettings(data: any) {
    const response = await api.put<ApiResponse<any>>('/settings/company', data);
    return response.data.data;
  },

  async getBankInfo() {
    const response = await api.get<ApiResponse<any>>('/settings/bank');
    return response.data.data;
  },

  async upsertBankInfo(data: any) {
    const response = await api.put<ApiResponse<any>>('/settings/bank', data);
    return response.data.data;
  },

  async deleteBankInfo() {
    await api.delete('/settings/bank');
  },

  async getInvoiceSettings() {
    const response = await api.get<ApiResponse<any>>('/settings/invoice');
    return response.data.data;
  },

  async updateInvoiceSettings(data: any) {
    const response = await api.put<ApiResponse<any>>('/settings/invoice', data);
    return response.data.data;
  },

  async getCommunicationSettings() {
    const response = await api.get<ApiResponse<any>>('/settings/communication');
    return response.data.data;
  },

  async updateCommunicationSettings(data: any) {
    const response = await api.put<ApiResponse<any>>('/settings/communication', data);
    return response.data.data;
  },

  async getGatewaySettings() {
    const response = await api.get<ApiResponse<any>>('/settings/gateway');
    return response.data.data;
  },

  async getTaxConfigurations() {
    const response = await api.get<ApiResponse<any[]>>('/settings/tax');
    return response.data.data;
  },

  async createTaxConfiguration(data: any) {
    const response = await api.post<ApiResponse<any>>('/settings/tax', data);
    return response.data.data;
  },

  async updateTaxConfiguration(id: string, data: any) {
    const response = await api.put<ApiResponse<any>>(`/settings/tax/${id}`, data);
    return response.data.data;
  },

  async deleteTaxConfiguration(id: string) {
    await api.delete(`/settings/tax/${id}`);
  },

  async getUserSettings() {
    const response = await api.get<ApiResponse<any>>('/settings/user');
    return response.data.data;
  },

  async updateUserSettings(data: any) {
    const response = await api.put<ApiResponse<any>>('/settings/user', data);
    return response.data.data;
  },

  async getCompleteSettings() {
    const response = await api.get<ApiResponse<any>>('/settings/complete');
    return response.data.data;
  },
};

// Modules API
export const modulesApi = {
  async getModules() {
    const response = await api.get<ApiResponse<any[]>>('/admin/modules');
    return response.data.data;
  },

  async getModule(id: string) {
    const response = await api.get<ApiResponse<any>>(`/admin/modules/${id}`);
    return response.data.data;
  },

  async updateModule(id: string, data: any) {
    const response = await api.put<ApiResponse<any>>(`/admin/modules/${id}`, data);
    return response.data.data;
  },

  async updateModuleRole(moduleId: string, data: any) {
    const response = await api.put<ApiResponse<any>>(`/admin/modules/${moduleId}/roles`, data);
    return response.data.data;
  },
};

// Templates API
export const templatesApi = {
  async getTemplates(params?: { search?: string; status?: string; type?: string }) {
    const response = await api.get<ApiResponse<any[]>>('/templates', { params });
    return response.data.data;
  },

  async getTemplate(id: string) {
    const response = await api.get<ApiResponse<any>>(`/templates/${id}`);
    return response.data.data;
  },

  async getDefaultTemplate() {
    const response = await api.get<ApiResponse<any>>('/templates/default');
    return response.data.data;
  },

  async createTemplate(data: any) {
    const response = await api.post<ApiResponse<any>>('/templates', data);
    return response.data.data;
  },

  async updateTemplate(id: string, data: any) {
    const response = await api.put<ApiResponse<any>>(`/templates/${id}`, data);
    return response.data.data;
  },

  async deleteTemplate(id: string) {
    await api.delete(`/templates/${id}`);
  },

  async setAsDefault(id: string) {
    const response = await api.post<ApiResponse<any>>(`/templates/${id}/default`);
    return response.data.data;
  },

  async activateTemplate(id: string) {
    const response = await api.post<ApiResponse<any>>(`/templates/${id}/activate`);
    return response.data.data;
  },

  async deactivateTemplate(id: string) {
    const response = await api.post<ApiResponse<any>>(`/templates/${id}/deactivate`);
    return response.data.data;
  },

  async getVersions(templateId: string) {
    const response = await api.get<ApiResponse<any[]>>(`/templates/${templateId}/versions`);
    return response.data.data;
  },

  async rollbackToVersion(templateId: string, versionId: string) {
    const response = await api.post<ApiResponse<any>>(`/templates/${templateId}/versions/${versionId}/rollback`);
    return response.data.data;
  },

  async previewTemplate(id: string) {
    const response = await api.get<ApiResponse<any>>(`/templates/${id}/preview`);
    return response.data.data;
  },

  async getUserAssignments() {
    const response = await api.get<ApiResponse<any[]>>('/templates/assignments');
    return response.data.data;
  },

  async getMyTemplate() {
    const response = await api.get<ApiResponse<any>>('/templates/my');
    return response.data.data;
  },

  async getStats() {
    const response = await api.get<ApiResponse<any>>('/templates/stats');
    return response.data.data;
  },
};

// Integrations API
export const integrationsApi = {
  async getIntegrations(params?: { search?: string; status?: string; provider?: string }) {
    const response = await api.get<ApiResponse<any[]>>('/integrations', { params });
    return response.data.data;
  },

  async getIntegration(id: string) {
    const response = await api.get<ApiResponse<any>>(`/integrations/${id}`);
    return response.data.data;
  },

  async createIntegration(data: any) {
    const response = await api.post<ApiResponse<any>>('/integrations', data);
    return response.data.data;
  },

  async updateIntegration(id: string, data: any) {
    const response = await api.put<ApiResponse<any>>(`/integrations/${id}`, data);
    return response.data.data;
  },

  async deleteIntegration(id: string) {
    await api.delete(`/integrations/${id}`);
  },

  async testConnection(id: string) {
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(`/integrations/${id}/test`);
    return response.data.data;
  },

  async startSync(id: string, data: { syncType: string; entityTypes: string[] }) {
    const response = await api.post<ApiResponse<any>>(`/integrations/${id}/sync`, data);
    return response.data.data;
  },

  async getLogs(id: string, params?: { level?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>(`/integrations/${id}/logs`, { params });
    return response.data.data;
  },

  async getSyncHistory(id: string, params?: { entityType?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>(`/integrations/${id}/sync-history`, { params });
    return response.data.data;
  },

  async getQueueStatus() {
    const response = await api.get<ApiResponse<any>>('/integrations/queue/status');
    return response.data.data;
  },
};

// Communication API
export const communicationApi = {
  async getLogs(params?: { search?: string; channel?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>('/communication/logs', { params });
    return response.data.data;
  },

  async getLog(id: string) {
    const response = await api.get<ApiResponse<any>>(`/communication/logs/${id}`);
    return response.data.data;
  },

  async getTemplates() {
    const response = await api.get<ApiResponse<any[]>>('/communication/templates');
    return response.data.data;
  },

  async createTemplate(data: any) {
    const response = await api.post<ApiResponse<any>>('/communication/templates', data);
    return response.data.data;
  },

  async updateTemplate(id: string, data: any) {
    const response = await api.put<ApiResponse<any>>(`/communication/templates/${id}`, data);
    return response.data.data;
  },

  async deleteTemplate(id: string) {
    await api.delete(`/communication/templates/${id}`);
  },

  async setDefaultTemplate(id: string) {
    const response = await api.post<ApiResponse<any>>(`/communication/templates/${id}/default`);
    return response.data.data;
  },

  async sendEmail(data: any) {
    const response = await api.post<ApiResponse<any>>('/communication/send/email', data);
    return response.data.data;
  },

  async sendWhatsApp(data: any) {
    const response = await api.post<ApiResponse<any>>('/communication/send/whatsapp', data);
    return response.data.data;
  },

  async sendInvoiceEmail(invoiceId: string) {
    const response = await api.post<ApiResponse<any>>(`/communication/send/invoice/${invoiceId}/email`);
    return response.data.data;
  },

  async getStats(startDate?: Date, endDate?: Date) {
    const response = await api.get<ApiResponse<any>>('/communication/stats', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },
};

// Reports API
export const reportsApi = {
  async getInvoiceReport(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/invoices', { params });
    return response.data.data;
  },

  async getAgingReport(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/aging', { params });
    return response.data.data;
  },

  async getCustomerRevenueReport(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/customer-revenue', { params });
    return response.data.data;
  },

  async getOutstandingReport(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/outstanding', { params });
    return response.data.data;
  },

  async getPaymentReport(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/payments', { params });
    return response.data.data;
  },

  async getTaxReport(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/tax', { params });
    return response.data.data;
  },

  async getGatewayReport(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/gateway', { params });
    return response.data.data;
  },

  async getFinancialSummary(params?: any) {
    const response = await api.get<ApiResponse<any>>('/reports/financial-summary', { params });
    return response.data.data;
  },

  async getSavedReports() {
    const response = await api.get<ApiResponse<any[]>>('/reports/saved');
    return response.data.data;
  },

  async saveReport(data: any) {
    const response = await api.post<ApiResponse<any>>('/reports/saved', data);
    return response.data.data;
  },

  async deleteSavedReport(id: string) {
    await api.delete(`/reports/saved/${id}`);
  },
};

// Exports API
export const exportsApi = {
  async queueExport(data: { reportType: string; format: string; dateRange?: string; filters?: any }) {
    const response = await api.post<ApiResponse<{ exportId: string; status: string }>>('/exports', data);
    return response.data.data;
  },

  async getExportStatus(id: string) {
    const response = await api.get<ApiResponse<any>>(`/exports/${id}/status`);
    return response.data.data;
  },

  async downloadExport(id: string) {
    const response = await api.get(`/exports/${id}/download`, { responseType: 'blob' });
    return response.data;
  },

  async getExportHistory() {
    const response = await api.get<ApiResponse<any[]>>('/exports/history');
    return response.data.data;
  },
};

// Analytics API
export const analyticsApi = {
  async getRevenueAnalytics(period?: string) {
    const response = await api.get<ApiResponse<any>>('/analytics/revenue', { params: { period } });
    return response.data.data;
  },

  async getInvoiceAnalytics(period?: string) {
    const response = await api.get<ApiResponse<any>>('/analytics/invoices', { params: { period } });
    return response.data.data;
  },

  async getCustomerAnalytics(period?: string) {
    const response = await api.get<ApiResponse<any>>('/analytics/customers', { params: { period } });
    return response.data.data;
  },

  async getPaymentAnalytics(period?: string) {
    const response = await api.get<ApiResponse<any>>('/analytics/payments', { params: { period } });
    return response.data.data;
  },

  async getOutstandingAnalytics() {
    const response = await api.get<ApiResponse<any>>('/analytics/outstanding');
    return response.data.data;
  },

  async getMovingAverage(metric: string, days?: number) {
    const response = await api.get<ApiResponse<any>>('/analytics/moving-average', { params: { metric, days } });
    return response.data.data;
  },
};

// Admin API
export const adminApi = {
  async getDashboard() {
    const response = await api.get<ApiResponse<any>>('/admin/dashboard');
    return response.data.data;
  },

  async getUsers(params?: { search?: string; status?: string; role?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>('/admin/users', { params });
    return response.data.data;
  },

  async getUser(id: string) {
    const response = await api.get<ApiResponse<any>>(`/admin/users/${id}`);
    return response.data.data;
  },

  async createUser(data: any) {
    const response = await api.post<ApiResponse<any>>('/admin/users', data);
    return response.data.data;
  },

  async updateUser(id: string, data: any) {
    const response = await api.put<ApiResponse<any>>(`/admin/users/${id}`, data);
    return response.data.data;
  },

  async suspendUser(id: string) {
    const response = await api.post<ApiResponse<any>>(`/admin/users/${id}/suspend`);
    return response.data.data;
  },

  async activateUser(id: string) {
    const response = await api.post<ApiResponse<any>>(`/admin/users/${id}/activate`);
    return response.data.data;
  },

  async deleteUser(id: string) {
    await api.delete(`/admin/users/${id}`);
  },

  async restoreUser(id: string) {
    const response = await api.post<ApiResponse<any>>(`/admin/users/${id}/restore`);
    return response.data.data;
  },

  async getUserStats() {
    const response = await api.get<ApiResponse<any>>('/admin/users/stats');
    return response.data.data;
  },

  async getAuditLogs(params?: { search?: string; action?: string; module?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>('/admin/audit-logs', { params });
    return response.data.data;
  },

  async getAuditLogStats() {
    const response = await api.get<ApiResponse<any>>('/admin/audit-logs/stats');
    return response.data.data;
  },

  async getActivityLogs(params?: { page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>('/admin/activity-logs', { params });
    return response.data.data;
  },

  async getApiUsageStats() {
    const response = await api.get<ApiResponse<any>>('/admin/api-usage');
    return response.data.data;
  },

  async getApiUsage() {
    const response = await api.get<ApiResponse<{ data: any[] }>>('/admin/api-usage/daily');
    return response.data.data;
  },

  async getFeatureUsage() {
    const response = await api.get<ApiResponse<{ data: any[] }>>('/admin/feature-usage');
    return response.data.data;
  },

  async getStorageUsage() {
    const response = await api.get<ApiResponse<{ data: any[] }>>('/admin/storage-usage');
    return response.data.data;
  },

  async getCompanyStats() {
    const response = await api.get<ApiResponse<any>>('/admin/company-stats');
    return response.data.data;
  },
};
