

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS "reminderThresholds" integer[] NOT NULL DEFAULT '{3,7,14}';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS "remindersSent" integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "lastReminderSentAt" timestamptz;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


