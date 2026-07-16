-- Grants the SUPER_ADMIN ("master") account write access (UPDATE) on the
-- `companies` table itself. 
DROP POLICY IF EXISTS "companies_write_super_admin" ON public.companies;
CREATE POLICY "companies_write_super_admin" ON public.companies FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());