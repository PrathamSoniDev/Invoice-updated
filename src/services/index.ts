// Re-export all services from their new Supabase-based implementations
export { customerService } from './customerService';
export { invoiceService } from './invoiceService';
export { paymentService } from './paymentService';
export { dashboardService, dashboardApi } from './dashboardService';
export { settingsService, settingsApi } from './settingsService';
export { adminService, adminApi, userService, auditService, activityService, modulesApi } from './adminService';
export { templatesService, templatesApi, integrationsService, integrationsApi } from './templateIntegrationService';
export { reportsService, reportsApi, communicationService, communicationApi, exportsApi, analyticsApi } from './reportsCommunicationService';
