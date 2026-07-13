CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;


DROP POLICY IF EXISTS "select_own_users" ON public.users;
CREATE POLICY "select_own_users" ON public.users FOR SELECT
  TO authenticated
  USING (
    "companyId" = public.get_company_id()
    OR id = auth.uid()
    OR public.is_super_admin()
  );

-- companies: a super admin can see every company row (needed so the master
-- console can show which company each user belongs to).
DROP POLICY IF EXISTS "select_own_company" ON public.companies;
CREATE POLICY "select_own_company" ON public.companies FOR SELECT
  TO authenticated
  USING (
    id = public.get_company_id()
    OR email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid() LIMIT 1)
    OR public.is_super_admin()
  );


DO $$
DECLARE
  platform_company_id uuid;
  master_user_id uuid;
  now_time timestamptz := now();
BEGIN
  SELECT id INTO platform_company_id
  FROM public.companies
  WHERE email = 'info@selltechindproductions.in'
  LIMIT 1;

  IF platform_company_id IS NULL THEN
    INSERT INTO public.companies (name, "legalName", email)
    VALUES ('Platform Administration', 'Platform Administration', 'info@selltechindproductions.in')
    RETURNING id INTO platform_company_id;
  END IF;


  SELECT id INTO master_user_id
  FROM auth.users
  WHERE email = 'info@selltechindproductions.in'
  LIMIT 1;

  IF master_user_id IS NULL THEN
    master_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user
    )
    VALUES (
      master_user_id,
      '00000000-0000-0000-0000-000000000000',
      'info@selltechindproductions.in',
      extensions.crypt('ChangeMe!Bootstrap-2026', extensions.gen_salt('bf')),
      now_time, now_time, now_time,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Master Administrator"}',
      false
    );
  END IF;

  INSERT INTO public.users (
    id, "companyId", name, email, "emailVerified", "emailVerifiedAt",
    "passwordHash", role, status, permissions
  )
  VALUES (
    master_user_id,
    platform_company_id,
    'Master Administrator',
    'info@selltechindproductions.in',
    true,
    now_time,
    NULL, -- Supabase Auth owns the real password hash; see 20260703020000 migration.
    'SUPER_ADMIN',
    'ACTIVE',
    '["dashboard","customers","invoices","payment_links","whatsapp","email","reports","settings","admin"]'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET role = 'SUPER_ADMIN';
END $$;
