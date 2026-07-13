-- This migration adds a new `public.is_super_admin()` function, and then
-- grants SELECT access to every table for that role.
DO $$
DECLARE
  t text;
BEGIN
  -- Tables with a direct "companyId" column.
  FOREACH t IN ARRAY ARRAY[
    'bank_info', 'invoice_settings', 'communication_settings', 'gateway_settings',
    'company_settings', 'customers', 'invoices', 'payment_links', 'payments',
    'message_templates', 'communication_logs', 'invoice_templates',
    'user_invoice_templates', 'activity_logs', 'audit_logs', 'module_configs',
    'external_integrations', 'saved_reports', 'export_history', 'notifications',
    'tax_configurations', 'coupons', 'recurring_invoices'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I;',
      t || '_select_super_admin', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_super_admin());',
      t || '_select_super_admin', t
    );
  END LOOP;
END $$;

-- Join-scoped tables (no direct companyId column) — a simple
-- `USING (public.is_super_admin())` is enough since it needs no join at all.
DROP POLICY IF EXISTS "invoice_items_select_super_admin" ON public.invoice_items;
CREATE POLICY "invoice_items_select_super_admin" ON public.invoice_items FOR SELECT
  TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "invoice_taxes_select_super_admin" ON public.invoice_taxes;
CREATE POLICY "invoice_taxes_select_super_admin" ON public.invoice_taxes FOR SELECT
  TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "invoice_activities_select_super_admin" ON public.invoice_activities;
CREATE POLICY "invoice_activities_select_super_admin" ON public.invoice_activities FOR SELECT
  TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "template_versions_select_super_admin" ON public.template_versions;
CREATE POLICY "template_versions_select_super_admin" ON public.template_versions FOR SELECT
  TO authenticated USING (public.is_super_admin());
