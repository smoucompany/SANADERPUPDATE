-- ============================================================
-- الملف الثامن: إكمال نظام ERP الاحترافي الشامل
-- يُشغَّل بعد الملفات السابقة (01 → 07)
-- ============================================================

-- ============================================================
-- إصلاح تعارض جدول invoice_sequences (موجود في 01 و 07)
-- ============================================================

-- تعديل الجدول الموجود بإضافة حقل last_number إن لم يكن موجوداً
ALTER TABLE invoice_sequences
  ADD COLUMN IF NOT EXISTS last_number  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS year         INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- إعادة بناء الـ UNIQUE constraint لدعم السنة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_sequences_company_id_type_year_key'
  ) THEN
    ALTER TABLE invoice_sequences
      DROP CONSTRAINT IF EXISTS invoice_sequences_company_id_type_key;
    ALTER TABLE invoice_sequences
      ADD CONSTRAINT invoice_sequences_company_id_type_year_key
      UNIQUE (company_id, type, year);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================
-- تعديل جدول المشتريات - إضافة حقول مفقودة
-- ============================================================
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS confirmed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by   UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS warehouse_id   UUID REFERENCES warehouses(id);

-- ============================================================
-- تعديل جدول المبيعات - إضافة حقول مفقودة
-- ============================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS confirmed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by   UUID REFERENCES users(id);

-- ============================================================
-- تعديل جدول المصروفات - إضافة حقل رقم المستند
-- ============================================================
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);

-- ============================================================
-- جدول حركات المستخدمين (لسجل التدقيق المتقدم)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs_v2 (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id),
  user_name      VARCHAR(255),
  user_role      VARCHAR(50),
  action         VARCHAR(50) NOT NULL,  -- create/update/delete/approve/lock/unlock/post/reverse
  table_name     VARCHAR(100) NOT NULL,
  record_id      UUID,
  record_number  VARCHAR(100),
  old_data       JSONB,
  new_data       JSONB,
  ip_address     VARCHAR(50),
  device_info    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_v2_company ON audit_logs_v2(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_v2_user    ON audit_logs_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_v2_table   ON audit_logs_v2(table_name, record_id);

ALTER TABLE audit_logs_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_v2_company" ON audit_logs_v2;
CREATE POLICY "audit_v2_company" ON audit_logs_v2
  USING (company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- ============================================================
-- FUNCTION: توليد أرقام المستندات (نسخة محسّنة)
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_document_number(
  p_company_id UUID,
  p_type       VARCHAR,
  p_prefix     VARCHAR DEFAULT NULL,
  p_year       INTEGER DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
  v_year    INTEGER;
  v_prefix  VARCHAR;
  v_next    INTEGER;
  v_padding INTEGER := 4;
  v_result  VARCHAR;
BEGIN
  v_year   := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);

  CASE p_type
    WHEN 'purchase'          THEN v_prefix := COALESCE(p_prefix, 'PUR');
    WHEN 'sale'              THEN v_prefix := COALESCE(p_prefix, 'INV');
    WHEN 'expense'           THEN v_prefix := COALESCE(p_prefix, 'EXP');
    WHEN 'cashbox_transfer'  THEN v_prefix := COALESCE(p_prefix, 'CBT');
    WHEN 'bank_deposit'      THEN v_prefix := COALESCE(p_prefix, 'DEP');
    WHEN 'bank_withdrawal'   THEN v_prefix := COALESCE(p_prefix, 'WIT');
    WHEN 'wh_transfer'       THEN v_prefix := COALESCE(p_prefix, 'WHT');
    WHEN 'payment'           THEN v_prefix := COALESCE(p_prefix, 'PAY');
    WHEN 'receipt'           THEN v_prefix := COALESCE(p_prefix, 'REC');
    WHEN 'JE'                THEN v_prefix := COALESCE(p_prefix, 'JE');
    WHEN 'purchase_return'   THEN v_prefix := COALESCE(p_prefix, 'PRN');
    WHEN 'sale_return'       THEN v_prefix := COALESCE(p_prefix, 'SRN');
    ELSE                          v_prefix := COALESCE(p_prefix, UPPER(LEFT(p_type, 3)));
  END CASE;

  INSERT INTO invoice_sequences (company_id, type, prefix, last_number, year, padding)
  VALUES (p_company_id, p_type, v_prefix, 0, v_year, v_padding)
  ON CONFLICT (company_id, type, year) DO NOTHING;

  UPDATE invoice_sequences
  SET last_number = last_number + 1,
      updated_at  = NOW()
  WHERE company_id = p_company_id AND type = p_type AND year = v_year
  RETURNING last_number INTO v_next;

  IF v_next IS NULL THEN
    v_next := 1;
    INSERT INTO invoice_sequences (company_id, type, prefix, last_number, year, padding)
    VALUES (p_company_id, p_type, v_prefix, 1, v_year, v_padding)
    ON CONFLICT DO NOTHING;
  END IF;

  v_result := v_prefix || '-' || v_year || '-' || LPAD(v_next::TEXT, v_padding, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: اعتماد فاتورة مشتريات (ترحيل إلى المخزن + قيود)
-- ============================================================
CREATE OR REPLACE FUNCTION approve_purchase(
  p_purchase_id UUID,
  p_user_id     UUID
) RETURNS JSONB AS $$
DECLARE
  v_purchase  RECORD;
  v_entry_id  UUID;
  v_result    JSONB;
BEGIN
  SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id;

  IF v_purchase IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'الفاتورة غير موجودة');
  END IF;

  IF v_purchase.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'الفاتورة مقفلة مسبقاً');
  END IF;

  IF v_purchase.status NOT IN ('draft', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'message', 'لا يمكن اعتماد فاتورة بهذه الحالة');
  END IF;

  -- ترحيل للمخزن
  PERFORM post_purchase_to_warehouse(p_purchase_id);

  -- إنشاء قيد محاسبي
  v_entry_id := create_purchase_journal_entry(p_purchase_id);

  -- تحديث حالة الفاتورة
  UPDATE purchases SET
    status        = 'confirmed',
    is_locked     = TRUE,
    locked_at     = NOW(),
    locked_by     = p_user_id,
    is_posted     = TRUE,
    confirmed_at  = NOW(),
    confirmed_by  = p_user_id,
    journal_entry_id = v_entry_id,
    updated_at    = NOW()
  WHERE id = p_purchase_id;

  -- تحديث رصيد المورد
  IF v_purchase.payment_method = 'deferred' AND v_purchase.supplier_id IS NOT NULL THEN
    PERFORM update_supplier_balance(v_purchase.supplier_id, v_purchase.total, 'increase');
  END IF;

  -- تحديث رصيد الخزينة الرئيسية إن كانت نقدي
  IF v_purchase.payment_method = 'cash' AND v_purchase.paid_amount > 0 THEN
    UPDATE cashboxes
    SET balance = balance - v_purchase.paid_amount, updated_at = NOW()
    WHERE company_id = v_purchase.company_id AND is_main = TRUE;
  END IF;

  -- تحديث رصيد البنك إن كان تحويل
  IF v_purchase.payment_method IN ('transfer', 'mada') AND v_purchase.bank_account_id IS NOT NULL
     AND v_purchase.paid_amount > 0 THEN
    PERFORM update_bank_balance(v_purchase.bank_account_id, v_purchase.paid_amount, 'out');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'تم اعتماد الفاتورة وترحيلها', 'journal_entry_id', v_entry_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: عكس فاتورة مشتريات (soft delete)
-- ============================================================
CREATE OR REPLACE FUNCTION reverse_purchase(
  p_purchase_id UUID,
  p_user_id     UUID,
  p_reason      TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase RECORD;
BEGIN
  SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id;

  IF v_purchase IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'الفاتورة غير موجودة');
  END IF;

  -- عكس آثار المخزون
  IF v_purchase.is_posted THEN
    UPDATE inventory_batches
    SET is_active = FALSE, updated_at = NOW()
    WHERE purchase_id = p_purchase_id;

    -- تحديث جدول inventory
    UPDATE inventory i
    SET quantity = GREATEST(0, i.quantity - ib.quantity_in),
        updated_at = NOW()
    FROM inventory_batches ib
    WHERE ib.purchase_id = p_purchase_id
      AND ib.warehouse_id = i.warehouse_id
      AND ib.product_id = i.product_id;
  END IF;

  -- عكس رصيد المورد
  IF v_purchase.payment_method = 'deferred' AND v_purchase.supplier_id IS NOT NULL THEN
    PERFORM update_supplier_balance(v_purchase.supplier_id, v_purchase.total, 'decrease');
  END IF;

  -- عكس الخزينة
  IF v_purchase.payment_method = 'cash' AND v_purchase.paid_amount > 0 THEN
    UPDATE cashboxes
    SET balance = balance + v_purchase.paid_amount, updated_at = NOW()
    WHERE company_id = v_purchase.company_id AND is_main = TRUE;
  END IF;

  -- عكس البنك
  IF v_purchase.payment_method IN ('transfer', 'mada') AND v_purchase.bank_account_id IS NOT NULL
     AND v_purchase.paid_amount > 0 THEN
    PERFORM update_bank_balance(v_purchase.bank_account_id, v_purchase.paid_amount, 'in');
  END IF;

  -- حذف ناعم
  UPDATE purchases SET
    deleted_at = NOW(),
    updated_at = NOW(),
    notes = COALESCE(notes, '') || ' | محذوف: ' || COALESCE(p_reason, 'بدون سبب')
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم حذف الفاتورة وعكس آثارها');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: اعتماد فاتورة مبيعات
-- ============================================================
CREATE OR REPLACE FUNCTION approve_sale(
  p_invoice_id UUID,
  p_user_id    UUID
) RETURNS JSONB AS $$
DECLARE
  v_invoice  RECORD;
  v_entry_id UUID;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;

  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'الفاتورة غير موجودة');
  END IF;

  IF v_invoice.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'الفاتورة مقفلة مسبقاً');
  END IF;

  -- التحقق من أن جميع المنتجات لها رسبي معتمد
  IF EXISTS (
    SELECT 1 FROM invoice_items ii
    WHERE ii.invoice_id = p_invoice_id
      AND ii.product_id IS NOT NULL
      AND NOT check_product_has_recipe(v_invoice.company_id, ii.product_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'بعض المنتجات ليس لها رسبي معتمد');
  END IF;

  -- خصم المواد الخام من المخزن 2
  PERFORM deduct_recipe_from_warehouse2(p_invoice_id);

  -- إنشاء قيد محاسبي
  v_entry_id := create_sale_journal_entry(p_invoice_id);

  -- قفل الفاتورة
  UPDATE invoices SET
    status           = CASE WHEN paid_amount >= total THEN 'paid' ELSE 'confirmed' END,
    is_locked        = TRUE,
    locked_at        = NOW(),
    locked_by        = p_user_id,
    is_posted        = TRUE,
    confirmed_at     = NOW(),
    confirmed_by     = p_user_id,
    journal_entry_id = v_entry_id,
    updated_at       = NOW()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم اعتماد فاتورة المبيعات', 'journal_entry_id', v_entry_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: إنشاء قيد تحويل خزينة
-- ============================================================
CREATE OR REPLACE FUNCTION post_cashbox_transfer(
  p_transfer_id UUID
) RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  SELECT * INTO v_transfer FROM cashbox_transfers WHERE id = p_transfer_id;

  -- تخفيض من الخزينة المحولة منها
  UPDATE cashboxes SET balance = balance - v_transfer.amount, updated_at = NOW()
  WHERE id = v_transfer.from_cashbox_id;

  -- إضافة للخزينة المحولة إليها
  UPDATE cashboxes SET balance = balance + v_transfer.amount, updated_at = NOW()
  WHERE id = v_transfer.to_cashbox_id;

  -- تسجيل حركة الخزينة (خروج)
  INSERT INTO cashbox_movements (company_id, cashbox_id, movement_date, reference_type, reference_id,
    reference_number, description, debit, credit)
  SELECT v_transfer.company_id, v_transfer.from_cashbox_id, v_transfer.transfer_date,
    'cashbox_transfer', v_transfer.id, v_transfer.transfer_number,
    'تحويل خزينة صادر', 0, v_transfer.amount;

  -- تسجيل حركة الخزينة (دخول)
  INSERT INTO cashbox_movements (company_id, cashbox_id, movement_date, reference_type, reference_id,
    reference_number, description, debit, credit)
  SELECT v_transfer.company_id, v_transfer.to_cashbox_id, v_transfer.transfer_date,
    'cashbox_transfer', v_transfer.id, v_transfer.transfer_number,
    'تحويل خزينة وارد', v_transfer.amount, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: إنشاء قيد مصروف
-- ============================================================
CREATE OR REPLACE FUNCTION post_expense(
  p_expense_id UUID
) RETURNS UUID AS $$
DECLARE
  v_expense   RECORD;
  v_entry_id  UUID;
  v_entry_num VARCHAR;
  v_exp_acc   UUID;
  v_cash_acc  UUID;
  v_bank_acc  UUID;
BEGIN
  SELECT e.*, ec.account_id AS exp_account_id
  INTO v_expense
  FROM expenses e
  LEFT JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.id = p_expense_id;

  v_entry_num := get_next_document_number(v_expense.company_id, 'JE', 'JE');

  -- حساب المصروف
  SELECT id INTO v_exp_acc FROM accounts
  WHERE company_id = v_expense.company_id
    AND id = v_expense.exp_account_id
  LIMIT 1;

  IF v_exp_acc IS NULL THEN
    SELECT id INTO v_exp_acc FROM accounts
    WHERE company_id = v_expense.company_id AND type = 'expense'
    ORDER BY code LIMIT 1;
  END IF;

  -- حساب الخزينة الرئيسية
  SELECT a.id INTO v_cash_acc
  FROM cashboxes c
  JOIN accounts a ON a.id = c.account_id
  WHERE c.company_id = v_expense.company_id AND c.is_main = TRUE
  LIMIT 1;

  -- حساب البنك
  IF v_expense.bank_account_id IS NOT NULL THEN
    SELECT account_id INTO v_bank_acc FROM bank_accounts
    WHERE id = v_expense.bank_account_id;
  END IF;

  INSERT INTO journal_entries (
    company_id, user_id, reference_type, reference_id,
    entry_number, entry_date, status, description,
    total_debit, total_credit, is_auto
  ) VALUES (
    v_expense.company_id, v_expense.user_id, 'expense', p_expense_id,
    v_entry_num, v_expense.expense_date, 'posted',
    'قيد مصروف: ' || v_expense.description,
    v_expense.total_amount, v_expense.total_amount, TRUE
  ) RETURNING id INTO v_entry_id;

  -- سطر المصروف (مدين)
  IF v_exp_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_exp_acc, v_expense.description, v_expense.total_amount, 0);
  END IF;

  -- سطر الدفع (دائن)
  IF v_expense.payment_method = 'cash' AND v_cash_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_cash_acc, 'دفع نقدي', 0, v_expense.total_amount);

    -- تخفيض رصيد الخزينة
    UPDATE cashboxes SET balance = balance - v_expense.total_amount, updated_at = NOW()
    WHERE company_id = v_expense.company_id AND is_main = TRUE;
  ELSIF v_expense.payment_method IN ('transfer', 'mada') AND v_expense.bank_account_id IS NOT NULL THEN
    IF v_bank_acc IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
      VALUES (v_entry_id, v_bank_acc, 'دفع بنكي', 0, v_expense.total_amount);
    END IF;

    -- تخفيض رصيد البنك
    PERFORM update_bank_balance(v_expense.bank_account_id, v_expense.total_amount, 'out');
  END IF;

  -- تحديث المصروف
  UPDATE expenses SET
    is_posted        = TRUE,
    journal_entry_id = v_entry_id,
    updated_at       = NOW()
  WHERE id = p_expense_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تقرير المخزن رقم 1 (الدفعات)
-- ============================================================
CREATE OR REPLACE FUNCTION get_warehouse1_report(
  p_company_id UUID,
  p_product_id UUID DEFAULT NULL
) RETURNS TABLE (
  product_id     UUID,
  product_name   VARCHAR,
  product_code   VARCHAR,
  batch_number   VARCHAR,
  purchase_number VARCHAR,
  supplier_name  VARCHAR,
  quantity_in    DECIMAL,
  quantity_out   DECIMAL,
  quantity_remaining DECIMAL,
  cost_price     DECIMAL,
  total_cost     DECIMAL,
  expiry_date    DATE,
  receipt_date   DATE,
  is_active      BOOLEAN
) AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  SELECT id INTO v_warehouse_id
  FROM warehouses
  WHERE company_id = p_company_id AND warehouse_role = 'incoming' AND deleted_at IS NULL
  ORDER BY warehouse_number LIMIT 1;

  RETURN QUERY
  SELECT
    ib.product_id,
    p.name_ar::VARCHAR,
    p.code::VARCHAR,
    ib.batch_number,
    ib.purchase_number,
    s.name_ar::VARCHAR AS supplier_name,
    ib.quantity_in,
    ib.quantity_out,
    ib.quantity_remaining,
    ib.cost_price,
    ib.total_cost,
    ib.expiry_date,
    ib.receipt_date,
    ib.is_active
  FROM inventory_batches ib
  JOIN products p ON p.id = ib.product_id
  LEFT JOIN suppliers s ON s.id = ib.supplier_id
  WHERE ib.company_id = p_company_id
    AND ib.warehouse_id = v_warehouse_id
    AND (p_product_id IS NULL OR ib.product_id = p_product_id)
  ORDER BY ib.receipt_date DESC, ib.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تقرير المخزن رقم 2 (مخزن التشغيل)
-- ============================================================
CREATE OR REPLACE FUNCTION get_warehouse2_report(
  p_company_id UUID,
  p_product_id UUID DEFAULT NULL
) RETURNS TABLE (
  product_id     UUID,
  product_name   VARCHAR,
  product_code   VARCHAR,
  batch_number   VARCHAR,
  quantity_in    DECIMAL,
  quantity_out   DECIMAL,
  quantity_remaining DECIMAL,
  cost_price     DECIMAL,
  expiry_date    DATE,
  receipt_date   DATE
) AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  SELECT id INTO v_warehouse_id
  FROM warehouses
  WHERE company_id = p_company_id AND warehouse_role = 'operations' AND deleted_at IS NULL
  ORDER BY warehouse_number LIMIT 1;

  RETURN QUERY
  SELECT
    ib.product_id,
    p.name_ar::VARCHAR,
    p.code::VARCHAR,
    ib.batch_number,
    ib.quantity_in,
    ib.quantity_out,
    ib.quantity_remaining,
    ib.cost_price,
    ib.expiry_date,
    ib.receipt_date
  FROM inventory_batches ib
  JOIN products p ON p.id = ib.product_id
  WHERE ib.company_id = p_company_id
    AND ib.warehouse_id = v_warehouse_id
    AND ib.quantity_remaining > 0
    AND (p_product_id IS NULL OR ib.product_id = p_product_id)
  ORDER BY ib.receipt_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: الحصول على كشف حساب المورد (محسّن)
-- ============================================================
CREATE OR REPLACE FUNCTION get_supplier_statement_full(
  p_company_id  UUID,
  p_supplier_id UUID,
  p_from_date   DATE DEFAULT '2000-01-01',
  p_to_date     DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  doc_date      DATE,
  doc_number    VARCHAR,
  doc_type      VARCHAR,
  doc_type_ar   VARCHAR,
  description   TEXT,
  debit         DECIMAL,
  credit        DECIMAL,
  balance       DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH transactions AS (
    -- فواتير المشتريات
    SELECT
      p.purchase_date AS doc_date,
      p.purchase_number::VARCHAR AS doc_number,
      'purchase'::VARCHAR AS doc_type,
      'فاتورة مشتريات'::VARCHAR AS doc_type_ar,
      ('فاتورة مشتريات رقم ' || p.purchase_number)::TEXT AS description,
      p.total AS debit,
      0::DECIMAL AS credit
    FROM purchases p
    WHERE p.company_id = p_company_id
      AND p.supplier_id = p_supplier_id
      AND p.purchase_date BETWEEN p_from_date AND p_to_date
      AND p.deleted_at IS NULL
      AND p.status NOT IN ('draft', 'cancelled')

    UNION ALL

    -- مردود المشتريات
    SELECT
      pr.return_date AS doc_date,
      pr.return_number::VARCHAR AS doc_number,
      'return'::VARCHAR AS doc_type,
      'مردود مشتريات'::VARCHAR AS doc_type_ar,
      ('مردود مشتريات رقم ' || pr.return_number)::TEXT AS description,
      0::DECIMAL AS debit,
      pr.total AS credit
    FROM purchase_returns pr
    WHERE pr.company_id = p_company_id
      AND pr.supplier_id = p_supplier_id
      AND pr.return_date BETWEEN p_from_date AND p_to_date

    UNION ALL

    -- إيصالات السداد
    SELECT
      py.payment_date AS doc_date,
      py.payment_number::VARCHAR AS doc_number,
      'payment'::VARCHAR AS doc_type,
      'إيصال سداد'::VARCHAR AS doc_type_ar,
      ('إيصال سداد رقم ' || py.payment_number)::TEXT AS description,
      0::DECIMAL AS debit,
      py.amount AS credit
    FROM payments py
    WHERE py.company_id = p_company_id
      AND py.supplier_id = p_supplier_id
      AND py.payment_date BETWEEN p_from_date AND p_to_date
      AND py.type = 'payment'
  )
  SELECT
    t.doc_date,
    t.doc_number,
    t.doc_type,
    t.doc_type_ar,
    t.description,
    t.debit,
    t.credit,
    SUM(t.debit - t.credit) OVER (
      ORDER BY t.doc_date, t.doc_number
      ROWS UNBOUNDED PRECEDING
    ) AS balance
  FROM transactions t
  ORDER BY t.doc_date, t.doc_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تحديث أرصدة الخزائن من الحركات
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_cashbox_balance(
  p_cashbox_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(debit - credit), 0)
  INTO v_balance
  FROM cashbox_movements
  WHERE cashbox_id = p_cashbox_id;

  UPDATE cashboxes SET balance = v_balance, updated_at = NOW()
  WHERE id = p_cashbox_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تسجيل حركة خزينة تلقائياً
-- ============================================================
CREATE OR REPLACE FUNCTION log_cashbox_movement(
  p_company_id     UUID,
  p_cashbox_id     UUID,
  p_ref_type       VARCHAR,
  p_ref_id         UUID,
  p_ref_number     VARCHAR,
  p_description    TEXT,
  p_debit          DECIMAL,
  p_credit         DECIMAL,
  p_user_id        UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  SELECT balance INTO v_current_balance FROM cashboxes WHERE id = p_cashbox_id;

  INSERT INTO cashbox_movements (
    company_id, cashbox_id, movement_date, reference_type, reference_id,
    reference_number, description, debit, credit, balance, user_id
  ) VALUES (
    p_company_id, p_cashbox_id, CURRENT_DATE, p_ref_type, p_ref_id,
    p_ref_number, p_description,
    p_debit, p_credit,
    COALESCE(v_current_balance, 0) + p_debit - p_credit,
    p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تسجيل حركة بنكية
-- ============================================================
CREATE OR REPLACE FUNCTION log_bank_movement(
  p_company_id       UUID,
  p_bank_account_id  UUID,
  p_ref_type         VARCHAR,
  p_ref_id           UUID,
  p_ref_number       VARCHAR,
  p_description      TEXT,
  p_debit            DECIMAL,
  p_credit           DECIMAL,
  p_user_id          UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  SELECT balance INTO v_current_balance FROM bank_accounts WHERE id = p_bank_account_id;

  INSERT INTO bank_movements (
    company_id, bank_account_id, movement_date, reference_type, reference_id,
    reference_number, description, debit, credit, balance, user_id
  ) VALUES (
    p_company_id, p_bank_account_id, CURRENT_DATE, p_ref_type, p_ref_id,
    p_ref_number, p_description,
    p_debit, p_credit,
    COALESCE(v_current_balance, 0) + p_debit - p_credit,
    p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: تسجيل حركة خزينة تلقائياً عند التحويل
-- ============================================================
CREATE OR REPLACE FUNCTION trg_cashbox_transfer_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_posted = TRUE AND (OLD IS NULL OR OLD.is_posted = FALSE) THEN
    PERFORM post_cashbox_transfer(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الـ trigger فقط إذا كان الجدول موجوداً (يحتاج الملف 07 مُشغَّلاً أولاً)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cashbox_transfers'
  ) THEN
    DROP TRIGGER IF EXISTS trg_cashbox_transfer_auto ON cashbox_transfers;
    EXECUTE '
      CREATE TRIGGER trg_cashbox_transfer_auto
        AFTER INSERT OR UPDATE ON cashbox_transfers
        FOR EACH ROW EXECUTE FUNCTION trg_cashbox_transfer_post()
    ';
    RAISE NOTICE 'Trigger trg_cashbox_transfer_auto created successfully';
  ELSE
    RAISE NOTICE 'Table cashbox_transfers not found — run sql/07_erp_enhancement.sql first, then re-run this file';
  END IF;
END $$;

-- ============================================================
-- FUNCTION: تهيئة الشركة الجديدة (مخازن + خزائن + حسابات)
-- ============================================================
CREATE OR REPLACE FUNCTION setup_new_company_full(
  p_company_id UUID
) RETURNS VOID AS $$
BEGIN
  -- إنشاء المخازن
  PERFORM setup_company_warehouses(p_company_id);

  -- إنشاء خزينة رئيسية
  IF NOT EXISTS(SELECT 1 FROM cashboxes WHERE company_id = p_company_id AND is_main = TRUE) THEN
    INSERT INTO cashboxes (company_id, name_ar, name_en, cashbox_type, is_main, is_default, balance)
    VALUES (p_company_id, 'الخزينة الرئيسية', 'Main Cashbox', 'main', TRUE, TRUE, 0);
  END IF;

  -- إنشاء تسلسلات أرقام المستندات
  INSERT INTO invoice_sequences (company_id, type, prefix, last_number, year)
  VALUES
    (p_company_id, 'purchase',         'PUR', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'sale',             'INV', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'expense',          'EXP', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'cashbox_transfer', 'CBT', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'bank_deposit',     'DEP', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'bank_withdrawal',  'WIT', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'wh_transfer',      'WHT', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'payment',          'PAY', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'receipt',          'REC', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'JE',               'JE',  0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'purchase_return',  'PRN', 0, EXTRACT(YEAR FROM NOW())::INTEGER),
    (p_company_id, 'sale_return',      'SRN', 0, EXTRACT(YEAR FROM NOW())::INTEGER)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS - تفعيل الصلاحيات للجداول المفقودة
-- ============================================================

ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences  ENABLE ROW LEVEL SECURITY;

-- Helper function لاسترجاع company_id
CREATE OR REPLACE FUNCTION get_user_company_id() RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies
DO $$
DECLARE
  t TEXT;
  policies TEXT[][] := ARRAY[
    ['expenses',           'Company isolation expenses'],
    ['expense_categories', 'Company isolation expense_cat'],
    ['invoice_sequences',  'Company isolation inv_seq']
  ];
  p TEXT[];
BEGIN
  FOREACH p SLICE 1 IN ARRAY policies LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p[2], p[1]);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (company_id = get_user_company_id())',
      p[2], p[1]
    );
  END LOOP;
END $$;

-- ============================================================
-- INDEXES إضافية للأداء
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_expenses_company    ON expenses(company_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category   ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted    ON expenses(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_supplier   ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_company    ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_batches_remain  ON inventory_batches(warehouse_id, product_id)
  WHERE quantity_remaining > 0 AND is_active = TRUE;

-- ============================================================
-- FUNCTION: dashboard summary شامل
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_company_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_sales',
      (SELECT COALESCE(SUM(total), 0) FROM invoices
       WHERE company_id = p_company_id AND deleted_at IS NULL
         AND status NOT IN ('draft', 'cancelled')
         AND invoice_date >= DATE_TRUNC('month', CURRENT_DATE)),
    'total_purchases',
      (SELECT COALESCE(SUM(total), 0) FROM purchases
       WHERE company_id = p_company_id AND deleted_at IS NULL
         AND status NOT IN ('draft', 'cancelled')
         AND purchase_date >= DATE_TRUNC('month', CURRENT_DATE)),
    'total_expenses',
      (SELECT COALESCE(SUM(total_amount), 0) FROM expenses
       WHERE company_id = p_company_id AND deleted_at IS NULL
         AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)),
    'cashbox_balance',
      (SELECT COALESCE(SUM(balance), 0) FROM cashboxes
       WHERE company_id = p_company_id AND deleted_at IS NULL),
    'bank_balance',
      (SELECT COALESCE(SUM(balance), 0) FROM bank_accounts
       WHERE company_id = p_company_id AND deleted_at IS NULL AND is_active = TRUE),
    'pending_purchases',
      (SELECT COUNT(*) FROM purchases
       WHERE company_id = p_company_id AND status = 'draft' AND deleted_at IS NULL),
    'low_stock_items',
      (SELECT COUNT(DISTINCT product_id) FROM inventory
       WHERE warehouse_id IN (
         SELECT id FROM warehouses WHERE company_id = p_company_id AND warehouse_role = 'operations'
       )),
    'suppliers_balance',
      (SELECT COALESCE(SUM(balance), 0) FROM suppliers
       WHERE company_id = p_company_id AND deleted_at IS NULL)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'ERP Complete schema v8 created successfully' AS result;
