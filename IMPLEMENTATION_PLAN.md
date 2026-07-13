# InvoiceGen Enterprise - Backend Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for building a production-ready Node.js + Express + Prisma + MySQL backend for the InvoiceGen enterprise SaaS application. The frontend is complete and uses mock services. This plan maps every frontend page to required REST APIs.

---

## 1. Frontend Analysis Summary

### 1.1 Pages & Components

| Module | Pages | Actions |
|--------|-------|---------|
| Auth | Login, ForgotPassword, ResetPassword | Login, Logout, Refresh, Password Reset |
| Dashboard | DashboardPage | Metrics, Charts, Activity |
| Customers | List, Details, Form (Create/Edit) | CRUD, Statistics |
| Invoices | List, Details, Create/Edit | CRUD, Line Items, Status, Duplicate |
| PaymentLinks | List, Details, Create | CRUD, Status, Gateway |
| Communication | WhatsApp, Email, Logs | History, Templates, Send |
| Reports | ReportsPage | 6 report types, Export (PDF/Excel/CSV) |
| Settings | SettingsPage, ExternalIntegrations | Company, Bank, Invoice, Comms, Gateways |
| Admin | Users, Modules, Templates, AuditLogs, Usage | Full CRUD, RBAC, Analytics |

### 1.2 Current Mock Services

| Service | File | Methods |
|---------|------|---------|
| authStore | store/authStore.ts | login, logout, initialize |
| customerService | services/customerService.ts | list, get, create, update, delete |
| invoiceService | services/invoiceService.ts | list, get, create, update, delete, duplicate |
| paymentService | services/paymentService.ts | listLinks, getLink, createLink, listPayments |
| communicationService | services/index.ts | listLogs, listTemplates, createTemplate |
| auditService | services/index.ts | list |
| activityService | services/index.ts | list |
| userService | services/index.ts | list, create, update, suspend, delete |
| settingsStore | store/settingsStore.ts | company, bank, invoice, communication, gateways |
| moduleStore | store/moduleStore.ts | modules, toggleModule, isModuleEnabled |
| templateStore | store/templateStore.ts | templates, versions, userTemplates |
| integrationStore | store/integrationStore.ts | integrations, syncHistory |

### 1.3 TypeScript Types (from types/index.ts)

- User, UserRole, UserStatus
- Customer, Address
- Invoice, LineItem, InvoiceStatus
- PaymentLink, PaymentLinkStatus
- Payment, PaymentStatus
- CommunicationLog, MessageTemplate
- ActivityLog, AuditLog
- CompanyInfo, BankInfo, InvoiceSettings, CommunicationSettings, GatewaySettings
- ModuleConfig, ModuleKey
- DashboardMetrics, Chart Data Types
- InvoiceTemplate, TemplateVersion, UserInvoiceTemplate
- ExternalIntegration, IntegrationLog, SyncHistory

---

## 2. Technology Stack

### Backend Stack
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma
- **Database**: MySQL 8.0
- **Cache**: Redis
- **Queue**: BullMQ
- **Auth**: JWT (access tokens) + Refresh Tokens (rotation)
- **Validation**: Zod
- **File Upload**: Multer + Cloudinary
- **Real-time**: Socket.IO
- **Documentation**: Swagger/OpenAPI

### Security
- Helmet (HTTP headers)
- Rate Limiting (express-rate-limit)
- CORS
- bcrypt (password hashing)
- Input validation

---

## 3. Database Schema Design

### 3.1 Core Models

```prisma
// User & Auth
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  password          String
  name              String
  phone             String?
  avatar            String?
  role              Role      @default(business)
  status            UserStatus @default(active)
  companyName       String?
  permissions       Json      // ModuleKey[]
  
  // Relations
  sessions          Session[]
  refreshTokens     RefreshToken[]
  passwordResetTokens PasswordResetToken[]
  customers         Customer[]
  invoices          Invoice[]
  paymentLinks      PaymentLink[]
  payments          Payment[]
  activityLogs      ActivityLog[]
  auditLogs         AuditLog[]
  invoiceTemplates  UserInvoiceTemplate[]
  
  companySettings   CompanySettings?
  bankSettings      BankSettings?
  invoiceSettings   InvoiceSettings?
  communicationSettings CommunicationSettings?
  gatewaySettings   GatewaySettings?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  lastActiveAt      DateTime?
  deletedAt         DateTime?
}

model Session {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  token       String   @unique
  userAgent   String?
  ipAddress   String
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
 _revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}

enum Role {
  admin
  manager
  staff
  business
  viewer
}

enum UserStatus {
  active
  suspended
  invited
}
```

### 3.2 Business Models

```prisma
model Customer {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  name              String
  businessName      String
  gstNumber         String?
  email             String
  mobile            String
  whatsapp          String?
  notes             String?
  status            CustomerStatus @default(active)
  
  billingAddress    Address?
  shippingAddress   Address?
  invoices          Invoice[]
  paymentLinks      PaymentLink[]
  payments          Payment[]
  communicationLogs CommunicationLog[]
  
  totalInvoices     Int      @default(0)
  totalRevenue      Decimal  @default(0)
  outstandingAmount Decimal  @default(0)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
}

model Address {
  id          String   @id @default(uuid())
  customerId  String   @unique
  customer    Customer @relation(fields: [customerId], references: [id])
  type        AddressType @default(billing)
  line1       String
  line2       String?
  city        String
  state       String
  pincode     String
  country     String  @default("India")
}

enum CustomerStatus {
  active
  inactive
}

enum AddressType {
  billing
  shipping
}

model Invoice {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])
  number        String   @unique
  status        InvoiceStatus @default(draft)
  
  issueDate     DateTime
  dueDate       DateTime
  lineItems     LineItem[]
  
  subtotal      Decimal  @default(0)
  taxAmount     Decimal  @default(0)
  discountAmount Decimal @default(0)
  total         Decimal  @default(0)
  amountPaid    Decimal  @default(0)
  balance       Decimal  @default(0)
  
  notes         String?
  terms         String?
  
  payments      Payment[]
  communicationLogs CommunicationLog[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}

model LineItem {
  id            String   @id @default(uuid())
  invoiceId     String
  invoice       Invoice  @relation(fields: [invoiceId], references: [id])
  description   String
  quantity      Decimal
  rate          Decimal
  discount      Decimal  @default(0)
  taxRate       Decimal  @default(0)
  amount        Decimal  @default(0)
  sortOrder     Int      @default(0)
}

enum InvoiceStatus {
  draft
  sent
  viewed
  paid
  overdue
  cancelled
}
```

### 3.3 Payment Models

```prisma
model PaymentLink {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])
  invoiceId     String?
  
  linkId        String   @unique
  amount        Decimal
  currency      String   @default("INR")
  gateway       GatewayType
  status        PaymentLinkStatus @default(pending)
  url           String
  
  description   String?
  expiryDate    DateTime
  
  paidAt        DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}

model Payment {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  invoiceId     String
  invoice       Invoice  @relation(fields: [invoiceId], references: [id])
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])
  paymentLinkId String?
  
  amount        Decimal
  method        PaymentMethod
  status        PaymentStatus @default(pending)
  gateway       GatewayType?
  transactionId String
  
  gatewayResponse Json?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum PaymentLinkStatus {
  pending
  paid
  failed
  expired
}

enum PaymentStatus {
  pending
  paid
  failed
  refunded
}

enum PaymentMethod {
  card
  upi
  netbanking
  wallet
  cash
  cheque
}

enum GatewayType {
  razorpay
  paytm
}
```

### 3.4 Communication Models

```prisma
model CommunicationLog {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  channel       Channel
  recipient     String
  recipientName String
  subject       String
  body          String
  
  status        CommunicationStatus @default(sent)
  templateId    String?
  template      MessageTemplate? @relation(fields: [templateId], references: [id])
  
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  invoiceId     String?
  invoice       Invoice? @relation(fields: [invoiceId], references: [id])
  
  sentAt        DateTime @default(now())
  deliveredAt   DateTime?
  readAt        DateTime?
  
  createdAt     DateTime @default(now())
}

model MessageTemplate {
  id            String   @id @default(uuid())
  name          String
  channel       Channel
  subject       String
  body          String
  variables     Json     // string[]
  
  logs          CommunicationLog[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Channel {
  whatsapp
  email
  sms
}

enum CommunicationStatus {
  sent
  delivered
  read
  failed
}
```

### 3.5 Settings Models

```prisma
model CompanySettings {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  
  name          String
  legalName     String?
  gstNumber     String?
  panNumber     String?
  email         String
  phone         String?
  website       String?
  
  addressLine1  String?
  addressLine2  String?
  city          String?
  state         String?
  pincode       String?
  country       String   @default("India")
  
  logo          String?  // Cloudinary URL
  signature     String?  // Cloudinary URL
  primaryColor  String?
  footerText    String?
  showLogo      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model BankSettings {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  
  bankName      String?
  accountName   String?
  accountNumber String?
  ifsc          String?
  branch        String?
  upiId         String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model InvoiceSettings {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  
  prefix          String   @default("INV")
  nextNumber      Int      @default(1001)
  defaultTaxRate  Decimal  @default(18)
  defaultCurrency String   @default("INR")
  defaultTerms    String?
  defaultNotes    String?
  autoNumbering   Boolean  @default(true)
  paymentTerms    Int      @default(30) // days
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CommunicationSettings {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  
  whatsappEnabled Boolean  @default(false)
  emailEnabled    Boolean  @default(true)
  smsEnabled      Boolean  @default(false)
  
  email           String?
  whatsappNumber  String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model GatewaySettings {
  id                    String   @id @default(uuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id])
  
  razorpayKeyId         String?
  razorpayKeySecret     String?
  razorpayStatus        GatewayStatus @default(disconnected)
  
  paytmMerchantId       String?
  paytmMerchantKey      String?
  paytmStatus           GatewayStatus @default(disconnected)
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum GatewayStatus {
  connected
  disconnected
}
```

### 3.6 Module & Template Models

```prisma
model ModuleConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  label       String
  description String?
  enabled     Boolean  @default(true)
  icon        String
  roles       Json     // Role[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model InvoiceTemplate {
  id          String   @id @default(uuid())
  name        String
  type        TemplateType
  version     String
  content     String?  // Large text, stored separately
  config      Json?
  status      TemplateStatus @default(draft)
  isDefault   Boolean  @default(false)
  
  uploadedBy  String
  uploadedAt  DateTime
  
  versions    TemplateVersion[]
  userAssignments UserInvoiceTemplate[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TemplateVersion {
  id          String   @id @default(uuid())
  templateId  String
  template    InvoiceTemplate @relation(fields: [templateId], references: [id])
  version     String
  content     String?
  config      Json?
  uploadedBy  String
  uploadedAt  DateTime
  
  createdAt   DateTime @default(now())
}

model UserInvoiceTemplate {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  templateId  String?
  template    InvoiceTemplate? @relation(fields: [templateId], references: [id])
  
  isActive    Boolean  @default(true)
  assignedBy  String
  assignedAt  DateTime
  
  userEmail   String
  userName   String
  companyName String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum TemplateType {
  tsx
  html
  json
}

enum TemplateStatus {
  active
  disabled
  draft
}
```

### 3.7 Audit & Analytics Models

```prisma
model ActivityLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String
  entity      String
  entityId    String
  description String
  metadata    Json?
  
  createdAt   DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  userRole    Role
  action      AuditAction
  module      String
  entityId    String
  entityName  String
  description String
  ipAddress   String
  changes     Json?
  
  createdAt   DateTime @default(now())
}

enum AuditAction {
  create
  update
  delete
  login
  logout
  export
  settings
}

model ApiUsageLog {
  id          String   @id @default(uuid())
  date        DateTime @db.Date
  endpoint    String
  method      String
  requests    Int      @default(0)
  errors      Int      @default(0)
  avgResponseTime Int?
  
  createdAt   DateTime @default(now())
}

model StorageUsage {
  id          String   @id @default(uuid())
  userId      String?
  category    String
  usedBytes   BigInt
  totalBytes  BigInt
  
  updatedAt   DateTime @updatedAt
}

model ExternalIntegration {
  id              String   @id @default(uuid())
  name            String
  provider        IntegrationProvider
  description     String
  status          IntegrationStatus @default(disconnected)
  
  connectionName  String?
  apiUrl          String?
  username        String?
  password        String?
  apiKey          String?
  apiSecret       String?
  companyCode     String?
  
  syncCustomers   Boolean @default(false)
  syncInvoices    Boolean @default(false)
  syncProducts    Boolean @default(false)
  syncTaxes       Boolean @default(false)
  syncPayments    Boolean @default(false)
  syncChartData   Boolean @default(false)
  
  lastSyncAt      DateTime?
  nextSyncAt      DateTime?
  syncInterval    Int @default(3600) // seconds
  
  syncHistory     SyncHistory[]
  logs            IntegrationLog[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model SyncHistory {
  id              String   @id @default(uuid())
  integrationId   String
  integration     ExternalIntegration @relation(fields: [integrationId], references: [id])
  syncType        SyncType
  entityType      String
  status          SyncStatus
  recordsCount    Int
  errorMessage    String?
  startedAt       DateTime
  completedAt     DateTime?
  
  createdAt       DateTime @default(now())
}

model IntegrationLog {
  id              String   @id @default(uuid())
  integrationId   String
  integration     ExternalIntegration @relation(fields: [integrationId], references: [id])
  level           LogLevel
  message         String
  details         Json?
  
  createdAt       DateTime @default(now())
}

enum IntegrationProvider {
  tally
  busy
  zoho_books
  marg
  sap
  dynamics
  quickbooks
  xero
}

enum IntegrationStatus {
  connected
  disconnected
  error
  pending
}

enum SyncType {
  manual
  scheduled
}

enum SyncStatus {
  pending
  running
  completed
  failed
}

enum LogLevel {
  info
  warn
  error
}

model FileUpload {
  id          String   @id @default(uuid())
  userId      String
  filename    String
  originalName String
  mimeType    String
  size        BigInt
  url         String   // Cloudinary URL
  publicId    String   // Cloudinary ID
  resourceType String  // image, raw, video
  folder      String?
  
  createdAt   DateTime @default(now())
}
```

---

## 4. API Design

### 4.1 Response Format (Standardized)

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4.2 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Email/password login |
| POST | /api/auth/logout | Logout current session |
| POST | /api/auth/logout-all | Logout all sessions |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset with token |
| POST | /api/auth/verify-email | Verify email address |

### 4.3 User Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List users (pagination, filters) |
| GET | /api/users/:id | Get user details |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |
| PUT | /api/users/:id/suspend | Suspend user |
| PUT | /api/users/:id/activate | Activate user |
| GET | /api/users/:id/settings | Get user settings |

### 4.4 Customer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/customers | List customers |
| GET | /api/customers/:id | Get customer details |
| POST | /api/customers | Create customer |
| PUT | /api/customers/:id | Update customer |
| DELETE | /api/customers/:id | Delete customer |
| GET | /api/customers/:id/invoices | Get customer invoices |
| GET | /api/customers/:id/payments | Get customer payments |
| GET | /api/customers/:id/stats | Get customer statistics |

### 4.5 Invoice Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/invoices | List invoices |
| GET | /api/invoices/:id | Get invoice details |
| POST | /api/invoices | Create invoice |
| PUT | /api/invoices/:id | Update invoice |
| DELETE | /api/invoices/:id | Delete invoice |
| POST | /api/invoices/:id/duplicate | Duplicate invoice |
| PUT | /api/invoices/:id/status | Update status |
| GET | /api/invoices/number | Generate next number |
| POST | /api/invoices/:id/send | Send invoice via email |

### 4.6 Payment Link Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/payment-links | List payment links |
| GET | /api/payment-links/:id | Get link details |
| POST | /api/payment-links | Create payment link |
| DELETE | /api/payment-links/:id | Cancel/expire link |
| GET | /api/payment-links/public/:linkId | Public endpoint for payment |

### 4.7 Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/payments | List payments |
| GET | /api/payments/:id | Get payment details |
| POST | /api/payments | Record manual payment |
| POST | /api/payments/webhook/razorpay | Razorpay webhook |
| POST | /api/payments/webhook/paytm | Paytm webhook |

### 4.8 Settings Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings/company | Get company settings |
| PUT | /api/settings/company | Update company settings |
| POST | /api/settings/company/logo | Upload logo |
| POST | /api/settings/company/signature | Upload signature |
| GET | /api/settings/bank | Get bank settings |
| PUT | /api/settings/bank | Update bank settings |
| GET | /api/settings/invoice | Get invoice settings |
| PUT | /api/settings/invoice | Update invoice settings |
| GET | /api/settings/communication | Get comm settings |
| PUT | /api/settings/communication | Update comm settings |
| GET | /api/settings/gateways | Get gateway settings |
| PUT | /api/settings/gateways | Update gateway settings |

### 4.9 Dashboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/metrics | Get KPI metrics |
| GET | /api/dashboard/revenue-trend | Revenue chart data |
| GET | /api/dashboard/invoice-trend | Invoice chart data |
| GET | /api/dashboard/customer-growth | Customer growth data |
| GET | /api/dashboard/payment-distribution | Payment pie data |
| GET | /api/dashboard/recent-invoices | Recent invoices |
| GET | /api/dashboard/activity | Recent activity |

### 4.10 Reports Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/revenue | Revenue report |
| GET | /api/reports/invoices | Invoice report |
| GET | /api/reports/customers | Customer report |
| GET | /api/reports/payments | Payment report |
| GET | /api/reports/tax | Tax/GST report |
| GET | /api/reports/outstanding | Outstanding payments |
| GET | /api/reports/export | Export report (PDF/Excel/CSV) |

### 4.11 Communication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/communication/logs | List communication logs |
| GET | /api/communication/templates | List templates |
| POST | /api/communication/templates | Create template |
| PUT | /api/communication/templates/:id | Update template |
| DELETE | /api/communication/templates/:id | Delete template |
| POST | /api/communication/email | Send email |
| POST | /api/communication/whatsapp | Send WhatsApp |

### 4.12 Module Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/modules | List all modules |
| PUT | /api/modules/:key | Update module config |
| PUT | /api/modules/:key/toggle | Toggle enabled |

### 4.13 Invoice Templates Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/invoice-templates | List templates |
| GET | /api/invoice-templates/:id | Get template details |
| POST | /api/invoice-templates | Upload template |
| PUT | /api/invoice-templates/:id | Update template |
| DELETE | /api/invoice-templates/:id | Delete template |
| GET | /api/invoice-templates/:id/versions | Get versions |
| POST | /api/invoice-templates/:id/versions | Upload new version |
| PUT | /api/invoice-templates/:id/default | Set as default |
| GET | /api/user-templates | List user assignments |
| PUT | /api/user-templates/:userId | Assign template to user |

### 4.14 Audit Logs Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/audit-logs | List audit logs |
| GET | /api/audit-logs/:id | Get log details |

### 4.15 Usage Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/usage/api | API usage stats |
| GET | /api/usage/feature | Feature usage stats |
| GET | /api/usage/storage | Storage usage stats |
| GET | /api/usage/activity | User activity stats |

### 4.16 External Integration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/integrations | List integrations |
| GET | /api/integrations/:id | Get integration |
| PUT | /api/integrations/:id | Update config |
| POST | /api/integrations/:id/connect | Initiate connection |
| DELETE | /api/integrations/:id | Disconnect |
| POST | /api/integrations/:id/sync | Trigger sync |
| GET | /api/integrations/:id/history | Sync history |
| GET | /api/integrations/:id/logs | Integration logs |

---

## 5. Backend Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── index.ts           # App config
│   │   ├── database.ts        # Prisma client
│   │   ├── redis.ts           # Redis client
│   │   ├── cloudinary.ts      # Cloudinary config
│   │   └── email.ts           # SMTP/Resend config
│   │
│   ├── database/
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   │
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification
│   │   ├── rbac.ts           # Role/permission check
│   │   ├── rateLimit.ts      # Rate limiting
│   │   ├── validate.ts       # Zod validation
│   │   ├── errorHandler.ts   # Global error handler
│   │   ├── requestLogger.ts  # Request logging
│   │   └── audit.ts          # Audit logging
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── customer.controller.ts
│   │   ├── invoice.controller.ts
│   │   ├── paymentLink.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── settings.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── report.controller.ts
│   │   ├── communication.controller.ts
│   │   ├── module.controller.ts
│   │   ├── template.controller.ts
│   │   ├── audit.controller.ts
│   │   ├── usage.controller.ts
│   │   └── integration.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── customer.service.ts
│   │   ├── invoice.service.ts
│   │   ├── payment.service.ts
│   │   ├── paymentLink.service.ts
│   │   ├── settings.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── report.service.ts
│   │   ├── communication.service.ts
│   │   ├── template.service.ts
│   │   ├── audit.service.ts
│   │   ├── usage.service.ts
│   │   ├── integration.service.ts
│   │   └── file.service.ts
│   │
│   ├── repositories/
│   │   ├── user.repo.ts
│   │   ├── customer.repo.ts
│   │   ├── invoice.repo.ts
│   │   ├── payment.repo.ts
│   │   ├── paymentLink.repo.ts
│   │   ├── settings.repo.ts
│   │   ├── template.repo.ts
│   │   ├── audit.repo.ts
│   │   └── integration.repo.ts
│   │
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── customer.routes.ts
│   │   ├── invoice.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── settings.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── report.routes.ts
│   │   ├── communication.routes.ts
│   │   ├── module.routes.ts
│   │   ├── template.routes.ts
│   │   ├── audit.routes.ts
│   │   ├── usage.routes.ts
│   │   └── integration.routes.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   ├── customer.validator.ts
│   │   ├── invoice.validator.ts
│   │   ├── payment.validator.ts
│   │   ├── settings.validator.ts
│   │   └── common.validator.ts
│   │
│   ├── dto/
│   │   ├── auth.dto.ts
│   │   ├── user.dto.ts
│   │   ├── customer.dto.ts
│   │   ├── invoice.dto.ts
│   │   ├── payment.dto.ts
│   │   ├── settings.dto.ts
│   │   └── common.dto.ts
│   │
│   ├── interfaces/
│   │   ├── request.ts
│   │   ├── response.ts
│   │   └── services.ts
│   │
│   ├── helpers/
│   │   ├── password.ts
│   │   ├── token.ts
│   │   ├── pagination.ts
│   │   └── export.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   └── format.ts
│   │
│   ├── constants/
│   │   ├── errors.ts
│   │   ├── roles.ts
│   │   └── modules.ts
│   │
│   ├── socket/
│   │   ├── index.ts
│   │   └── handlers.ts
│   │
│   ├── jobs/
│   │   ├── index.ts
│   │   ├── queues/
│   │   │   ├── email.queue.ts
│   │   │   ├── whatsapp.queue.ts
│   │   │   ├── sync.queue.ts
│   │   │   └── report.queue.ts
│   │   └── processors/
│   │       ├── email.processor.ts
│   │       ├── whatsapp.processor.ts
│   │       ├── sync.processor.ts
│   │       └── report.processor.ts
│   │
│   ├── emails/
│   │   ├── index.ts
│   │   └── templates/
│   │       ├── password-reset.ts
│   │       ├── welcome.ts
│   │       ├── invoice.ts
│   │       └── notification.ts
│   │
│   ├── storage/
│   │   └── cloudinary.ts
│   │
│   ├── types/
│   │   └── index.d.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed/
│       └── index.ts
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 6. Authentication Flow

### 6.1 Login Flow

```
1. POST /api/auth/login { email, password, rememberMe }
2. Validate credentials
3. Generate access token (15 min expiry)
4. Generate refresh token (7 days or 30 days if rememberMe)
5. Create session record
6. Return: { accessToken, refreshToken, user }
7. Store tokens in frontend (localStorage/sessionStorage based on rememberMe)
```

### 6.2 Token Refresh Flow

```
1. Access token expires
2. Frontend catches 401
3. POST /api/auth/refresh { refreshToken }
4. Validate refresh token
5. Rotate: revoke old refresh, generate new access + refresh
6. Return: { accessToken, refreshToken }
7. Retry original request
```

### 6.3 Password Reset Flow

```
1. POST /api/auth/forgot-password { email }
2. Generate reset token (1 hour expiry)
3. Send email with reset link
4. POST /api/auth/reset-password { token, newPassword }
5. Validate token, hash password, update user
6. Invalidate all sessions for user
```

---

## 7. RBAC Implementation

### 7.1 Permission Structure

```typescript
type ModulePermission = {
  module: ModuleKey;
  actions: ('create' | 'read' | 'update' | 'delete')[];
};
```

### 7.2 Role Default Permissions

| Role | Dashboard | Customers | Invoices | Payments | Reports | Settings | Admin |
|------|-----------|-----------|----------|----------|----------|-----------|-------|
| admin | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| manager | CR | CRUD | CRUD | CRUD | CRUD | CRUD | - |
| staff | CR | CRUD | CRUD | CRUD | CR | R | - |
| business | CR | CRUD | CRUD | CRUD | CRUD | CRUD | - |
| viewer | R | R | R | R | R | - | - |

### 7.3 Middleware Usage

```typescript
router.post('/customers', 
  authenticate,
  checkPermission('customers', 'create'),
  validate(customerCreateSchema),
  customerController.create
);
```

---

## 8. Redis & BullMQ Usage

### 8.1 Redis Caching

- Dashboard metrics (5 min TTL)
- User sessions (refresh token TTL)
- Report aggregations (1 hour TTL)
- Rate limiting counters

### 8.2 BullMQ Queues

| Queue | Purpose | Retry |
|-------|---------|-------|
| email | Send emails (invoice, reset, notifications) | 3x |
| whatsapp | Send WhatsApp messages | 3x |
| sync | External integration sync | 5x exponential |
| report | Generate PDF/Excel exports | 2x |
| invoice-number | Auto-generate invoice numbers | 1x |

---

## 9. File Upload Strategy

### 9.1 Cloudinary Setup

- Folder structure: `invoicegen/{userId}/{type}`
- Types: logo, signature, invoice-document, template

### 9.2 Multer Configuration

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

## 10. Implementation Order (Modules)

### Phase 1: Foundation
1. **Module 1**: Project scaffold, Prisma, Docker, TypeScript, ESLint
2. **Module 2**: Authentication (JWT, Refresh, Sessions, Password Reset)

### Phase 2: Core Business
3. **Module 3**: User Management (CRUD, RBAC)
4. **Module 4**: Customers (CRUD, Addresses, Stats)
5. **Module 5**: Invoices (CRUD, Line Items, Numbering, Status)
6. **Module 6**: Payment Links (Create, Status, Expiry)
7. **Module 7**: Payments (Recording, Gateway mock)

### Phase 3: Configuration
8. **Module 8**: Settings (Company, Bank, Invoice, Communication, Gateways)
9. **Module 9**: Module Management (Feature flags)
10. **Module 10**: Dashboard (Metrics, Charts, Activity)

### Phase 4: Communication
11. **Module 11**: Communication (Email, WhatsApp, Templates, Logs)

### Phase 5: Reports
12. **Module 12**: Reports (6 report types, Export)

### Phase 6: Admin
13. **Module 13**: Invoice Templates (Upload, Versioning, Assignment)
14. **Module 14**: Audit Logs (Activity tracking)
15. **Module 15**: Usage Analytics (API, Storage stats)

### Phase 7: Integration
16. **Module 16**: External Integrations (Tally, Zoho, QuickBooks sync)
17. **Module 17**: File Management (Cloudinary, Uploads)

### Phase 8: Finalize
18. **Module 18**: Frontend Integration, Testing, Build Verification

---

## 11. Frontend Integration Points

### 11.1 Files to Replace

| Current | Replacement |
|---------|-------------|
| src/services/customerService.ts | API client + React Query hooks |
| src/services/invoiceService.ts | API client + React Query hooks |
| src/services/paymentService.ts | API client + React Query hooks |
| src/services/index.ts (comm) | API client + React Query hooks |
| src/store/authStore.ts | API auth + React Query |
| src/store/settingsStore.ts | API settings + React Query |
| src/store/moduleStore.ts | API modules + React Query |
| src/store/templateStore.ts | API templates + React Query |
| src/store/integrationStore.ts | API integrations + React Query |

### 11.2 New Files to Create

```
src/lib/
  api.ts           # Axios instance with interceptors
  auth-token.ts    # Token management

src/hooks/
  useAuth.ts       # Auth hook with React Query
  useCustomers.ts # Customer hooks
  useInvoices.ts   # Invoice hooks
  usePayments.ts   # Payment hooks
  useSettings.ts   # Settings hooks
  useDashboard.ts  # Dashboard hooks
  useReports.ts    # Report hooks
```

---

## 12. Verification Checklist

For each module:

- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] Frontend calls return correct data
- [ ] Pagination works correctly
- [ ] Filtering works correctly
- [ ] Sorting works correctly
- [ ] Error handling works
- [ ] Loading states display
- [ ] Authentication required
- [ ] RBAC enforced
- [ ] Audit logs recorded (for mutations)

---

## Approval Required

Before implementation begins, please confirm:

1. Database schema design is acceptable
2. API endpoints cover all frontend needs
3. Module implementation order is appropriate
4. Authentication flow is acceptable
5. RBAC approach is acceptable

Once approved, implementation will begin with Module 1 (Project Scaffold).
