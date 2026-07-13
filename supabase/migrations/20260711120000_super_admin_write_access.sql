-- Grants the SUPER_ADMIN ("master") account write access (INSERT / UPDATE /
-- DELETE) on the tables the Master Console needs to manage across every
-- tenant: customers, invoices (+ line items + activity trail), payment
-- links, payments, and users (so the master account can add admins/staff
-- for any company).
--
-- Existing per-company policies (e.g. "customers_insert") stay untouched —
-- Postgres OR's multiple permissive policies together for the same command,
-- so a super admin satisfies these new policies while regular tenant users
-- keep going through the existing "companyId = get_company_id()" policies.

-- ============================================
-- CUSTOMERS
-- ============================================
DROP POLICY IF EXISTS "customers_write_super_admin" ON public.customers;
CREATE POLICY "customers_write_super_admin" ON public.customers FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================
-- INVOICES
-- ============================================
DROP POLICY IF EXISTS "invoices_write_super_admin" ON public.invoices;
CREATE POLICY "invoices_write_super_admin" ON public.invoices FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "invoice_items_write_super_admin" ON public.invoice_items;
CREATE POLICY "invoice_items_write_super_admin" ON public.invoice_items FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "invoice_activities_write_super_admin" ON public.invoice_activities;
CREATE POLICY "invoice_activities_write_super_admin" ON public.invoice_activities FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- invoice_settings needs to be readable/updatable by the master account so
-- invoice-number generation (nextNumber increment) works when creating an
-- invoice on behalf of any company.
DROP POLICY IF EXISTS "invoice_settings_write_super_admin" ON public.invoice_settings;
CREATE POLICY "invoice_settings_write_super_admin" ON public.invoice_settings FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================
-- PAYMENT LINKS
-- ============================================
DROP POLICY IF EXISTS "payment_links_write_super_admin" ON public.payment_links;
CREATE POLICY "payment_links_write_super_admin" ON public.payment_links FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================
-- PAYMENTS
-- ============================================
DROP POLICY IF EXISTS "payments_write_super_admin" ON public.payments;
CREATE POLICY "payments_write_super_admin" ON public.payments FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================
-- USERS (master console "add user" / edit / delete)
-- ============================================
DROP POLICY IF EXISTS "users_insert_super_admin" ON public.users;
CREATE POLICY "users_insert_super_admin" ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "users_update_super_admin" ON public.users;
CREATE POLICY "users_update_super_admin" ON public.users FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "users_delete_super_admin" ON public.users;
CREATE POLICY "users_delete_super_admin" ON public.users FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
