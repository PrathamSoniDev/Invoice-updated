DO $$
DECLARE
  platform_company_id uuid;
BEGIN
  -- Find (or create) the Platform Administration company, same lookup the
  -- original seeding migration used.
  SELECT id INTO platform_company_id
  FROM public.companies
  WHERE email = 'info@selltechindproductions.in'
  LIMIT 1;

  IF platform_company_id IS NULL THEN
    INSERT INTO public.companies (name, "legalName", email)
    VALUES ('Platform Administration', 'Platform Administration', 'info@selltechindproductions.in')
    RETURNING id INTO platform_company_id;
  END IF;

  -- Re-point any SUPER_ADMIN whose companyId is dangling (references a
  -- companies row that doesn't exist) back to the Platform Administration
  -- company. Regular ADMIN/MANAGER/etc. users are never touched here.
  UPDATE public.users u
  SET "companyId" = platform_company_id,
      "updatedAt" = now()
  WHERE u.role = 'SUPER_ADMIN'
    AND NOT EXISTS (
      SELECT 1 FROM public.companies c WHERE c.id = u."companyId"
    );
END $$;