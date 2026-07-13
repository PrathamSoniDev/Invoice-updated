-- Phase 9: security hardening.

-- ============================================================================
-- 1. Audit log immutability
-- ============================================================================
-- The spec asks to replace a "FOR ALL ... USING (true) WITH CHECK (true)"
-- policy on audit_logs with separate INSERT-only policies. That FOR ALL
-- policy was already dropped in 20260702051510_update_rls_policies.sql,
-- which left audit_logs with only SELECT and INSERT policies (both scoped to
-- "companyId" = get_company_id()) — verified via:
--   SELECT polname, polcmd FROM pg_policies WHERE tablename = 'audit_logs';
-- There is no UPDATE or DELETE policy at all for `anon`/`authenticated`, and
-- with RLS enabled, the absence of a matching policy means those commands
-- are already denied by default. So audit_logs is already immutable for
-- everyone except service_role (which bypasses RLS entirely, as intended —
-- only backend jobs/Edge Functions use that key). Same story for
-- activity_logs. Nothing to change there.
--
-- What IS actually broken: the master account's cross-tenant audit/activity
-- writes (see masterService.ts's logMasterAudit/logMasterActivity, added
-- alongside the Master Console CRUD work) insert rows with the TARGET
-- company's id, not the master account's own company — but the existing
-- INSERT policies require "companyId" = get_company_id() (the CALLER's own
-- company), so those inserts have been silently failing RLS for the master
-- account this whole time (caught by a try/catch and logged to console,
-- never surfaced). Fixing that is squarely "audit log" work, so it's
-- included here rather than filed separately.
DROP POLICY IF EXISTS "audit_logs_insert_super_admin" ON audit_logs;
CREATE POLICY "audit_logs_insert_super_admin" ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "activity_logs_insert_super_admin" ON activity_logs;
CREATE POLICY "activity_logs_insert_super_admin" ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_super_admin" ON audit_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "activity_logs_select_super_admin" ON activity_logs;
CREATE POLICY "activity_logs_select_super_admin" ON activity_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- ============================================================================
-- 2. Login rate limiting
-- ============================================================================
-- Backs the check-login-attempts Edge Function, called from authStore.ts
-- BEFORE signInWithPassword. Keyed by IP+email since either alone is too
-- coarse (shared office IP vs. a targeted single-account brute force).
CREATE TABLE IF NOT EXISTS login_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  text NOT NULL, -- lower(email) || ':' || ip
  email       text NOT NULL,
  ip          text NOT NULL,
  success     boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time
  ON login_attempts(identifier, "createdAt" DESC);

-- Auto-cleanup: nothing needs to read attempts older than a few minutes, so
-- keep the table small without needing a separate cron job.
CREATE OR REPLACE FUNCTION public.prune_old_login_attempts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM login_attempts WHERE "createdAt" < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prune_old_login_attempts_trigger ON login_attempts;
CREATE TRIGGER prune_old_login_attempts_trigger
  AFTER INSERT ON login_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.prune_old_login_attempts();

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated at all, intentionally — this table is
-- only ever touched by the check-login-attempts Edge Function via the
-- service_role key (RLS bypassed), which is exactly the point: nobody
-- should be able to read or clear their own rate-limit counter from the
-- client.
