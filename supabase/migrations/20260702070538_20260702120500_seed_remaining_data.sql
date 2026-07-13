/*
# InvoiceGen Enterprise Demo Data Seed - Part 6: Templates, Notifications, Logs, Integrations
*/

DO $$
DECLARE
  c_rec RECORD;
  u_rec RECORD;
BEGIN

IF EXISTS (SELECT 1 FROM invoice_templates LIMIT 1) THEN
  RAISE NOTICE 'Demo templates/remaining data already seeded — skipping.';
  RETURN;
END IF;

INSERT INTO invoice_templates ("companyId", name, description, type, status, content, "isDefault", version, tags)
SELECT
  c.id,
  t.name,
  t.description,
  'HTML'::"TemplateType",
  'ACTIVE'::"TemplateStatus",
  t.content,
  t."isDefault",
  1,
  t.tags
FROM companies c
CROSS JOIN (VALUES
  ('Modern Blue', 'Clean modern template with blue accents', '<html><body><div class="invoice"><h1>{{company_name}}</h1></div></body></html>', true, '["modern","professional"]'::jsonb),
  ('Classic Professional', 'Traditional business invoice layout', '<html><body><table class="invoice-table"><tr><td>{{company_name}}</td></tr></table></body></html>', false, '["classic","business"]'::jsonb),
  ('Minimal Clean', 'Simple and elegant minimalist design', '<html><body><div class="minimal">{{content}}</div></body></html>', false, '["minimal","clean"]'::jsonb),
  ('Retail Standard', 'Perfect for retail businesses', '<html><body><div class="retail-header">{{logo}}</div></body></html>', false, '["retail","colorful"]'::jsonb),
  ('Corporate Elite', 'Premium corporate template', '<html><body><div class="corporate"><header>{{header}}</header></div></body></html>', false, '["corporate","premium"]'::jsonb)
) AS t(name, description, content, "isDefault", tags);

INSERT INTO notifications ("companyId", "userId", type, title, message, "isRead", "readAt", data)
SELECT
  u."companyId",
  u.id,
  CASE (random() * 5)::int
    WHEN 0 THEN 'payment_received'
    WHEN 1 THEN 'invoice_paid'
    WHEN 2 THEN 'invoice_overdue'
    WHEN 3 THEN 'customer_created'
    WHEN 4 THEN 'payment_failed'
    ELSE 'settings_updated'
  END,
  CASE (random() * 5)::int
    WHEN 0 THEN 'Payment Received'
    WHEN 1 THEN 'Invoice Marked as Paid'
    WHEN 2 THEN 'Invoice Overdue Alert'
    WHEN 3 THEN 'New Customer Added'
    WHEN 4 THEN 'Payment Failed'
    ELSE 'Settings Updated'
  END,
  CASE (random() * 5)::int
    WHEN 0 THEN 'Payment of Rs. 15,000 received from Customer'
    WHEN 1 THEN 'Invoice has been marked as paid'
    WHEN 2 THEN 'Invoice is 7 days overdue'
    WHEN 3 THEN 'New customer has been added'
    WHEN 4 THEN 'Payment failed - Please retry'
    ELSE 'Your company settings have been updated successfully'
  END,
  random() < 0.7,
  CASE WHEN random() < 0.7 THEN now() - (random() * 24) * '1 hour'::interval ELSE NULL END,
  '{"priority":"normal"}'::jsonb
FROM users u
CROSS JOIN generate_series(1, 5) g;


INSERT INTO activity_logs ("companyId", "userId", action, description, "entityType", "entityId", "ipAddress", "userAgent")
SELECT
  u."companyId",
  u.id,
  a.action,
  a.description,
  a."entityType",
  gen_random_uuid()::text,
  '192.168.1.' || (random() * 254 + 1)::text,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u
CROSS JOIN (VALUES
  ('login', 'User logged in successfully', 'auth'),
  ('logout', 'User logged out', 'auth'),
  ('invoice_created', 'Created new invoice', 'invoice'),
  ('invoice_sent', 'Sent invoice to customer', 'invoice'),
  ('payment_received', 'Recorded payment for invoice', 'payment'),
  ('customer_created', 'Added new customer', 'customer'),
  ('customer_updated', 'Updated customer details', 'customer'),
  ('settings_updated', 'Updated company settings', 'settings'),
  ('report_exported', 'Exported report', 'report'),
  ('file_uploaded', 'Uploaded company logo', 'file')
) AS a(action, description, "entityType")
ORDER BY random()
LIMIT 500;

INSERT INTO audit_logs (
  "companyId", "userId", action, "entityType", "entityId", "oldValues", "newValues", "ipAddress", "userAgent"
)
SELECT
  u."companyId",
  u.id,
  CASE (random() * 4)::int
    WHEN 0 THEN 'CREATE'::"AuditAction"
    WHEN 1 THEN 'UPDATE'::"AuditAction"
    WHEN 2 THEN 'DELETE'::"AuditAction"
    WHEN 3 THEN 'LOGIN'::"AuditAction"
    ELSE 'SETTINGS'::"AuditAction"
  END,
  CASE (random() * 3)::int
    WHEN 0 THEN 'invoice'
    WHEN 1 THEN 'customer'
    WHEN 2 THEN 'payment'
    ELSE 'settings'
  END,
  gen_random_uuid()::text,
  CASE WHEN random() < 0.5 THEN '{"status":"DRAFT"}'::jsonb ELSE NULL END,
  CASE WHEN random() >= 0.5 THEN '{"status":"PAID"}'::jsonb ELSE NULL END,
  '192.168.1.' || (random() * 254 + 1)::text,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u
ORDER BY random()
LIMIT 200;


INSERT INTO external_integrations ("companyId", provider, status, config, credentials, "lastSyncAt", "syncStatus")
SELECT
  c.id,
  p.provider,
  'CONNECTED'::"IntegrationStatus",
  '{"sync_interval":"daily","auto_sync":true}'::jsonb,
  '{"api_key":"demo_key_*****","endpoint":"https://api.example.com"}'::jsonb,
  now() - (random() * 7) * '1 day'::interval,
  'COMPLETED'::"SyncStatus"
FROM companies c
CROSS JOIN (VALUES
  ('TALLY'::"IntegrationProvider"),
  ('ZOHO_BOOKS'::"IntegrationProvider"),
  ('BUSY'::"IntegrationProvider")
) AS p(provider);

INSERT INTO external_integrations ("companyId", provider, status, config, credentials, "lastSyncAt", "syncStatus")
SELECT
  c.id,
  p.provider,
  'DISCONNECTED'::"IntegrationStatus",
  '{}'::jsonb,
  NULL,
  NULL,
  NULL
FROM companies c
CROSS JOIN (VALUES
  ('QUICKBOOKS'::"IntegrationProvider"),
  ('XERO'::"IntegrationProvider"),
  ('SAP'::"IntegrationProvider")
) AS p(provider);


INSERT INTO saved_reports ("companyId", name, type, config, "scheduleEnabled", "createdById")
SELECT
  c.id,
  r.name,
  r.type,
  r.config,
  random() < 0.3,
  (SELECT id FROM users WHERE "companyId" = c.id AND role = 'ADMIN' LIMIT 1)
FROM companies c
CROSS JOIN (VALUES
  ('Monthly Revenue Report', 'revenue', '{"dateRange":"monthly","groupBy":"month"}'::jsonb),
  ('Quarterly Tax Summary', 'tax', '{"dateRange":"quarterly","taxType":"all"}'::jsonb),
  ('Customer Aging Report', 'aging', '{"buckets":["0-30","31-60","61-90","90+"]}'::jsonb),
  ('Outstanding Invoices', 'outstanding', '{"dateRange":"all","status":"pending"}'::jsonb),
  ('Payment Gateway Report', 'gateway', '{"gateway":"all","dateRange":"monthly"}'::jsonb)
) AS r(name, type, config);


INSERT INTO export_history ("companyId", "userId", type, format, status, "fileUrl", "fileSize", "completedAt")
SELECT
  u."companyId",
  u.id,
  CASE (random() * 3)::int
    WHEN 0 THEN 'Invoice Report'
    WHEN 1 THEN 'Customer List'
    ELSE 'Payment Summary'
  END,
  CASE (random() * 2)::int
    WHEN 0 THEN 'xlsx'
    ELSE 'csv'
  END,
  'COMPLETED',
  'https://storage.example.com/exports/' || substr(md5(random()::text), 1, 20) || '.xlsx',
  (random() * 500000 + 50000)::int,
  now() - (random() * 30) * '1 day'::interval
FROM users u
WHERE u.role IN ('ADMIN', 'MANAGER')
LIMIT 50;

RAISE NOTICE 'All remaining demo data seeded successfully!';
END $$;