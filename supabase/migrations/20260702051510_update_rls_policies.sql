-- HELPER FUNCTIONS FOR RLS
CREATE OR REPLACE FUNCTION public.get_company_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT "companyId" FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- COMPANIES - Update Policies
DROP POLICY IF EXISTS "service_all_companies" ON companies;

DROP POLICY IF EXISTS "select_own_company" ON companies;

CREATE POLICY "select_own_company"
ON companies
FOR SELECT
TO authenticated
USING (id = public.get_company_id());

CREATE POLICY "update_own_company" ON companies FOR UPDATE
  TO authenticated USING (id = public.get_company_id() AND public.is_admin())
  WITH CHECK (id = public.get_company_id() AND public.is_admin());

-- USERS - Update Policies
DROP POLICY IF EXISTS "service_all_users" ON users;

CREATE POLICY "select_own_users" ON users FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());

CREATE POLICY "insert_own_users" ON users FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id() AND public.is_admin());

CREATE POLICY "update_own_users" ON users FOR UPDATE
  TO authenticated USING ("companyId" = public.get_company_id())
  WITH CHECK ("companyId" = public.get_company_id());

CREATE POLICY "delete_own_users" ON users FOR DELETE
  TO authenticated USING ("companyId" = public.get_company_id() AND public.is_admin());

-- ============================================
-- BANK_INFO - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_bi" ON bank_info;

CREATE POLICY "select_own_bank" ON bank_info FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "insert_own_bank" ON bank_info FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "update_own_bank" ON bank_info FOR UPDATE
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "delete_own_bank" ON bank_info FOR DELETE
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- INVOICE_SETTINGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_is" ON invoice_settings;

CREATE POLICY "invoice_settings_crud" ON invoice_settings FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- COMMUNICATION_SETTINGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_cs" ON communication_settings;

CREATE POLICY "comm_settings_crud" ON communication_settings FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- GATEWAY_SETTINGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_gs" ON gateway_settings;

CREATE POLICY "gateway_crud" ON gateway_settings FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- COMPANY_SETTINGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_cset" ON company_settings;

CREATE POLICY "company_settings_crud" ON company_settings FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- USER_SETTINGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_us" ON user_settings;

CREATE POLICY "user_settings_select" ON user_settings FOR SELECT
  TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT
  TO authenticated WITH CHECK ("userId" = auth.uid());
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE
  TO authenticated USING ("userId" = auth.uid());

-- ============================================
-- CUSTOMERS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_cust" ON customers;

CREATE POLICY "customers_select" ON customers FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "customers_insert" ON customers FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "customers_update" ON customers FOR UPDATE
  TO authenticated USING ("companyId" = public.get_company_id())
  WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "customers_delete" ON customers FOR DELETE
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- INVOICES - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_inv" ON invoices;

CREATE POLICY "invoices_select" ON invoices FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "invoices_insert" ON invoices FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "invoices_update" ON invoices FOR UPDATE
  TO authenticated USING ("companyId" = public.get_company_id())
  WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "invoices_delete" ON invoices FOR DELETE
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- INVOICE_ITEMS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_ii" ON invoice_items;

CREATE POLICY "invoice_items_all" ON invoice_items FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items."invoiceId" AND invoices."companyId" = public.get_company_id())
  );

-- ============================================
-- INVOICE_TAXES - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_it" ON invoice_taxes;

CREATE POLICY "invoice_taxes_all" ON invoice_taxes FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_taxes."invoiceId" AND invoices."companyId" = public.get_company_id())
  );

-- ============================================
-- INVOICE_ACTIVITIES - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_ia" ON invoice_activities;

CREATE POLICY "invoice_activities_all" ON invoice_activities FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_activities."invoiceId" AND invoices."companyId" = public.get_company_id())
  );

-- ============================================
-- PAYMENT_LINKS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_pl" ON payment_links;

CREATE POLICY "payment_links_select" ON payment_links FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "payment_links_insert" ON payment_links FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "payment_links_update" ON payment_links FOR UPDATE
  TO authenticated USING ("companyId" = public.get_company_id())
  WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "payment_links_delete" ON payment_links FOR DELETE
  TO authenticated USING ("companyId" = public.get_company_id());

-- Public access for payment links (for customers to pay)
CREATE POLICY "payment_links_public" ON payment_links FOR SELECT
  TO anon USING (status = 'PENDING' AND ("expiresAt" IS NULL OR "expiresAt" > now()));

-- ============================================
-- PAYMENTS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_pay" ON payments;

CREATE POLICY "payments_select" ON payments FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "payments_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "payments_update" ON payments FOR UPDATE
  TO authenticated USING ("companyId" = public.get_company_id())
  WITH CHECK ("companyId" = public.get_company_id());

-- ============================================
-- MESSAGE_TEMPLATES - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_mt" ON message_templates;

CREATE POLICY "message_templates_crud" ON message_templates FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- COMMUNICATION_LOGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_cl" ON communication_logs;

CREATE POLICY "communication_logs_select" ON communication_logs FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "communication_logs_insert" ON communication_logs FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());

-- ============================================
-- INVOICE_TEMPLATES - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_tmpl" ON invoice_templates;

CREATE POLICY "invoice_templates_crud" ON invoice_templates FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- TEMPLATE_VERSIONS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_tv" ON template_versions;

CREATE POLICY "template_versions_all" ON template_versions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoice_templates WHERE invoice_templates.id = template_versions."templateId" AND invoice_templates."companyId" = public.get_company_id())
  );

-- ============================================
-- USER_INVOICE_TEMPLATES - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_uit" ON user_invoice_templates;

CREATE POLICY "user_invoice_templates_crud" ON user_invoice_templates FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- MODULE_CONFIGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_mc" ON module_configs;

CREATE POLICY "module_configs_crud" ON module_configs FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- EXTERNAL_INTEGRATIONS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_ei" ON external_integrations;

CREATE POLICY "integrations_crud" ON external_integrations FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- ACTIVITY_LOGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_actlog" ON activity_logs;

CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());

-- ============================================
-- AUDIT_LOGS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_audlog" ON audit_logs;

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  TO authenticated USING ("companyId" = public.get_company_id());
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());

-- ============================================
-- NOTIFICATIONS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_notif" ON notifications;

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK ("companyId" = public.get_company_id());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  TO authenticated USING ("userId" = auth.uid());

-- ============================================
-- SAVED_REPORTS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_sr" ON saved_reports;

CREATE POLICY "saved_reports_crud" ON saved_reports FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- EXPORT_HISTORY - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_eh" ON export_history;

CREATE POLICY "export_history_crud" ON export_history FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- TAX_CONFIGURATIONS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_tc" ON tax_configurations;

CREATE POLICY "tax_configurations_crud" ON tax_configurations FOR ALL
  TO authenticated USING ("companyId" = public.get_company_id());

-- ============================================
-- SESSIONS - Update Policies (for logout all devices)
-- ============================================
DROP POLICY IF EXISTS "service_all_sessions" ON sessions;

CREATE POLICY "sessions_select" ON sessions FOR SELECT
  TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "sessions_delete" ON sessions FOR DELETE
  TO authenticated USING ("userId" = auth.uid());

-- ============================================
-- REFRESH_TOKENS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_rt" ON refresh_tokens;

CREATE POLICY "refresh_tokens_select" ON refresh_tokens FOR SELECT
  TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "refresh_tokens_delete" ON refresh_tokens FOR DELETE
  TO authenticated USING ("userId" = auth.uid());

-- ============================================
-- PASSWORD_RESET_TOKENS - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_prt" ON password_reset_tokens;

-- Only allow inserts, no reading tokens directly
CREATE POLICY "password_reset_insert" ON password_reset_tokens FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================
-- ACCOUNT_SECURITY - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_as" ON account_security;

CREATE POLICY "account_security_select" ON account_security FOR SELECT
  TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "account_security_update" ON account_security FOR UPDATE
  TO authenticated USING ("userId" = auth.uid());

-- ============================================
-- TRUSTED_DEVICES - Update Policies
-- ============================================
DROP POLICY IF EXISTS "service_all_td" ON trusted_devices;

CREATE POLICY "trusted_devices_select" ON trusted_devices FOR SELECT
  TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "trusted_devices_delete" ON trusted_devices FOR DELETE
  TO authenticated USING ("userId" = auth.uid());