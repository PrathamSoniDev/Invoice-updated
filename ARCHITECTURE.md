# InvoiceGen Enterprise - Complete Backend Architecture

## Table of Contents

1. [Frontend to Backend Mapping](#1-frontend-to-backend-mapping)
2. [Database Design](#2-database-design)
3. [API Specification](#3-api-specification)
4. [Authentication Flow](#4-authentication-flow)
5. [RBAC Design](#5-rbac-design)
6. [Module Permission Matrix](#6-module-permission-matrix)
7. [Folder Structure](#7-folder-structure)
8. [Queue Architecture](#8-queue-architecture)
9. [Redis Strategy](#9-redis-strategy)
10. [Socket.IO Design](#10-socketio-design)
11. [External Integrations](#11-external-integrations)
12. [Implementation Order](#12-implementation-order)
13. [Testing Strategy](#13-testing-strategy)
14. [Production Checklist](#14-production-checklist)

---

## 1. Frontend to Backend Mapping

### 1.1 Authentication Pages

#### LoginPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | LoginPage |
| **Route** | `/login` |
| **Components** | AuthLayout, Input, Button, Label, Card |
| **React Query Hooks** | `useLogin` (mutation) |
| **API Service** | `authService.login()` |
| **Backend Controller** | `AuthController.login` |
| **Backend Service** | `AuthService.login` |
| **Repository** | `UserRepository.findByEmail`, `SessionRepository.create` |
| **Prisma Models** | User, Session, RefreshToken |
| **REST Endpoint** | `POST /api/v1/auth/login` |
| **Request DTO** | `LoginRequestDTO { email: string, password: string, rememberMe?: boolean }` |
| **Response DTO** | `AuthResponseDTO { user: UserDTO, accessToken: string, refreshToken: string, expiresIn: number }` |
| **Authentication** | None (public) |
| **RBAC Requirement** | None |
| **Module Permission** | None |

#### ForgotPasswordPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | ForgotPasswordPage |
| **Route** | `/forgot-password` |
| **Components** | AuthLayout, Input, Button, Label, Card |
| **React Query Hooks** | `useForgotPassword` (mutation) |
| **API Service** | `authService.forgotPassword()` |
| **Backend Controller** | `AuthController.forgotPassword` |
| **Backend Service** | `AuthService.initiatePasswordReset` |
| **Repository** | `UserRepository.findByEmail`, `PasswordResetTokenRepository.create` |
| **Prisma Models** | User, PasswordResetToken |
| **REST Endpoint** | `POST /api/v1/auth/forgot-password` |
| **Request DTO** | `ForgotPasswordRequestDTO { email: string }` |
| **Response DTO** | `MessageResponseDTO { message: string }` |
| **Authentication** | None (public) |
| **RBAC Requirement** | None |
| **Module Permission** | None |

#### ResetPasswordPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | ResetPasswordPage |
| **Route** | `/reset-password` |
| **Components** | AuthLayout, Input, Button, Label, Card |
| **React Query Hooks** | `useResetPassword` (mutation) |
| **API Service** | `authService.resetPassword()` |
| **Backend Controller** | `AuthController.resetPassword` |
| **Backend Service** | `AuthService.completePasswordReset` |
| **Repository** | `PasswordResetTokenRepository.findByToken`, `UserRepository.updatePassword` |
| **Prisma Models** | User, PasswordResetToken |
| **REST Endpoint** | `POST /api/v1/auth/reset-password` |
| **Request DTO** | `ResetPasswordRequestDTO { token: string, password: string, confirmPassword: string }` |
| **Response DTO** | `MessageResponseDTO { message: string }` |
| **Authentication** | None (public, token-based) |
| **RBAC Requirement** | None |
| **Module Permission** | None |

---

### 1.2 Dashboard Page

| Attribute | Value |
|-----------|-------|
| **Page Name** | DashboardPage |
| **Route** | `/dashboard` |
| **Components** | StatCard, MetricCard, ChartWrapper, ActivityTimeline, Card, Button, Avatar |
| **React Query Hooks** | `useDashboardMetrics`, `useRevenueTrend`, `useInvoiceTrend`, `useCustomerGrowth`, `usePaymentDistribution`, `useRecentInvoices`, `useActivityLogs` |
| **API Service** | `dashboardService.getMetrics()`, `dashboardService.getCharts()` |
| **Backend Controller** | `DashboardController.getMetrics`, `DashboardController.getCharts` |
| **Backend Service** | `DashboardService.calculateMetrics`, `DashboardService.getChartData` |
| **Repository** | `InvoiceRepository.getAggregates`, `CustomerRepository.count`, `PaymentRepository.getAggregates`, `ActivityLogRepository.findRecent` |
| **Prisma Models** | Invoice, Customer, Payment, PaymentLink, ActivityLog |
| **REST Endpoints** | `GET /api/v1/dashboard/metrics`, `GET /api/v1/dashboard/charts`, `GET /api/v1/dashboard/recent-invoices`, `GET /api/v1/dashboard/activity` |
| **Request DTO** | `DashboardQueryDTO { dateRange?: string }` |
| **Response DTO** | `DashboardMetricsDTO`, `DashboardChartsDTO`, `RecentInvoicesDTO`, `ActivityLogsDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | Any authenticated role |
| **Module Permission** | `dashboard` |

---

### 1.3 Customer Pages

#### CustomerListPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | CustomerListPage |
| **Route** | `/customers` |
| **Components** | PageHeader, DataTable, SearchBar, FilterBar, StatusBadge, Pagination |
| **React Query Hooks** | `useCustomers` (query with pagination) |
| **API Service** | `customerService.list()` |
| **Backend Controller** | `CustomerController.list` |
| **Backend Service** | `CustomerService.getCustomers` |
| **Repository** | `CustomerRepository.findWithPagination` |
| **Prisma Models** | Customer |
| **REST Endpoint** | `GET /api/v1/customers` |
| **Request DTO** | `CustomerListQueryDTO { page?: number, limit?: number, search?: string, status?: string, sortBy?: string, sortOrder?: 'asc' | 'desc' }` |
| **Response DTO** | `PaginatedResponseDTO<CustomerDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `customers` (read) |

#### CustomerDetailsPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | CustomerDetailsPage |
| **Route** | `/customers/:id` |
| **Components** | PageHeader, Card, Tabs, InvoiceList, PaymentHistory, ActivityTimeline |
| **React Query Hooks** | `useCustomer`, `useCustomerInvoices`, `useCustomerPayments` |
| **API Service** | `customerService.get()`, `invoiceService.listByCustomer()` |
| **Backend Controller** | `CustomerController.get`, `InvoiceController.listByCustomer` |
| **Backend Service** | `CustomerService.getCustomerById` |
| **Repository** | `CustomerRepository.findById`, `InvoiceRepository.findByCustomerId` |
| **Prisma Models** | Customer, Invoice, Payment |
| **REST Endpoints** | `GET /api/v1/customers/:id`, `GET /api/v1/customers/:id/invoices`, `GET /api/v1/customers/:id/payments` |
| **Request DTO** | Path param: `id: string` |
| **Response DTO** | `CustomerDetailDTO`, `PaginatedResponseDTO<InvoiceDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `customers` (read) |

#### CustomerFormPage (Create)

| Attribute | Value |
|-----------|-------|
| **Page Name** | CustomerFormPage (Create) |
| **Route** | `/customers/new` |
| **Components** | PageHeader, Form, Input, Textarea, Button, AddressFields |
| **React Query Hooks** | `useCreateCustomer` (mutation) |
| **API Service** | `customerService.create()` |
| **Backend Controller** | `CustomerController.create` |
| **Backend Service** | `CustomerService.createCustomer` |
| **Repository** | `CustomerRepository.create` |
| **Prisma Models** | Customer |
| **REST Endpoint** | `POST /api/v1/customers` |
| **Request DTO** | `CreateCustomerDTO { name: string, businessName: string, gstNumber?: string, email: string, mobile: string, whatsapp?: string, billingAddress: AddressDTO, shippingAddress?: AddressDTO, notes?: string }` |
| **Response DTO** | `CustomerDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `customers` (create) |

#### CustomerFormPage (Edit)

| Attribute | Value |
|-----------|-------|
| **Page Name** | CustomerFormPage (Edit) |
| **Route** | `/customers/:id/edit` |
| **Components** | PageHeader, Form, Input, Textarea, Button, AddressFields |
| **React Query Hooks** | `useCustomer`, `useUpdateCustomer` (mutation) |
| **API Service** | `customerService.update()` |
| **Backend Controller** | `CustomerController.update` |
| **Backend Service** | `CustomerService.updateCustomer` |
| **Repository** | `CustomerRepository.update` |
| **Prisma Models** | Customer |
| **REST Endpoint** | `PUT /api/v1/customers/:id` |
| **Request DTO** | `UpdateCustomerDTO { ...fields }` |
| **Response DTO** | `CustomerDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `customers` (update) |

---

### 1.4 Invoice Pages

#### InvoiceListPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | InvoiceListPage |
| **Route** | `/invoices` |
| **Components** | PageHeader, DataTable, SearchBar, FilterBar, StatusBadge, Pagination |
| **React Query Hooks** | `useInvoices` (query with pagination) |
| **API Service** | `invoiceService.list()` |
| **Backend Controller** | `InvoiceController.list` |
| **Backend Service** | `InvoiceService.getInvoices` |
| **Repository** | `InvoiceRepository.findWithPagination` |
| **Prisma Models** | Invoice, InvoiceItem, Customer |
| **REST Endpoint** | `GET /api/v1/invoices` |
| **Request DTO** | `InvoiceListQueryDTO { page?: number, limit?: number, search?: string, status?: string, customerId?: string, fromDate?: string, toDate?: string, sortBy?: string, sortOrder?: 'asc' | 'desc' }` |
| **Response DTO** | `PaginatedResponseDTO<InvoiceDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `invoices` (read) |

#### InvoiceDetailsPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | InvoiceDetailsPage |
| **Route** | `/invoices/:id` |
| **Components** | PageHeader, Card, InvoicePreview, LineItemsTable, PaymentHistory, ActionsMenu |
| **React Query Hooks** | `useInvoice`, `useInvoicePayments` |
| **API Service** | `invoiceService.get()` |
| **Backend Controller** | `InvoiceController.get` |
| **Backend Service** | `InvoiceService.getInvoiceById` |
| **Repository** | `InvoiceRepository.findByIdWithItems` |
| **Prisma Models** | Invoice, InvoiceItem, Customer, Payment |
| **REST Endpoints** | `GET /api/v1/invoices/:id`, `GET /api/v1/invoices/:id/payments` |
| **Request DTO** | Path param: `id: string` |
| **Response DTO** | `InvoiceDetailDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `invoices` (read) |

#### InvoiceCreatePage

| Attribute | Value |
|-----------|-------|
| **Page Name** | InvoiceCreatePage |
| **Route** | `/invoices/new` |
| **Components** | PageHeader, Form, CustomerSelect, LineItemsEditor, TotalsCalculator, DatePicker, Textarea, Button |
| **React Query Hooks** | `useCreateInvoice` (mutation), `useCustomers` (for dropdown) |
| **API Service** | `invoiceService.create()` |
| **Backend Controller** | `InvoiceController.create` |
| **Backend Service** | `InvoiceService.createInvoice` |
| **Repository** | `InvoiceRepository.create`, `InvoiceItemRepository.createMany` |
| **Prisma Models** | Invoice, InvoiceItem |
| **REST Endpoint** | `POST /api/v1/invoices` |
| **Request DTO** | `CreateInvoiceDTO { customerId: string, issueDate: string, dueDate: string, lineItems: LineItemDTO[], notes?: string, terms?: string, discountAmount?: number }` |
| **Response DTO** | `InvoiceDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `invoices` (create) |

#### InvoiceUpdatePage

| Attribute | Value |
|-----------|-------|
| **Page Name** | InvoiceCreatePage (Edit) |
| **Route** | `/invoices/:id/edit` |
| **Components** | Same as create |
| **React Query Hooks** | `useInvoice`, `useUpdateInvoice` (mutation) |
| **API Service** | `invoiceService.update()` |
| **Backend Controller** | `InvoiceController.update` |
| **Backend Service** | `InvoiceService.updateInvoice` |
| **Repository** | `InvoiceRepository.update`, `InvoiceItemRepository.upsertMany` |
| **Prisma Models** | Invoice, InvoiceItem |
| **REST Endpoint** | `PUT /api/v1/invoices/:id` |
| **Request DTO** | `UpdateInvoiceDTO { ...fields }` |
| **Response DTO** | `InvoiceDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `invoices` (update) |

#### Invoice Actions

| Action | Endpoint | Description |
|--------|----------|-------------|
| Send | `POST /api/v1/invoices/:id/send` | Mark as sent, trigger email |
| Mark Paid | `POST /api/v1/invoices/:id/mark-paid` | Update status to paid |
| Cancel | `POST /api/v1/invoices/:id/cancel` | Mark as cancelled |
| Duplicate | `POST /api/v1/invoices/:id/duplicate` | Create copy |
| Delete | `DELETE /api/v1/invoices/:id` | Soft delete |
| Download PDF | `GET /api/v1/invoices/:id/pdf` | Generate and download |

---

### 1.5 Payment Link Pages

#### PaymentLinkListPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | PaymentLinkListPage |
| **Route** | `/payment-links` |
| **Components** | PageHeader, DataTable, SearchBar, FilterBar, StatusBadge, Pagination |
| **React Query Hooks** | `usePaymentLinks` (query with pagination) |
| **API Service** | `paymentService.listLinks()` |
| **Backend Controller** | `PaymentLinkController.list` |
| **Backend Service** | `PaymentLinkService.getPaymentLinks` |
| **Repository** | `PaymentLinkRepository.findWithPagination` |
| **Prisma Models** | PaymentLink, Customer |
| **REST Endpoint** | `GET /api/v1/payment-links` |
| **Request DTO** | `PaymentLinkListQueryDTO { page?: number, limit?: number, search?: string, status?: string, gateway?: string }` |
| **Response DTO** | `PaginatedResponseDTO<PaymentLinkDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `payment-links` (read) |

#### PaymentLinkDetailsPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | PaymentLinkDetailsPage |
| **Route** | `/payment-links/:id` |
| **Components** | PageHeader, Card, PaymentInfo, StatusTimeline, ActionsMenu |
| **React Query Hooks** | `usePaymentLink` |
| **API Service** | `paymentService.getLink()` |
| **Backend Controller** | `PaymentLinkController.get` |
| **Backend Service** | `PaymentLinkService.getPaymentLinkById` |
| **Repository** | `PaymentLinkRepository.findById` |
| **Prisma Models** | PaymentLink, Customer, Payment |
| **REST Endpoint** | `GET /api/v1/payment-links/:id` |
| **Request DTO** | Path param: `id: string` |
| **Response DTO** | `PaymentLinkDetailDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `payment-links` (read) |

#### PaymentLinkCreatePage

| Attribute | Value |
|-----------|-------|
| **Page Name** | PaymentLinkCreatePage |
| **Route** | `/payment-links/new` |
| **Components** | PageHeader, Form, CustomerSelect, AmountInput, DatePicker, GatewaySelect, Textarea, Button |
| **React Query Hooks** | `useCreatePaymentLink` (mutation) |
| **API Service** | `paymentService.createLink()` |
| **Backend Controller** | `PaymentLinkController.create` |
| **Backend Service** | `PaymentLinkService.createPaymentLink` |
| **Repository** | `PaymentLinkRepository.create` |
| **Prisma Models** | PaymentLink |
| **REST Endpoint** | `POST /api/v1/payment-links` |
| **Request DTO** | `CreatePaymentLinkDTO { customerId: string, amount: number, currency?: string, gateway: GatewayType, expiryDate: string, description?: string }` |
| **Response DTO** | `PaymentLinkDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `payment-links` (create) |

---

### 1.6 Communication Pages

#### WhatsAppHistoryPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | WhatsAppHistoryPage |
| **Route** | `/communication/whatsapp` |
| **Components** | PageHeader, DataTable, SearchBar, FilterBar, CommunicationStatusBadge, Pagination |
| **React Query Hooks** | `useCommunicationLogs` (query with pagination, filtered by channel) |
| **API Service** | `communicationService.listLogs()` |
| **Backend Controller** | `CommunicationController.list` |
| **Backend Service** | `CommunicationService.getLogs` |
| **Repository** | `CommunicationLogRepository.findWithPagination` |
| **Prisma Models** | CommunicationLog, Customer, MessageTemplate |
| **REST Endpoint** | `GET /api/v1/communications` |
| **Request DTO** | `CommunicationListQueryDTO { page?: number, limit?: number, search?: string, channel: 'whatsapp', status?: string }` |
| **Response DTO** | `PaginatedResponseDTO<CommunicationLogDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `whatsapp` (read) |

#### EmailHistoryPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | EmailHistoryPage |
| **Route** | `/communication/email` |
| **Components** | Same as WhatsApp |
| **React Query Hooks** | `useCommunicationLogs` (filtered by channel: email) |
| **API Service** | `communicationService.listLogs()` |
| **Backend Controller** | `CommunicationController.list` |
| **Backend Service** | `CommunicationService.getLogs` |
| **Repository** | `CommunicationLogRepository.findWithPagination` |
| **Prisma Models** | CommunicationLog, Customer, MessageTemplate |
| **REST Endpoint** | `GET /api/v1/communications` |
| **Request DTO** | `CommunicationListQueryDTO { ...channel: 'email' }` |
| **Response DTO** | `PaginatedResponseDTO<CommunicationLogDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, staff |
| **Module Permission** | `email` (read) |

---

### 1.7 Reports Page

| Attribute | Value |
|-----------|-------|
| **Page Name** | ReportsPage |
| **Route** | `/reports` |
| **Components** | PageHeader, Tabs, StatCard, ChartWrapper, DataTable, ExportButton, DatePicker |
| **React Query Hooks** | `useReportData` (for each tab: revenue, invoices, customers, payments, tax, outstanding) |
| **API Service** | `reportService.getRevenueReport()`, `reportService.getInvoiceReport()`, etc. |
| **Backend Controller** | `ReportController.getRevenue`, `ReportController.getInvoices`, `ReportController.getCustomers`, `ReportController.getPayments`, `ReportController.getTax`, `ReportController.getOutstanding` |
| **Backend Service** | `ReportService.generateRevenueReport`, `ReportService.generateInvoiceReport`, etc. |
| **Repository** | `InvoiceRepository.reportAggregates`, `CustomerRepository.reportAggregates`, `PaymentRepository.reportAggregates` |
| **Prisma Models** | Invoice, Customer, Payment |
| **REST Endpoints** | `GET /api/v1/reports/revenue`, `GET /api/v1/reports/invoices`, `GET /api/v1/reports/customers`, `GET /api/v1/reports/payments`, `GET /api/v1/reports/tax`, `GET /api/v1/reports/outstanding` |
| **Request DTO** | `ReportQueryDTO { dateRange: string, fromDate?: string, toDate?: string }` |
| **Response DTO** | `RevenueReportDTO`, `InvoiceReportDTO`, `CustomerReportDTO`, `PaymentReportDTO`, `TaxReportDTO`, `OutstandingReportDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, viewer |
| **Module Permission** | `reports` (read) |

#### Report Export Endpoint

| Attribute | Value |
|-----------|-------|
| **REST Endpoint** | `GET /api/v1/reports/export` |
| **Request DTO** | `ExportQueryDTO { reportType: string, format: 'pdf' | 'excel' | 'csv', dateRange?: string }` |
| **Response** | File download (application/pdf, application/vnd.ms-excel, text/csv) |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager, viewer |
| **Module Permission** | `reports` (export) |

---

### 1.8 Settings Pages

#### SettingsPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | SettingsPage |
| **Route** | `/settings` |
| **Components** | PageHeader, Tabs, Card, Form, Input, Textarea, Switch, FileUpload, Button |
| **React Query Hooks** | `useSettings`, `useUpdateCompanySettings`, `useUpdateBankSettings`, `useUpdateInvoiceSettings`, `useUpdateCommunicationSettings`, `useUpdateGatewaySettings` |
| **API Service** | `settingsService.getCompany()`, `settingsService.updateCompany()`, etc. |
| **Backend Controller** | `SettingsController.getCompany`, `SettingsController.updateCompany`, `SettingsController.getBank`, `SettingsController.updateBank`, `SettingsController.getInvoice`, `SettingsController.updateInvoice`, `SettingsController.getCommunication`, `SettingsController.updateCommunication`, `SettingsController.getGateways`, `SettingsController.updateGateways` |
| **Backend Service** | `SettingsService.getCompanySettings`, `SettingsService.updateCompanySettings`, etc. |
| **Repository** | `CompanyRepository.find`, `CompanyRepository.update`, `BankInfoRepository.find`, `BankInfoRepository.update`, `InvoiceSettingsRepository.find`, `InvoiceSettingsRepository.update` |
| **Prisma Models** | Company, BankInfo, InvoiceSettings, CommunicationSettings, GatewaySettings |
| **REST Endpoints** | `GET /api/v1/settings/company`, `PUT /api/v1/settings/company`, `GET /api/v1/settings/bank`, `PUT /api/v1/settings/bank`, `GET /api/v1/settings/invoice`, `PUT /api/v1/settings/invoice`, `GET /api/v1/settings/communication`, `PUT /api/v1/settings/communication`, `GET /api/v1/settings/gateways`, `PUT /api/v1/settings/gateways` |
| **Request DTO** | `CompanySettingsDTO`, `BankSettingsDTO`, `InvoiceSettingsDTO`, `CommunicationSettingsDTO`, `GatewaySettingsDTO` |
| **Response DTO** | Same as request DTOs |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin, manager |
| **Module Permission** | `settings` (configure) |

#### ExternalIntegrationsPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | ExternalIntegrationsPage |
| **Route** | `/settings/external-integrations` |
| **Components** | PageHeader, IntegrationCard, IntegrationConfigDialog, SyncHistoryTable |
| **React Query Hooks** | `useIntegrations`, `useIntegrationLogs`, `useConnectIntegration`, `useDisconnectIntegration`, `useSyncIntegration` |
| **API Service** | `integrationService.list()`, `integrationService.connect()`, `integrationService.disconnect()`, `integrationService.sync()` |
| **Backend Controller** | `IntegrationController.list`, `IntegrationController.get`, `IntegrationController.connect`, `IntegrationController.disconnect`, `IntegrationController.sync`, `IntegrationController.getLogs` |
| **Backend Service** | `IntegrationService.listIntegrations`, `IntegrationService.connectProvider`, `IntegrationService.disconnectProvider`, `IntegrationService.triggerSync` |
| **Repository** | `ExternalIntegrationRepository.find`, `ExternalIntegrationRepository.update`, `SyncHistoryRepository.create`, `IntegrationLogRepository.find` |
| **Prisma Models** | ExternalIntegration, IntegrationLog, SyncHistory |
| **REST Endpoints** | `GET /api/v1/integrations`, `GET /api/v1/integrations/:id`, `POST /api/v1/integrations/:id/connect`, `POST /api/v1/integrations/:id/disconnect`, `POST /api/v1/integrations/:id/sync`, `GET /api/v1/integrations/:id/logs`, `GET /api/v1/integrations/:id/sync-history` |
| **Request DTO** | `ConnectIntegrationDTO { config: IntegrationConfigDTO, syncOptions: SyncOptionsDTO }` |
| **Response DTO** | `IntegrationDTO`, `SyncHistoryDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin |
| **Module Permission** | `settings` (configure) |

---

### 1.9 Admin Pages

#### UserManagementPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | UserManagementPage |
| **Route** | `/admin/users` |
| **Components** | PageHeader, DataTable, SearchBar, FilterBar, UserRoleBadge, UserStatusBadge, ActionsMenu, UserFormDialog |
| **React Query Hooks** | `useUsers`, `useCreateUser`, `useUpdateUser`, `useSuspendUser`, `useDeleteUser` |
| **API Service** | `userService.list()`, `userService.create()`, `userService.update()`, `userService.suspend()`, `userService.delete()` |
| **Backend Controller** | `UserController.list`, `UserController.create`, `UserController.get`, `UserController.update`, `UserController.suspend`, `UserController.delete` |
| **Backend Service** | `UserService.getUsers`, `UserService.createUser`, `UserService.updateUser`, `UserService.suspendUser`, `UserService.deleteUser` |
| **Repository** | `UserRepository.findWithPagination`, `UserRepository.create`, `UserRepository.update` |
| **Prisma Models** | User, Role, Permission |
| **REST Endpoints** | `GET /api/v1/admin/users`, `POST /api/v1/admin/users`, `GET /api/v1/admin/users/:id`, `PUT /api/v1/admin/users/:id`, `POST /api/v1/admin/users/:id/suspend`, `DELETE /api/v1/admin/users/:id` |
| **Request DTO** | `CreateUserDTO`, `UpdateUserDTO` |
| **Response DTO** | `UserDTO`, `PaginatedResponseDTO<UserDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin only |
| **Module Permission** | `admin` (full CRUD) |

#### ModuleManagementPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | ModuleManagementPage |
| **Route** | `/admin/modules` |
| **Components** | PageHeader, ModuleCard, Switch, RoleSelect |
| **React Query Hooks** | `useModules`, `useToggleModule`, `useUpdateModuleRoles` |
| **API Service** | `moduleService.list()`, `moduleService.toggle()`, `moduleService.updateRoles()` |
| **Backend Controller** | `ModuleController.list`, `ModuleController.toggle`, `ModuleController.updateRoles` |
| **Backend Service** | `ModuleService.getModules`, `ModuleService.toggleModule`, `ModuleService.updateModuleRoles` |
| **Repository** | `ModuleRepository.find`, `ModuleRepository.update` |
| **Prisma Models** | Module, ModuleRole |
| **REST Endpoints** | `GET /api/v1/admin/modules`, `PUT /api/v1/admin/modules/:key/toggle`, `PUT /api/v1/admin/modules/:key/roles` |
| **Request DTO** | `ToggleModuleDTO`, `UpdateModuleRolesDTO` |
| **Response DTO** | `ModuleDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin only |
| **Module Permission** | `admin` (configure) |

#### InvoiceTemplatesPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | InvoiceTemplatesPage |
| **Route** | `/admin/invoice-templates` |
| **Components** | PageHeader, TemplateList, TemplateUploadDialog, TemplatePreviewModal, TemplateVersionTimeline |
| **React Query Hooks** | `useTemplates`, `useTemplateVersions`, `useUploadTemplate`, `useActivateTemplate`, `useSetDefaultTemplate`, `useDeleteTemplate` |
| **API Service** | `templateService.list()`, `templateService.upload()`, `templateService.activate()`, `templateService.setDefault()` |
| **Backend Controller** | `TemplateController.list`, `TemplateController.get`, `TemplateController.upload`, `TemplateController.activate`, `TemplateController.setDefault`, `TemplateController.getVersions`, `TemplateController.delete` |
| **Backend Service** | `TemplateService.getTemplates`, `TemplateService.uploadTemplate`, `TemplateService.activateTemplate`, `TemplateService.setDefaultTemplate`, `TemplateService.getVersions` |
| **Repository** | `InvoiceTemplateRepository.find`, `InvoiceTemplateRepository.create`, `InvoiceTemplateRepository.update`, `TemplateVersionRepository.find` |
| **Prisma Models** | InvoiceTemplate, TemplateVersion, UserInvoiceTemplate |
| **REST Endpoints** | `GET /api/v1/admin/templates`, `POST /api/v1/admin/templates`, `GET /api/v1/admin/templates/:id`, `PUT /api/v1/admin/templates/:id/activate`, `PUT /api/v1/admin/templates/:id/default`, `GET /api/v1/admin/templates/:id/versions`, `DELETE /api/v1/admin/templates/:id` |
| **Request DTO** | `UploadTemplateDTO { name: string, type: TemplateType, content: string, config?: object }` |
| **Response DTO** | `TemplateDTO`, `TemplateVersionDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin only |
| **Module Permission** | `admin` (configure) |

#### AuditLogsPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | AuditLogsPage |
| **Route** | `/admin/audit-logs` |
| **Components** | PageHeader, DataTable, FilterBar, ActionsFilter, ModuleFilter, DateRangePicker |
| **React Query Hooks** | `useAuditLogs` |
| **API Service** | `auditService.list()` |
| **Backend Controller** | `AuditController.list` |
| **Backend Service** | `AuditService.getAuditLogs` |
| **Repository** | `AuditLogRepository.findWithPagination` |
| **Prisma Models** | AuditLog |
| **REST Endpoint** | `GET /api/v1/admin/audit-logs` |
| **Request DTO** | `AuditLogQueryDTO { page?: number, limit?: number, search?: string, action?: string, module?: string, userId?: string, fromDate?: string, toDate?: string }` |
| **Response DTO** | `PaginatedResponseDTO<AuditLogDTO>` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin only |
| **Module Permission** | `admin` (read) |

#### UsageAnalyticsPage

| Attribute | Value |
|-----------|-------|
| **Page Name** | UsageAnalyticsPage |
| **Route** | `/admin/usage` |
| **Components** | PageHeader, StatCard, ChartWrapper, UsageTable |
| **React Query Hooks** | `useApiUsage`, `useFeatureUsage`, `useStorageUsage` |
| **API Service** | `usageService.getApiUsage()`, `usageService.getFeatureUsage()`, `usageService.getStorageUsage()` |
| **Backend Controller** | `UsageController.getApiUsage`, `UsageController.getFeatureUsage`, `UsageController.getStorageUsage` |
| **Backend Service** | `UsageService.calculateApiUsage`, `UsageService.calculateFeatureUsage`, `UsageService.calculateStorageUsage` |
| **Repository** | `ApiUsageRepository.getAggregates`, `ActivityLogRepository.getFeatureUsage`, `FileUploadRepository.getStorageStats` |
| **Prisma Models** | ApiUsageLog, ActivityLog, FileUpload |
| **REST Endpoints** | `GET /api/v1/admin/usage/api`, `GET /api/v1/admin/usage/features`, `GET /api/v1/admin/usage/storage` |
| **Request DTO** | `UsageQueryDTO { dateRange?: string }` |
| **Response DTO** | `ApiUsageDTO`, `FeatureUsageDTO`, `StorageUsageDTO` |
| **Authentication** | Required (JWT) |
| **RBAC Requirement** | admin only |
| **Module Permission** | `admin` (read) |

---

## 2. Database Design

### 2.1 Prisma Schema

```prisma
// ============================================
// PRISMA SCHEMA FOR INVOICEGEN ENTERPRISE
// Database: MySQL
// ============================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum UserRole {
  ADMIN
  MANAGER
  STAFF
  BUSINESS
  VIEWER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  INVITED
  INACTIVE
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  OVERDUE
  CANCELLED
}

enum PaymentLinkStatus {
  PENDING
  PAID
  FAILED
  EXPIRED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CARD
  UPI
  NETBANKING
  WALLET
  CASH
  CHEQUE
}

enum GatewayType {
  RAZORPAY
  PAYTM
}

enum GatewayStatus {
  CONNECTED
  DISCONNECTED
}

enum CommunicationChannel {
  WHATSAPP
  EMAIL
  SMS
}

enum CommunicationStatus {
  SENT
  DELIVERED
  READ
  FAILED
}

enum TemplateType {
  TSX
  HTML
  JSON
}

enum TemplateStatus {
  ACTIVE
  DISABLED
  DRAFT
}

enum ModuleKey {
  DASHBOARD
  CUSTOMERS
  INVOICES
  PAYMENT_LINKS
  WHATSAPP
  EMAIL
  REPORTS
  SETTINGS
  ADMIN
}

enum IntegrationProvider {
  TALLY
  BUSY
  ZOHO_BOOKS
  MARG
  SAP
  DYNAMICS
  QUICKBOOKS
  XERO
}

enum IntegrationStatus {
  CONNECTED
  DISCONNECTED
  ERROR
  PENDING
}

enum SyncStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  EXPORT
  SETTINGS
}

// ============================================
// USER & AUTHENTICATION MODELS
// ============================================

model User {
  id                String            @id @default(uuid()) @db.Char(36)
  name              String            @db.VarChar(255)
  email             String            @unique @db.VarChar(255)
  emailVerified     Boolean           @default(false)
  emailVerifiedAt   DateTime?
  passwordHash      String            @db.VarChar(255)
  phone             String?           @db.VarChar(20)
  avatar            String?           @db.VarChar(500)
  role              UserRole          @default(STAFF)
  status            UserStatus        @default(ACTIVE)
  permissions       Json              @default("[]")
  lastActiveAt      DateTime?
  lastLoginAt       DateTime?
  loginCount        Int               @default(0)
  failedLoginCount  Int               @default(0)
  lockedUntil       DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  deletedAt         DateTime?

  // Relations
  sessions          Session[]
  refreshTokens     RefreshToken[]
  passwordResets    PasswordResetToken[]
  activities        ActivityLog[]
  auditLogs         AuditLog[]
  createdCustomers  Customer[]        @relation("CreatedCustomers")
  updatedCustomers  Customer[]        @relation("UpdatedCustomers")
  createdInvoices   Invoice[]         @relation("CreatedInvoices")
  invoices          UserInvoiceTemplate[]
  uploadedTemplates InvoiceTemplate[]  @relation("UploadedTemplates")
  templateVersions  TemplateVersion[]
  settings          UserSettings?

  @@index([email])
  @@index([role])
  @@index([status])
  @@index([createdAt])
  @@map("users")
}

model Session {
  id           String   @id @default(uuid()) @db.Char(36)
  userId       String   @db.Char(36)
  tokenHash    String   @unique @db.VarChar(255)
  userAgent    String?  @db.Text
  ipAddress    String?  @db.VarChar(45)
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  lastActivity DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("sessions")
}

model RefreshToken {
  id           String   @id @default(uuid()) @db.Char(36)
  userId       String   @db.Char(36)
  tokenHash    String   @unique @db.VarChar(255)
  expiresAt    DateTime
  revoked      Boolean  @default(false)
  revokedAt    DateTime?
  replacedBy   String?  @db.Char(36)
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id         String   @id @default(uuid()) @db.Char(36)
  userId     String   @db.Char(36)
  token      String   @unique @db.VarChar(255)
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}

model UserSettings {
  id           String   @id @default(uuid()) @db.Char(36)
  userId       String   @unique @db.Char(36)
  theme        String   @default("system") @db.VarChar(20)
  language     String   @default("en") @db.VarChar(10)
  timezone     String   @default("Asia/Kolkata") @db.VarChar(50)
  notifications Json   @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

// ============================================
// COMPANY & SETTINGS MODELS
// ============================================

model Company {
  id              String    @id @default(uuid()) @db.Char(36)
  name            String    @db.VarChar(255)
  legalName       String    @db.VarChar(255)
  gstNumber       String?   @db.VarChar(15)
  panNumber       String?   @db.VarChar(10)
  email           String    @db.VarChar(255)
  phone           String?   @db.VarChar(20)
  website         String?   @db.VarChar(255)
  addressLine1    String    @db.VarChar(255)
  addressLine2    String?   @db.VarChar(255)
  city            String    @db.VarChar(100)
  state           String    @db.VarChar(100)
  pincode         String    @db.VarChar(10)
  country         String    @default("India") @db.VarChar(100)
  logo            String?   @db.VarChar(500)
  signature       String?   @db.VarChar(500)
  primaryColor    String?   @db.VarChar(20)
  footerText      String?   @db.Text
  showLogo        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  bankInfo        BankInfo?
  invoiceSettings InvoiceSettings?

  @@index([gstNumber])
  @@map("companies")
}

model BankInfo {
  id            String   @id @default(uuid()) @db.Char(36)
  companyId     String   @unique @db.Char(36)
  bankName      String   @db.VarChar(255)
  accountName   String   @db.VarChar(255)
  accountNumber String   @db.VarChar(50)
  ifsc          String   @db.VarChar(20)
  branch        String?  @db.VarChar(255)
  upiId         String?  @db.VarChar(100)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@map("bank_info")
}

model InvoiceSettings {
  id              String   @id @default(uuid()) @db.Char(36)
  companyId       String   @unique @db.Char(36)
  prefix          String   @default("INV") @db.VarChar(10)
  nextNumber      Int      @default(1001)
  defaultTaxRate  Decimal  @default(18) @db.Decimal(5, 2)
  defaultCurrency String   @default("INR") @db.VarChar(10)
  defaultTerms    String?  @db.Text
  defaultNotes    String?  @db.Text
  autoNumbering   Boolean  @default(true)
  paymentTerms    Int      @default(30)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@map("invoice_settings")
}

model CommunicationSettings {
  id              String   @id @default(uuid()) @db.Char(36)
  companyId       String   @unique @db.Char(36)
  whatsappEnabled Boolean  @default(false)
  emailEnabled    Boolean  @default(true)
  smsEnabled      Boolean  @default(false)
  email           String?  @db.VarChar(255)
  whatsappNumber  String?  @db.VarChar(20)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("communication_settings")
}

model GatewaySettings {
  id                String        @id @default(uuid()) @db.Char(36)
  companyId         String        @unique @db.Char(36)
  razorpayStatus    GatewayStatus @default(DISCONNECTED)
  razorpayKeyId     String?       @db.VarChar(255)
  razorpayKeySecret String?       @db.VarChar(255)
  razorpayWebhookSecret String?   @db.VarChar(255)
  paytmStatus       GatewayStatus @default(DISCONNECTED)
  paytmMerchantId   String?       @db.VarChar(255)
  paytmMerchantKey  String?       @db.VarChar(255)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@map("gateway_settings")
}

// ============================================
// MODULE & PERMISSION MODELS
// ============================================

model Module {
  id          String     @id @default(uuid()) @db.Char(36)
  key         ModuleKey  @unique
  label       String     @db.VarChar(100)
  description String?    @db.Text
  enabled     Boolean    @default(true)
  icon        String     @db.VarChar(50)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  roles       ModuleRole[]

  @@map("modules")
}

model ModuleRole {
  id       String   @id @default(uuid()) @db.Char(36)
  moduleId String   @db.Char(36)
  role     UserRole
  canRead  Boolean  @default(true)
  canCreate Boolean @default(false)
  canUpdate Boolean @default(false)
  canDelete Boolean @default(false)
  canExport Boolean @default(false)
  canConfigure Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  module    Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([moduleId, role])
  @@index([moduleId])
  @@map("module_roles")
}

// ============================================
// CUSTOMER MODELS
// ============================================

model Customer {
  id                String   @id @default(uuid()) @db.Char(36)
  name              String   @db.VarChar(255)
  businessName      String   @db.VarChar(255)
  gstNumber         String?  @db.VarChar(15)
  email             String   @db.VarChar(255)
  mobile            String   @db.VarChar(20)
  whatsapp          String?  @db.VarChar(20)
  notes             String?  @db.Text
  status            String   @default("active") @db.VarChar(20)

  // Billing Address
  billingLine1      String   @db.VarChar(255)
  billingLine2      String?  @db.VarChar(255)
  billingCity       String   @db.VarChar(100)
  billingState      String   @db.VarChar(100)
  billingPincode    String   @db.VarChar(10)
  billingCountry    String   @default("India") @db.VarChar(100)

  // Shipping Address
  shippingLine1     String?  @db.VarChar(255)
  shippingLine2     String?  @db.VarChar(255)
  shippingCity      String?  @db.VarChar(100)
  shippingState     String?  @db.VarChar(100)
  shippingPincode   String?  @db.VarChar(10)
  shippingCountry   String?  @db.VarChar(100)

  // Stats (computed/ cached)
  totalInvoices     Int      @default(0)
  totalRevenue      Decimal  @default(0) @db.Decimal(15, 2)
  outstandingAmount Decimal  @default(0) @db.Decimal(15, 2)

  // Audit
  createdById       String?  @db.Char(36)
  updatedById       String?  @db.Char(36)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?

  createdBy         User?    @relation("CreatedCustomers", fields: [createdById], references: [id])
  updatedBy         User?    @relation("UpdatedCustomers", fields: [updatedById], references: [id])
  invoices          Invoice[]
  paymentLinks      PaymentLink[]
  communications    CommunicationLog[]
  payments          Payment[]

  @@index([name])
  @@index([email])
  @@index([businessName])
  @@index([gstNumber])
  @@index([status])
  @@index([createdAt])
  @@map("customers")
}

// ============================================
// INVOICE MODELS
// ============================================

model Invoice {
  id              String        @id @default(uuid()) @db.Char(36)
  number          String        @unique @db.VarChar(50)
  customerId      String        @db.Char(36)
  status          InvoiceStatus @default(DRAFT)
  issueDate       DateTime
  dueDate         DateTime
  subtotal        Decimal       @db.Decimal(15, 2)
  taxAmount       Decimal       @db.Decimal(15, 2)
  discountAmount  Decimal       @default(0) @db.Decimal(15, 2)
  total           Decimal       @db.Decimal(15, 2)
  amountPaid      Decimal       @default(0) @db.Decimal(15, 2)
  balance         Decimal       @db.Decimal(15, 2)
  notes           String?       @db.Text
  terms           String?       @db.Text
  sentAt          DateTime?
  viewedAt        DateTime?
  paidAt          DateTime?

  createdById     String?       @db.Char(36)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?

  customer        Customer     @relation(fields: [customerId], references: [id], onDelete: Restrict)
  createdBy       User?        @relation("CreatedInvoices", fields: [createdById], references: [id])
  items           InvoiceItem[]
  payments        Payment[]

  @@index([number])
  @@index([customerId])
  @@index([status])
  @@index([issueDate])
  @@index([dueDate])
  @@index([createdAt])
  @@map("invoices")
}

model InvoiceItem {
  id          String   @id @default(uuid()) @db.Char(36)
  invoiceId   String   @db.Char(36)
  description String   @db.VarChar(500)
  quantity    Decimal  @db.Decimal(10, 2)
  rate        Decimal  @db.Decimal(15, 2)
  discount    Decimal  @default(0) @db.Decimal(15, 2)
  taxRate     Decimal  @db.Decimal(5, 2)
  amount      Decimal  @db.Decimal(15, 2)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@map("invoice_items")
}

// ============================================
// PAYMENT MODELS
// ============================================

model PaymentLink {
  id           String             @id @default(uuid()) @db.Char(36)
  linkId       String             @unique @db.VarChar(50)
  customerId   String             @db.Char(36)
  amount       Decimal            @db.Decimal(15, 2)
  currency     String             @default("INR") @db.VarChar(10)
  gateway      GatewayType
  status       PaymentLinkStatus  @default(PENDING)
  gatewayLinkId String?           @db.VarChar(255)
  url          String?            @db.VarChar(500)
  expiryDate   DateTime
  paidAt       DateTime?
  description  String?            @db.Text
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  deletedAt    DateTime?

  customer     Customer           @relation(fields: [customerId], references: [id])
  payments     Payment[]

  @@index([linkId])
  @@index([customerId])
  @@index([status])
  @@index([gateway])
  @@index([createdAt])
  @@map("payment_links")
}

model Payment {
  id             String         @id @default(uuid()) @db.Char(36)
  invoiceId      String?        @db.Char(36)
  paymentLinkId  String?        @db.Char(36)
  customerId     String         @db.Char(36)
  amount         Decimal        @db.Decimal(15, 2)
  method         PaymentMethod
  status         PaymentStatus  @default(PENDING)
  gateway        GatewayType?
  transactionId  String         @unique @db.VarChar(100)
  gatewayResponse Json?
  date           DateTime       @default(now())
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  invoice        Invoice?       @relation(fields: [invoiceId], references: [id])
  paymentLink    PaymentLink?  @relation(fields: [paymentLinkId], references: [id])
  customer       Customer       @relation(fields: [customerId], references: [id])

  @@index([invoiceId])
  @@index([paymentLinkId])
  @@index([customerId])
  @@index([transactionId])
  @@index([date])
  @@map("payments")
}

// ============================================
// COMMUNICATION MODELS
// ============================================

model CommunicationLog {
  id             String              @id @default(uuid()) @db.Char(36)
  channel        CommunicationChannel
  recipient      String              @db.VarChar(255)
  recipientName  String              @db.VarChar(255)
  subject        String              @db.VarChar(500)
  body           String              @db.Text
  status         CommunicationStatus @default(SENT)
  templateId     String?             @db.Char(36)
  templateName   String?             @db.VarChar(255)
  sentAt         DateTime            @default(now())
  deliveredAt    DateTime?
  readAt         DateTime?
  failedReason  String?             @db.Text
  relatedType   String?             @db.VarChar(50)
  relatedId     String?             @db.Char(36)
  customerId    String?             @db.Char(36)
  createdAt     DateTime            @default(now())

  customer       Customer?           @relation(fields: [customerId], references: [id])
  template       MessageTemplate?    @relation(fields: [templateId], references: [id])

  @@index([channel])
  @@index([status])
  @@index([customerId])
  @@index([sentAt])
  @@map("communication_logs")
}

model MessageTemplate {
  id          String   @id @default(uuid()) @db.Char(36)
  name        String   @db.VarChar(255)
  channel     CommunicationChannel
  subject     String?  @db.VarChar(500)
  body        String   @db.Text
  variables   Json     @default("[]")
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  communications CommunicationLog[]

  @@index([channel])
  @@index([isDefault])
  @@map("message_templates")
}

// ============================================
// INVOICE TEMPLATE MODELS
// ============================================

model InvoiceTemplate {
  id          String         @id @default(uuid()) @db.Char(36)
  name        String         @db.VarChar(255)
  type        TemplateType
  version     String         @db.VarChar(20)
  content     String?        @db.LongText
  config      Json?
  status      TemplateStatus @default(ACTIVE)
  isDefault   Boolean        @default(false)
  uploadedById String       @db.Char(36)
  uploadedAt  DateTime       @default(now())
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  uploadedBy  User           @relation("UploadedTemplates", fields: [uploadedById], references: [id])
  versions    TemplateVersion[]
  userTemplates UserInvoiceTemplate[]

  @@index([status])
  @@index([isDefault])
  @@map("invoice_templates")
}

model TemplateVersion {
  id          String   @id @default(uuid()) @db.Char(36)
  templateId  String   @db.Char(36)
  version     String   @db.VarChar(20)
  content     String?  @db.LongText
  config      Json?
  uploadedById String @db.Char(36)
  uploadedAt  DateTime @default(now())
  createdAt   DateTime @default(now())

  template    InvoiceTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  uploadedBy  User            @relation(fields: [uploadedById], references: [id])

  @@index([templateId])
  @@map("template_versions")
}

model UserInvoiceTemplate {
  id           String   @id @default(uuid()) @db.Char(36)
  userId       String   @db.Char(36)
  templateId   String?  @db.Char(36)
  isActive     Boolean  @default(true)
  assignedAt   DateTime @default(now())
  assignedById String   @db.Char(36)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  template     InvoiceTemplate? @relation(fields: [templateId], references: [id])
  assignedBy   User            @relation("AssignedBy", fields: [assignedById], references: [id])

  @@index([userId])
  @@index([templateId])
  @@map("user_invoice_templates")
}

// ============================================
// ACTIVITY & AUDIT MODELS
// ============================================

model ActivityLog {
  id          String   @id @default(uuid()) @db.Char(36)
  userId      String   @db.Char(36)
  userName    String   @db.VarChar(255)
  action      String   @db.VarChar(100)
  entity      String   @db.VarChar(100)
  entityId    String   @db.Char(36)
  description String   @db.Text
  metadata    Json?
  timestamp   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([entity])
  @@index([entityId])
  @@index([timestamp])
  @@map("activity_logs")
}

model AuditLog {
  id          String      @id @default(uuid()) @db.Char(36)
  userId      String      @db.Char(36)
  userName    String      @db.VarChar(255)
  userRole    UserRole
  action      AuditAction
  module      String      @db.VarChar(100)
  entityId    String      @db.Char(36)
  entityName  String      @db.VarChar(255)
  description String      @db.Text
  ipAddress   String?     @db.VarChar(45)
  userAgent   String?     @db.Text
  changes     Json?
  timestamp   DateTime    @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([module])
  @@index([timestamp])
  @@map("audit_logs")
}

// ============================================
// EXTERNAL INTEGRATION MODELS
// ============================================

model ExternalIntegration {
  id           String             @id @default(uuid()) @db.Char(36)
  name         String             @db.VarChar(255)
  provider     IntegrationProvider @unique
  description  String?           @db.Text
  status       IntegrationStatus  @default(DISCONNECTED)
  config       Json?
  syncOptions  Json?
  lastSyncAt   DateTime?
  nextSyncAt   DateTime?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  logs         IntegrationLog[]
  syncHistory  SyncHistory[]

  @@index([provider])
  @@index([status])
  @@map("external_integrations")
}

model IntegrationLog {
  id             String   @id @default(uuid()) @db.Char(36)
  integrationId String   @db.Char(36)
  level         String   @db.VarChar(20)
  message       String   @db.Text
  details       Json?
  createdAt     DateTime @default(now())

  integration   ExternalIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@index([integrationId])
  @@index([createdAt])
  @@map("integration_logs")
}

model SyncHistory {
  id             String   @id @default(uuid()) @db.Char(36)
  integrationId  String   @db.Char(36)
  syncType       String   @db.VarChar(20)
  entityType     String   @db.VarChar(100)
  status         SyncStatus @default(PENDING)
  recordsCount   Int      @default(0)
  errorMessage   String?  @db.Text
  startedAt      DateTime @default(now())
  completedAt    DateTime?

  integration    ExternalIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@index([integrationId])
  @@index([status])
  @@index([startedAt])
  @@map("sync_history")
}

// ============================================
// FILE UPLOAD MODEL
// ============================================

model FileUpload {
  id           String   @id @default(uuid()) @db.Char(36)
  filename     String   @db.VarChar(255)
  originalName String   @db.VarChar(255)
  mimeType     String   @db.VarChar(100)
  size         Int
  path         String   @db.VarChar(500)
  publicId     String?  @db.VarChar(255)
  uploadedById String   @db.Char(36)
  relatedType  String?  @db.VarChar(50)
  relatedId    String?  @db.Char(36)
  createdAt    DateTime @default(now())

  uploadedBy   User     @relation(fields: [uploadedById], references: [id])

  @@index([uploadedById])
  @@index([relatedType, relatedId])
  @@map("file_uploads")
}

// ============================================
// API USAGE MODEL
// ============================================

model ApiUsageLog {
  id          String   @id @default(uuid()) @db.Char(36)
  userId      String?  @db.Char(36)
  endpoint    String   @db.VarChar(255)
  method      String   @db.VarChar(10)
  statusCode  Int
  duration    Int
  ipAddress   String?  @db.VarChar(45)
  userAgent   String?  @db.Text
  requestSize Int?
  responseSize Int?
  error       String?  @db.Text
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([endpoint])
  @@index([timestamp])
  @@index([statusCode])
  @@map("api_usage_logs")
}

// ============================================
// NOTIFICATION MODEL
// ============================================

model Notification {
  id          String   @id @default(uuid()) @db.Char(36)
  userId      String   @db.Char(36)
  type        String   @db.VarChar(50)
  title       String   @db.VarChar(255)
  message     String   @db.Text
  data        Json?
  readAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([readAt])
  @@index([createdAt])
  @@map("notifications")
}
```

### 2.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INVOICEGEN ENTERPRISE ERD                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │   Company    │
                                    │──────────────│
                                    │ id (PK)      │
                                    │ name         │
                                    │ gstNumber    │
                                    │ ...          │
                                    └──────┬───────┘
                                           │ 1:1
                          ┌────────────────┼────────────────┐
                          │                │                │
                    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
                    │ BankInfo  │    │ Invoice   │    │Communication│
                    │───────────│    │ Settings  │    │ Settings   │
                    │ id (PK)   │    │───────────│    │───────────│
                    │ companyId │    │ companyId │    │ companyId │
                    │ (FK)      │    │ (FK)      │    │ (FK)      │
                    └───────────┘    └───────────┘    └───────────┘

┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│     User     │           │   Customer   │           │    Invoice   │
│──────────────│           │──────────────│           │──────────────│
│ id (PK)      │──┐    ┌───│ id (PK)      │←──────────│ id (PK)      │
│ name         │  │    │   │ name         │    1:N    │ number       │
│ email        │  │    │   │ businessName │           │ customerId   │
│ passwordHash │  │    │   │ email        │           │ (FK)        │
│ role         │  │    │   │ mobile       │           │ status      │
│ status       │  │    │   │ gstNumber    │           │ issueDate   │
│ ...          │  │    │   │ ...          │           │ dueDate     │
└──────────────┘  │    │   └──────┬───────┘           └──────┬───────┘
       │          │    │          │                          │
       │          │    │          │ 1:N                      │ 1:N
       │          │    │          │                          │
       │          │    │          ↓                    ┌─────┴─────┐
       │          │    │   ┌──────────────┐            │ Invoice   │
       │          │    │   │ PaymentLink  │            │ Item      │
       │          │    │   │──────────────│            │───────────│
       │          │    │   │ id (PK)      │            │ id (PK)   │
       │          │    │   │ linkId       │            │ invoiceId │
       │          │    │   │ customerId   │←───────────│ (FK)      │
       │          │    │   │ (FK)        │            │ description│
       │          │    │   │ amount       │            │ quantity  │
       │          │    │   │ gateway      │            │ rate      │
       │          │    │   │ status       │            └───────────┘
       │          │    │   └──────┬───────┘
       │          │    │          │
       │          │    │          │ 1:N
       │          │    │          │
       │ 1:N      │    │          ↓
       │          │    │   ┌──────────────┐
       │          │    │   │   Payment    │
       │          │    │   │──────────────│
       │          │    │   │ id (PK)      │
       │          └────┼──→│ customerId   │
       │               │   │ (FK)        │
       │               │   │ invoiceId   │←──────────────────────┐
       │               │   │ (FK)        │                        │
       │               │   │ paymentLinkId│←──────────┐           │
       │               │   │ (FK)        │           │           │
       │               │   │ transactionId│          │           │
       │               │   └──────────────┘          │           │
       │               │                             │           │
       │               │                             │           │
┌──────┴───────┐┌──────┴───────┐           ┌─────────┴─────┐     │
│   Session    ││ RefreshToken │           │ Communication  │     │
│──────────────││──────────────│           │     Log        │     │
│ id (PK)      ││ id (PK)      │           │────────────────│     │
│ userId (FK)  ││ userId (FK)  │           │ id (PK)        │     │
│ tokenHash    ││ tokenHash    │           │ customerId     │←────┘
│ expiresAt    ││ expiresAt    │           │ (FK)          │
└──────────────┘│ revoked      │           │ invoiceId (FK)│
                │ ...          │           │ channel        │
                └──────────────┘           │ status        │
                                           └───────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Module    │     │   AuditLog   │     │ ActivityLog  │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ key          │     │ userId (FK)  │     │ userId (FK)  │
│ label        │     │ action       │     │ action       │
│ enabled      │     │ module       │     │ entity       │
└──────┬───────┘     │ entityId     │     │ entityId     │
       │             │ changes      │     │ timestamp    │
       │ 1:N         └──────────────┘     └──────────────┘
       │
       ↓
┌──────────────┐
│ ModuleRole   │
│──────────────│
│ id (PK)      │
│ moduleId (FK)│
│ role         │
│ canRead      │
│ canCreate    │
│ canUpdate    │
│ canDelete    │
│ canExport    │
│ canConfigure │
└──────────────┘

┌──────────────────┐     ┌──────────────────┐
│ InvoiceTemplate  │ 1:N │ TemplateVersion  │
│──────────────────│←────│──────────────────│
│ id (PK)          │     │ id (PK)          │
│ name             │     │ templateId (FK)  │
│ type             │     │ version           │
│ status           │     │ content          │
│ isDefault        │     │ uploadedById (FK)│
│ uploadedById(FK) │     └──────────────────┘
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ExternalIntegration│ 1:N│ IntegrationLog   │
│──────────────────│←────│──────────────────│
│ id (PK)          │     │ id (PK)          │
│ provider         │     │ integrationId(FK)│
│ status           │     │ level            │
│ config           │     │ message          │
│ syncOptions      │     └──────────────────┘
└───────┬──────────┘
        │ 1:N
        ↓
┌──────────────────┐
│   SyncHistory    │
│──────────────────│
│ id (PK)          │
│ integrationId(FK)│
│ syncType         │
│ status           │
│ recordsCount     │
│ errorMessage     │
└──────────────────┘
```

---

## 3. API Specification

### 3.1 Authentication APIs

#### POST /api/v1/auth/login

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/auth/login` |
| **Authentication** | None (public) |
| **Roles** | Any |
| **Module Permission** | None |
| **Description** | Authenticate user and obtain tokens |

**Request Body:**
```json
{
  "email": "string (required, valid email format)",
  "password": "string (required, min 8 chars)",
  "rememberMe": "boolean (optional, default false)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "ADMIN | MANAGER | STAFF | BUSINESS | VIEWER",
      "status": "ACTIVE | SUSPENDED | INVITED",
      "avatar": "string | null",
      "phone": "string | null",
      "permissions": ["dashboard", "customers", ...],
      "lastActive": "ISO8601 date",
      "createdAt": "ISO8601 date"
    },
    "accessToken": "string (JWT, expires in 15min)",
    "refreshToken": "string (UUID, expires in 7d or 30d if rememberMe)",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account suspended
- `429 Too Many Requests` - Rate limit exceeded (5 attempts per minute)
- `500 Internal Server Error` - Server error

---

#### POST /api/v1/auth/refresh

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/auth/refresh` |
| **Authentication** | Refresh Token (body) |
| **Roles** | Any authenticated |
| **Module Permission** | None |
| **Description** | Refresh access token using refresh token |

**Request Body:**
```json
{
  "refreshToken": "string (required, UUID)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string (JWT, expires in 15min)",
    "refreshToken": "string (new refresh token, rotation)",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid/missing refresh token
- `401 Unauthorized` - Refresh token expired or revoked

---

#### POST /api/v1/auth/logout

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/auth/logout` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | Any authenticated |
| **Module Permission** | None |
| **Description** | Logout current session |

**Request Body:**
```json
{
  "logoutAll": "boolean (optional, logout from all devices)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### POST /api/v1/auth/forgot-password

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/auth/forgot-password` |
| **Authentication** | None (public) |
| **Roles** | Any |
| **Module Permission** | None |
| **Description** | Request password reset email |

**Request Body:**
```json
{
  "email": "string (required, valid email format)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

**Note:** Always returns 200 to prevent email enumeration.

---

#### POST /api/v1/auth/reset-password

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/auth/reset-password` |
| **Authentication** | None (token-based) |
| **Roles** | Any |
| **Module Permission** | None |
| **Description** | Reset password using token |

**Request Body:**
```json
{
  "token": "string (required, from email link)",
  "password": "string (required, min 8 chars, must contain uppercase, lowercase, number)",
  "confirmPassword": "string (required, must match password)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password."
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors or password mismatch
- `401 Unauthorized` - Invalid or expired token

---

#### GET /api/v1/auth/me

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `/api/v1/auth/me` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | Any authenticated |
| **Module Permission** | None |
| **Description** | Get current authenticated user |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "ADMIN | MANAGER | STAFF | BUSINESS | VIEWER",
    "status": "ACTIVE | SUSPENDED | INVITED",
    "avatar": "string | null",
    "phone": "string | null",
    "permissions": ["dashboard", "customers", ...],
    "companyInfo": { ... },
    "bankInfo": { ... },
    "lastActive": "ISO8601 date",
    "createdAt": "ISO8601 date"
  }
}
```

---

### 3.2 Customer APIs

#### GET /api/v1/customers

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `/api/v1/customers` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `customers` (read) |
| **Description** | List customers with pagination, filtering, searching, sorting |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 10 | Items per page (max 100) |
| search | string | - | Search in name, businessName, email, gstNumber |
| status | string | - | Filter by status: active, inactive |
| sortBy | string | createdAt | Sort field: name, businessName, createdAt, totalRevenue |
| sortOrder | string | desc | Sort direction: asc, desc |
| fromDate | string | - | Filter by createdAt >= date (ISO8601) |
| toDate | string | - | Filter by createdAt <= date (ISO8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "businessName": "string",
      "gstNumber": "string | null",
      "email": "string",
      "mobile": "string",
      "whatsapp": "string | null",
      "billingAddress": {
        "line1": "string",
        "line2": "string | null",
        "city": "string",
        "state": "string",
        "pincode": "string",
        "country": "string"
      },
      "shippingAddress": { ... },
      "notes": "string | null",
      "status": "active | inactive",
      "totalInvoices": 0,
      "totalRevenue": 0,
      "outstandingAmount": 0,
      "createdAt": "ISO8601 date",
      "updatedAt": "ISO8601 date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions

---

#### GET /api/v1/customers/:id

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `/api/v1/customers/:id` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `customers` (read) |
| **Description** | Get customer by ID |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Customer ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "businessName": "string",
    "gstNumber": "string | null",
    "email": "string",
    "mobile": "string",
    "whatsapp": "string | null",
    "billingAddress": { ... },
    "shippingAddress": { ... },
    "notes": "string | null",
    "status": "active | inactive",
    "totalInvoices": 0,
    "totalRevenue": 0,
    "outstandingAmount": 0,
    "invoices": [ ... ],
    "payments": [ ... ],
    "createdAt": "ISO8601 date",
    "updatedAt": "ISO8601 date"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid UUID format
- `404 Not Found` - Customer not found

---

#### POST /api/v1/customers

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/customers` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `customers` (create) |
| **Description** | Create new customer |

**Request Body:**
```json
{
  "name": "string (required, max 255)",
  "businessName": "string (required, max 255)",
  "gstNumber": "string (optional, 15 chars, GST format)",
  "email": "string (required, valid email)",
  "mobile": "string (required, 10-15 chars)",
  "whatsapp": "string (optional, 10-15 chars)",
  "billingAddress": {
    "line1": "string (required)",
    "line2": "string (optional)",
    "city": "string (required)",
    "state": "string (required)",
    "pincode": "string (required, 6 digits)",
    "country": "string (default: India)"
  },
  "shippingAddress": {
    "sameAsBilling": "boolean (optional, default: true)",
    ...same fields as billing
  },
  "notes": "string (optional)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    ...customer fields
  },
  "message": "Customer created successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `409 Conflict` - Duplicate email or GST number

---

#### PUT /api/v1/customers/:id

| Attribute | Value |
|-----------|-------|
| **Method** | PUT |
| **URL** | `/api/v1/customers/:id` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `customers` (update) |
| **Description** | Update customer |

**Request Body:** Same fields as POST, all optional

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ...updated customer },
  "message": "Customer updated successfully"
}
```

---

#### DELETE /api/v1/customers/:id

| Attribute | Value |
|-----------|-------|
| **Method** | DELETE |
| **URL** | `/api/v1/customers/:id` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager |
| **Module Permission** | `customers` (delete) |
| **Description** | Soft delete customer |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Cannot delete customer with unpaid invoices
- `404 Not Found` - Customer not found

---

### 3.3 Invoice APIs

#### GET /api/v1/invoices

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `/api/v1/invoices` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `invoices` (read) |
| **Description** | List invoices with pagination and filters |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page (max 100) |
| search | string | - | Search in number, customerName |
| status | string | - | Filter by status: draft, sent, viewed, paid, overdue, cancelled |
| customerId | string | - | Filter by customer UUID |
| fromDate | string | - | Filter by issueDate >= |
| toDate | string | - | Filter by issueDate <= |
| dueFrom | string | - | Filter by dueDate >= |
| dueTo | string | - | Filter by dueDate <= |
| minAmount | number | - | Filter by total >= |
| maxAmount | number | - | Filter by total <= |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | Sort direction |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "number": "INV-2025-0001",
      "customerId": "uuid",
      "customerName": "string",
      "customerEmail": "string",
      "status": "draft | sent | viewed | paid | overdue | cancelled",
      "issueDate": "ISO8601 date",
      "dueDate": "ISO8601 date",
      "subtotal": 0,
      "taxAmount": 0,
      "discountAmount": 0,
      "total": 0,
      "amountPaid": 0,
      "balance": 0,
      "notes": "string | null",
      "terms": "string | null",
      "createdAt": "ISO8601 date",
      "updatedAt": "ISO8601 date"
    }
  ],
  "pagination": { ... }
}
```

---

#### POST /api/v1/invoices

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/invoices` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `invoices` (create) |
| **Description** | Create new invoice |

**Request Body:**
```json
{
  "customerId": "uuid (required)",
  "issueDate": "ISO8601 date (required, default: today)",
  "dueDate": "ISO8601 date (required)",
  "lineItems": [
    {
      "description": "string (required)",
      "quantity": "number (required, positive)",
      "rate": "number (required, positive)",
      "discount": "number (default: 0)",
      "taxRate": "number (default: from settings)"
    }
  ],
  "notes": "string (optional)",
  "terms": "string (optional, default: from settings)",
  "discountAmount": "number (default: 0)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "number": "INV-2025-0001",
    "subtotal": 10000,
    "taxAmount": 1800,
    "discountAmount": 0,
    "total": 11800,
    "amountPaid": 0,
    "balance": 11800,
    ...invoice fields
  },
  "message": "Invoice created successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `404 Not Found` - Customer not found

---

#### POST /api/v1/invoices/:id/send

| Attribute | Value |
|-----------|-------|
| **Method** | POST |
| **URL** | `/api/v1/invoices/:id/send` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `invoices` (update) |
| **Description** | Mark invoice as sent and send email |

**Request Body:**
```json
{
  "sendEmail": "boolean (default: true)",
  "sendWhatsApp": "boolean (default: false)",
  "message": "string (optional, custom message)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ...invoice with updated status },
  "message": "Invoice sent successfully"
}
```

---

#### GET /api/v1/invoices/:id/pdf

| Attribute | Value |
|-----------|-------|
| **Method** | GET |
| **URL** | `/api/v1/invoices/:id/pdf` |
| **Authentication** | Bearer Token (JWT) |
| **Roles** | admin, manager, staff |
| **Module Permission** | `invoices` (read) |
| **Description** | Download invoice as PDF |

**Response Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="INV-2025-0001.pdf"`

**Response Body:** Binary PDF file

---

### 3.4 Payment Link APIs

#### GET /api/v1/payment-links

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| search | string | - | Search in linkId, customerName |
| status | string | - | Filter: pending, paid, failed, expired |
| gateway | string | - | Filter: razorpay, paytm |
| minAmount | number | - | Minimum amount |
| maxAmount | number | - | Maximum amount |
| fromDate | string | - | Created from date |
| toDate | string | - | Created to date |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | Sort direction |

**Response:** Similar pattern to customers list

---

#### POST /api/v1/payment-links

**Request Body:**
```json
{
  "customerId": "uuid (required)",
  "amount": "number (required, positive)",
  "currency": "string (default: INR)",
  "gateway": "razorpay | paytm (required)",
  "expiryDate": "ISO8601 date (required)",
  "description": "string (optional)",
  "sendNotification": "boolean (default: true)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "linkId": "plink_abc123",
    "url": "https://pay.invoicegen.com/l/abc123",
    "gatewayLinkId": "razorpay_link_id",
    "amount": 10000,
    "status": "pending",
    ...payment link fields
  },
  "message": "Payment link created successfully"
}
```

---

### 3.5 Report APIs

#### GET /api/v1/reports/revenue

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| range | string | 12m | Date range: 7d, 30d, 3m, 12m, custom |
| fromDate | string | - | Custom start date (ISO8601) |
| toDate | string | - | Custom end date (ISO8601) |
| groupBy | string | month | Group: day, week, month, quarter |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 5000000,
      "paidRevenue": 4500000,
      "pendingRevenue": 500000,
      "overdueRevenue": 200000,
      "averageInvoiceValue": 50000,
      "collectionRate": 90
    },
    "chart": [
      {
        "period": "2025-01",
        "revenue": 400000,
        "paid": 350000,
        "pending": 50000
      }
    ],
    "trend": {
      "revenueChange": 12.5,
      "paidChange": 8.3,
      "pendingChange": -3.2
    }
  }
}
```

---

#### GET /api/v1/reports/export

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Report type: revenue, invoices, customers, payments, tax, outstanding |
| format | string | Export format: pdf, excel, csv |
| range | string | Date range |
| fromDate | string | Custom start date |
| toDate | string | Custom end date |

**Response:**
- PDF: `Content-Type: application/pdf`
- Excel: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- CSV: `Content-Type: text/csv`

---

### 3.6 Settings APIs

#### GET /api/v1/settings/company

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "InvoiceGen",
    "legalName": "InvoiceGen Technologies Pvt. Ltd.",
    "gstNumber": "27AABCI1234L1Z5",
    "panNumber": "AABCI1234L",
    "email": "contact@invoicegen.com",
    "phone": "+91 9876543200",
    "website": "www.invoicegen.com",
    "address": {
      "line1": "42, Tech Park Tower",
      "line2": "Hinjewadi Phase 2",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411057",
      "country": "India"
    },
    "logo": "https://cloudinary.com/.../logo.png",
    "signature": "https://cloudinary.com/.../signature.png",
    "primaryColor": "#876CD4",
    "footerText": "InvoiceGen — Premium Invoicing",
    "showLogo": true
  }
}
```

---

#### PUT /api/v1/settings/company

**Request Body:** Same structure as response

---

### 3.7 Admin APIs

#### GET /api/v1/admin/users

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search in name, email |
| role | string | Filter by role |
| status | string | Filter by status |
| sortBy | string | Sort field |
| sortOrder | string | Sort direction |

---

#### POST /api/v1/admin/users

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "role": "ADMIN | MANAGER | STAFF | BUSINESS | VIEWER (required)",
  "permissions": ["dashboard", "customers", ...] (optional)",
  "sendInvite": "boolean (default: true)"
}
```

---

### 3.8 Communication APIs

#### GET /api/v1/communications

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search in recipient, subject |
| channel | string | Filter: whatsapp, email, sms |
| status | string | Filter: sent, delivered, read, failed |
| customerId | string | Filter by customer |
| templateId | string | Filter by template |
| fromDate | string | Sent from date |
| toDate | string | Sent to date |

---

### 3.9 Integration APIs

#### POST /api/v1/integrations/:id/connect

**Request Body:**
```json
{
  "config": {
    "apiUrl": "string",
    "username": "string",
    "password": "string (encrypted)",
    "companyCode": "string"
  },
  "syncOptions": {
    "customers": true,
    "invoices": true,
    "products": true,
    "taxes": true,
    "payments": false,
    "chartOfAccounts": true
  }
}
```

---

#### POST /api/v1/integrations/:id/sync

**Request Body:**
```json
{
  "entityTypes": ["customers", "invoices"],
  "fullSync": false
}
```

---

### 3.10 Standard Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "string (optional)"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [ ...items ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 4. Authentication Flow

### 4.1 Complete Authentication Lifecycle

#### Login Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │ Service  │     │Database  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /auth/login                │                │
     │ {email,password,rememberMe}    │                │
     │───────────────>│                │                │
     │                │ validate input │                │
     │                │───────────────>│                │
     │                │                │ find user      │
     │                │                │───────────────>│
     │                │                │<───────────────│
     │                │                │ verify password│
     │                │                │ (bcrypt)       │
     │                │                │                │
     │                │                │ check status   │
     │                │                │ (suspended?)  │
     │                │                │                │
     │                │                │ generate JWT   │
     │                │                │ create refresh │
     │                │                │ token          │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ create session │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ log activity   │
     │                │                │───────────────>│
     │                │                │                │
     │                │<───────────────│                │
     │                │ tokens + user │                │
     │<───────────────│                │                │
     │                │                │                │
```

#### Token Refresh Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │ Service  │     │Database  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /auth/refresh             │                │
     │ {refreshToken}                 │                │
     │───────────────>│                │                │
     │                │ verify token   │                │
     │                │───────────────>│                │
     │                │                │ find token     │
     │                │                │───────────────>│
     │                │                │<───────────────│
     │                │                │ check not expired
     │                │                │ check not revoked
     │                │                │
     │                │                │ generate new JWT
     │                │                │ generate new refresh (rotation)
     │                │                │ mark old as revoked
     │                │                │───────────────>│
     │                │                │ save new refresh
     │                │                │───────────────>│
     │                │<───────────────│                │
     │                │ new tokens    │                │
     │<───────────────│                │                │
```

#### Password Reset Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │ Service  │     │Database  │     │  Email   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ POST /auth/forgot-password     │                │                │
     │ {email}        │                │                │                │
     │───────────────>│                │                │                │
     │                │ find user      │                │                │
     │                │───────────────>│───────────────>│                │
     │                │                │<───────────────│                │
     │                │                │ generate token │                │
     │                │                │ (expires 1h)   │                │
     │                │                │───────────────>│                │
     │                │                │                │                │
     │                │                │ send email     │                │
     │                │                │────────────────────────────────>│
     │                │                │                │                │
     │<───────────────│ 200 OK (even if user not found - prevents enumeration)
     │                │                │                │                │
     │                │                │                │                │
     │ Click email link                 │                │                │
     │ GET /reset-password?token=xxx   │                │                │
     │ (frontend validates)            │                │                │
     │                │                │                │                │
     │ POST /auth/reset-password       │                │                │
     │ {token, password, confirmPassword}               │                │
     │───────────────>│                │                │                │
     │                │ verify token   │                │                │
     │                │───────────────>│───────────────>│                │
     │                │                │<───────────────│                │
     │                │                │ update password│                │
     │                │                │ (bcrypt hash) │                │
     │                │                │───────────────>│                │
     │                │                │ mark token used│                │
     │                │                │───────────────>│                │
     │                │                │ invalidate all │                │
     │                │                │ refresh tokens │                │
     │                │                │───────────────>│                │
     │<───────────────│ 200 OK         │                │                │
     │                │                │                │                │
```

### 4.2 Token Specifications

**Access Token (JWT):**
```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "ADMIN",
  "permissions": ["dashboard", "customers", ...],
  "sessionId": "session-uuid",
  "iat": 1234567890,
  "exp": 1234567890 + 900  // 15 minutes
}

Signature: HMAC-SHA256(secret, header + payload)
```

**Refresh Token:**
- Format: UUID v4
- Storage: Hashed (SHA-256) in database
- Expiry: 7 days (or 30 days with rememberMe)
- Single-use: Rotated on each refresh

### 4.3 Authentication Sequence Diagram

```
User          Frontend          AuthAPI          AuthService          DB
  │               │                 │                  │               │
  │──Login────────>│                 │                  │               │
  │  (email,pwd)  │                 │                  │               │
  │               │──POST /auth/login─────────────────>│               │
  │               │                 │──validate────────>│               │
  │               │                 │                  │──find user──>│
  │               │                 │                  │<──user───────│
  │               │                 │                  │──verify pwd─>│
  │               │                 │                  │<──ok─────────│
  │               │                 │                  │──create jwt──>│
  │               │                 │                  │──refresh────>│
  │               │                 │<───tokens────────│               │
  │               │<──tokens────────│                  │               │
  │<──redirect────│                 │                  │               │
  │  to dashboard │                 │                  │               │
  │               │                 │                  │               │
  │───────────────────Protected Request (Bearer token)─>│               │
  │               │                 │──verify JWT─────>│               │
  │               │                 │<──user info──────│               │
  │               │                 │                  │──check perm──>│
  │               │<──response──────│                  │               │
  │<──data────────│                 │                  │               │
```

### 4.4 Auto Refresh Strategy

**Frontend:**
1. Store access token in memory (not localStorage for security)
2. Store refresh token in httpOnly cookie or secure storage
3. Axios interceptor catches 401 errors
4. On 401, attempt refresh using refresh token
5. If refresh succeeds, retry original request with new token
6. If refresh fails, redirect to login

**Token Rotation:**
- Each refresh generates a new refresh token
- Old refresh token is marked revoked
- Prevents token reuse attacks

### 4.5 Session Management

**Session Table:**
- `id`: UUID
- `userId`: Foreign key
- `tokenHash`: Hashed session identifier
- `userAgent`: Browser/Device info
- `ipAddress`: Client IP
- `expiresAt`: Session expiry
- `lastActivity`: Last API call

**Logout Options:**
- `POST /auth/logout`: Logout current session
- `POST /auth/logout { logoutAll: true }`: Logout all sessions

**Session Restoration:**
- On app load, check if valid refresh token exists
- If yes, attempt silent refresh
- On success, restore session
- On failure, redirect to login

---

## 5. RBAC Design

### 5.1 Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **ADMIN** | Full system administrator | All modules, all operations |
| **MANAGER** | Business manager | Most modules, limited admin access |
| **STAFF** | Regular staff member | Core modules, create/update operations |
| **BUSINESS** | Business user | Limited to own company data |
| **VIEWER** | Read-only access | Dashboard and reports only |

### 5.2 Role Permissions

#### ADMIN
- **Dashboard**: Full access
- **Customers**: Full access (CRUD + export)
- **Invoices**: Full access (CRUD + send + cancel)
- **Payment Links**: Full access
- **WhatsApp**: Full access
- **Email**: Full access
- **Reports**: Full access + export
- **Settings**: Full access (configure company, integrations)
- **Admin**: Full access (users, modules, templates, audit logs, usage)

#### MANAGER
- **Dashboard**: Full access
- **Customers**: CRUD + export
- **Invoices**: CRUD + send
- **Payment Links**: CRUD
- **WhatsApp**: Full access
- **Email**: Full access
- **Reports**: Read + export
- **Settings**: Configure (no user management)
- **Admin**: None

#### STAFF
- **Dashboard**: Read
- **Customers**: CRUD (no delete, no export)
- **Invoices**: CRUD (no delete, send only)
- **Payment Links**: CRUD
- **WhatsApp**: Send messages
- **Email**: Send emails
- **Reports**: Read only
- **Settings**: None
- **Admin**: None

#### BUSINESS
- **Dashboard**: Read
- **Customers**: Read own company's customers
- **Invoices**: Create for own company
- **Payment Links**: Create for own company
- **WhatsApp**: None
- **Email**: None
- **Reports**: Read own company's reports
- **Settings**: View only
- **Admin**: None

#### VIEWER
- **Dashboard**: Read
- **Customers**: None
- **Invoices**: None
- **Payment Links**: None
- **WhatsApp**: None
- **Email**: None
- **Reports**: Read only
- **Settings**: None
- **Admin**: None

### 5.3 Accessible APIs by Role

| API Pattern | ADMIN | MANAGER | STAFF | BUSINESS | VIEWER |
|-------------|-------|---------|-------|----------|--------|
| GET /dashboard | Yes | Yes | Yes | Yes | Yes |
| GET /customers | Yes | Yes | Yes | Own only | No |
| POST /customers | Yes | Yes | Yes | Own only | No |
| PUT /customers | Yes | Yes | Yes | Own only | No |
| DELETE /customers | Yes | Yes | No | No | No |
| GET /invoices | Yes | Yes | Yes | Own only | No |
| POST /invoices | Yes | Yes | Yes | Own only | No |
| PUT /invoices | Yes | Yes | Yes | Own only | No |
| DELETE /invoices | Yes | Yes | No | No | No |
| POST /invoices/:id/send | Yes | Yes | Yes | Own only | No |
| GET /reports | Yes | Yes | Read only | Own only | Read only |
| GET /reports/export | Yes | Yes | No | No | No |
| GET /settings | Yes | Yes | No | View | No |
| PUT /settings | Yes | Yes | No | No | No |
| GET /admin/* | Yes | No | No | No | No |

---

## 6. Module Permission Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              MODULE PERMISSION MATRIX                                            │
├────────────────┬─────────────────────────────────────────────────────────────────────────────────┤
│                │                                   ROLES                                        │
│                ├─────────────────┬─────────────────┬─────────────────┬─────────────────┬───────────┤
│ MODULE         │     ADMIN       │    MANAGER      │     STAFF       │    BUSINESS     │  VIEWER   │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Dashboard      │ R C U D E A C   │ R C U D E A C   │ R - - - - - -   │ R - - - - - -   │ R - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Customers      │ R C U D E A C   │ R C U D E A -   │ R C U - - - -   │ R C U - - - -   │ - - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Invoices       │ R C U D E A C   │ R C U D E A -   │ R C U - - - -   │ R C U - - - -   │ - - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Payment Links  │ R C U D E A C   │ R C U D E A -   │ R C U - - - -   │ R C U - - - -   │ - - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ WhatsApp       │ R C U D E A C   │ R C U D E A -   │ R C - - - - -   │ - - - - - - -   │ - - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Email          │ R C U D E A C   │ R C U D E A -   │ R C - - - - -   │ - - - - - - -   │ - - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Reports        │ R C U D E A C   │ R C U D E A -   │ R - - - - - -   │ R - - - - - -   │ R - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Settings       │ R C U D E A C   │ R C U D E A C   │ - - - - - - -   │ R - - - - - -   │ - - - - - │
├────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Admin          │ R C U D E A C   │ - - - - - - -   │ - - - - - - -   │ - - - - - - -   │ - - - - - │
└────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┴───────────┘

LEGEND:
R = Read       - View/list records
C = Create     - Create new records
U = Update     - Modify existing records
D = Delete     - Remove records (soft delete)
E = Export     - Export data to PDF/Excel/CSV
A = Approve    - Approve/reject requests
C = Configure  - Change module settings

Example: "R C U D E A C" means full access to all operations.
         "R - - - - - -" means read-only access.
```

### 6.1 Permission Granularity

**Module-Level Permissions:**
- Stored in `permissions` array on User model
- Example: `["dashboard", "customers", "invoices"]`

**Operation-Level Permissions:**
- Derived from role + module permissions
- Checked in middleware before controller execution

**Resource-Level Permissions:**
- Business users can only access own company data
- Checked in service layer

---

## 7. Folder Structure

```
backend/
├── src/
│   ├── config/                          # Configuration files
│   │   ├── index.ts                     # Config aggregator
│   │   ├── database.ts                  # Database connection config
│   │   ├── redis.ts                     # Redis client config
│   │   ├── jwt.ts                       # JWT configuration
│   │   ├── email.ts                     # Email/SMTP configuration
│   │   ├── cloudinary.ts                # Cloudinary config
│   │   ├── payment-gateways.ts          # Razorpay/Paytm config
│   │   ├── rate-limits.ts               # Rate limiting config
│   │   └── cors.ts                      # CORS configuration
│   │
│   ├── database/                        # Database setup and Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma            # Prisma schema
│   │   │   ├── migrations/              # Database migrations
│   │   │   └── seed.ts                  # Seed data
│   │   ├── connection.ts                # Database connection
│   │   └── migrations.lock              # Migration lock file
│   │
│   ├── middleware/                      # Express middleware
│   │   ├── index.ts                     # Middleware aggregator
│   │   ├── auth.middleware.ts           # JWT authentication
│   │   ├── rbac.middleware.ts           # Role-based access control
│   │   ├── module.middleware.ts         # Module permission checks
│   │   ├── validation.middleware.ts     # Request validation
│   │   ├── error.middleware.ts          # Global error handler
│   │   ├── rate-limit.middleware.ts     # Rate limiting
│   │   ├── cors.middleware.ts           # CORS handling
│   │   ├── helmet.middleware.ts        # Security headers
│   │   ├── compression.middleware.ts    # Response compression
│   │   ├── request-logger.middleware.ts # Request logging
│   │   ├── audit.middleware.ts          # Audit logging
│   │   └── upload.middleware.ts         # File upload (Multer)
│   │
│   ├── controllers/                     # Request handlers
│   │   ├── auth.controller.ts           # Authentication endpoints
│   │   ├── dashboard.controller.ts      # Dashboard metrics
│   │   ├── customer.controller.ts       # Customer CRUD
│   │   ├── invoice.controller.ts        # Invoice operations
│   │   ├── payment-link.controller.ts   # Payment link operations
│   │   ├── payment.controller.ts        # Payment records
│   │   ├── communication.controller.ts  # WhatsApp/Email logs
│   │   ├── report.controller.ts         # Report generation
│   │   ├── settings.controller.ts      # Company settings
│   │   ├── integration.controller.ts   # External integrations
│   │   ├── user.controller.ts           # User management (admin)
│   │   ├── module.controller.ts         # Module management (admin)
│   │   ├── template.controller.ts       # Invoice templates (admin)
│   │   ├── audit.controller.ts          # Audit logs (admin)
│   │   ├── usage.controller.ts          # Usage analytics (admin)
│   │   ├── notification.controller.ts   # User notifications
│   │   └── webhook.controller.ts        # Payment webhooks
│   │
│   ├── routes/                          # API routes
│   │   ├── index.ts                     # Route aggregator
│   │   ├── auth.routes.ts               # /api/v1/auth/*
│   │   ├── dashboard.routes.ts          # /api/v1/dashboard/*
│   │   ├── customer.routes.ts           # /api/v1/customers/*
│   │   ├── invoice.routes.ts            # /api/v1/invoices/*
│   │   ├── payment-link.routes.ts       # /api/v1/payment-links/*
│   │   ├── payment.routes.ts            # /api/v1/payments/*
│   │   ├── communication.routes.ts      # /api/v1/communications/*
│   │   ├── report.routes.ts             # /api/v1/reports/*
│   │   ├── settings.routes.ts           # /api/v1/settings/*
│   │   ├── integration.routes.ts        # /api/v1/integrations/*
│   │   ├── admin.routes.ts              # /api/v1/admin/*
│   │   ├── notification.routes.ts       # /api/v1/notifications/*
│   │   └── webhook.routes.ts            # /api/v1/webhooks/*
│   │
│   ├── services/                        # Business logic layer
│   │   ├── auth.service.ts              # Authentication logic
│   │   ├── token.service.ts             # JWT/Refresh token management
│   │   ├── session.service.ts           # Session management
│   │   ├── password.service.ts          # Password hashing/reset
│   │   ├── dashboard.service.ts         # Dashboard calculations
│   │   ├── customer.service.ts          # Customer business logic
│   │   ├── invoice.service.ts           # Invoice operations
│   │   ├── invoice-number.service.ts    # Invoice numbering
│   │   ├── pdf.service.ts               # PDF generation
│   │   ├── payment-link.service.ts      # Payment link operations
│   │   ├── payment-gateway.service.ts   # Gateway abstraction
│   │   ├── razorpay.service.ts          # Razorpay client
│   │   ├── paytm.service.ts             # Paytm client
│   │   ├── communication.service.ts     # Comm logs management
│   │   ├── email.service.ts             # Email sending (Resend/SMTP)
│   │   ├── whatsapp.service.ts          # WhatsApp sending
│   │   ├── report.service.ts            # Report generation
│   │   ├── export.service.ts            # PDF/Excel/CSV export
│   │   ├── settings.service.ts          # Settings management
│   │   ├── integration.service.ts       # Integration management
│   │   ├── sync.service.ts              # Data synchronization
│   │   ├── user.service.ts              # User management
│   │   ├── module.service.ts            # Module management
│   │   ├── template.service.ts          # Template management
│   │   ├── audit.service.ts             # Audit log management
│   │   ├── usage.service.ts             # Usage analytics
│   │   ├── notification.service.ts      # Notification management
│   │   ├── upload.service.ts            # File upload (Cloudinary)
│   │   └── cache.service.ts             # Redis caching
│   │
│   ├── repositories/                    # Data access layer
│   │   ├── base.repository.ts           # Base repository with common methods
│   │   ├── user.repository.ts           # User data access
│   │   ├── session.repository.ts         # Session data access
│   │   ├── refresh-token.repository.ts  # Refresh token data access
│   │   ├── customer.repository.ts       # Customer data access
│   │   ├── invoice.repository.ts        # Invoice data access
│   │   ├── invoice-item.repository.ts   # Invoice item data access
│   │   ├── payment.repository.ts        # Payment data access
│   │   ├── payment-link.repository.ts    # Payment link data access
│   │   ├── communication-log.repository.ts # Communication data access
│   │   ├── message-template.repository.ts # Template data access
│   │   ├── invoice-template.repository.ts # Invoice template data access
│   │   ├── template-version.repository.ts # Template version data access
│   │   ├── company.repository.ts        # Company settings data access
│   │   ├── integration.repository.ts    # Integration data access
│   │   ├── sync-history.repository.ts   # Sync history data access
│   │   ├── activity-log.repository.ts   # Activity log data access
│   │   ├── audit-log.repository.ts      # Audit log data access
│   │   ├── module.repository.ts         # Module data access
│   │   ├── notification.repository.ts   # Notification data access
│   │   └── api-usage.repository.ts      # API usage data access
│   │
│   ├── validators/                      # Zod validation schemas
│   │   ├── index.ts                     # Validator aggregator
│   │   ├── auth.validator.ts            # Auth request validation
│   │   ├── customer.validator.ts        # Customer validation
│   │   ├── invoice.validator.ts         # Invoice validation
│   │   ├── payment-link.validator.ts    # Payment link validation
│   │   ├── communication.validator.ts   # Communication validation
│   │   ├── report.validator.ts          # Report query validation
│   │   ├── settings.validator.ts        # Settings validation
│   │   ├── integration.validator.ts     # Integration validation
│   │   ├── user.validator.ts            # User validation
│   │   ├── module.validator.ts          # Module validation
│   │   └── common.validator.ts          # Common validation patterns
│   │
│   ├── dto/                             # Data Transfer Objects
│   │   ├── index.ts                     # DTO aggregator
│   │   ├── auth.dto.ts                  # Auth request/response DTOs
│   │   ├── user.dto.ts                  # User DTOs
│   │   ├── customer.dto.ts              # Customer DTOs
│   │   ├── invoice.dto.ts               # Invoice DTOs
│   │   ├── payment.dto.ts               # Payment DTOs
│   │   ├── payment-link.dto.ts          # Payment link DTOs
│   │   ├── communication.dto.ts         # Communication DTOs
│   │   ├── report.dto.ts                # Report DTOs
│   │   ├── settings.dto.ts              # Settings DTOs
│   │   ├── integration.dto.ts           # Integration DTOs
│   │   ├── template.dto.ts              # Template DTOs
│   │   ├── audit.dto.ts                 # Audit DTOs
│   │   └── common.dto.ts                # Common DTOs (pagination, etc.)
│   │
│   ├── interfaces/                      # TypeScript interfaces
│   │   ├── index.ts                     # Interface aggregator
│   │   ├── auth.interface.ts            # Auth interfaces
│   │   ├── user.interface.ts            # User interfaces
│   │   ├── customer.interface.ts        # Customer interfaces
│   │   ├── invoice.interface.ts         # Invoice interfaces
│   │   ├── payment.interface.ts         # Payment interfaces
│   │   ├── gateway.interface.ts         # Payment gateway interfaces
│   │   ├── email.interface.ts           # Email provider interfaces
│   │   ├── storage.interface.ts          # Storage provider interfaces
│   │   ├── queue.interface.ts           # Job queue interfaces
│   │   ├── cache.interface.ts           # Cache interfaces
│   │   └── error.interface.ts           # Error interfaces
│   │
│   ├── helpers/                         # Helper functions
│   │   ├── index.ts                     # Helper aggregator
│   │   ├── pagination.helper.ts         # Pagination utilities
│   │   ├── filtering.helper.ts          # Filtering utilities
│   │   ├── sorting.helper.ts            # Sorting utilities
│   │   ├── pdf.helper.ts                # PDF generation helpers
│   │   ├── excel.helper.ts              # Excel generation helpers
│   │   ├── csv.helper.ts                # CSV generation helpers
│   │   ├── date.helper.ts               # Date manipulation helpers
│   │   ├── string.helper.ts             # String manipulation helpers
│   │   ├── number.helper.ts             # Number/currency helpers
│   │   └── template.helper.ts           # Template variable replacement
│   │
│   ├── utils/                           # Utility functions
│   │   ├── index.ts                     # Utility aggregator
│   │   ├── logger.ts                    # Winston logger
│   │   ├── crypto.ts                    # Cryptographic utilities
│   │   ├── hash.ts                      # Hashing utilities
│   │   ├── jwt.ts                       # JWT utilities
│   │   ├── response.ts                  # Response formatting
│   │   ├── error.ts                     # Custom error classes
│   │   ├── env.ts                       # Environment utilities
│   │   └── ip.ts                        # IP address utilities
│   │
│   ├── constants/                       # Application constants
│   │   ├── index.ts                     # Constants aggregator
│   │   ├── errors.ts                    # Error codes and messages
│   │   ├── status.ts                    # Status constants
│   │   ├── roles.ts                     # Role constants
│   │   ├── permissions.ts               # Permission constants
│   │   ├── modules.ts                   # Module constants
│   │   ├── rate-limits.ts               # Rate limit values
│   │   └── cache-ttl.ts                 # Cache TTL values
│   │
│   ├── socket/                          # Socket.IO
│   │   ├── index.ts                     # Socket server setup
│   │   ├── handlers/                    # Event handlers
│   │   │   ├── connection.handler.ts    # Connection handling
│   │   │   ├── invoice.handler.ts       # Invoice events
│   │   │   ├── payment.handler.ts       # Payment events
│   │   │   ├── notification.handler.ts  # Notification events
│   │   │   └── dashboard.handler.ts     # Dashboard updates
│   │   ├── middleware/                  # Socket middleware
│   │   │   └── auth.socket.middleware.ts # Socket authentication
│   │   └── types.ts                     # Socket event types
│   │
│   ├── events/                          # Event emitters
│   │   ├── index.ts                     # Event aggregator
│   │   ├── invoice.events.ts            # Invoice events
│   │   ├── payment.events.ts            # Payment events
│   │   ├── user.events.ts               # User events
│   │   └── notification.events.ts       # Notification events
│   │
│   ├── jobs/                            # BullMQ jobs
│   │   ├── index.ts                     # Job aggregator
│   │   ├── invoice-email.job.ts         # Invoice email job
│   │   ├── invoice-pdf.job.ts           # Invoice PDF generation
│   │   ├── payment-reminder.job.ts      # Payment reminder job
│   │   ├── report-export.job.ts         # Report export job
│   │   ├── whatsapp.job.ts              # WhatsApp message job
│   │   ├── email.job.ts                 # Email sending job
│   │   ├── sync.job.ts                  # Integration sync job
│   │   ├── audit.job.ts                 # Audit logging job
│   │   └── cleanup.job.ts               # Cleanup expired data job
│   │
│   ├── queues/                          # Queue setup
│   │   ├── index.ts                     # Queue aggregator
│   │   ├── email.queue.ts               # Email queue
│   │   ├── whatsapp.queue.ts            # WhatsApp queue
│   │   ├── export.queue.ts              # Export queue
│   │   ├── notification.queue.ts        # Notification queue
│   │   ├── sync.queue.ts                # Sync queue
│   │   ├── audit.queue.ts               # Audit queue
│   │   └── retry.queue.ts               # Retry queue
│   │
│   ├── emails/                          # Email service
│   │   ├── index.ts                     # Email service entry
│   │   ├── providers/                    # Email providers
│   │   │   ├── resend.provider.ts       # Resend provider
│   │   │   └── smtp.provider.ts         # SMTP provider
│   │   └── templates/                   # Email templates
│   │       ├── invoice-sent.template.ts
│   │       ├── payment-received.template.ts
│   │       ├── password-reset.template.ts
│   │       ├── welcome.template.ts
│   │       └── payment-reminder.template.ts
│   │
│   ├── storage/                         # File storage service
│   │   ├── index.ts                     # Storage service entry
│   │   ├── cloudinary.provider.ts       # Cloudinary provider
│   │   └── local.provider.ts            # Local storage (dev)
│   │
│   ├── types/                           # Shared types
│   │   ├── index.ts                     # Type aggregator
│   │   ├── express.d.ts                 # Express augmentation
│   │   ├── prisma.d.ts                  # Prisma types
│   │   └── global.d.ts                  # Global type declarations
│   │
│   └── app.ts                           # Express app setup
│
├── tests/                               # Test files
│   ├── unit/                            # Unit tests
│   │   ├── services/
│   │   ├── repositories/
│   │   └── helpers/
│   ├── integration/                     # Integration tests
│   │   ├── auth.test.ts
│   │   ├── customers.test.ts
│   │   ├── invoices.test.ts
│   │   └── payments.test.ts
│   └── setup/                           # Test setup
│       ├── test-db.ts
│       └── test-server.ts
│
├── prisma/                              # Prisma CLI files
│   ├── schema.prisma
│   └── seed.ts
│
├── logs/                                # Log files
│   ├── combined.log
│   ├── error.log
│   └── access.log
│
├── uploads/                             # Local uploads (dev)
│
├── .env.example                         # Environment template
├── .env                                 # Environment variables
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
├── README.md
└── swagger.json                        # OpenAPI spec
```

---

## 8. Queue Architecture

### 8.1 BullMQ Queues

#### Email Queue (`email:queue`)
```typescript
{
  name: 'email:queue',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000  // 5 seconds
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
}
```

**Job Types:**
- `invoice-sent` - Send invoice email
- `payment-received` - Send payment confirmation
- `password-reset` - Send password reset email
- `payment-reminder` - Send payment reminder
- `welcome` - Send welcome email

**Payload Example:**
```json
{
  "to": "customer@example.com",
  "template": "invoice-sent",
  "data": {
    "invoiceNumber": "INV-2025-0001",
    "customerName": "John Doe",
    "amount": 11800,
    "dueDate": "2025-02-15"
  },
  "attachments": [
    { "filename": "invoice.pdf", "path": "/uploads/invoices/..." }
  ]
}
```

---

#### WhatsApp Queue (`whatsapp:queue`)
```typescript
{
  name: 'whatsapp:queue',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000  // 10 seconds
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
}
```

**Job Types:**
- `invoice-share` - Share invoice via WhatsApp
- `payment-link` - Share payment link
- `payment-reminder` - Send payment reminder
- `custom-message` - Send custom message

---

#### Export Queue (`export:queue`)
```typescript
{
  name: 'export:queue',
  defaultJobOptions: {
    attempts: 2,
    timeout: 120000,  // 2 minutes
    removeOnComplete: 10,
    removeOnFail: 5
  }
}
```

**Job Types:**
- `invoice-pdf` - Generate single invoice PDF
- `bulk-pdf` - Generate multiple invoices PDF
- `report-excel` - Generate Excel report
- `report-csv` - Generate CSV export

---

#### Audit Queue (`audit:queue`)
```typescript
{
  name: 'audit:queue',
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'fixed',
      delay: 2000
    },
    removeOnComplete: 500,
    removeOnFail: 100
  }
}
```

**Job Types:**
- `log-action` - Log user action
- `log-api-call` - Log API usage

---

#### Notification Queue (`notification:queue`)
```typescript
{
  name: 'notification:queue',
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 50,
    removeOnFail: 10
  }
}
```

**Job Types:**
- `push-notification` - In-app notification
- `email-notification` - Email notification
- `whatsapp-notification` - WhatsApp notification

---

#### Sync Queue (`sync:queue`)
```typescript
{
  name: 'sync:queue',
  defaultJobOptions: {
    attempts: 3,
    timeout: 300000,  // 5 minutes
    removeOnComplete: 20,
    removeOnFail: 10
  }
}
```

**Job Types:**
- `sync-customers` - Sync customers with external ERP
- `sync-invoices` - Sync invoices with external ERP
- `sync-payments` - Sync payments from external ERP

---

#### Retry Queue (`retry:queue`)
```typescript
{
  name: 'retry:queue',
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60000  // Start at 1 minute, double each retry
    }
  }
}
```

**Purpose:** Failed jobs from other queues are moved here for retry with longer delays.

---

### 8.2 Retry Strategy

| Attempt | Delay | Total Time Elapsed |
|---------|-------|-------------------|
| 1 | Immediate | 0 |
| 2 | 5 seconds | 5s |
| 3 | 25 seconds | 30s |
| 4 | 2 minutes | 2.5m |
| 5 | 10 minutes | 12.5m |

After 5 attempts:
- Move to failed queue
- Send alert to admin
- Log failure details

---

## 9. Redis Strategy

### 9.1 Cache Keys Structure

```
invoicegen:{resource}:{id}                # Single resource
invoicegen:{resource}:list:{hash}         # Paginated list
invoicegen:{resource}:user:{userId}       # User-specific data
invoicegen:stats:{type}:{period}          # Aggregated statistics
invoicegen:session:{sessionId}            # Session data
invoicegen:permissions:{userId}           # User permissions
```

### 9.2 Cached Data and TTL

| Key Pattern | Data | TTL | Invalidation |
|-------------|------|-----|--------------|
| `invoicegen:dashboard:metrics:{date}` | Dashboard metrics | 5 minutes | Time-based |
| `invoicegen:dashboard:charts:{range}` | Chart data | 15 minutes | Time-based |
| `invoicegen:customers:list:{hash}` | Customer list | 5 minutes | On customer change |
| `invoicegen:customers:{id}` | Single customer | 30 minutes | On customer update |
| `invoicegen:invoices:{id}` | Single invoice | 30 minutes | On invoice update |
| `invoicegen:invoices:list:{hash}` | Invoice list | 5 minutes | On invoice change |
| `invoicegen:reports:{type}:{range}` | Report data | 1 hour | Time-based |
| `invoicegen:settings:company:{companyId}` | Company settings | 24 hours | On settings change |
| `invoicegen:settings:invoice:{companyId}` | Invoice settings | 24 hours | On settings change |
| `invoicegen:permissions:{userId}` | User permissions | 1 hour | On role/permission change |
| `invoicegen:modules:config` | Module config | 24 hours | On module change |
| `invoicegen:user:{userId}` | User profile | 1 hour | On user update |
| `invoicegen:session:{tokenHash}` | Session data | 15 minutes | On session validation |
| `invoicegen:ratelimit:{ip}:{endpoint}` | Rate limit counter | Rolling | Per request |
| `invoicegen:refresh:{tokenHash}` | Refresh token info | 7-30 days | On token use/revoke |

### 9.3 Cache Invalidations

**Automatic Invalidation (Pub/Sub):**
```typescript
// On customer update
await redis.publish('cache:invalidate', 'invoicegen:customers:*');
await redis.delPattern('invoicegen:customers:list:*');

// On invoice update
await redis.publish('cache:invalidate', 'invoicegen:invoices:*');
await redis.delPattern('invoicegen:dashboard:*');
await redis.delPattern('invoicegen:reports:*');

// On settings change
await redis.publish('cache:invalidate', 'invoicegen:settings:*');
```

**Pattern-Based Deletion:**
```typescript
async delPattern(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 9.4 Cache Strategy by Endpoint

| Endpoint | Cache Strategy |
|----------|----------------|
| GET /dashboard/metrics | Cache 5min, background refresh |
| GET /dashboard/charts | Cache 15min |
| GET /customers | Cache-list 5min, invalidate on change |
| GET /customers/:id | Cache 30min, invalidate on update |
| GET /invoices | Cache-list 5min, invalidate on change |
| GET /invoices/:id | Cache 30min, invalidate on update |
| GET /reports/* | Cache 1h, vary by date range |
| GET /settings/* | Cache 24h, invalidate on change |
| POST/PUT/DELETE/* | No cache (mutations) |

---

## 10. Socket.IO Design

### 10.1 Server Setup

```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

const io = new Server(httpServer, {
  cors: { origin: config.cors.origins },
  transports: ['websocket', 'polling']
});

// Redis adapter for horizontal scaling
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

### 10.2 Event Types

#### Connection Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | Server → Client | Client connected |
| `disconnect` | Server → Client | Client disconnected |
| `authenticate` | Client → Server | Authenticate socket |

#### Invoice Events
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `invoice:created` | Server → Client | `InvoiceDTO` | New invoice created |
| `invoice:updated` | Server → Client | `InvoiceDTO` | Invoice updated |
| `invoice:sent` | Server → Client | `{ invoiceId, sentAt }` | Invoice sent |
| `invoice:viewed` | Server → Client | `{ invoiceId, viewedAt }` | Invoice viewed by customer |
| `invoice:paid` | Server → Client | `{ invoiceId, amount, paidAt }` | Invoice paid |
| `invoice:cancelled` | Server → Client | `{ invoiceId }` | Invoice cancelled |

#### Payment Events
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `payment:received` | Server → Client | `PaymentDTO` | Payment received |
| `payment:failed` | Server → Client | `{ paymentId, reason }` | Payment failed |
| `payment-link:created` | Server → Client | `PaymentLinkDTO` | Payment link created |
| `payment-link:paid` | Server → Client | `{ linkId, paidAt }` | Payment link paid |

#### Dashboard Events
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `dashboard:metrics:update` | Server → Client | `DashboardMetrics` | Metrics updated |
| `dashboard:activity:new` | Server → Client | `ActivityLog` | New activity |

#### Notification Events
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `notification:new` | Server → Client | `NotificationDTO` | New notification |
| `notification:read` | Client → Server | `{ notificationId }` | Mark as read |
| `notifications:clear` | Client → Server | `{}` | Clear all notifications |

### 10.3 Rooms

| Room | Members | Events |
|------|---------|--------|
| `user:{userId}` | Single user | Personal notifications |
| `company:{companyId}` | All company users | Company-level updates |
| `admin` | Admin users | Admin events |
| `dashboard` | Users on dashboard | Dashboard updates |

### 10.4 Publishers and Subscribers

**Publishers (emit events):**
- Invoice Service (invoice events)
- Payment Service (payment events)
- Notification Service (notification events)
- Dashboard Service (metrics updates)

**Subscribers (listen to events):**
- Socket handlers forward to connected clients
- Webhook handlers forward external events

**Example Flow:**
```
InvoiceService.updateStatus(invoiceId, 'paid')
    ↓
EventEmitter.emit('invoice:paid', { invoiceId, amount })
    ↓
InvoiceHandler (subscriber)
    ↓
io.to(`user:${userId}`).emit('invoice:paid', data)
    ↓
Client socket receives event
    ↓
Frontend updates UI (React Query invalidation)
```

---

## 11. External Integrations

### 11.1 Provider Interface Design

```typescript
// interfaces/gateway.interface.ts
interface PaymentGateway {
  name: string;
  
  // Payment Links
  createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult>;
  getPaymentLink(linkId: string): Promise<PaymentLinkResult>;
  cancelPaymentLink(linkId: string): Promise<void>;
  
  // Payments
  verifyPayment(paymentId: string, signature: string): Promise<PaymentVerificationResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
  
  // Webhooks
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): WebhookEvent;
}

// interfaces/email.interface.ts
interface EmailProvider {
  name: string;
  
  send(options: SendEmailOptions): Promise<SendResult>;
  sendTemplate(templateId: string, to: string, data: object): Promise<SendResult>;
}

// interfaces/storage.interface.ts
interface StorageProvider {
  name: string;
  
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
  getUrl(publicId: string): string;
}

// interfaces/integration.interface.ts
interface ERPIntegration {
  name: string;
  provider: IntegrationProvider;
  
  connect(config: IntegrationConfig): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Sync operations
  syncCustomers(direction: 'push' | 'pull'): Promise<SyncResult>;
  syncInvoices(direction: 'push' | 'pull'): Promise<SyncResult>;
  syncPayments(direction: 'push' | 'pull'): Promise<SyncResult>;
  syncProducts(direction: 'push' | 'pull'): Promise<SyncResult>;
}
```

### 11.2 Razorpay Integration

```typescript
// services/razorpay.service.ts
class RazorpayService implements PaymentGateway {
  name = 'razorpay';
  private client: Razorpay;
  
  constructor(config: RazorpayConfig) {
    this.client = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret
    });
  }
  
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
    const link = await this.client.paymentLink.create({
      amount: params.amount * 100, // Razorpay uses paise
      currency: params.currency,
      description: params.description,
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        contact: params.customerPhone
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      notes: params.metadata
    });
    
    return {
      id: link.id,
      url: link.short_url,
      status: this.mapStatus(link.status)
    };
  }
  
  verifyWebhookSignature(payload: string, signature: string): boolean {
    return validateWebhookSignature(
      payload,
      signature,
      this.config.webhookSecret
    );
  }
}
```

### 11.3 Paytm Integration

```typescript
// services/paytm.service.ts
class PaytmService implements PaymentGateway {
  name = 'paytm';
  private merchantId: string;
  private merchantKey: string;
  
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
    // Paytm link creation logic
  }
}
```

### 11.4 Cloudinary Integration

```typescript
// storage/cloudinary.provider.ts
class CloudinaryProvider implements StorageProvider {
  name = 'cloudinary';
  
  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    const result = await cloudinary.uploader.upload(
      `data:${options.mimeType};base64,${file.toString('base64')}`,
      {
        folder: options.folder || 'invoicegen',
        public_id: options.publicId,
        transformation: options.transformations
      }
    );
    
    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  }
}
```

### 11.5 Email Integration

```typescript
// emails/providers/resend.provider.ts
class ResendProvider implements EmailProvider {
  name = 'resend';
  private client: Resend;
  
  async send(options: SendEmailOptions): Promise<SendResult> {
    const result = await this.client.emails.send({
      from: options.from || config.email.defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    });
    
    return {
      id: result.id,
      status: 'sent'
    };
  }
}

// emails/providers/smtp.provider.ts
class SMTPProvider implements EmailProvider {
  name = 'smtp';
  private transporter: nodemailer.Transporter;
  
  async send(options: SendEmailOptions): Promise<SendResult> {
    const result = await this.transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    });
    
    return {
      id: result.messageId,
      status: 'sent'
    };
  }
}
```

### 11.6 ERP Connectors

```typescript
// integrations/tally.integration.ts
class TallyIntegration implements ERPIntegration {
  name = 'Tally Prime';
  provider = IntegrationProvider.TALLY;
  
  async syncCustomers(direction: 'push' | 'pull'): Promise<SyncResult> {
    if (direction === 'push') {
      // Push InvoiceGen customers to Tally
    } else {
      // Pull Tally ledgers as customers
    }
  }
  
  async syncInvoices(direction: 'push' | 'pull'): Promise<SyncResult> {
    // Sync vouchers
  }
}

// integrations/zoho-books.integration.ts
class ZohoBooksIntegration implements ERPIntegration {
  name = 'Zoho Books';
  provider = IntegrationProvider.ZOHO_BOOKS;
  
  // ... implementation
}
```

---

## 12. Implementation Order

### Module 1: Project Setup & Base Infrastructure

**Task 1.1: Project Initialization**
- Files to create:
  - `package.json` with all dependencies
  - `tsconfig.json`
  - `.env`, `.env.example`
  - `docker-compose.yml`
  - `Dockerfile`
  - `.gitignore`
- Dependencies: None
- Complexity: Low
- Testing:
  - [ ] npm install completes without errors
  - [ ] TypeScript compiles
  - [ ] Docker containers start

**Task 1.2: Prisma Setup**
- Files to create:
  - `prisma/schema.prisma`
  - `prisma/seed.ts`
- Files to update: None
- Dependencies: Task 1.1
- Complexity: Medium
- Testing:
  - [ ] npx prisma generate succeeds
  - [ ] npx prisma migrate dev creates tables
  - [ ] npx prisma studio opens
  - [ ] Seed data populated

**Task 1.3: Express App Setup**
- Files to create:
  - `src/app.ts`
  - `src/config/index.ts`
  - `src/config/database.ts`
  - `src/config/redis.ts`
  - `src/config/cors.ts`
  - `src/database/connection.ts`
- Dependencies: Task 1.2
- Complexity: Medium
- Testing:
  - [ ] Server starts on configured port
  - [ ] Database connection established
  - [ ] Redis connection established

**Task 1.4: Middleware Stack**
- Files to create:
  - `src/middleware/error.middleware.ts`
  - `src/middleware/cors.middleware.ts`
  - `src/middleware/helmet.middleware.ts`
  - `src/middleware/compression.middleware.ts`
  - `src/middleware/request-logger.middleware.ts`
- Dependencies: Task 1.3
- Complexity: Medium
- Testing:
  - [ ] CORS headers present
  - [ ] Security headers present
  - [ ] Errors formatted consistently
  - [ ] Requests logged

---

### Module 2: Authentication System

**Task 2.1: Auth Types & Validators**
- Files to create:
  - `src/validators/auth.validator.ts`
  - `src/dto/auth.dto.ts`
  - `src/interfaces/auth.interface.ts`
  - `src/types/express.d.ts`
- Dependencies: Module 1
- Complexity: Low
- Testing:
  - [ ] Validators correctly validate/ reject input

**Task 2.2: Auth Repositories**
- Files to create:
  - `src/repositories/base.repository.ts`
  - `src/repositories/user.repository.ts`
  - `src/repositories/session.repository.ts`
  - `src/repositories/refresh-token.repository.ts`
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] User CRUD operations work
  - [ ] Session management works
  - [ ] Token management works

**Task 2.3: Auth Services**
- Files to create:
  - `src/services/auth.service.ts`
  - `src/services/token.service.ts`
  - `src/services/session.service.ts`
  - `src/services/password.service.ts`
  - `src/utils/jwt.ts`
  - `src/utils/hash.ts`
  - `src/utils/crypto.ts`
- Dependencies: Task 2.2
- Complexity: High
- Testing:
  - [ ] Password hashing works
  - [ ] JWT generation/validation works
  - [ ] Session creation works
  - [ ] Login logic correct

**Task 2.4: Auth Controllers & Routes**
- Files to create:
  - `src/controllers/auth.controller.ts`
  - `src/routes/auth.routes.ts`
  - `src/middleware/auth.middleware.ts`
- Files to update:
  - `src/app.ts` - mount auth routes
- Dependencies: Task 2.3
- Complexity: Medium
- Testing:
  - [ ] POST /auth/login works
  - [ ] POST /auth/refresh works
  - [ ] POST /auth/logout works
  - [ ] GET /auth/me works
  - [ ] Invalid token rejected

**Task 2.5: Password Reset Flow**
- Files to create:
  - `src/repositories/password-reset-token.repository.ts`
  - `src/emails/templates/password-reset.template.ts`
- Files to update:
  - `src/controllers/auth.controller.ts`
  - `src/routes/auth.routes.ts`
- Dependencies: Task 2.4, Email module
- Complexity: Medium
- Testing:
  - [ ] POST /auth/forgot-password works
  - [ ] POST /auth/reset-password works
  - [ ] Token expiry enforced

---

### Module 3: RBAC & Module Permissions

**Task 3.1: RBAC Middleware**
- Files to create:
  - `src/middleware/rbac.middleware.ts`
  - `src/middleware/module.middleware.ts`
  - `src/constants/roles.ts`
  - `src/constants/permissions.ts`
- Dependencies: Module 2
- Complexity: Medium
- Testing:
  - [ ] Role check works
  - [ ] Permission check works
  - [ ] Module access check works

**Task 3.2: Module Management**
- Files to create:
  - `src/repositories/module.repository.ts`
  - `src/services/module.service.ts`
  - `src/controllers/module.controller.ts`
  - `src/routes/admin.routes.ts`
- Dependencies: Task 3.1
- Complexity: Medium
- Testing:
  - [ ] GET /admin/modules works
  - [ ] PUT /admin/modules/:key/toggle works
  - [ ] Permissions enforced

---

### Module 4: Company & Settings

**Task 4.1: Settings Repositories**
- Files to create:
  - `src/repositories/company.repository.ts`
- Dependencies: Module 1
- Complexity: Low
- Testing:
  - [ ] Company CRUD works

**Task 4.2: Settings Service & Controller**
- Files to create:
  - `src/services/settings.service.ts`
  - `src/controllers/settings.controller.ts`
  - `src/routes/settings.routes.ts`
  - `src/validators/settings.validator.ts`
  - `src/dto/settings.dto.ts`
- Files to update:
  - `src/app.ts`
- Dependencies: Task 4.1, Module 2
- Complexity: Medium
- Testing:
  - [ ] GET /settings/company works
  - [ ] PUT /settings/company works
  - [ ] Only admin/manager can update

---

### Module 5: Customer Module

**Task 5.1: Customer Types & Validators**
- Files to create:
  - `src/validators/customer.validator.ts`
  - `src/dto/customer.dto.ts`
  - `src/interfaces/customer.interface.ts`
- Dependencies: Module 1
- Complexity: Low

**Task 5.2: Customer Repository**
- Files to create:
  - `src/repositories/customer.repository.ts`
- Dependencies: Task 5.1
- Complexity: Medium
- Testing:
  - [ ] Pagination works
  - [ ] Filtering works
  - [ ] Search works
  - [ ] Soft delete works

**Task 5.3: Customer Service & Controller**
- Files to create:
  - `src/services/customer.service.ts`
  - `src/controllers/customer.controller.ts`
  - `src/routes/customer.routes.ts`
- Files to update:
  - `src/app.ts`
- Dependencies: Task 5.2
- Complexity: Medium
- Testing:
  - [ ] All CRUD operations work
  - [ ] Statistics calculated correctly
  - [ ] RBAC enforced

---

### Module 6: Invoice Module

**Task 6.1: Invoice Types & Validators**
- Files to create:
  - `src/validators/invoice.validator.ts`
  - `src/dto/invoice.dto.ts`
  - `src/interfaces/invoice.interface.ts`
- Dependencies: Module 1
- Complexity: Low

**Task 6.2: Invoice Repositories**
- Files to create:
  - `src/repositories/invoice.repository.ts`
  - `src/repositories/invoice-item.repository.ts`
- Dependencies: Task 6.1
- Complexity: Medium
- Testing:
  - [ ] Invoice with items CRUD works
  - [ ] Totals calculated correctly
  - [ ] Numbering works

**Task 6.3: Invoice Service**
- Files to create:
  - `src/services/invoice.service.ts`
  - `src/services/invoice-number.service.ts`
  - `src/helpers/pdf.helper.ts`
- Dependencies: Task 6.2
- Complexity: High
- Testing:
  - [ ] Create invoice with line items
  - [ ] Calculate totals correctly
  - [ ] Auto-numbering works
  - [ ] Status transitions valid

**Task 6.4: Invoice Controller & Routes**
- Files to create:
  - `src/controllers/invoice.controller.ts`
  - `src/routes/invoice.routes.ts`
- Files to update:
  - `src/app.ts`
- Dependencies: Task 6.3
- Complexity: Medium
- Testing:
  - [ ] All endpoints work
  - [ ] RBAC enforced
  - [ ] PDF generation works

---

### Module 7: Payment Links & Payments

**Task 7.1: Payment Gateway Abstraction**
- Files to create:
  - `src/interfaces/gateway.interface.ts`
  - `src/services/payment-gateway.service.ts`
  - `src/services/razorpay.service.ts`
  - `src/config/payment-gateways.ts`
- Dependencies: Module 1
- Complexity: High
- Testing:
  - [ ] Gateway abstraction works
  - [ ] Razorpay integration works

**Task 7.2: Payment Link Module**
- Files to create:
  - `src/validators/payment-link.validator.ts`
  - `src/dto/payment-link.dto.ts`
  - `src/repositories/payment-link.repository.ts`
  - `src/services/payment-link.service.ts`
  - `src/controllers/payment-link.controller.ts`
  - `src/routes/payment-link.routes.ts`
- Dependencies: Task 7.1
- Complexity: High
- Testing:
  - [ ] Create payment link works
  - [ ] Gateway integration works
  - [ ] Status updates correct

**Task 7.3: Payment Webhooks**
- Files to create:
  - `src/controllers/webhook.controller.ts`
  - `src/routes/webhook.routes.ts`
- Dependencies: Task 7.2
- Complexity: High
- Testing:
  - [ ] Webhook signature verification
  - [ ] Payment updates processed
  - [ ] Invoice status updated

---

### Module 8: Communication Module

**Task 8.1: Email Service**
- Files to create:
  - `src/interfaces/email.interface.ts`
  - `src/emails/providers/resend.provider.ts`
  - `src/emails/providers/smtp.provider.ts`
  - `src/emails/index.ts`
  - `src/services/email.service.ts`
  - `src/config/email.ts`
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] Email sending works
  - [ ] Templates rendered correctly

**Task 8.2: WhatsApp Service**
- Files to create:
  - `src/services/whatsapp.service.ts`
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] WhatsApp sending works

**Task 8.3: Communication Logs**
- Files to create:
  - `src/repositories/communication-log.repository.ts`
  - `src/repositories/message-template.repository.ts`
  - `src/services/communication.service.ts`
  - `src/controllers/communication.controller.ts`
  - `src/routes/communication.routes.ts`
- Dependencies: Task 8.1, 8.2
- Complexity: Medium
- Testing:
  - [ ] Log listing works
  - [ ] Templates work

---

### Module 9: Reports Module

**Task 9.1: Report Services**
- Files to create:
  - `src/services/report.service.ts`
  - `src/services/export.service.ts`
  - `src/helpers/excel.helper.ts`
  - `src/helpers/csv.helper.ts`
- Dependencies: Module 1, 5, 6, 7
- Complexity: High
- Testing:
  - [ ] All report calculations correct
  - [ ] Export formats work

**Task 9.2: Report Controllers**
- Files to create:
  - `src/controllers/report.controller.ts`
  - `src/routes/report.routes.ts`
  - `src/validators/report.validator.ts`
  - `src/dto/report.dto.ts`
- Dependencies: Task 9.1
- Complexity: Medium
- Testing:
  - [ ] All report endpoints work
  - [ ] Export downloads work

---

### Module 10: Admin Module

**Task 10.1: User Management**
- Files to create:
  - `src/validators/user.validator.ts`
  - `src/dto/user.dto.ts`
  - `src/services/user.service.ts`
  - `src/controllers/user.controller.ts`
- Files to update:
  - `src/routes/admin.routes.ts`
- Dependencies: Module 2
- Complexity: Medium
- Testing:
  - [ ] All user CRUD works
  - [ ] Permissions enforced

**Task 10.2: Audit Logs**
- Files to create:
  - `src/middleware/audit.middleware.ts`
  - `src/repositories/audit-log.repository.ts`
  - `src/services/audit.service.ts`
  - `src/controllers/audit.controller.ts`
- Dependencies: Module 1, 2
- Complexity: Medium
- Testing:
  - [ ] Actions logged correctly
  - [ ] Logs queryable

**Task 10.3: Invoice Templates**
- Files to create:
  - `src/repositories/invoice-template.repository.ts`
  - `src/repositories/template-version.repository.ts`
  - `src/services/template.service.ts`
  - `src/controllers/template.controller.ts`
- Files to update:
  - `src/routes/admin.routes.ts`
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] Template upload works
  - [ ] Version management works
  - [ ] Preview works

**Task 10.4: Usage Analytics**
- Files to create:
  - `src/repositories/api-usage.repository.ts`
  - `src/services/usage.service.ts`
  - `src/controllers/usage.controller.ts`
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] Usage metrics calculated
  - [ ] Charts data correct

---

### Module 11: External Integrations

**Task 11.1: Integration Infrastructure**
- Files to create:
  - `src/interfaces/integration.interface.ts`
  - `src/repositories/integration.repository.ts`
  - `src/repositories/sync-history.repository.ts`
- Dependencies: Module 1
- Complexity: Medium

**Task 11.2: Integration Services**
- Files to create:
  - `src/services/integration.service.ts`
  - `src/services/sync.service.ts`
- Dependencies: Task 11.1
- Complexity: High
- Testing:
  - [ ] Connect/disconnect works
  - [ ] Sync triggers work

**Task 11.3: ERP Connectors**
- Files to create:
  - `src/integrations/tally.integration.ts`
  - `src/integrations/zoho-books.integration.ts`
- Dependencies: Task 11.2
- Complexity: High
- Testing:
  - [ ] Each connector works with mock data

---

### Module 12: Queues & Background Jobs

**Task 12.1: BullMQ Setup**
- Files to create:
  - `src/queues/index.ts`
  - `src/queues/email.queue.ts`
  - `src/queues/whatsapp.queue.ts`
  - `src/queues/export.queue.ts`
  - `src/queues/audit.queue.ts`
  - `src/queues/notification.queue.ts`
  - `src/config/redis.ts` (update)
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] Queues initialize
  - [ ] Jobs can be added
  - [ ] Workers process jobs

**Task 12.2: Job Definitions**
- Files to create:
  - `src/jobs/email.job.ts`
  - `src/jobs/whatsapp.job.ts`
  - `src/jobs/export.job.ts`
  - `src/jobs/invoice-pdf.job.ts`
  - `src/jobs/audit.job.ts`
- Dependencies: Task 12.1
- Complexity: Medium
- Testing:
  - [ ] Each job completes
  - [ ] Retries work
  - [ ] Failures handled

---

### Module 13: Socket.IO

**Task 13.1: Socket Server**
- Files to create:
  - `src/socket/index.ts`
  - `src/socket/middleware/auth.socket.middleware.ts`
  - `src/socket/handlers/connection.handler.ts`
- Dependencies: Module 2
- Complexity: Medium
- Testing:
  - [ ] Socket connects
  - [ ] Authentication works
  - [ ] Rooms join

**Task 13.2: Event Handlers**
- Files to create:
  - `src/socket/handlers/invoice.handler.ts`
  - `src/socket/handlers/payment.handler.ts`
  - `src/socket/handlers/notification.handler.ts`
  - `src/socket/handlers/dashboard.handler.ts`
- Dependencies: Task 13.1
- Complexity: Medium
- Testing:
  - [ ] Events emit correctly
  - [ ] Clients receive events

---

### Module 14: Caching

**Task 14.1: Redis Cache Service**
- Files to create:
  - `src/services/cache.service.ts`
  - `src/constants/cache-ttl.ts`
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] Get/set works
  - [ ] TTL respected
  - [ ] Pattern delete works

**Task 14.2: Cache Integration**
- Files to update:
  - All services (add caching)
- Dependencies: Task 14.1
- Complexity: Medium
- Testing:
  - [ ] Cache hit reduces DB query
  - [ ] Cache invalidation works

---

### Module 15: File Uploads

**Task 15.1: Storage Provider**
- Files to create:
  - `src/storage/cloudinary.provider.ts`
  - `src/storage/local.provider.ts`
  - `src/storage/index.ts`
  - `src/services/upload.service.ts`
  - `src/middleware/upload.middleware.ts`
- Dependencies: Module 1
- Complexity: Medium
- Testing:
  - [ ] Upload works
  - [ ] Delete works
  - [ ] URL generation works

**Task 15.2: Upload Routes**
- Files to create:
  - `src/controllers/upload.controller.ts`
- Dependencies: Task 15.1
- Complexity: Low
- Testing:
  - [ ] Logo upload works
  - [ ] Signature upload works

---

### Module 16: Notifications

**Task 16.1: Notification System**
- Files to create:
  - `src/repositories/notification.repository.ts`
  - `src/services/notification.service.ts`
  - `src/controllers/notification.controller.ts`
  - `src/routes/notification.routes.ts`
- Dependencies: Module 2, 13
- Complexity: Medium
- Testing:
  - [ ] Notifications created
  - [ ] Notifications listed
  - [ ] Mark read works

---

### Module 17: Activity Logging

**Task 17.1: Activity Service**
- Files to create:
  - `src/repositories/activity-log.repository.ts`
  - `src/services/activity.service.ts`
- Dependencies: Module 1
- Complexity: Low
- Testing:
  - [ ] Activities logged
  - [ ] Activities retrieved

---

### Module 18: Rate Limiting

**Task 18.1: Rate Limiter**
- Files to create:
  - `src/middleware/rate-limit.middleware.ts`
  - `src/constants/rate-limits.ts`
- Dependencies: Module 1
- Complexity: Low
- Testing:
  - [ ] Limits enforced
  - [ ] 429 returned correctly

---

### Module 19: API Documentation

**Task 19.1: Swagger Setup**
- Files to create:
  - `src/swagger.ts`
  - `swagger.json`
- Files to update:
  - `src/app.ts`
- Dependencies: All modules
- Complexity: Medium
- Testing:
  - [ ] Swagger UI accessible
  - [ ] All endpoints documented

---

### Module 20: Frontend Integration

**Task 20.1: Axios Client**
- Files to update:
  - `frontend/src/lib/axios.ts` (new)
  - `frontend/src/services/api.ts` (new)
- Dependencies: All backend modules
- Complexity: Medium
- Testing:
  - [ ] Token attached
  - [ ] Refresh flow works
  - [ ] Errors handled

**Task 20.2: React Query Hooks**
- Files to update:
  - All service files in frontend
- Dependencies: Task 20.1
- Complexity: High
- Testing:
  - [ ] Data fetches correctly
  - [ ] Mutations work
  - [ ] Cache invalidates

**Task 20.3: Auth Store Update**
- Files to update:
  - `frontend/src/store/authStore.ts`
- Dependencies: Task 20.2
- Complexity: Medium
- Testing:
  - [ ] Login persists
  - [ ] Logout clears
  - [ ] Token refresh works

---

## 13. Testing Strategy

### 13.1 Unit Tests

**Services:**
- Test each service method in isolation
- Mock repository calls
- Test edge cases and error handling

**Example:**
```typescript
describe('CustomerService', () => {
  describe('createCustomer', () => {
    it('should create customer with valid data', async () => {
      const mockRepo = { create: jest.fn().mockResolvedValue(mockCustomer) };
      const service = new CustomerService(mockRepo);
      
      const result = await service.createCustomer(validData);
      
      expect(mockRepo.create).toHaveBeenCalledWith(validData);
      expect(result).toEqual(mockCustomer);
    });
    
    it('should throw error for duplicate email', async () => {
      const mockRepo = { findByEmail: jest.fn().mockResolvedValue(existingCustomer) };
      const service = new CustomerService(mockRepo);
      
      await expect(service.createCustomer(data))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

**Repositories:**
- Use test database
- Test all CRUD operations
- Test relations and cascades

### 13.2 Integration Tests

**API Tests:**
```typescript
describe('Customer API', () => {
  let token: string;
  
  beforeAll(async () => {
    token = await getAuthToken();
  });
  
  describe('GET /api/v1/customers', () => {
    it('should return paginated customers', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });
    
    it('should reject unauthorized requests', async () => {
      const res = await request(app)
        .get('/api/v1/customers');
      
      expect(res.status).toBe(401);
    });
  });
});
```

### 13.3 Authentication Tests

- Login with valid credentials
- Login with invalid credentials
- Refresh token flow
- Token expiry handling
- Password reset flow
- Session management
- Rate limiting

### 13.4 Performance Tests

- Load test with k6 or Artillery
- Measure response times
- Test concurrent requests
- Database query performance

### 13.5 Security Tests

- SQL injection attempts
- XSS attempts
- CSRF validation
- JWT tampering
- Rate limit bypass attempts
- Unauthorized access attempts

---

## 14. Production Checklist

### 14.1 Environment Variables

```bash
# Database
DATABASE_URL="mysql://user:password@host:3306/invoicegen"

# Redis
REDIS_URL="redis://host:6379"

# JWT
JWT_SECRET="random-256-bit-secret"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV=production
API_PREFIX="/api/v1"

# CORS
CORS_ORIGINS="https://invoicegen.com,https://app.invoicegen.com"

# Email
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_xxx"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="user"
SMTP_PASS="password"

# Storage
CLOUDINARY_CLOUD_NAME="invoicegen"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"

# Payment Gateways
RAZORPAY_KEY_ID="rzp_xxx"
RAZORPAY_KEY_SECRET="xxx"
RAZORPAY_WEBHOOK_SECRET="xxx"
PAYTM_MERCHANT_ID="xxx"
PAYTM_MERCHANT_KEY="xxx"

# Integrations
TALLY_API_URL="http://localhost:9000"
ZOHO_BOOKS_CLIENT_ID="xxx"
ZOHO_BOOKS_CLIENT_SECRET="xxx"

# Logging
LOG_LEVEL="info"
LOG_FORMAT="json"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 14.2 Docker Structure

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/src/app.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:password@db:3306/invoicegen
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=invoicegen
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

### 14.3 Health Checks

```typescript
// routes/health.routes.ts
router.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
  };
  
  const healthy = Object.values(checks).every(v => v);
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
});
```

### 14.4 Logging

**Winston Logger:**
```typescript
const logger = winston.createLogger({
  level: config.log.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transtracts.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 14.5 Monitoring

- Use Prometheus/Grafana or DataDog
- Track: Request duration, error rates, queue depths
- Alert on: High error rate, queue backup, memory usage

### 14.6 Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  await prisma.$disconnect();
  
  // Close Redis connections
  await redis.quit();
  
  // Close BullMQ queues
  await closeQueues();
  
  process.exit(0);
});
```

### 14.7 Backups

- Daily database backups
- Point-in-time recovery enabled
- Backup encryption at rest
- Off-site backup storage

### 14.8 Security Headers

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

### 14.9 Rate Limiting

```typescript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    });
  }
});

app.use(limiter);

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/api/v1/auth/login', authLimiter);
```

### 14.10 Compression

```typescript
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024
}));
```

### 14.11 Migration Strategy

1. **Development**: `prisma migrate dev`
2. **Staging**: `prisma migrate deploy` (CI/CD)
3. **Production**:
   - Run migrations in transaction
   - Backup before migration
   - Rollback plan ready
   - Zero-downtime deployment (blue-green)

---

## 15. Multi-Tenant SaaS Architecture

### 15.1 Company Isolation

Every business entity must support `companyId` for complete data isolation:

**Models requiring companyId:**
- Users
- Customers
- Invoices
- Invoice Items
- Payment Links
- Payments
- Communication Logs
- Message Templates
- Notifications
- Audit Logs
- Activity Logs
- Usage Analytics
- Invoice Templates (via UserInvoiceTemplate)
- External Integrations
- File Uploads

### 15.2 Repository Pattern for Multi-Tenancy

```typescript
// All repositories must filter by companyId
async findMany(params: FindManyParams & { companyId: string }) {
  return this.prisma.model.findMany({
    where: {
      companyId: params.companyId,
      deletedAt: null,  // Soft delete filter
      ...params.where
    }
  });
}
```

### 15.3 Request Context

```typescript
// Middleware extracts company context
declare global {
  namespace Express {
    interface Request {
      companyId: string;
      userId: string;
      userRole: UserRole;
    }
  }
}
```

### 15.4 Business User Restrictions

Business role users can only see:
- Own company's customers
- Own company's invoices
- Own company's reports
- Never access another company's data

---

## 16. Complete Financial Domain

### 16.1 Tax Models

**GST Breakdown:**
```prisma
model InvoiceTax {
  id          String   @id @default(uuid())
  invoiceId   String
  taxType     String   // CGST, SGST, IGST, CESS
  taxRate     Decimal  @db.Decimal(5, 2)
  taxableAmount Decimal
  taxAmount   Decimal  @db.Decimal(15, 2)
  createdAt   DateTime @default(now())

  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@map("invoice_taxes")
}
```

**Tax Configuration:**
```prisma
model TaxConfiguration {
  id              String   @id @default(uuid())
  companyId       String
  name            String
  taxType         String   // GST, CGST, SGST, IGST, CESS
  rate            Decimal  @db.Decimal(5, 2)
  isIntraState    Boolean
  description     String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([companyId, name])
  @@map("tax_configurations")
}
```

### 16.2 HSN/SAC Codes

```prisma
model HSNSACCode {
  id          String   @id @default(uuid())
  code        String   @unique
  description String
  category    String   // Goods or Services
  taxRate     Decimal  @db.Decimal(5, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@map("hsn_sac_codes")
}
```

### 16.3 Discount & Coupon Support

```prisma
model Coupon {
  id            String   @id @default(uuid())
  companyId     String
  code          String
  description   String?
  discountType  String   // PERCENTAGE, FIXED
  discountValue Decimal  @db.Decimal(15, 2)
  minOrderValue Decimal? @db.Decimal(15, 2)
  maxDiscount   Decimal? @db.Decimal(15, 2)
  usageLimit    Int?
  usageCount    Int      @default(0)
  validFrom     DateTime
  validTo       DateTime
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([companyId, code])
  @@map("coupons")
}

model InvoiceDiscount {
  id            String   @id @default(uuid())
  invoiceId     String
  couponId      String?
  discountType  String   // COUPON, MANUAL
  discountValue Decimal  @db.Decimal(15, 2)
  reason        String?
  createdAt     DateTime @default(now())

  invoice       Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  coupon        Coupon?  @relation(fields: [couponId], references: [id])

  @@map("invoice_discounts")
}
```

### 16.4 Credit/Debit Notes

```prisma
model CreditNote {
  id            String   @id @default(uuid())
  companyId     String
  number        String
  invoiceId     String?
  customerId    String
  reason        String
  amount        Decimal  @db.Decimal(15, 2)
  status        String   @default("DRAFT") // DRAFT, ISSUED, APPLIED
  issuedAt      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  @@unique([companyId, number])
  @@map("credit_notes")
}

model DebitNote {
  id            String   @id @default(uuid())
  companyId     String
  number        String
  invoiceId     String?
  customerId    String
  reason        String
  amount        Decimal  @db.Decimal(15, 2)
  status        String   @default("DRAFT")
  issuedAt      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  @@unique([companyId, number])
  @@map("debit_notes")
}
```

### 16.5 Recurring Invoices

```prisma
model RecurringInvoice {
  id              String   @id @default(uuid())
  companyId       String
  customerId      String
  templateInvoiceId String
  frequency       String   // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  interval        Int      @default(1)
  startDate       DateTime
  endDate         DateTime?
  nextRunAt       DateTime
  lastRunAt       DateTime?
  active          Boolean  @default(true)
  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("recurring_invoices")
}

model RecurringInvoiceRun {
  id                String   @id @default(uuid())
  recurringInvoiceId String
  invoiceId         String
  scheduledAt       DateTime
  executedAt        DateTime?
  status            String   @default("PENDING") // PENDING, SUCCESS, FAILED
  errorMessage      String?
  createdAt         DateTime @default(now())

  @@map("recurring_invoice_runs")
}
```

### 16.6 Invoice Attachments & Activity

```prisma
model InvoiceAttachment {
  id          String   @id @default(uuid())
  invoiceId   String
  fileName    String
  filePath    String
  fileSize    Int
  mimeType    String
  uploadedById String
  uploadedAt  DateTime @default(now())
  deletedAt   DateTime?

  @@map("invoice_attachments")
}

model InvoiceActivity {
  id          String   @id @default(uuid())
  invoiceId   String
  userId      String?
  action      String   // CREATED, SENT, VIEWED, PAID, CANCELLED, REMINDED
  description String
  metadata    Json?
  createdAt   DateTime @default(now())

  @@map("invoice_activities")
}

model InvoiceComment {
  id          String   @id @default(uuid())
  invoiceId   String
  userId      String
  content     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("invoice_comments")
}

model InvoiceVersion {
  id          String   @id @default(uuid())
  invoiceId   String
  version     Int
  snapshot    Json
  changedById String
  changedAt   DateTime @default(now())
  changeDescription String?

  @@unique([invoiceId, version])
  @@map("invoice_versions")
}
```

---

## 17. Dashboard Architecture

### 17.1 Dashboard Widgets

```prisma
model DashboardWidget {
  id            String   @id @default(uuid())
  key           String   @unique
  name          String
  description   String?
  category      String   // METRICS, CHARTS, TABLES, LISTS
  defaultSize   String   // SMALL, MEDIUM, LARGE
  defaultPosition Json?
  configSchema  Json?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  @@map("dashboard_widgets")
}

model UserDashboardWidget {
  id          String   @id @default(uuid())
  userId      String
  widgetId    String
  position    Json
  size        String
  config      Json?
  isVisible   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, widgetId])
  @@map("user_dashboard_widgets")
}
```

### 17.2 Dashboard Preferences

```prisma
model DashboardPreferences {
  id            String   @id @default(uuid())
  userId        String   @unique
  layout        Json?
  filters       Json?
  refreshInterval Int    @default(30000)
  theme         String   @default("default")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("dashboard_preferences")
}
```

### 17.3 KPI Engine

```typescript
interface KPIConfig {
  id: string;
  name: string;
  description: string;
  category: 'revenue' | 'customers' | 'invoices' | 'payments' | 'operations';
  dataSource: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year';
  comparison: 'previous_period' | 'same_last_year' | 'none';
  format: 'currency' | 'number' | 'percentage';
  target?: number;
  alertThreshold?: {
    warning: number;
    critical: number;
  };
}
```

---

## 18. Reports Architecture

### 18.1 Report Types

```typescript
enum ReportType {
  // Revenue Reports
  REVENUE_SUMMARY = 'revenue_summary',
  REVENUE_BY_CUSTOMER = 'revenue_by_customer',
  REVENUE_BY_PRODUCT = 'revenue_by_product',
  REVENUE_TREND = 'revenue_trend',
  
  // Sales Reports
  SALES_FUNNEL = 'sales_funnel',
  SALES_BY_REGION = 'sales_by_region',
  SALES_BY_SALES_PERSON = 'sales_by_sales_person',
  
  // Payment Reports
  PAYMENT_COLLECTION = 'payment_collection',
  PAYMENT_BY_GATEWAY = 'payment_by_gateway',
  PAYMENT_METHOD_DISTRIBUTION = 'payment_method_distribution',
  
  // Customer Reports
  CUSTOMER_ACQUISITION = 'customer_acquisition',
  CUSTOMER_RETENTION = 'customer_retention',
  CUSTOMER_LIFETIME_VALUE = 'customer_lifetime_value',
  
  // Outstanding Reports
  INVOICE_AGING = 'invoice_aging',
  COLLECTION_FORECAST = 'collection_forecast',
  OVERDUE_ANALYSIS = 'overdue_analysis',
  
  // Tax Reports
  GST_SUMMARY = 'gst_summary',
  GST_INPUT_CREDIT = 'gst_input_credit',
  GST_OUTPUT_LIABILITY = 'gst_output_liability',
  HSN_WISE_SUMMARY = 'hsn_wise_summary',
  
  // Communication Reports
  EMAIL_PERFORMANCE = 'email_performance',
  WHATSAPP_PERFORMANCE = 'whatsapp_performance',
  COMMUNICATION_SUMMARY = 'communication_summary',
  
  // Audit Reports
  USER_ACTIVITY = 'user_activity',
  API_USAGE = 'api_usage',
  ERROR_LOGS = 'error_logs',
}
```

### 18.2 Report Export

```typescript
interface ReportExportConfig {
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'LETTER';
  includeCharts: boolean;
  includeSummary: boolean;
  includeDetails: boolean;
  customBranding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
}
```

### 18.3 Saved Reports

```prisma
model SavedReport {
  id            String   @id @default(uuid())
  companyId     String
  userId        String
  name          String
  reportType    String
  config        Json
  schedule      Json?
  lastRunAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("saved_reports")
}

model ScheduledReport {
  id            String   @id @default(uuid())
  companyId     String
  savedReportId String
  frequency     String   // DAILY, WEEKLY, MONTHLY
  recipients    Json
  nextRunAt     DateTime
  lastRunAt     DateTime?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  @@map("scheduled_reports")
}

model ExportHistory {
  id            String   @id @default(uuid())
  companyId     String
  userId        String
  reportType    String
  format        String
  parameters    Json
  filePath      String
  fileSize      Int
  status        String
  errorMessage  String?
  createdAt     DateTime @default(now())

  @@map("export_history")
}
```

---

## 19. Company Settings Architecture

### 19.1 Settings Categories

```prisma
model CompanySettings {
  id            String   @id @default(uuid())
  companyId     String   @unique
  
  // General Settings
  timezone      String   @default("Asia/Kolkata")
  dateFormat    String   @default("DD/MM/YYYY")
  currency      String   @default("INR")
  language      String   @default("en")
  
  // Invoice Settings
  autoNumbering Boolean  @default(true)
  invoicePrefix String   @default("INV")
  nextNumber    Int      @default(1001)
  defaultTerms  String?
  defaultNotes  String?
  paymentTerms  Int      @default(30)
  
  // Tax Settings
  defaultTaxRate Decimal @default(18) @db.Decimal(5, 2)
  gstEnabled    Boolean  @default(true)
  tdsEnabled    Boolean  @default(false)
  tcsEnabled    Boolean  @default(false)
  
  // Notification Settings
  emailNotifications Boolean @default(true)
  whatsappNotifications Boolean @default(false)
  smsNotifications Boolean @default(false)
  
  // Security Settings
  twoFactorAuth Boolean @default(false)
  sessionTimeout Int   @default(30)
  ipWhitelist   Json?
  
  // Business Hours
  businessHours Json?
  workingDays   Json?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("company_settings")
}
```

### 19.2 API Keys Model

```prisma
model APIKey {
  id            String   @id @default(uuid())
  companyId     String
  userId        String
  name          String
  keyHash       String   @unique
  prefix        String
  permissions   Json
  lastUsedAt    DateTime?
  expiresAt     DateTime?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("api_keys")
}
```

---

## 20. Communication Architecture

### 20.1 Communication Queue Processing

```typescript
// Communication job flow
interface CommunicationJob {
  id: string;
  type: 'EMAIL' | 'WHATSAPP' | 'SMS';
  templateId?: string;
  recipient: string;
  variables: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    mimeType: string;
  }>;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'FAILED';
  scheduledAt?: Date;
}
```

### 20.2 Dead Letter Queue

```prisma
model FailedCommunication {
  id              String   @id @default(uuid())
  companyId       String
  originalJobId   String
  channel         String
  recipient       String
  subject         String?
  body            String
  failureReason   String
  retryAttempts   Int
  originalPayload Json
  failedAt        DateTime @default(now())
  
  @@map("failed_communications")
}
```

### 20.3 Variable Replacement Engine

```typescript
interface TemplateVariable {
  name: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'LINK';
  required: boolean;
  defaultValue?: unknown;
  format?: string;
}

class TemplateEngine {
  replace(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(variables[key] ?? '');
    });
  }
}
```

---

## 21. Security Architecture

### 21.1 Account Security

```prisma
model AccountSecurity {
  id                    String   @id @default(uuid())
  userId                String   @unique
  loginAttempts         Int      @default(0)
  lockedUntil           DateTime?
  passwordChangedAt     DateTime
  lastPasswordChange    DateTime?
  securityQuestionsSet  Boolean  @default(false)
  twoFactorEnabled      Boolean  @default(false)
  twoFactorSecret       String?
  twoFactorBackupCodes  Json?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("account_security")
}
```

### 21.2 Device Tracking

```prisma
model TrustedDevice {
  id          String   @id @default(uuid())
  userId      String
  deviceHash  String
  deviceName  String
  deviceType  String
  browser     String
  os          String
  ipAddress   String
  trustedAt   DateTime @default(now())
  lastSeenAt  DateTime @default(now())
  isActive    Boolean  @default(true)

  @@unique([userId, deviceHash])
  @@map("trusted_devices")
}
```

### 21.3 Login Security Settings

```typescript
const securityConfig = {
  loginAttempts: {
    maxAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    resetAfterSuccess: true
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
    expiryDays: 90,
    preventReuse: 5
  },
  session: {
    maxConcurrent: 5,
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 24 * 60 * 60 * 1000 // 24 hours
  },
  twoFactor: {
    required: false,
    requiredForRoles: ['ADMIN'],
    allowedMethods: ['APP', 'SMS', 'EMAIL']
  }
};
```

### 21.4 CSRF Protection

```typescript
// CSRF token middleware (prepared for future)
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  }
});

// Apply to state-changing routes
app.use('/api/v1/*', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  next();
});
```

### 21.5 Secure Cookie Configuration

```typescript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  domain: process.env.COOKIE_DOMAIN
};
```

---

## 22. Storage Layer Architecture

### 22.1 Storage Abstraction

```typescript
interface StorageProvider {
  name: string;
  
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  getPublicUrl(key: string): string;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<FileMetadata>;
}

interface UploadOptions {
  key?: string;
  folder?: string;
  mimeType: string;
  acl?: 'public-read' | 'private';
  metadata?: Record<string, string>;
  transformation?: ImageTransformation;
}

interface ImageTransformation {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp' | 'avif';
  crop?: 'fill' | 'fit' | 'scale';
}
```

### 22.2 File Versioning

```prisma
model FileVersion {
  id          String   @id @default(uuid()))
  fileUploadId String
  version     Int
  key         String
  size        Int
  uploadedById String
  uploadedAt  DateTime @default(now())

  @@unique([fileUploadId, version])
  @@map("file_versions")
}
```

---

## 23. Monitoring Architecture

### 23.1 Health Check Endpoints

```typescript
// GET /health - Basic health
// GET /health/ready - Readiness (all systems go)
// GET /health/live - Liveness (app is running)

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    storage: ComponentHealth;
    email: ComponentHealth;
    queues: ComponentHealth;
  };
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    requestsPerMinute: number;
    averageResponseTime: number;
  };
}
```

### 23.2 Metrics Collection

```typescript
interface MetricsConfig {
  collectInterval: number; // milliseconds
  retentionDays: number;
  aggregations: ['1m', '5m', '1h', '1d'];
  
  metrics: {
    requestDuration: boolean;
    requestCount: boolean;
    errorCount: boolean;
    activeConnections: boolean;
    queueDepth: boolean;
    databaseConnections: boolean;
    cacheHitRate: boolean;
  };
}
```

---

## 24. Module 1 Implementation - Backend Foundation

Architecture approved and implementation begins now.

---
