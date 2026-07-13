-- Phase 8: subscription/billing management. Adds plan/usage tracking to
-- companies and a `plans` reference table, seeded with Free/Pro/Business
-- tiers. Actually charging the customer for the subscription itself is out
-- of scope (per the spec) — this is just the data model + admin controls,
-- surfaced in the Master Console (Super Admin only).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS "subscriptionPlan" text NOT NULL DEFAULT 'free';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "subscriptionStatus" text NOT NULL DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "billingCycleStart" timestamptz NOT NULL DEFAULT now();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "usageQuota" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_status_check
  CHECK ("subscriptionStatus" IN ('active', 'past_due', 'cancelled', 'trialing'));

CREATE TABLE IF NOT EXISTS plans (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  "priceMonthly"  numeric(10,2) NOT NULL DEFAULT 0,
  "invoiceQuota"  integer NOT NULL,
  "userQuota"     integer NOT NULL,
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "createdAt"     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO plans (id, name, "priceMonthly", "invoiceQuota", "userQuota", features) VALUES
  ('free', 'Free', 0, 25, 2, '["Basic invoicing", "1 payment gateway", "Email support"]'::jsonb),
  ('pro', 'Pro', 999, 250, 10, '["Unlimited customers", "Both payment gateways", "WhatsApp notifications", "Priority support"]'::jsonb),
  ('business', 'Business', 2999, 2000, 50, '["Everything in Pro", "Scheduled reports", "Custom branding", "Dedicated support"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "priceMonthly" = EXCLUDED."priceMonthly",
  "invoiceQuota" = EXCLUDED."invoiceQuota",
  "userQuota" = EXCLUDED."userQuota",
  features = EXCLUDED.features;

-- Existing companies default to 'free' above; give them a sane usageQuota
-- snapshot matching that plan so the Master Console doesn't show an empty
-- quota for pre-existing rows.
UPDATE companies SET "usageQuota" = '{"invoiceQuota": 25, "userQuota": 2}'::jsonb
WHERE "usageQuota" = '{}'::jsonb;

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans are reference data — every authenticated user can read them (e.g. to
-- show "what would upgrading unlock"), but only the master account can
-- change them (there's no UI for that yet; this just keeps the door closed).
DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "plans_write_super_admin" ON plans;
CREATE POLICY "plans_write_super_admin" ON plans FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- The existing `update_own_company` policy (see
-- 20260702051510_update_rls_policies.sql) lets any company ADMIN update
-- their own `companies` row — which would otherwise let a tenant admin set
-- their own subscriptionPlan/usageQuota directly, bypassing billing
-- entirely. RLS policies can't restrict individual columns, so this trigger
-- closes that gap by silently reverting the billing columns to their
-- previous values whenever a non-super-admin (i.e. anyone other than the
-- master account, or the service_role used by backend jobs) tries to change
-- them. Other columns on the same UPDATE (name, logo, address, etc.) are
-- unaffected.
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  NEW."subscriptionPlan" := OLD."subscriptionPlan";
  NEW."subscriptionStatus" := OLD."subscriptionStatus";
  NEW."billingCycleStart" := OLD."billingCycleStart";
  NEW."usageQuota" := OLD."usageQuota";
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_billing_columns_trigger ON companies;
CREATE TRIGGER protect_billing_columns_trigger
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_billing_columns();
