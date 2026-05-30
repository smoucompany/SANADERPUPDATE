-- ============================================================
-- الملف الثاني: الدوال والصلاحيات
-- شغّل ثانياً بعد 01_schema.sql
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- SEQUENCE FUNCTION (invoice/purchase numbering)
-- ============================================================

CREATE OR REPLACE FUNCTION get_next_sequence(p_company_id UUID, p_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix  TEXT;
  v_seq     INTEGER;
BEGIN
  CASE p_type
    WHEN 'invoice'   THEN v_prefix := 'INV';
    WHEN 'purchase'  THEN v_prefix := 'PUR';
    WHEN 'journal'   THEN v_prefix := 'JRN';
    WHEN 'voucher'   THEN v_prefix := 'VOU';
    WHEN 'quotation' THEN v_prefix := 'QUO';
    WHEN 'receipt'   THEN v_prefix := 'RCP';
    WHEN 'payment'   THEN v_prefix := 'PAY';
    WHEN 'expense'   THEN v_prefix := 'EXP';
    WHEN 'return'    THEN v_prefix := 'RTN';
    ELSE v_prefix := upper(left(p_type, 3));
  END CASE;

  INSERT INTO invoice_sequences (company_id, type, prefix, current_number, padding)
  VALUES (p_company_id, p_type, v_prefix || '-', 0, 6)
  ON CONFLICT (company_id, type) DO NOTHING;

  UPDATE invoice_sequences
  SET current_number = current_number + 1
  WHERE company_id = p_company_id AND type = p_type
  RETURNING current_number INTO v_seq;

  RETURN v_prefix || '-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SETUP NEW COMPANY (called after registration)
-- ============================================================

CREATE OR REPLACE FUNCTION setup_new_company(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Invoice sequences
  INSERT INTO invoice_sequences (company_id, type, prefix, current_number, padding) VALUES
    (p_company_id,'invoice',  'INV-',0,6),
    (p_company_id,'purchase', 'PUR-',0,6),
    (p_company_id,'journal',  'JRN-',0,6),
    (p_company_id,'voucher',  'VOU-',0,6),
    (p_company_id,'quotation','QUO-',0,6),
    (p_company_id,'receipt',  'RCP-',0,6),
    (p_company_id,'payment',  'PAY-',0,6),
    (p_company_id,'expense',  'EXP-',0,6),
    (p_company_id,'return',   'RTN-',0,6)
  ON CONFLICT (company_id, type) DO NOTHING;

  -- Default branch
  INSERT INTO branches (company_id, name_ar, code, is_main)
  VALUES (p_company_id, 'الفرع الرئيسي', 'MAIN', TRUE)
  ON CONFLICT DO NOTHING;

  -- Default warehouse
  INSERT INTO warehouses (company_id, name_ar, name_en, code, is_default)
  VALUES (p_company_id, 'المستودع الرئيسي', 'Main Warehouse', 'WH-001', TRUE)
  ON CONFLICT DO NOTHING;

  -- Default cashbox
  INSERT INTO cashboxes (company_id, name_ar, name_en, is_default, balance)
  VALUES (p_company_id, 'الصندوق الرئيسي', 'Main Cashbox', TRUE, 0)
  ON CONFLICT DO NOTHING;

  -- Default units
  INSERT INTO units (company_id, name_ar, name_en, abbreviation) VALUES
    (p_company_id,'قطعة',     'Piece',      'قطعة'),
    (p_company_id,'كيلوجرام', 'Kilogram',   'كجم'),
    (p_company_id,'لتر',      'Liter',      'لتر'),
    (p_company_id,'صندوق',    'Box',        'صندوق'),
    (p_company_id,'كرتون',    'Carton',     'كرتون'),
    (p_company_id,'علبة',     'Pack',       'علبة'),
    (p_company_id,'دزينة',    'Dozen',      'دزينة'),
    (p_company_id,'متر',      'Meter',      'متر'),
    (p_company_id,'طن',       'Ton',        'طن')
  ON CONFLICT DO NOTHING;

  -- Default expense categories
  INSERT INTO expense_categories (company_id, name_ar) VALUES
    (p_company_id,'إيجارات'),
    (p_company_id,'رواتب وأجور'),
    (p_company_id,'مرافق (كهرباء وماء)'),
    (p_company_id,'صيانة وإصلاح'),
    (p_company_id,'تسويق وإعلان'),
    (p_company_id,'مواصلات وسفر'),
    (p_company_id,'رسوم بنكية'),
    (p_company_id,'قرطاسية ومستلزمات'),
    (p_company_id,'مصروفات أخرى')
  ON CONFLICT DO NOTHING;

  -- Default settings
  INSERT INTO settings (company_id, key, value) VALUES
    (p_company_id,'vat_rate',              '15'),
    (p_company_id,'currency',              '"SAR"'),
    (p_company_id,'auto_journal_entries',  'true'),
    (p_company_id,'allow_negative_stock',  'false'),
    (p_company_id,'require_customer_on_sale','false'),
    (p_company_id,'show_logo_on_invoice',  'true'),
    (p_company_id,'invoice_template',      '"standard"')
  ON CONFLICT (company_id, key) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REGISTER COMPANY (called from frontend on signup)
-- ============================================================

CREATE OR REPLACE FUNCTION register_company(
  p_user_id     UUID,
  p_company_name TEXT,
  p_full_name   TEXT,
  p_phone       TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Create company
  INSERT INTO companies (name_ar, vat_rate, currency)
  VALUES (p_company_name, 15, 'SAR')
  RETURNING id INTO v_company_id;

  -- Create admin user
  INSERT INTO users (id, company_id, full_name, phone, role, email)
  VALUES (
    p_user_id,
    v_company_id,
    p_full_name,
    p_phone,
    'admin',
    (SELECT email FROM auth.users WHERE id = p_user_id)
  );

  -- Setup defaults
  PERFORM setup_new_company(v_company_id);

  RETURN jsonb_build_object('company_id', v_company_id, 'success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DASHBOARD SUMMARY
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary(p_company_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  v_today_sales    DECIMAL; v_month_sales   DECIMAL;
  v_today_purchases DECIMAL; v_month_expenses DECIMAL;
  v_outstanding     DECIMAL; v_low_stock      INTEGER;
BEGIN
  SELECT COALESCE(SUM(total),0) INTO v_today_sales    FROM invoices  WHERE company_id=p_company_id AND invoice_date=p_date  AND status NOT IN ('cancelled','draft') AND deleted_at IS NULL;
  SELECT COALESCE(SUM(total),0) INTO v_month_sales    FROM invoices  WHERE company_id=p_company_id AND DATE_TRUNC('month',invoice_date)=DATE_TRUNC('month',p_date) AND status NOT IN ('cancelled','draft') AND deleted_at IS NULL;
  SELECT COALESCE(SUM(total),0) INTO v_today_purchases FROM purchases WHERE company_id=p_company_id AND purchase_date=p_date AND status NOT IN ('cancelled','draft') AND deleted_at IS NULL;
  SELECT COALESCE(SUM(total_amount),0) INTO v_month_expenses FROM expenses WHERE company_id=p_company_id AND DATE_TRUNC('month',expense_date)=DATE_TRUNC('month',p_date);
  SELECT COALESCE(SUM(remaining_amount),0) INTO v_outstanding FROM invoices WHERE company_id=p_company_id AND status IN ('partial','confirmed') AND deleted_at IS NULL;
  SELECT COUNT(DISTINCT p.id) INTO v_low_stock FROM products p JOIN inventory i ON p.id=i.product_id WHERE p.company_id=p_company_id AND p.track_inventory=TRUE AND i.quantity<=p.min_stock_alert AND p.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'today_sales',v_today_sales,'month_sales',v_month_sales,
    'today_purchases',v_today_purchases,'month_expenses',v_month_expenses,
    'outstanding_debt',v_outstanding,'low_stock_count',v_low_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS
-- ============================================================

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'companies','users','branches','warehouses','cashboxes','shifts',
    'accounts','categories','units','products','inventory','inventory_movements',
    'customers','suppliers','invoices','invoice_items','sales_returns','quotations',
    'purchases','purchase_items','purchase_returns','purchase_orders',
    'journal_entries','journal_entry_lines','payments','bank_accounts','assets',
    'expense_categories','expenses','vouchers','employees','attendance','leaves',
    'payroll','crm_leads','crm_activities','settings','invoice_sequences',
    'notifications','activity_logs','cost_centers'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ============================================================
-- DROP ALL OLD POLICIES
-- ============================================================

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- CREATE RLS POLICIES
-- ============================================================

-- users
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "users_update" ON users FOR UPDATE USING (id = auth.uid());

-- companies
CREATE POLICY "companies_select" ON companies FOR SELECT USING (id = get_user_company_id());
CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (id = get_user_company_id());

-- notifications (user-specific)
CREATE POLICY "notifications_policy" ON notifications FOR ALL
  USING (company_id = get_user_company_id() AND (user_id IS NULL OR user_id = auth.uid()))
  WITH CHECK (company_id = get_user_company_id());

-- activity_logs (insert + select only)
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT USING (company_id = get_user_company_id());

-- Tables with direct company_id column
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'branches','warehouses','cashboxes','shifts',
    'accounts','categories','units','products','inventory_movements',
    'customers','suppliers','invoices','sales_returns','quotations',
    'purchases','purchase_returns','purchase_orders',
    'journal_entries','payments','bank_accounts','assets',
    'expense_categories','expenses','vouchers','employees','attendance','leaves',
    'payroll','crm_leads','crm_activities','settings','invoice_sequences','cost_centers'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "%s_all" ON public.%I FOR ALL USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id())',
      t, t
    );
  END LOOP;
END $$;

-- inventory: linked via warehouse_id → warehouses.company_id
CREATE POLICY "inventory_all" ON inventory FOR ALL
  USING (warehouse_id IN (SELECT id FROM warehouses WHERE company_id = get_user_company_id()))
  WITH CHECK (warehouse_id IN (SELECT id FROM warehouses WHERE company_id = get_user_company_id()));

-- invoice_items: linked via invoice_id → invoices.company_id
CREATE POLICY "invoice_items_all" ON invoice_items FOR ALL
  USING (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()))
  WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()));

-- purchase_items: linked via purchase_id → purchases.company_id
CREATE POLICY "purchase_items_all" ON purchase_items FOR ALL
  USING (purchase_id IN (SELECT id FROM purchases WHERE company_id = get_user_company_id()))
  WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE company_id = get_user_company_id()));

-- journal_entry_lines: linked via journal_entry_id → journal_entries.company_id
CREATE POLICY "journal_entry_lines_all" ON journal_entry_lines FOR ALL
  USING (journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id = get_user_company_id()))
  WITH CHECK (journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id = get_user_company_id()));

SELECT 'Functions and RLS created successfully' AS result;
