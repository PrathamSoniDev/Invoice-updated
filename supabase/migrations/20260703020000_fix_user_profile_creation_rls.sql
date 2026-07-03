-- ============================================
-- FIX: User profile creation & RLS chicken-and-egg
-- ============================================
-- Problem:
--   1. `users."passwordHash"` is NOT NULL but the application never sets it
--      (Supabase Auth owns password hashing in auth.users). Every profile
--      INSERT from the client therefore failed with a NOT NULL violation,
--      leaving auth.users rows without a matching public.users profile.
--      The frontend then queried that missing profile with `.single()`,
--      which returns HTTP 406 Not Acceptable (PGRST116) when 0 rows match.
--   2. RLS `insert_own_users` required `public.is_admin()`, but is_admin()
--      reads from public.users — which does not exist yet for a brand-new
--      user. This is a chicken-and-egg: you cannot insert a profile unless
--      you are an admin, but you cannot be an admin until you have a
--      profile. Self-registration and first-login profile creation were
--      therefore blocked by RLS.
--   3. There was no INSERT policy on `companies`, so self-registration
--      could not create the company a new admin user belongs to.
--   4. `is_admin()` compared role = 'admin' (lowercase) while the UserRole
--      enum stores 'ADMIN' (uppercase), so it always returned false.
--
-- Fix:
--   - Make `passwordHash` nullable (Supabase Auth manages passwords).
--   - Add a self-service INSERT policy on `users` so an authenticated user
--     can create their OWN profile row (id = auth.uid()).
--   - Add an INSERT policy on `companies` for authenticated users.
--   - Fix `is_admin()` to compare against the uppercase enum value.
--
-- Approach note:
--   Profile creation is implemented in APPLICATION CODE (ensureUserProfile
--   in src/lib/supabase.ts) rather than via a PostgreSQL trigger. This is
--   because the profile needs a `companyId`, and for self-registration a
--   new company must be created first — a multi-step transaction that is
--   simpler and more transparent to perform in the client. A trigger
--   cannot easily create the company + profile + default settings
--   atomically with the anon/authenticated role. The application code is
--   idempotent (upsert onConflict id) so concurrent calls never create
--   duplicates.
-- ============================================

-- ============================================
-- 1. Make users."passwordHash" nullable
--    (Supabase Auth stores the real password hash in auth.users; the
--     public.users.passwordHash column is a legacy field that the client
--     never populates.)
-- ============================================
ALTER TABLE public.users
  ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Backfill any existing NULL passwordHash so old rows are consistent.
UPDATE public.users SET "passwordHash" = '' WHERE "passwordHash" IS NULL;

-- ============================================
-- 2. Fix is_admin() helper (enum is uppercase 'ADMIN')
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- ============================================
-- 3. USERS - allow a user to insert their OWN profile
--    (breaks the chicken-and-egg: a user with no profile can now create
--     their own profile row, restricted to their own auth.uid())
-- ============================================
DROP POLICY IF EXISTS "insert_own_users" ON public.users;
DROP POLICY IF EXISTS "insert_self_profile" ON public.users;

-- Admins can still insert profiles for anyone in their company.
CREATE POLICY "insert_own_users" ON public.users FOR INSERT
  TO authenticated
  WITH CHECK ("companyId" = public.get_company_id() AND public.is_admin());

-- A user may insert their OWN profile (id = auth.uid()). This is what
-- enables first-login / self-registration profile creation.
CREATE POLICY "insert_self_profile" ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- A user may always SELECT their own profile (even before get_company_id()
-- resolves, which depends on the profile existing).
DROP POLICY IF EXISTS "select_own_users" ON public.users;
CREATE POLICY "select_own_users" ON public.users FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id() OR id = auth.uid());

-- A user may UPDATE their own profile.
DROP POLICY IF EXISTS "update_own_users" ON public.users;
CREATE POLICY "update_own_users" ON public.users FOR UPDATE
  TO authenticated
  USING ("companyId" = public.get_company_id() OR id = auth.uid())
  WITH CHECK ("companyId" = public.get_company_id() OR id = auth.uid());

-- ============================================
-- 4. COMPANIES - allow authenticated users to INSERT
--    (needed for self-registration, where a new company is created)
-- ============================================
DROP POLICY IF EXISTS "insert_own_company" ON public.companies;
CREATE POLICY "insert_own_company" ON public.companies FOR INSERT
  TO authenticated WITH CHECK (true);

-- Ensure a user can always SELECT their own company even if the
-- get_company_id() helper has not resolved yet (defensive).
DROP POLICY IF EXISTS "select_own_company" ON public.companies;
CREATE POLICY "select_own_company" ON public.companies FOR SELECT
  TO authenticated USING (id = public.get_company_id() OR email = (
    SELECT u.email FROM public.users u WHERE u.id = auth.uid() LIMIT 1
  ));

-- ============================================
-- 5. Backfill missing profiles for existing auth.users
--    (one-time repair for users already stuck without a profile)
-- ============================================
-- Create a default company for any auth user missing a profile, then
-- insert a minimal profile. This is safe to re-run (guarded by NOT EXISTS).
DO $$
DECLARE
  missing_user RECORD;
  new_company_id uuid;
BEGIN
  FOR missing_user IN
    SELECT au.id, au.email
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = au.id
    )
  LOOP
    -- Create a default company for the orphaned user
    INSERT INTO public.companies (name, "legalName", email)
    VALUES (
      COALESCE(au.raw_user_meta_data->>'companyName', split_part(au.email, '@', 1) || '''s Company'),
      COALESCE(au.raw_user_meta_data->>'companyName', split_part(au.email, '@', 1) || '''s Company'),
      au.email
    )
    RETURNING id INTO new_company_id;

    -- Insert the missing profile
    INSERT INTO public.users (id, "companyId", name, email, role, status, permissions)
    VALUES (
      missing_user.id,
      new_company_id,
      COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
      missing_user.email,
      'ADMIN',
      'ACTIVE',
      '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
