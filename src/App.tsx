import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthProvider } from '@/components/auth/AuthProvider';

const LoginPage = lazy(() => import('@/modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('@/modules/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/modules/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CustomerListPage = lazy(() => import('@/modules/customers/CustomerListPage').then((m) => ({ default: m.CustomerListPage })));
const CustomerDetailsPage = lazy(() => import('@/modules/customers/CustomerDetailsPage').then((m) => ({ default: m.CustomerDetailsPage })));
const CustomerFormPage = lazy(() => import('@/modules/customers/CustomerFormPage').then((m) => ({ default: m.CustomerFormPage })));
const NotificationsPage = lazy(() => import("@/modules/notifications/NotificationsPage").then((m) => ({default: m.NotificationsPage })));
const InvoiceListPage = lazy(() => import('@/modules/invoices/InvoiceListPage').then((m) => ({ default: m.InvoiceListPage })));
const InvoiceCreatePage = lazy(() => import('@/modules/invoices/InvoiceCreatePage').then((m) => ({ default: m.InvoiceCreatePage })));
const InvoiceDetailsPage = lazy(() => import('@/modules/invoices/InvoiceDetailsPage').then((m) => ({ default: m.InvoiceDetailsPage })));
const PaymentLinkListPage = lazy(() => import('@/modules/payments/PaymentLinkListPage').then((m) => ({ default: m.PaymentLinkListPage })));
const PaymentLinkCreatePage = lazy(() => import('@/modules/payments/PaymentLinkCreatePage').then((m) => ({ default: m.PaymentLinkCreatePage })));
const PaymentLinkDetailsPage = lazy(() => import('@/modules/payments/PaymentLinkDetailsPage').then((m) => ({ default: m.PaymentLinkDetailsPage })));
const WhatsAppHistoryPage = lazy(() => import('@/modules/communication/CommunicationHistory').then((m) => ({ default: m.WhatsAppHistoryPage })));
const EmailHistoryPage = lazy(() => import('@/modules/communication/CommunicationHistory').then((m) => ({ default: m.EmailHistoryPage })));
const CommunicationLogsPage = lazy(() => import('@/modules/communication/CommunicationHistory').then((m) => ({ default: m.CommunicationLogsPage })));
const ReportsPage = lazy(() => import('@/modules/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('@/modules/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const UserManagementPage = lazy(() => import('@/modules/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage })));
const ModuleManagementPage = lazy(() => import('@/modules/admin/ModuleManagementPage').then((m) => ({ default: m.ModuleManagementPage })));
const AuditLogsPage = lazy(() => import('@/modules/admin/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const UsageAnalyticsPage = lazy(() => import('@/modules/admin/UsageAnalyticsPage').then((m) => ({ default: m.UsageAnalyticsPage })));
const InvoiceTemplatesPage = lazy(() => import('@/modules/admin/InvoiceTemplatesPage').then((m) => ({ default: m.InvoiceTemplatesPage })));
// const ExternalIntegrationsPage = lazy(() => import('@/modules/settings/ExternalIntegrationsPage').then((m) => ({ default: m.ExternalIntegrationsPage })));
const MasterConsolePage = lazy(() => import('@/modules/master/MasterConsolePage').then((m) => ({ default: m.MasterConsolePage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<LoadingState className="min-h-screen" />}>
              <Routes>
            {/* Public routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<ProtectedRoute module="dashboard"><DashboardPage /></ProtectedRoute>} />

              {/* Customers */}
              <Route path="/customers" element={<ProtectedRoute module="customers"><CustomerListPage /></ProtectedRoute>} />
              <Route path="/customers/new" element={<ProtectedRoute module="customers"><CustomerFormPage /></ProtectedRoute>} />
              <Route path="/customers/:id" element={<ProtectedRoute module="customers"><CustomerDetailsPage /></ProtectedRoute>} />
              <Route path="/customers/:id/edit" element={<ProtectedRoute module="customers"><CustomerFormPage /></ProtectedRoute>} />

              {/* Notifications */}
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}/>

              {/* Invoices */}
              <Route path="/invoices" element={<ProtectedRoute module="invoices"><InvoiceListPage /></ProtectedRoute>} />
              <Route path="/invoices/new" element={<ProtectedRoute module="invoices"><InvoiceCreatePage /></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute module="invoices"><InvoiceDetailsPage /></ProtectedRoute>} />
              <Route path="/invoices/:id/edit" element={<ProtectedRoute module="invoices"><InvoiceCreatePage /></ProtectedRoute>} />

              {/* Payment Links */}
              <Route path="/payment-links" element={<ProtectedRoute module="payment-links"><PaymentLinkListPage /></ProtectedRoute>} />
              <Route path="/payment-links/new" element={<ProtectedRoute module="payment-links"><PaymentLinkCreatePage /></ProtectedRoute>} />
              <Route path="/payment-links/:id" element={<ProtectedRoute module="payment-links"><PaymentLinkDetailsPage /></ProtectedRoute>} />

              {/* Communication */}
              <Route path="/communication/whatsapp" element={<ProtectedRoute module="whatsapp"><WhatsAppHistoryPage /></ProtectedRoute>} />
              <Route path="/communication/email" element={<ProtectedRoute module="email"><EmailHistoryPage /></ProtectedRoute>} />
              <Route path="/communication/logs" element={<ProtectedRoute module="whatsapp"><CommunicationLogsPage /></ProtectedRoute>} />

              {/* Reports */}
              <Route path="/reports" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />

              {/* Settings */}
              <Route path="/settings" element={<ProtectedRoute module="settings"><SettingsPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              {/* <Route path="/settings/external-integrations" element={<ProtectedRoute module="settings"><ExternalIntegrationsPage /></ProtectedRoute>} /> */}

              {/* Admin */}
              <Route path="/admin/users" element={<ProtectedRoute module="admin" adminOnly><UserManagementPage /></ProtectedRoute>} />
              <Route path="/admin/modules" element={<ProtectedRoute module="admin" adminOnly><ModuleManagementPage /></ProtectedRoute>} />
              <Route path="/admin/invoice-templates" element={<ProtectedRoute module="admin" adminOnly><InvoiceTemplatesPage /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute module="admin" adminOnly><AuditLogsPage /></ProtectedRoute>} />
              <Route path="/admin/usage" element={<ProtectedRoute module="admin" adminOnly><UsageAnalyticsPage /></ProtectedRoute>} />

              {/* Platform (SUPER_ADMIN only — enforced inside the page via RLS-backed queries) */}
              <Route path="/master" element={<ProtectedRoute><MasterConsolePage /></ProtectedRoute>} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}