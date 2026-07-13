DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN','MANAGER','STAFF','BUSINESS','VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','SUSPENDED','INVITED','INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','SENT','VIEWED','PAID','OVERDUE','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentLinkStatus" AS ENUM ('PENDING','PAID','FAILED','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PAID','FAILED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CARD','UPI','NETBANKING','WALLET','CASH','CHEQUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayType" AS ENUM ('RAZORPAY','PAYTM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayStatus" AS ENUM ('CONNECTED','DISCONNECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CommunicationChannel" AS ENUM ('WHATSAPP','EMAIL','SMS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CommunicationStatus" AS ENUM ('PENDING','SENT','DELIVERED','READ','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TemplateType" AS ENUM ('TSX','HTML','JSON');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TemplateStatus" AS ENUM ('ACTIVE','DISABLED','DRAFT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ModuleKey" AS ENUM ('DASHBOARD','CUSTOMERS','INVOICES','PAYMENT_LINKS','WHATSAPP','EMAIL','REPORTS','SETTINGS','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "IntegrationProvider" AS ENUM ('TALLY','BUSY','ZOHO_BOOKS','MARG','SAP','DYNAMICS','QUICKBOOKS','XERO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED','DISCONNECTED','ERROR','PENDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SyncStatus" AS ENUM ('PENDING','RUNNING','COMPLETED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','SETTINGS','VIEW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaxType" AS ENUM ('GST','CGST','SGST','IGST','CESS','TDS','TCS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE','FIXED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE','INACTIVE','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CreditDebitNoteStatus" AS ENUM ('DRAFT','ISSUED','APPLIED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- COMPANIES

CREATE TABLE IF NOT EXISTS companies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  "legalName"         text NOT NULL,
  "gstNumber"         text,
  "panNumber"         text,
  email               text NOT NULL,
  phone               text,
  website             text,
  "addressLine1"      text NOT NULL DEFAULT '',
  "addressLine2"      text,
  city                text NOT NULL DEFAULT '',
  state               text NOT NULL DEFAULT '',
  pincode             text NOT NULL DEFAULT '',
  country             text NOT NULL DEFAULT 'India',
  logo                text,
  signature           text,
  "primaryColor"      text,
  "footerText"        text,
  "showLogo"          boolean NOT NULL DEFAULT true,
  "isActive"          boolean NOT NULL DEFAULT true,
  "subscriptionStatus" text,
  "subscriptionExpiry" timestamptz,
  "createdAt"         timestamptz NOT NULL DEFAULT now(),
  "updatedAt"         timestamptz NOT NULL DEFAULT now(),
  "deletedAt"         timestamptz
);
CREATE INDEX IF NOT EXISTS idx_companies_gst ON companies("gstNumber");
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies("isActive");
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_companies" ON companies;
CREATE POLICY "service_all_companies" ON companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- USERS

CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"         uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                text NOT NULL,
  email               text NOT NULL,
  "emailVerified"     boolean NOT NULL DEFAULT false,
  "emailVerifiedAt"   timestamptz,
  "passwordHash"      text NOT NULL,
  phone               text,
  avatar              text,
  role                "UserRole" NOT NULL DEFAULT 'STAFF',
  status              "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  permissions         jsonb NOT NULL DEFAULT '[]',
  "lastActiveAt"      timestamptz,
  "lastLoginAt"       timestamptz,
  "loginCount"        integer NOT NULL DEFAULT 0,
  "failedLoginCount"  integer NOT NULL DEFAULT 0,
  "lockedUntil"       timestamptz,
  "createdAt"         timestamptz NOT NULL DEFAULT now(),
  "updatedAt"         timestamptz NOT NULL DEFAULT now(),
  "deletedAt"         timestamptz,
  UNIQUE("companyId", email)
);
CREATE INDEX IF NOT EXISTS idx_users_company ON users("companyId");
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_users" ON users;
CREATE POLICY "service_all_users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- SESSIONS & AUTH TOKENS

CREATE TABLE IF NOT EXISTS sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "tokenHash"     text NOT NULL UNIQUE,
  "userAgent"     text,
  "ipAddress"     text,
  "deviceId"      text,
  "expiresAt"     timestamptz NOT NULL,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "lastActivity"  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions("tokenHash");
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions("expiresAt");
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_sessions" ON sessions;
CREATE POLICY "service_all_sessions" ON sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "tokenHash" text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  revoked     boolean NOT NULL DEFAULT false,
  "revokedAt" timestamptz,
  "replacedBy" text,
  "deviceId"  text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rt_user ON refresh_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_rt_token ON refresh_tokens("tokenHash");
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_rt" ON refresh_tokens;
CREATE POLICY "service_all_rt" ON refresh_tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "usedAt"    timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens("userId");
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_prt" ON password_reset_tokens;
CREATE POLICY "service_all_prt" ON password_reset_tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"          uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme             text NOT NULL DEFAULT 'system',
  language          text NOT NULL DEFAULT 'en',
  timezone          text NOT NULL DEFAULT 'Asia/Kolkata',
  notifications     jsonb NOT NULL DEFAULT '{}',
  "dashboardLayout" jsonb,
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_us" ON user_settings;
CREATE POLICY "service_all_us" ON user_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS account_security (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"                uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "loginAttempts"         integer NOT NULL DEFAULT 0,
  "lockedUntil"           timestamptz,
  "passwordChangedAt"     timestamptz,
  "twoFactorEnabled"      boolean NOT NULL DEFAULT false,
  "twoFactorSecret"       text,
  "twoFactorBackupCodes"  jsonb,
  "securityQuestions"     jsonb,
  "createdAt"             timestamptz NOT NULL DEFAULT now(),
  "updatedAt"             timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE account_security ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_as" ON account_security;
CREATE POLICY "service_all_as" ON account_security FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS trusted_devices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "deviceHash" text NOT NULL,
  "deviceName" text,
  "deviceType" text,
  browser     text,
  os          text,
  "ipAddress" text,
  "userAgent" text,
  "trustedAt" timestamptz NOT NULL DEFAULT now(),
  "lastSeenAt" timestamptz NOT NULL DEFAULT now(),
  "isActive"  boolean NOT NULL DEFAULT true,
  UNIQUE("userId","deviceHash")
);
CREATE INDEX IF NOT EXISTS idx_td_user ON trusted_devices("userId");
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_td" ON trusted_devices;
CREATE POLICY "service_all_td" ON trusted_devices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- COMPANY SETTINGS

CREATE TABLE IF NOT EXISTS bank_info (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  "bankName"      text NOT NULL,
  "accountName"   text NOT NULL,
  "accountNumber" text NOT NULL,
  ifsc            text NOT NULL,
  branch          text,
  "upiId"         text,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bank_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_bi" ON bank_info;
CREATE POLICY "service_all_bi" ON bank_info FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS invoice_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"       uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  prefix            text NOT NULL DEFAULT 'INV',
  "nextNumber"      integer NOT NULL DEFAULT 1001,
  "defaultTaxRate"  decimal(10,2) NOT NULL DEFAULT 18,
  "defaultCurrency" text NOT NULL DEFAULT 'INR',
  "defaultTerms"    text,
  "defaultNotes"    text,
  "autoNumbering"   boolean NOT NULL DEFAULT true,
  "paymentTerms"    integer NOT NULL DEFAULT 30,
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_is" ON invoice_settings;
CREATE POLICY "service_all_is" ON invoice_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS communication_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"         uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  "whatsappEnabled"   boolean NOT NULL DEFAULT false,
  "emailEnabled"      boolean NOT NULL DEFAULT true,
  "smsEnabled"        boolean NOT NULL DEFAULT false,
  email               text,
  "whatsappNumber"    text,
  "autoSendInvoice"   boolean NOT NULL DEFAULT false,
  "autoSendReminder"  boolean NOT NULL DEFAULT false,
  "reminderDays"      integer NOT NULL DEFAULT 3,
  "createdAt"         timestamptz NOT NULL DEFAULT now(),
  "updatedAt"         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE communication_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_cs" ON communication_settings;
CREATE POLICY "service_all_cs" ON communication_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS gateway_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"         uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  "razorpayEnabled"   boolean NOT NULL DEFAULT false,
  "razorpayKeyId"     text,
  "razorpayKeySecret" text,
  "razorpayWebhook"   text,
  "paytmEnabled"      boolean NOT NULL DEFAULT false,
  "paytmMerchantId"   text,
  "paytmMerchantKey"  text,
  "paytmEnvironment"  text DEFAULT 'TEST',
  "createdAt"         timestamptz NOT NULL DEFAULT now(),
  "updatedAt"         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gateway_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_gs" ON gateway_settings;
CREATE POLICY "service_all_gs" ON gateway_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS company_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  "dateFormat"    text NOT NULL DEFAULT 'DD/MM/YYYY',
  "timeFormat"    text NOT NULL DEFAULT '12h',
  timezone        text NOT NULL DEFAULT 'Asia/Kolkata',
  currency        text NOT NULL DEFAULT 'INR',
  language        text NOT NULL DEFAULT 'en',
  "fiscalYearStart" integer NOT NULL DEFAULT 4,
  "features"      jsonb NOT NULL DEFAULT '{}',
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_cset" ON company_settings;
CREATE POLICY "service_all_cset" ON company_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- CUSTOMERS

CREATE TABLE IF NOT EXISTS customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              text NOT NULL,
  "businessName"    text NOT NULL DEFAULT '',
  "gstNumber"       text,
  email             text NOT NULL,
  mobile            text NOT NULL DEFAULT '',
  whatsapp          text,
  notes             text,
  status            text NOT NULL DEFAULT 'ACTIVE',
  "billingLine1"    text NOT NULL DEFAULT '',
  "billingLine2"    text,
  "billingCity"     text NOT NULL DEFAULT '',
  "billingState"    text NOT NULL DEFAULT '',
  "billingPincode"  text NOT NULL DEFAULT '',
  "billingCountry"  text NOT NULL DEFAULT 'India',
  "shippingLine1"   text,
  "shippingLine2"   text,
  "shippingCity"    text,
  "shippingState"   text,
  "shippingPincode" text,
  "shippingCountry" text,
  "totalInvoices"   integer NOT NULL DEFAULT 0,
  "totalRevenue"    decimal(10,2) NOT NULL DEFAULT 0,
  "outstandingAmount" decimal(10,2) NOT NULL DEFAULT 0,
  "createdById"     uuid REFERENCES users(id),
  "updatedById"     uuid REFERENCES users(id),
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now(),
  "deletedAt"       timestamptz
);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers("companyId");
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_cust" ON customers;
CREATE POLICY "service_all_cust" ON customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- INVOICES

CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "customerId"    uuid NOT NULL REFERENCES customers(id),
  number          text NOT NULL,
  status          "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issueDate"     timestamptz NOT NULL DEFAULT now(),
  "dueDate"       timestamptz NOT NULL,
  subtotal        decimal(10,2) NOT NULL,
  "taxAmount"     decimal(10,2) NOT NULL,
  "discountAmount" decimal(10,2) NOT NULL DEFAULT 0,
  total           decimal(10,2) NOT NULL,
  "amountPaid"    decimal(10,2) NOT NULL DEFAULT 0,
  balance         decimal(10,2) NOT NULL,
  notes           text,
  terms           text,
  "sentAt"        timestamptz,
  "viewedAt"      timestamptz,
  "paidAt"        timestamptz,
  "cancelledAt"   timestamptz,
  "createdById"   uuid REFERENCES users(id),
  "updatedById"   uuid REFERENCES users(id),
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now(),
  "deletedAt"     timestamptz,
  UNIQUE("companyId", number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices("companyId");
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices("customerId");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices("dueDate");
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_inv" ON invoices;
CREATE POLICY "service_all_inv" ON invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId" uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  "hsnCode"   text,
  quantity    decimal(10,2) NOT NULL,
  rate        decimal(10,2) NOT NULL,
  discount    decimal(10,2) NOT NULL DEFAULT 0,
  "taxRate"   decimal(10,2) NOT NULL DEFAULT 0,
  amount      decimal(10,2) NOT NULL,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_items_invoice ON invoice_items("invoiceId");
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_ii" ON invoice_items;
CREATE POLICY "service_all_ii" ON invoice_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS invoice_taxes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId"     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  "taxType"       "TaxType" NOT NULL,
  "taxRate"       decimal(10,2) NOT NULL,
  "taxableAmount" decimal(10,2) NOT NULL,
  "taxAmount"     decimal(10,2) NOT NULL,
  "createdAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_taxes_invoice ON invoice_taxes("invoiceId");
ALTER TABLE invoice_taxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_it" ON invoice_taxes;
CREATE POLICY "service_all_it" ON invoice_taxes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS invoice_activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId" uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  "userId"    uuid,
  action      text NOT NULL,
  description text NOT NULL,
  metadata    jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_act_invoice ON invoice_activities("invoiceId");
ALTER TABLE invoice_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_ia" ON invoice_activities;
CREATE POLICY "service_all_ia" ON invoice_activities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- PAYMENT LINKS

CREATE TABLE IF NOT EXISTS payment_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "customerId"    uuid NOT NULL REFERENCES customers(id),
  "invoiceId"     uuid REFERENCES invoices(id),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  description     text,
  amount          decimal(10,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'INR',
  status          "PaymentLinkStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt"     timestamptz,
  "maxPayments"   integer,
  "paymentCount"  integer NOT NULL DEFAULT 0,
  "gateway"       "GatewayType",
  "gatewayLinkId" text,
  "gatewayLinkUrl" text,
  metadata        jsonb,
  "createdById"   uuid REFERENCES users(id),
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now(),
  "deletedAt"     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_pl_company ON payment_links("companyId");
CREATE INDEX IF NOT EXISTS idx_pl_customer ON payment_links("customerId");
CREATE INDEX IF NOT EXISTS idx_pl_slug ON payment_links(slug);
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_pl" ON payment_links;
CREATE POLICY "service_all_pl" ON payment_links FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- PAYMENTS

CREATE TABLE IF NOT EXISTS payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"       uuid NOT NULL REFERENCES companies(id),
  "invoiceId"       uuid REFERENCES invoices(id),
  "paymentLinkId"   uuid REFERENCES payment_links(id),
  "customerId"      uuid NOT NULL REFERENCES customers(id),
  amount            decimal(10,2) NOT NULL,
  method            "PaymentMethod" NOT NULL,
  status            "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  gateway           "GatewayType",
  "transactionId"   text NOT NULL UNIQUE,
  "gatewayResponse" jsonb,
  date              timestamptz NOT NULL DEFAULT now(),
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pay_company ON payments("companyId");
CREATE INDEX IF NOT EXISTS idx_pay_invoice ON payments("invoiceId");
CREATE INDEX IF NOT EXISTS idx_pay_customer ON payments("customerId");
CREATE INDEX IF NOT EXISTS idx_pay_date ON payments(date);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_pay" ON payments;
CREATE POLICY "service_all_pay" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- COMMUNICATION

CREATE TABLE IF NOT EXISTS message_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  channel     "CommunicationChannel" NOT NULL,
  subject     text,
  body        text NOT NULL,
  variables   jsonb NOT NULL DEFAULT '[]',
  "isDefault" boolean NOT NULL DEFAULT false,
  "isActive"  boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mt_company ON message_templates("companyId");
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_mt" ON message_templates;
CREATE POLICY "service_all_mt" ON message_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS communication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL REFERENCES companies(id),
  channel         "CommunicationChannel" NOT NULL,
  recipient       text NOT NULL,
  "recipientName" text NOT NULL,
  subject         text NOT NULL,
  body            text NOT NULL,
  status          "CommunicationStatus" NOT NULL DEFAULT 'PENDING',
  "templateId"    uuid REFERENCES message_templates(id),
  "templateName"  text,
  "sentAt"        timestamptz,
  "deliveredAt"   timestamptz,
  "readAt"        timestamptz,
  "failedReason"  text,
  "relatedType"   text,
  "relatedId"     text,
  "customerId"    uuid REFERENCES customers(id),
  "createdAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cl_company ON communication_logs("companyId");
CREATE INDEX IF NOT EXISTS idx_cl_channel ON communication_logs(channel);
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_cl" ON communication_logs;
CREATE POLICY "service_all_cl" ON communication_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- INVOICE TEMPLATES

CREATE TABLE IF NOT EXISTS invoice_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  type            "TemplateType" NOT NULL DEFAULT 'HTML',
  status          "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
  content         text NOT NULL DEFAULT '',
  thumbnail       text,
  "isDefault"     boolean NOT NULL DEFAULT false,
  "isPublic"      boolean NOT NULL DEFAULT false,
  version         integer NOT NULL DEFAULT 1,
  tags            jsonb NOT NULL DEFAULT '[]',
  "uploadedById"  uuid REFERENCES users(id),
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now(),
  "deletedAt"     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tmpl_company ON invoice_templates("companyId");
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_tmpl" ON invoice_templates;
CREATE POLICY "service_all_tmpl" ON invoice_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS template_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateId" uuid NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,
  version     integer NOT NULL,
  content     text NOT NULL,
  "changedBy" uuid REFERENCES users(id),
  "changeNote" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tv_template ON template_versions("templateId");
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_tv" ON template_versions;
CREATE POLICY "service_all_tv" ON template_versions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_invoice_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "userId"        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "templateId"    uuid NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,
  "isDefault"     boolean NOT NULL DEFAULT false,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  UNIQUE("userId","templateId")
);
ALTER TABLE user_invoice_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_uit" ON user_invoice_templates;
CREATE POLICY "service_all_uit" ON user_invoice_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ACTIVITY & AUDIT LOGS

CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL,
  "userId"    uuid REFERENCES users(id),
  action      text NOT NULL,
  description text NOT NULL,
  "entityType" text,
  "entityId"  text,
  metadata    jsonb,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_al_company ON activity_logs("companyId");
CREATE INDEX IF NOT EXISTS idx_al_user ON activity_logs("userId");
CREATE INDEX IF NOT EXISTS idx_al_created ON activity_logs("createdAt");
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_actlog" ON activity_logs;
CREATE POLICY "service_all_actlog" ON activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"   uuid NOT NULL,
  "userId"      uuid REFERENCES users(id),
  action        "AuditAction" NOT NULL,
  "entityType"  text NOT NULL,
  "entityId"    text,
  "oldValues"   jsonb,
  "newValues"   jsonb,
  "ipAddress"   text,
  "userAgent"   text,
  "createdAt"   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aud_company ON audit_logs("companyId");
CREATE INDEX IF NOT EXISTS idx_aud_user ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_aud_entity ON audit_logs("entityType","entityId");
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_audlog" ON audit_logs;
CREATE POLICY "service_all_audlog" ON audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- MODULES

CREATE TABLE IF NOT EXISTS module_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module      "ModuleKey" NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  settings    jsonb NOT NULL DEFAULT '{}',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("companyId", module)
);
CREATE INDEX IF NOT EXISTS idx_mc_company ON module_configs("companyId");
ALTER TABLE module_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_mc" ON module_configs;
CREATE POLICY "service_all_mc" ON module_configs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- INTEGRATIONS

CREATE TABLE IF NOT EXISTS external_integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider      "IntegrationProvider" NOT NULL,
  status        "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
  config        jsonb NOT NULL DEFAULT '{}',
  credentials   jsonb,
  "lastSyncAt"  timestamptz,
  "syncStatus"  "SyncStatus",
  "syncError"   text,
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL DEFAULT now(),
  UNIQUE("companyId", provider)
);
CREATE INDEX IF NOT EXISTS idx_ei_company ON external_integrations("companyId");
ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_ei" ON external_integrations;
CREATE POLICY "service_all_ei" ON external_integrations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- REPORTS

CREATE TABLE IF NOT EXISTS saved_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}',
  "scheduleEnabled" boolean NOT NULL DEFAULT false,
  "scheduleConfig" jsonb,
  "lastRunAt" timestamptz,
  "createdById" uuid REFERENCES users(id),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sr_company ON saved_reports("companyId");
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_sr" ON saved_reports;
CREATE POLICY "service_all_sr" ON saved_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS export_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "userId"    uuid REFERENCES users(id),
  type        text NOT NULL,
  format      text NOT NULL,
  status      text NOT NULL DEFAULT 'PENDING',
  "fileUrl"   text,
  "fileSize"  integer,
  config      jsonb,
  error       text,
  "completedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eh_company ON export_history("companyId");
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_eh" ON export_history;
CREATE POLICY "service_all_eh" ON export_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- NOTIFICATIONS

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "userId"    uuid REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  message     text NOT NULL,
  "isRead"    boolean NOT NULL DEFAULT false,
  "readAt"    timestamptz,
  data        jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_company ON notifications("companyId");
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications("userId");
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_notif" ON notifications;
CREATE POLICY "service_all_notif" ON notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- API KEYS

CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  "keyHash"   text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '[]',
  "isActive"  boolean NOT NULL DEFAULT true,
  "lastUsedAt" timestamptz,
  "expiresAt" timestamptz,
  "createdById" uuid REFERENCES users(id),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ak_company ON api_keys("companyId");
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_ak" ON api_keys;
CREATE POLICY "service_all_ak" ON api_keys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- TAX CONFIGURATIONS

CREATE TABLE IF NOT EXISTS tax_configurations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        "TaxType" NOT NULL,
  rate        decimal(10,2) NOT NULL,
  "isDefault" boolean NOT NULL DEFAULT false,
  "isActive"  boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tc_company ON tax_configurations("companyId");
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_tc" ON tax_configurations;
CREATE POLICY "service_all_tc" ON tax_configurations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- COUPONS

CREATE TABLE IF NOT EXISTS coupons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code              text NOT NULL,
  "discountType"    "DiscountType" NOT NULL,
  "discountValue"   decimal(10,2) NOT NULL,
  status            "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
  "usageLimit"      integer,
  "usageCount"      integer NOT NULL DEFAULT 0,
  "minOrderAmount"  decimal(10,2),
  "expiresAt"       timestamptz,
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now(),
  UNIQUE("companyId", code)
);
CREATE INDEX IF NOT EXISTS idx_coupon_company ON coupons("companyId");
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_coupon" ON coupons;
CREATE POLICY "service_all_coupon" ON coupons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- RECURRING INVOICES

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "customerId"    uuid NOT NULL REFERENCES customers(id),
  frequency       "RecurringFrequency" NOT NULL DEFAULT 'MONTHLY',
  "nextRunAt"     timestamptz NOT NULL,
  "lastRunAt"     timestamptz,
  "isActive"      boolean NOT NULL DEFAULT true,
  template        jsonb NOT NULL DEFAULT '{}',
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ri_company ON recurring_invoices("companyId");
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_all_ri" ON recurring_invoices;
CREATE POLICY "service_all_ri" ON recurring_invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
