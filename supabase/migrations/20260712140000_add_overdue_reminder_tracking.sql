-- Phase 6: Automated overdue reminders.
--
-- 1. company_settings.reminderThresholds: configurable "days overdue"
--    checkpoints (default 3/7/14) at which a reminder email should go out.
-- 2. invoices.remindersSent / lastReminderSentAt: tracks which thresholds
--    have already triggered a reminder for THIS invoice, so the daily
--    cron run never sends a duplicate for a threshold it already handled.
--
-- Scheduling: this project uses pg_cron + pg_net (both available on
-- Supabase's hosted Postgres, including the Free tier) to invoke the
-- check-overdue-invoices Edge Function once a day, rather than Supabase's
-- dashboard "Scheduled Functions" UI — pg_cron keeps the schedule itself in
-- version control here instead of a click-ops dashboard setting. If your
-- project's plan doesn't have pg_cron/pg_net available, use the dashboard's
-- Scheduled Functions feature to call check-overdue-invoices on a daily
-- cron expression instead, and you can skip the cron.schedule() step below.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS "reminderThresholds" integer[] NOT NULL DEFAULT '{3,7,14}';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS "remindersSent" integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "lastReminderSentAt" timestamptz;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- NOTE: the actual cron.schedule(...) call is intentionally NOT included
-- here — it needs your project's Edge Function URL and a secret header
-- value baked into the SQL, neither of which belong in a migration file
-- that's checked into version control. After deploying the
-- check-overdue-invoices function and setting its CRON_SECRET, run this
-- ONCE from the SQL editor (not as a migration):
--
--   select cron.schedule(
--     'check-overdue-invoices-daily',
--     '0 2 * * *', -- 2:00 AM UTC daily — adjust to taste
--     $$
--     select net.http_post(
--       url := 'https://<your-project-ref>.supabase.co/functions/v1/check-overdue-invoices',
--       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<your CRON_SECRET value>'),
--       body := '{}'::jsonb
--     );
--     $$
--   );
