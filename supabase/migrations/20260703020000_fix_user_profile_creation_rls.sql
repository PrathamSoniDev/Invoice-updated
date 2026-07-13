ALTER TABLE public.users
  ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Backfill any existing NULL passwordHash so old rows are consistent.
UPDATE public.users SET "passwordHash" = '' WHERE "passwordHash" IS NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;


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

DO $$
DECLARE
  missing_user RECORD;
  new_company_id uuid;
BEGIN
  FOR missing_user IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = au.id
    )
  LOOP
    -- Create a default company for the orphaned user
    INSERT INTO public.companies (name, "legalName", email)
    VALUES (
      COALESCE(missing_user.raw_user_meta_data->>'companyName', split_part(missing_user.email, '@', 1) || '''s Company'),
      COALESCE(missing_user.raw_user_meta_data->>'companyName', split_part(missing_user.email, '@', 1) || '''s Company'),
      missing_user.email
    )
    RETURNING id INTO new_company_id;

    -- Insert the missing profile
    INSERT INTO public.users (id, "companyId", name, email, role, status, permissions)
    VALUES (
      missing_user.id,
      new_company_id,
      COALESCE(missing_user.raw_user_meta_data->>'name', missing_user.raw_user_meta_data->>'full_name', split_part(missing_user.email, '@', 1)),
      missing_user.email,
      'ADMIN',
      'ACTIVE',
      '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
