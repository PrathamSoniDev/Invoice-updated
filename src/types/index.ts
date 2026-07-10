export type ID = string;

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
export type PaymentLinkStatus = 'pending' | 'paid' | 'failed' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type CommunicationChannel = 'whatsapp' | 'email' | 'sms';
export type CommunicationStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type UserRole = 'admin' | 'business' | 'manager' | 'staff' | 'viewer';
export type UserStatus = 'active' | 'suspended' | 'invited';
export type GatewayType = 'razorpay' | 'paytm';
export type GatewayStatus = 'connected' | 'disconnected';
export type ModuleKey =
  | 'dashboard'
  | 'customers'
  | 'invoices'
  | 'payment-links'
  | 'whatsapp'
  | 'email'
  | 'reports'
  | 'settings'
  | 'admin';

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  companyName?: string;
  lastActive?: string;
  createdAt: string;
  permissions: ModuleKey[];
  companyInfo?: CompanyInfo;
  bankInfo?: BankInfo;
}

export interface Customer {
  id: ID;
  name: string;
  businessName: string;
  gstNumber: string;
  email: string;
  mobile: string;
  whatsapp: string;
  billingAddress: Address;
  shippingAddress: Address;
  notes?: string;
  status: 'active' | 'inactive';
  totalInvoices: number;
  totalRevenue: number;
  outstandingAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface LineItem {
  id: ID;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  taxRate: number;
  amount: number;
}

export interface Invoice {
  id: ID;
  number: string;
  customerId: ID;
  customerName: string;
  customerEmail: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentLink {
  id: ID;
  linkId: string;
  customerId: ID;
  customerName: string;
  amount: number;
  currency: string;
  gateway: GatewayType;
  status: PaymentLinkStatus;
  url: string;
  expiryDate: string;
  createdAt: string;
  paidAt?: string;
  description?: string;
}

export interface Payment {
  id: ID;
  invoiceId: ID;
  invoiceNumber: string;
  customerId: ID;
  customerName: string;
  amount: number;
  method: 'card' | 'upi' | 'netbanking' | 'wallet' | 'cash' | 'cheque';
  status: PaymentStatus;
  gateway?: GatewayType;
  transactionId: string;
  date: string;
}

export interface CommunicationLog {
  id: ID;
  channel: CommunicationChannel;
  recipient: string;
  recipientName: string;
  subject: string;
  body: string;
  status: CommunicationStatus;
  templateId?: ID;
  templateName?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  relatedTo?: { type: 'invoice' | 'payment' | 'customer'; id: ID };
}

export interface MessageTemplate {
  id: ID;
  name: string;
  channel: CommunicationChannel;
  subject: string;
  body: string;
  variables: string[];
  createdAt: string;
}

export interface ActivityLog {
  id: ID;
  userId: ID;
  userName: string;
  action: string;
  entity: string;
  entityId: ID;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: ID;
  userId: ID;
  userName: string;
  userRole: UserRole;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'settings';
  module: string;
  entityId: ID;
  entityName: string;
  description: string;
  ipAddress: string;
  timestamp: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface CompanyInfo {
  name: string;
  legalName: string;
  gstNumber: string;
  panNumber: string;
  email: string;
  phone: string;
  website: string;
  address: Address;
  logo?: string;
  signature?: string;
  primaryColor?: string;
  footerText?: string;
  showLogo?: boolean;
}

export interface BankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
}

export interface InvoiceSettings {
  prefix: string;
  nextNumber: number;
  defaultTaxRate: number;
  defaultCurrency: string;
  defaultTerms: string;
  defaultNotes: string;
  autoNumbering: boolean;
  paymentTerms: number;
}

export interface CommunicationSettings {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  email: string;
  whatsappNumber: string;
}

export interface GatewaySettings {
  razorpay: {
    status: GatewayStatus;
  };
  paytm: {
    status: GatewayStatus;
  };
}

export interface ModuleConfig {
  key: ModuleKey;
  label: string;
  description: string;
  enabled: boolean;
  icon: string;
  roles: UserRole[];
}

export interface DashboardMetrics {
  totalInvoices: number;
  totalCustomers: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  totalPaymentLinks: number;
  successfulPayments: number;
  failedPayments: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  paid: number;
  pending: number;
}

export interface InvoiceTrendPoint {
  month: string;
  created: number;
  paid: number;
  overdue: number;
}

export interface CustomerGrowthPoint {
  month: string;
  total: number;
  new: number;
}

export interface PaymentDistributionPoint {
  name: string;
  value: number;
  color: string;
}

export interface ApiUsagePoint {
  date: string;
  requests: number;
  errors: number;
}

export interface FeatureUsagePoint {
  feature: string;
  usage: number;
}

export interface StorageUsagePoint {
  category: string;
  used: number;
  total: number;
}

// ========== INVOICE TEMPLATES ==========
export type TemplateType = 'tsx' | 'html' | 'json';
export type TemplateStatus = 'active' | 'disabled' | 'draft';

export interface InvoiceTemplate {
  id: ID;
  name: string;
  type: TemplateType;
  version: string;
  content?: string;
  config?: Record<string, unknown>;
  status: TemplateStatus;
  isDefault: boolean;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: ID;
  templateId: ID;
  version: string;
  content?: string;
  config?: Record<string, unknown>;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
}

export interface UserInvoiceTemplate {
  id: ID;
  userId: string;
  userEmail: string;
  userName: string;
  companyName?: string;
  templateId: ID | null;
  isActive: boolean;
  assignedAt: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ========== EXTERNAL INTEGRATIONS ==========
export type IntegrationProvider =
  | 'tally'
  | 'busy'
  | 'zoho_books'
  | 'marg'
  | 'sap'
  | 'dynamics'
  | 'quickbooks'
  | 'xero';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface ExternalIntegration {
  id: ID;
  name: string;
  provider: IntegrationProvider;
  description: string;
  status: IntegrationStatus;
  config: {
    connectionName?: string;
    apiUrl?: string;
    username?: string;
    companyCode?: string;
  };
  syncOptions: {
    customers: boolean;
    invoices: boolean;
    products: boolean;
    taxes: boolean;
    payments: boolean;
    chartOfAccounts: boolean;
  };
  lastSyncAt?: string;
  nextSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationLog {
  id: ID;
  integrationId: ID;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface SyncHistory {
  id: ID;
  integrationId: ID;
  syncType: 'manual' | 'scheduled';
  entityType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsCount: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}


// ========== NOTIFICATIONS ==========

export type NotificationType =
  | "payment_received"
  | "invoice_paid"
  | "invoice_overdue"
  | "customer_created"
  | "payment_failed"
  | "settings_updated";

export interface Notification {
  id: ID;
  companyId: ID;
  userId?: ID;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  data?: Record<string, unknown>;
}
