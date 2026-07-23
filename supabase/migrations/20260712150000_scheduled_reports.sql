
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "userId"          uuid REFERENCES users(id) ON DELETE SET NULL,
  "reportType"      text NOT NULL CHECK ("reportType" IN ('overview', 'invoices', 'customers', 'payments', 'tax')),
  filters           jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency         text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  "recipientEmails" text[] NOT NULL DEFAULT '{}',
  "isActive"        boolean NOT NULL DEFAULT true,
  "lastSentAt"      timestamptz,
  "nextSendAt"      timestamptz NOT NULL DEFAULT now(),
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company ON scheduled_reports("companyId");
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_send ON scheduled_reports("nextSendAt") WHERE "isActive" = true;

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Tenant users manage their own company's schedules (standard company-scoped
-- CRUD pattern, matching e.g. gateway_settings/company_settings).
DROP POLICY IF EXISTS "scheduled_reports_crud" ON scheduled_reports;
CREATE POLICY "scheduled_reports_crud" ON scheduled_reports FOR ALL
  TO authenticated
  USING ("companyId" = public.get_company_id())
  WITH CHECK ("companyId" = public.get_company_id());

-- The master account can see/manage schedules across every tenant, matching
-- the write-access pattern already granted on other tables (see
-- 20260711120000_super_admin_write_access.sql).
DROP POLICY IF EXISTS "scheduled_reports_super_admin" ON scheduled_reports;
CREATE POLICY "scheduled_reports_super_admin" ON scheduled_reports FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- The send-scheduled-reports Edge Function reads/writes with the
-- service_role key, which bypasses RLS entirely — no additional policy
-- needed for it.

-- Scheduling: after deploying send-scheduled-reports and setting its
-- CRON_SECRET, run this ONCE from the SQL editor (not as part of this
-- migration, for the same reason check-overdue-invoices's cron.schedule()
-- call isn't baked into a migration either — it needs your project's Edge
-- Function URL and secret value):
--
--   select cron.schedule(
--     'send-scheduled-reports',
--     '*/15 * * * *', -- every 15 minutes; the function only sends rows whose nextSendAt has passed
--     $$
--     select net.http_post(
--       url := 'https://<your-project-ref>.supabase.co/functions/v1/send-scheduled-reports',
--       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<your CRON_SECRET value>'),
--       body := '{}'::jsonb
--     );
--     $$
--   );
