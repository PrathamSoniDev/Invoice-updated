/*
# InvoiceGen Enterprise Demo Data Seed - Part 2: Company Settings
*/

DO $$
DECLARE
  c_id uuid[];
BEGIN

-- Get all company IDs
SELECT array_agg(id ORDER BY "createdAt") INTO c_id FROM companies;

-- ============================================
-- BANK INFO (UPSERT)
-- ============================================

INSERT INTO bank_info ("companyId", "bankName", "accountName", "accountNumber", ifsc, branch, "upiId")
SELECT
  id,
  CASE 
    WHEN array_position(c_id, id) = 1 THEN 'HDFC Bank'
    WHEN array_position(c_id, id) = 2 THEN 'ICICI Bank'
    WHEN array_position(c_id, id) = 3 THEN 'State Bank of India'
    WHEN array_position(c_id, id) = 4 THEN 'Axis Bank'
    ELSE 'Kotak Mahindra Bank'
  END,
  name || ' Pvt Ltd',
  CASE 
    WHEN array_position(c_id, id) = 1 THEN '50100234567890'
    WHEN array_position(c_id, id) = 2 THEN '012345678910'
    WHEN array_position(c_id, id) = 3 THEN '3456789012345'
    WHEN array_position(c_id, id) = 4 THEN '901234567890'
    ELSE '7890123456789'
  END,
  CASE 
    WHEN array_position(c_id, id) = 1 THEN 'HDFC0001234'
    WHEN array_position(c_id, id) = 2 THEN 'ICIC0002345'
    WHEN array_position(c_id, id) = 3 THEN 'SBIN0003456'
    WHEN array_position(c_id, id) = 4 THEN 'UTIB0004567'
    ELSE 'KKBK0005678'
  END,
  CASE 
    WHEN array_position(c_id, id) = 1 THEN 'Andheri East, Mumbai'
    WHEN array_position(c_id, id) = 2 THEN 'Electronic City, Bangalore'
    WHEN array_position(c_id, id) = 3 THEN 'Guindy, Chennai'
    WHEN array_position(c_id, id) = 4 THEN 'DLF Phase 3, Gurugram'
    ELSE 'SG Highway, Ahmedabad'
  END,
  CASE 
    WHEN array_position(c_id, id) = 1 THEN 'selltech@hdfcbank'
    WHEN array_position(c_id, id) = 2 THEN 'acmetech@icici'
    WHEN array_position(c_id, id) = 3 THEN 'abcmfg@sbi'
    WHEN array_position(c_id, id) = 4 THEN 'nextgen@axisbank'
    ELSE 'globalretail@kotak'
  END
FROM companies
ON CONFLICT ("companyId") DO UPDATE SET
  "bankName" = EXCLUDED."bankName",
  "accountName" = EXCLUDED."accountName",
  "accountNumber" = EXCLUDED."accountNumber",
  ifsc = EXCLUDED.ifsc,
  branch = EXCLUDED.branch,
  "upiId" = EXCLUDED."upiId";

-- ============================================
-- INVOICE SETTINGS (UPSERT)
-- ============================================

INSERT INTO invoice_settings ("companyId", prefix, "nextNumber", "defaultTaxRate", "defaultCurrency", "defaultTerms", "defaultNotes", "autoNumbering", "paymentTerms")
SELECT
  id,
  CASE 
    WHEN array_position(c_id, id) = 1 THEN 'STI'
    WHEN array_position(c_id, id) = 2 THEN 'ACM'
    WHEN array_position(c_id, id) = 3 THEN 'ABC'
    WHEN array_position(c_id, id) = 4 THEN 'NGS'
    ELSE 'GRI'
  END,
  1101,
  18.00,
  'INR',
  CASE 
    WHEN array_position(c_id, id) = 1 THEN 'Net 30 days. Late payments subject to interest at 2% per month.'
    WHEN array_position(c_id, id) = 2 THEN 'Payment due within 15 days. Goods once sold will not be taken back.'
    WHEN array_position(c_id, id) = 3 THEN 'Payment terms: 30 days from invoice date.'
    WHEN array_position(c_id, id) = 4 THEN 'Due on receipt. GST included as applicable.'
    ELSE 'Net 30 days. E.&O.E.'
  END,
  'Thank you for your business!',
  true,
  CASE 
    WHEN array_position(c_id, id) = 4 THEN 0
    WHEN array_position(c_id, id) = 2 THEN 15
    ELSE 30
  END
FROM companies
ON CONFLICT ("companyId") DO UPDATE SET
  prefix = EXCLUDED.prefix,
  "nextNumber" = EXCLUDED."nextNumber",
  "defaultTaxRate" = EXCLUDED."defaultTaxRate",
  "defaultTerms" = EXCLUDED."defaultTerms",
  "defaultNotes" = EXCLUDED."defaultNotes",
  "paymentTerms" = EXCLUDED."paymentTerms";

-- ============================================
-- COMMUNICATION SETTINGS (UPSERT)
-- ============================================

INSERT INTO communication_settings ("companyId", "whatsappEnabled", "emailEnabled", "smsEnabled", email, "whatsappNumber", "autoSendInvoice", "autoSendReminder", "reminderDays")
SELECT
  id,
  array_position(c_id, id) != 3,
  true,
  array_position(c_id, id) IN (2, 5),
  'billing@company' || array_position(c_id, id)::text || '.com',
  CASE WHEN array_position(c_id, id) != 3 THEN '+91-98765432' || array_position(c_id, id)::text ELSE NULL END,
  array_position(c_id, id) != 3,
  true,
  CASE 
    WHEN array_position(c_id, id) = 1 THEN 7
    WHEN array_position(c_id, id) = 2 THEN 5
    WHEN array_position(c_id, id) = 3 THEN 10
    WHEN array_position(c_id, id) = 4 THEN 3
    ELSE 7
  END
FROM companies
ON CONFLICT ("companyId") DO UPDATE SET
  "whatsappEnabled" = EXCLUDED."whatsappEnabled",
  "smsEnabled" = EXCLUDED."smsEnabled",
  email = EXCLUDED.email,
  "whatsappNumber" = EXCLUDED."whatsappNumber",
  "autoSendInvoice" = EXCLUDED."autoSendInvoice",
  "reminderDays" = EXCLUDED."reminderDays";

-- ============================================
-- GATEWAY SETTINGS (UPSERT)
-- ============================================

INSERT INTO gateway_settings ("companyId", "razorpayEnabled", "razorpayKeyId", "razorpayKeySecret", "razorpayWebhook", "paytmEnabled", "paytmMerchantId", "paytmMerchantKey", "paytmEnvironment")
SELECT
  id,
  true,
  'rzp_live_DEMO_KEY_' || lpad(array_position(c_id, id)::text, 3, '0'),
  'DEMO_SECRET_' || lpad(array_position(c_id, id)::text, 3, '0'),
  'https://company' || array_position(c_id, id)::text || '.com/webhook/razorpay',
  array_position(c_id, id) IN (1, 3, 4, 5),
  CASE WHEN array_position(c_id, id) IN (1, 3, 4, 5) THEN 'MERCHANT_' || lpad(array_position(c_id, id)::text, 3, '0') ELSE NULL END,
  CASE WHEN array_position(c_id, id) IN (1, 3, 4, 5) THEN 'DEMO_PAYTM_KEY_' || lpad(array_position(c_id, id)::text, 3, '0') ELSE NULL END,
  CASE WHEN array_position(c_id, id) = 3 THEN 'TEST' ELSE 'PRODUCTION' END
FROM companies
ON CONFLICT ("companyId") DO UPDATE SET
  "razorpayKeyId" = EXCLUDED."razorpayKeyId",
  "paytmEnabled" = EXCLUDED."paytmEnabled",
  "paytmMerchantId" = EXCLUDED."paytmMerchantId",
  "paytmEnvironment" = EXCLUDED."paytmEnvironment";

-- ============================================
-- COMPANY SETTINGS (UPSERT)
-- ============================================

INSERT INTO company_settings ("companyId", "dateFormat", "timeFormat", timezone, currency, language, "fiscalYearStart", features)
SELECT
  id,
  CASE 
    WHEN array_position(c_id, id) = 3 THEN 'MM/DD/YYYY'
    WHEN array_position(c_id, id) = 4 THEN 'DD-MM-YYYY'
    ELSE 'DD/MM/YYYY'
  END,
  CASE 
    WHEN array_position(c_id, id) = 3 THEN '24h'
    ELSE '12h'
  END,
  'Asia/Kolkata',
  'INR',
  'en',
  4,
  jsonb_build_object(
    'inventory', array_position(c_id, id) IN (3, 5),
    'multiCurrency', array_position(c_id, id) NOT IN (2, 5),
    'recurring', array_position(c_id, id) != 3
  )
FROM companies
ON CONFLICT ("companyId") DO UPDATE SET
  "dateFormat" = EXCLUDED."dateFormat",
  "timeFormat" = EXCLUDED."timeFormat",
  features = EXCLUDED.features;

-- ============================================
-- TAX CONFIGURATIONS (Skip if exists)
-- ============================================

INSERT INTO tax_configurations ("companyId", name, type, rate, "isDefault", "isActive")
SELECT
  c.id,
  t.name,
  t.type,
  t.rate,
  t."isDefault",
  true
FROM companies c
CROSS JOIN (VALUES
  ('CGST', 'CGST'::"TaxType", 9.00, true),
  ('SGST', 'SGST'::"TaxType", 9.00, true),
  ('IGST', 'IGST'::"TaxType", 18.00, false)
) AS t(name, type, rate, "isDefault")
WHERE NOT EXISTS (
  SELECT 1 FROM tax_configurations tc WHERE tc."companyId" = c.id
);

-- ============================================
-- MODULE CONFIGS (Skip if exists)
-- ============================================

INSERT INTO module_configs ("companyId", module, enabled, settings)
SELECT
  c.id,
  m.module,
  true,
  '{}'::jsonb
FROM companies c
CROSS JOIN (VALUES
  ('DASHBOARD'::"ModuleKey"),
  ('CUSTOMERS'::"ModuleKey"),
  ('INVOICES'::"ModuleKey"),
  ('PAYMENT_LINKS'::"ModuleKey"),
  ('WHATSAPP'::"ModuleKey"),
  ('EMAIL'::"ModuleKey"),
  ('REPORTS'::"ModuleKey"),
  ('SETTINGS'::"ModuleKey"),
  ('ADMIN'::"ModuleKey")
) AS m(module)
WHERE NOT EXISTS (
  SELECT 1 FROM module_configs mc WHERE mc."companyId" = c.id AND mc.module = m.module
);

RAISE NOTICE 'Company settings seeded successfully!';
END $$;