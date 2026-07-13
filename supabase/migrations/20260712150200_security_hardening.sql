-- The spec asks to replace a "FOR ALL ... USING (true) WITH CHECK (true)"
-- policy on audit_logs with separate INSERT-only policies. That FOR ALL
-- policy was already dropped in 20260702051510_update_rls_policies.sql,
-- which left audit_logs with only SELECT and INSERT policies (both scoped to
-- "companyId" = get_company_id()) — verified 
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

-- 2. Login rate limiting
-- Backs the check-login-attempts Edge Function, called from authStore.ts

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

