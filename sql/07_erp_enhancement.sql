-- ============================================================
-- الملف السابع: تحسينات شاملة لنظام ERP المطعم
-- يشمل: الخزائن، البنك، المصروفات، المخازن، الرسبي، الصلاحيات
-- ============================================================

-- ============================================================
-- ENUM TYPES الجديدة
-- ============================================================
DO $$ BEGIN
  CREATE TYPE cashbox_type AS ENUM ('main','sub');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE warehouse_role AS ENUM ('incoming','operations','general');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bank_transaction_type AS ENUM ('deposit','withdrawal','transfer','expense','purchase_payment','sale_receipt');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create','update','delete','approve','reject','lock','unlock','post','reverse');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role_v2 AS ENUM ('system_admin','financial_manager','warehouse_manager','cashier','regular_user');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- تعديل جدول الخزائن - إضافة نوع الخزينة
-- ============================================================
ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS cashbox_type    cashbox_type DEFAULT 'sub',
  ADD COLUMN IF NOT EXISTS is_main         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;

-- ============================================================
-- جدول مستندات تحويل الخزائن
-- ============================================================
CREATE TABLE IF NOT EXISTS cashbox_transfers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transfer_number  VARCHAR(50) NOT NULL,
  transfer_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  from_cashbox_id  UUID NOT NULL REFERENCES cashboxes(id),
  to_cashbox_id    UUID NOT NULL REFERENCES cashboxes(id),
  amount           DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  notes            TEXT,
  user_id          UUID REFERENCES users(id),
  is_posted        BOOLEAN DEFAULT TRUE,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, transfer_number)
);

-- ============================================================
-- جدول حركات الخزائن (تفاصيل كل حركة)
-- ============================================================
CREATE TABLE IF NOT EXISTS cashbox_movements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cashbox_id       UUID NOT NULL REFERENCES cashboxes(id),
  movement_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type   VARCHAR(50),   -- 'invoice','purchase','transfer','expense','voucher'
  reference_id     UUID,
  reference_number VARCHAR(50),
  description      TEXT,
  debit            DECIMAL(15,2) DEFAULT 0,   -- إيراد (دخول)
  credit           DECIMAL(15,2) DEFAULT 0,   -- مصروف (خروج)
  balance          DECIMAL(15,2) DEFAULT 0,
  user_id          UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- تعديل جدول الحسابات البنكية
-- ============================================================
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS branch         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS swift_code     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contact_phone  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ;

-- ============================================================
-- جدول إيداعات البنك
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_deposits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deposit_number   VARCHAR(50) NOT NULL,
  deposit_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id),
  depositor_name   VARCHAR(255),
  depositor_entity VARCHAR(255),
  amount           DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  reference        VARCHAR(255),
  notes            TEXT,
  user_id          UUID REFERENCES users(id),
  is_posted        BOOLEAN DEFAULT TRUE,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, deposit_number)
);

-- ============================================================
-- جدول سحوبات البنك
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_withdrawals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  withdrawal_number VARCHAR(50) NOT NULL,
  withdrawal_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account_id   UUID NOT NULL REFERENCES bank_accounts(id),
  beneficiary_name  VARCHAR(255),
  beneficiary_entity VARCHAR(255),
  amount            DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  reference         VARCHAR(255),
  notes             TEXT,
  user_id           UUID REFERENCES users(id),
  is_posted         BOOLEAN DEFAULT TRUE,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, withdrawal_number)
);

-- ============================================================
-- جدول حركات البنك
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_movements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id  UUID NOT NULL REFERENCES bank_accounts(id),
  movement_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type   VARCHAR(50),
  reference_id     UUID,
  reference_number VARCHAR(50),
  description      TEXT,
  debit            DECIMAL(15,2) DEFAULT 0,
  credit           DECIMAL(15,2) DEFAULT 0,
  balance          DECIMAL(15,2) DEFAULT 0,
  user_id          UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- تعديل جدول المصروفات
-- ============================================================
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS bank_account_id   UUID REFERENCES bank_accounts(id),
  ADD COLUMN IF NOT EXISTS is_locked         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_posted         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS journal_entry_id  UUID,
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ;

-- ============================================================
-- تعديل جدول فئات المصروفات
-- ============================================================
ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS code        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS name_en     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- تعديل جدول المخازن - إضافة دور المخزن
-- ============================================================
ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS warehouse_role  warehouse_role DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS warehouse_number INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;

-- ============================================================
-- جدول دفعات المخزن (Batches) - للمخزن رقم 1
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_batches (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  warehouse_id     UUID NOT NULL REFERENCES warehouses(id),
  purchase_id      UUID REFERENCES purchases(id),
  batch_number     VARCHAR(100),
  purchase_number  VARCHAR(50),
  supplier_id      UUID REFERENCES suppliers(id),
  quantity_in      DECIMAL(15,3) NOT NULL DEFAULT 0,
  quantity_out     DECIMAL(15,3) NOT NULL DEFAULT 0,
  quantity_remaining DECIMAL(15,3) GENERATED ALWAYS AS (quantity_in - quantity_out) STORED,
  cost_price       DECIMAL(15,4) DEFAULT 0,
  total_cost       DECIMAL(15,2) GENERATED ALWAYS AS ((quantity_in - quantity_out) * cost_price) STORED,
  expiry_date      DATE,
  receipt_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active        BOOLEAN DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON inventory_batches(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_purchase ON inventory_batches(purchase_id);

-- ============================================================
-- جدول تحويلات المخازن (المخزن 1 → المخزن 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transfer_number   VARCHAR(50) NOT NULL,
  transfer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  user_id           UUID REFERENCES users(id),
  status            VARCHAR(20) DEFAULT 'confirmed',
  notes             TEXT,
  total_cost        DECIMAL(15,2) DEFAULT 0,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, transfer_number)
);

CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id       UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  product_name      VARCHAR(255) NOT NULL,
  batch_id          UUID REFERENCES inventory_batches(id),
  quantity          DECIMAL(15,3) NOT NULL,
  unit_cost         DECIMAL(15,4) DEFAULT 0,
  total_cost        DECIMAL(15,4) DEFAULT 0,
  expiry_date       DATE,
  notes             TEXT,
  sort_order        INTEGER DEFAULT 0
);

-- ============================================================
-- جدول الرسبي (Recipe Management)
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  name_ar         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  serving_size    DECIMAL(10,3) DEFAULT 1,
  serving_unit    VARCHAR(50),
  preparation_time INTEGER,
  instructions    TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  is_approved     BOOLEAN DEFAULT FALSE,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  version         INTEGER DEFAULT 1,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, product_id)
);

CREATE TABLE IF NOT EXISTS recipe_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id      UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id),
  product_name   VARCHAR(255) NOT NULL,
  quantity       DECIMAL(15,4) NOT NULL,
  unit_id        UUID REFERENCES units(id),
  unit_name      VARCHAR(50),
  notes          TEXT,
  sort_order     INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_product ON recipe_items(product_id);

-- ============================================================
-- تعديل جدول فواتير المشتريات - قفل الفاتورة
-- ============================================================
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS is_locked         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_posted         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS journal_entry_id  UUID,
  ADD COLUMN IF NOT EXISTS bank_account_id   UUID REFERENCES bank_accounts(id);

-- ============================================================
-- تعديل جدول فواتير المبيعات - قفل الفاتورة
-- ============================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_locked         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_posted         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS journal_entry_id  UUID,
  ADD COLUMN IF NOT EXISTS bank_account_id   UUID REFERENCES bank_accounts(id);

-- ============================================================
-- جدول سجل التدقيق (Audit Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id),
  user_name      VARCHAR(255),
  user_role      VARCHAR(50),
  action         audit_action NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, record_id);

-- ============================================================
-- جدول صلاحيات المستخدمين التفصيلية
-- ============================================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module       VARCHAR(50) NOT NULL,   -- 'purchases','sales','inventory','accounting','hr','crm'
  can_view     BOOLEAN DEFAULT FALSE,
  can_create   BOOLEAN DEFAULT FALSE,
  can_edit     BOOLEAN DEFAULT FALSE,
  can_delete   BOOLEAN DEFAULT FALSE,
  can_approve  BOOLEAN DEFAULT FALSE,
  can_export   BOOLEAN DEFAULT FALSE,
  can_lock     BOOLEAN DEFAULT FALSE,
  can_unlock   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module)
);

-- ============================================================
-- تسلسل أرقام المستندات - إضافة أنواع جديدة
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  prefix       VARCHAR(20) DEFAULT '',
  last_number  INTEGER DEFAULT 0,
  year         INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  padding      INTEGER DEFAULT 4,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, type, year)
);

-- ============================================================
-- FUNCTIONS: توليد أرقام المستندات التلقائية
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
  v_padding INTEGER;
BEGIN
  v_year   := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_prefix := COALESCE(p_prefix, UPPER(LEFT(p_type, 3)));
  v_padding := 4;

  INSERT INTO invoice_sequences (company_id, type, prefix, last_number, year, padding)
  VALUES (p_company_id, p_type, v_prefix, 0, v_year, v_padding)
  ON CONFLICT (company_id, type, year) DO NOTHING;

  UPDATE invoice_sequences
  SET last_number = last_number + 1,
      updated_at  = NOW()
  WHERE company_id = p_company_id AND type = p_type AND year = v_year
  RETURNING last_number INTO v_next;

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_next::TEXT, v_padding, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تحديث رصيد الخزينة
-- ============================================================
CREATE OR REPLACE FUNCTION update_cashbox_balance(
  p_cashbox_id UUID,
  p_amount     DECIMAL,
  p_direction  VARCHAR   -- 'in' or 'out'
) RETURNS VOID AS $$
BEGIN
  IF p_direction = 'in' THEN
    UPDATE cashboxes SET balance = balance + p_amount, updated_at = NOW()
    WHERE id = p_cashbox_id;
  ELSE
    UPDATE cashboxes SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = p_cashbox_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تحديث رصيد البنك
-- ============================================================
CREATE OR REPLACE FUNCTION update_bank_balance(
  p_bank_account_id UUID,
  p_amount          DECIMAL,
  p_direction       VARCHAR
) RETURNS VOID AS $$
BEGIN
  IF p_direction = 'in' THEN
    UPDATE bank_accounts SET balance = balance + p_amount, updated_at = NOW()
    WHERE id = p_bank_account_id;
  ELSE
    UPDATE bank_accounts SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = p_bank_account_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: ترحيل فاتورة مشتريات إلى المخزن رقم 1
-- ============================================================
CREATE OR REPLACE FUNCTION post_purchase_to_warehouse(
  p_purchase_id UUID
) RETURNS VOID AS $$
DECLARE
  v_purchase     RECORD;
  v_item         RECORD;
  v_warehouse_id UUID;
  v_batch_num    VARCHAR;
BEGIN
  -- جلب بيانات الفاتورة
  SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id;

  -- البحث عن المخزن رقم 1 (incoming)
  SELECT id INTO v_warehouse_id
  FROM warehouses
  WHERE company_id = v_purchase.company_id
    AND warehouse_role = 'incoming'
    AND deleted_at IS NULL
  ORDER BY warehouse_number ASC
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    -- إن لم يوجد مخزن وارد، استخدم المخزن الافتراضي
    SELECT id INTO v_warehouse_id
    FROM warehouses
    WHERE company_id = v_purchase.company_id
      AND is_default = TRUE
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مخزن وارد معرّف للشركة';
  END IF;

  -- ترحيل كل صنف
  FOR v_item IN
    SELECT * FROM purchase_items WHERE purchase_id = p_purchase_id
  LOOP
    v_batch_num := COALESCE(v_item.batch_number, 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || FLOOR(RANDOM()*10000)::TEXT);

    -- إنشاء دفعة في جدول الدفعات
    INSERT INTO inventory_batches (
      company_id, product_id, warehouse_id, purchase_id,
      batch_number, purchase_number, supplier_id,
      quantity_in, quantity_out, cost_price,
      expiry_date, receipt_date
    ) VALUES (
      v_purchase.company_id, v_item.product_id, v_warehouse_id, p_purchase_id,
      v_batch_num, v_purchase.purchase_number, v_purchase.supplier_id,
      v_item.quantity, 0, v_item.unit_price,
      v_item.expiry_date, v_purchase.purchase_date
    );

    -- تحديث أو إنشاء سجل inventory
    INSERT INTO inventory (product_id, warehouse_id, quantity, batch_number, expiry_date)
    VALUES (v_item.product_id, v_warehouse_id, v_item.quantity, v_batch_num, v_item.expiry_date)
    ON CONFLICT (product_id, warehouse_id, batch_number) DO UPDATE
    SET quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW();

    -- تسجيل حركة المخزون
    INSERT INTO inventory_movements (
      company_id, product_id, warehouse_id,
      reference_type, reference_id,
      movement_type, quantity, cost_price,
      batch_number, expiry_date,
      user_id
    ) VALUES (
      v_purchase.company_id, v_item.product_id, v_warehouse_id,
      'purchase', p_purchase_id,
      'in', v_item.quantity, v_item.unit_price,
      v_batch_num, v_item.expiry_date,
      v_purchase.user_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: إنشاء قيود محاسبية لفاتورة مشتريات
-- ============================================================
CREATE OR REPLACE FUNCTION create_purchase_journal_entry(
  p_purchase_id UUID
) RETURNS UUID AS $$
DECLARE
  v_purchase    RECORD;
  v_entry_id    UUID;
  v_entry_num   VARCHAR;
  v_supplier_acc UUID;
  v_inventory_acc UUID;
  v_vat_acc     UUID;
  v_cash_acc    UUID;
  v_bank_acc_gl UUID;
BEGIN
  SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id;

  -- توليد رقم قيد
  v_entry_num := get_next_document_number(v_purchase.company_id, 'JE', 'JE');

  -- جلب الحسابات الأساسية
  SELECT id INTO v_supplier_acc FROM accounts
  WHERE company_id = v_purchase.company_id AND code = '2001' LIMIT 1;

  SELECT id INTO v_inventory_acc FROM accounts
  WHERE company_id = v_purchase.company_id AND code = '1301' LIMIT 1;

  SELECT id INTO v_vat_acc FROM accounts
  WHERE company_id = v_purchase.company_id AND (code = '2101' OR code LIKE '%ضريبة%') LIMIT 1;

  SELECT id INTO v_cash_acc FROM accounts
  WHERE company_id = v_purchase.company_id AND (code = '1011' OR code LIKE '%خزينة%') LIMIT 1;

  -- إنشاء قيد المحاسبة
  INSERT INTO journal_entries (
    company_id, user_id, reference_type, reference_id,
    entry_number, entry_date, status, description,
    total_debit, total_credit, is_auto
  ) VALUES (
    v_purchase.company_id, v_purchase.user_id, 'purchase', p_purchase_id,
    v_entry_num, v_purchase.purchase_date, 'posted',
    'قيد فاتورة مشتريات رقم ' || v_purchase.purchase_number,
    v_purchase.total, v_purchase.total, TRUE
  ) RETURNING id INTO v_entry_id;

  -- سطر المخزون (مدين)
  IF v_inventory_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_inventory_acc, 'بضاعة مشتراة', v_purchase.subtotal - v_purchase.discount_amount, 0);
  END IF;

  -- سطر ضريبة القيمة المضافة (مدين)
  IF v_purchase.tax_amount > 0 AND v_vat_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_vat_acc, 'ضريبة قيمة مضافة مشتريات', v_purchase.tax_amount, 0);
  END IF;

  -- سطر طريقة السداد (دائن)
  IF v_purchase.payment_method = 'cash' AND v_cash_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_cash_acc, 'سداد نقدي', 0, v_purchase.total);
  ELSIF v_purchase.payment_method IN ('transfer','mada') AND v_bank_acc_gl IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_bank_acc_gl, 'سداد بنكي', 0, v_purchase.total);
  ELSIF v_purchase.payment_method = 'deferred' AND v_supplier_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_supplier_acc, 'مديونية مورد', 0, v_purchase.total);
  END IF;

  -- ربط القيد بالفاتورة
  UPDATE purchases SET journal_entry_id = v_entry_id WHERE id = p_purchase_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: إنشاء قيود محاسبية لفاتورة مبيعات
-- ============================================================
CREATE OR REPLACE FUNCTION create_sale_journal_entry(
  p_invoice_id UUID
) RETURNS UUID AS $$
DECLARE
  v_invoice     RECORD;
  v_entry_id    UUID;
  v_entry_num   VARCHAR;
  v_revenue_acc UUID;
  v_ar_acc      UUID;
  v_vat_acc     UUID;
  v_cash_acc    UUID;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;

  v_entry_num := get_next_document_number(v_invoice.company_id, 'JE', 'JE');

  SELECT id INTO v_revenue_acc FROM accounts
  WHERE company_id = v_invoice.company_id AND (code = '4001' OR type = 'revenue') LIMIT 1;

  SELECT id INTO v_ar_acc FROM accounts
  WHERE company_id = v_invoice.company_id AND (code = '1201' OR code LIKE '%عملاء%') LIMIT 1;

  SELECT id INTO v_vat_acc FROM accounts
  WHERE company_id = v_invoice.company_id AND (code = '2101' OR code LIKE '%ضريبة%') LIMIT 1;

  SELECT id INTO v_cash_acc FROM accounts
  WHERE company_id = v_invoice.company_id AND (code = '1011' OR code LIKE '%خزينة%') LIMIT 1;

  INSERT INTO journal_entries (
    company_id, user_id, reference_type, reference_id,
    entry_number, entry_date, status, description,
    total_debit, total_credit, is_auto
  ) VALUES (
    v_invoice.company_id, v_invoice.user_id, 'sale', p_invoice_id,
    v_entry_num, v_invoice.invoice_date, 'posted',
    'قيد فاتورة مبيعات رقم ' || v_invoice.invoice_number,
    v_invoice.total, v_invoice.total, TRUE
  ) RETURNING id INTO v_entry_id;

  -- سطر الإيراد (دائن)
  IF v_revenue_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_revenue_acc, 'إيراد مبيعات', 0, v_invoice.subtotal - v_invoice.discount_amount);
  END IF;

  -- سطر الضريبة (دائن)
  IF v_invoice.tax_amount > 0 AND v_vat_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_vat_acc, 'ضريبة قيمة مضافة مبيعات', 0, v_invoice.tax_amount);
  END IF;

  -- سطر التحصيل (مدين)
  IF v_cash_acc IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
    VALUES (v_entry_id, v_cash_acc, 'تحصيل نقدي', v_invoice.total, 0);
  END IF;

  UPDATE invoices SET journal_entry_id = v_entry_id WHERE id = p_invoice_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: خصم مواد الرسبي من المخزن رقم 2 عند البيع (FIFO)
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_recipe_from_warehouse2(
  p_invoice_id UUID
) RETURNS VOID AS $$
DECLARE
  v_invoice       RECORD;
  v_item          RECORD;
  v_recipe        RECORD;
  v_recipe_item   RECORD;
  v_warehouse2_id UUID;
  v_needed        DECIMAL;
  v_batch         RECORD;
  v_deduct        DECIMAL;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;

  -- البحث عن مخزن التشغيل (2)
  SELECT id INTO v_warehouse2_id
  FROM warehouses
  WHERE company_id = v_invoice.company_id
    AND warehouse_role = 'operations'
    AND deleted_at IS NULL
  ORDER BY warehouse_number ASC LIMIT 1;

  IF v_warehouse2_id IS NULL THEN RETURN; END IF;

  FOR v_item IN
    SELECT * FROM invoice_items WHERE invoice_id = p_invoice_id
  LOOP
    -- جلب الرسبي المعتمد للمنتج
    SELECT r.* INTO v_recipe
    FROM recipes r
    WHERE r.company_id = v_invoice.company_id
      AND r.product_id = v_item.product_id
      AND r.is_approved = TRUE
      AND r.is_active = TRUE
    LIMIT 1;

    IF v_recipe.id IS NULL THEN CONTINUE; END IF;

    FOR v_recipe_item IN
      SELECT * FROM recipe_items WHERE recipe_id = v_recipe.id
    LOOP
      v_needed := v_recipe_item.quantity * v_item.quantity;

      -- FIFO: خصم من أقدم دفعة أولاً
      FOR v_batch IN
        SELECT * FROM inventory_batches
        WHERE product_id = v_recipe_item.product_id
          AND warehouse_id = v_warehouse2_id
          AND quantity_remaining > 0
          AND is_active = TRUE
        ORDER BY receipt_date ASC, expiry_date ASC NULLS LAST
      LOOP
        IF v_needed <= 0 THEN EXIT; END IF;

        v_deduct := LEAST(v_needed, v_batch.quantity_remaining);

        UPDATE inventory_batches
        SET quantity_out = quantity_out + v_deduct,
            updated_at   = NOW()
        WHERE id = v_batch.id;

        UPDATE inventory
        SET quantity   = quantity - v_deduct,
            updated_at = NOW()
        WHERE product_id = v_recipe_item.product_id
          AND warehouse_id = v_warehouse2_id
          AND batch_number = v_batch.batch_number;

        INSERT INTO inventory_movements (
          company_id, product_id, warehouse_id,
          reference_type, reference_id,
          movement_type, quantity, cost_price,
          batch_number, user_id
        ) VALUES (
          v_invoice.company_id, v_recipe_item.product_id, v_warehouse2_id,
          'sale', p_invoice_id,
          'out', v_deduct, v_batch.cost_price,
          v_batch.batch_number, v_invoice.user_id
        );

        v_needed := v_needed - v_deduct;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تحويل من المخزن 1 إلى المخزن 2 (FIFO)
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_warehouse_fifo(
  p_transfer_id UUID
) RETURNS VOID AS $$
DECLARE
  v_transfer  RECORD;
  v_item      RECORD;
  v_batch     RECORD;
  v_needed    DECIMAL;
  v_deduct    DECIMAL;
BEGIN
  SELECT * INTO v_transfer FROM warehouse_transfers WHERE id = p_transfer_id;

  FOR v_item IN
    SELECT * FROM warehouse_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    v_needed := v_item.quantity;

    IF v_item.batch_id IS NOT NULL THEN
      -- تحويل من دفعة محددة
      SELECT * INTO v_batch FROM inventory_batches WHERE id = v_item.batch_id;
      v_deduct := LEAST(v_needed, v_batch.quantity_remaining);

      UPDATE inventory_batches
      SET quantity_out = quantity_out + v_deduct, updated_at = NOW()
      WHERE id = v_batch.id;

      UPDATE inventory
      SET quantity = quantity - v_deduct, updated_at = NOW()
      WHERE product_id = v_item.product_id
        AND warehouse_id = v_transfer.from_warehouse_id
        AND batch_number = v_batch.batch_number;

      -- إضافة للمخزن 2
      INSERT INTO inventory_batches (
        company_id, product_id, warehouse_id, purchase_id,
        batch_number, quantity_in, quantity_out,
        cost_price, expiry_date, receipt_date
      ) VALUES (
        v_transfer.company_id, v_item.product_id, v_transfer.to_warehouse_id, v_batch.purchase_id,
        v_batch.batch_number, v_deduct, 0,
        v_batch.cost_price, v_batch.expiry_date, v_transfer.transfer_date
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO inventory (product_id, warehouse_id, quantity, batch_number, expiry_date)
      VALUES (v_item.product_id, v_transfer.to_warehouse_id, v_deduct, v_batch.batch_number, v_batch.expiry_date)
      ON CONFLICT (product_id, warehouse_id, batch_number) DO UPDATE
      SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW();
    ELSE
      -- FIFO: من أقدم دفعة
      FOR v_batch IN
        SELECT * FROM inventory_batches
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_transfer.from_warehouse_id
          AND quantity_remaining > 0
        ORDER BY receipt_date ASC, expiry_date ASC NULLS LAST
      LOOP
        IF v_needed <= 0 THEN EXIT; END IF;
        v_deduct := LEAST(v_needed, v_batch.quantity_remaining);

        UPDATE inventory_batches
        SET quantity_out = quantity_out + v_deduct, updated_at = NOW()
        WHERE id = v_batch.id;

        UPDATE inventory
        SET quantity = quantity - v_deduct, updated_at = NOW()
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_transfer.from_warehouse_id
          AND batch_number = v_batch.batch_number;

        INSERT INTO inventory (product_id, warehouse_id, quantity, batch_number, expiry_date)
        VALUES (v_item.product_id, v_transfer.to_warehouse_id, v_deduct, v_batch.batch_number, v_batch.expiry_date)
        ON CONFLICT (product_id, warehouse_id, batch_number) DO UPDATE
        SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW();

        v_needed := v_needed - v_deduct;
      END LOOP;
    END IF;

    -- تسجيل حركة التحويل
    INSERT INTO inventory_movements (
      company_id, product_id, warehouse_id, from_warehouse_id,
      reference_type, reference_id,
      movement_type, quantity, user_id
    ) VALUES (
      v_transfer.company_id, v_item.product_id, v_transfer.to_warehouse_id, v_transfer.from_warehouse_id,
      'warehouse_transfer', p_transfer_id,
      'transfer', v_item.quantity, v_transfer.user_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: تحديث رصيد المورد
-- ============================================================
CREATE OR REPLACE FUNCTION update_supplier_balance(
  p_supplier_id UUID,
  p_amount      DECIMAL,
  p_direction   VARCHAR  -- 'increase' or 'decrease'
) RETURNS VOID AS $$
BEGIN
  IF p_direction = 'increase' THEN
    UPDATE suppliers SET balance = balance + p_amount, updated_at = NOW()
    WHERE id = p_supplier_id;
  ELSE
    UPDATE suppliers SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = p_supplier_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: الحصول على كشف حساب المورد
-- ============================================================
CREATE OR REPLACE FUNCTION get_supplier_statement(
  p_company_id  UUID,
  p_supplier_id UUID,
  p_from_date   DATE DEFAULT '2000-01-01',
  p_to_date     DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  doc_date     DATE,
  doc_number   VARCHAR,
  doc_type     VARCHAR,
  description  TEXT,
  debit        DECIMAL,
  credit       DECIMAL,
  balance      DECIMAL
) AS $$
DECLARE
  v_running_balance DECIMAL := 0;
BEGIN
  RETURN QUERY
  WITH transactions AS (
    -- فواتير المشتريات
    SELECT
      p.purchase_date     AS doc_date,
      p.purchase_number   AS doc_number,
      'purchase'::VARCHAR AS doc_type,
      'فاتورة مشتريات'::TEXT AS description,
      p.total             AS debit,
      0::DECIMAL          AS credit
    FROM purchases p
    WHERE p.company_id = p_company_id
      AND p.supplier_id = p_supplier_id
      AND p.purchase_date BETWEEN p_from_date AND p_to_date
      AND p.deleted_at IS NULL
      AND p.status NOT IN ('draft','cancelled')

    UNION ALL

    -- مردود المشتريات
    SELECT
      pr.return_date      AS doc_date,
      pr.return_number    AS doc_number,
      'return'::VARCHAR   AS doc_type,
      'مردود مشتريات'::TEXT AS description,
      0::DECIMAL          AS debit,
      pr.total            AS credit
    FROM purchase_returns pr
    WHERE pr.company_id = p_company_id
      AND pr.supplier_id = p_supplier_id
      AND pr.return_date BETWEEN p_from_date AND p_to_date

    UNION ALL

    -- إيصالات السداد
    SELECT
      py.payment_date     AS doc_date,
      py.payment_number   AS doc_number,
      'payment'::VARCHAR  AS doc_type,
      'إيصال سداد'::TEXT  AS description,
      0::DECIMAL          AS debit,
      py.amount           AS credit
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
    t.description,
    t.debit,
    t.credit,
    SUM(t.debit - t.credit) OVER (ORDER BY t.doc_date, t.doc_number ROWS UNBOUNDED PRECEDING) AS balance
  FROM transactions t
  ORDER BY t.doc_date, t.doc_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: فحص توفر الرسبي للمنتج
-- ============================================================
CREATE OR REPLACE FUNCTION check_product_has_recipe(
  p_company_id UUID,
  p_product_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM recipes
    WHERE company_id = p_company_id
      AND product_id = p_product_id
      AND is_approved = TRUE
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cashbox_transfers_updated_at
  BEFORE UPDATE ON cashbox_transfers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_bank_deposits_updated_at
  BEFORE UPDATE ON bank_deposits
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_bank_withdrawals_updated_at
  BEFORE UPDATE ON bank_withdrawals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger: تحديث رصيد البنك عند الإيداع
CREATE OR REPLACE FUNCTION trg_bank_deposit_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_posted = TRUE AND (OLD.is_posted = FALSE OR OLD IS NULL) THEN
    PERFORM update_bank_balance(NEW.bank_account_id, NEW.amount, 'in');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bank_deposit_balance
  AFTER INSERT OR UPDATE ON bank_deposits
  FOR EACH ROW EXECUTE FUNCTION trg_bank_deposit_post();

-- Trigger: تحديث رصيد البنك عند السحب
CREATE OR REPLACE FUNCTION trg_bank_withdrawal_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_posted = TRUE AND (OLD.is_posted = FALSE OR OLD IS NULL) THEN
    PERFORM update_bank_balance(NEW.bank_account_id, NEW.amount, 'out');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bank_withdrawal_balance
  AFTER INSERT OR UPDATE ON bank_withdrawals
  FOR EACH ROW EXECUTE FUNCTION trg_bank_withdrawal_post();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE cashbox_transfers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbox_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_deposits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_withdrawals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_movements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions   ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company isolation" ON cashbox_transfers
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON cashbox_movements
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON bank_deposits
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON bank_withdrawals
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON bank_movements
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON inventory_batches
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON warehouse_transfers
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON warehouse_transfer_items
  USING (transfer_id IN (
    SELECT id FROM warehouse_transfers WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company isolation" ON recipes
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON recipe_items
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company isolation" ON audit_logs
  USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON user_permissions
  USING (company_id = get_user_company_id());

-- ============================================================
-- INDEXES للأداء
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cashbox_transfers_company ON cashbox_transfers(company_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_cashbox_movements_cashbox ON cashbox_movements(cashbox_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_company ON bank_deposits(company_id, deposit_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_withdrawals_company ON bank_withdrawals(company_id, withdrawal_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_movements_account ON bank_movements(bank_account_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_company ON warehouse_transfers(company_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_locked ON purchases(is_locked) WHERE is_locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_invoices_locked ON invoices(is_locked) WHERE is_locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_purchases_deleted ON purchases(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted ON invoices(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- إعداد البيانات الأولية للمخازن
-- إنشاء مخزن وارد (1) ومخزن تشغيل (2) افتراضيين
-- تُشغَّل يدوياً بعد تسجيل الشركة
-- ============================================================
-- يُنفَّذ عبر تطبيق: setup_company_warehouses(p_company_id)

CREATE OR REPLACE FUNCTION setup_company_warehouses(
  p_company_id UUID
) RETURNS VOID AS $$
DECLARE
  v_w1_exists BOOLEAN;
  v_w2_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM warehouses WHERE company_id = p_company_id AND warehouse_role = 'incoming'
  ) INTO v_w1_exists;

  SELECT EXISTS(
    SELECT 1 FROM warehouses WHERE company_id = p_company_id AND warehouse_role = 'operations'
  ) INTO v_w2_exists;

  IF NOT v_w1_exists THEN
    INSERT INTO warehouses (company_id, name_ar, name_en, code, warehouse_role, warehouse_number, is_default)
    VALUES (p_company_id, 'مخزن الوارد', 'Incoming Warehouse', 'WH-01', 'incoming', 1, TRUE);
  END IF;

  IF NOT v_w2_exists THEN
    INSERT INTO warehouses (company_id, name_ar, name_en, code, warehouse_role, warehouse_number, is_default)
    VALUES (p_company_id, 'مخزن التشغيل', 'Operations Warehouse', 'WH-02', 'operations', 2, FALSE);
  END IF;

  -- إنشاء خزينة رئيسية إن لم تكن موجودة
  IF NOT EXISTS(SELECT 1 FROM cashboxes WHERE company_id = p_company_id AND is_main = TRUE) THEN
    INSERT INTO cashboxes (company_id, name_ar, name_en, cashbox_type, is_main, is_default)
    VALUES (p_company_id, 'الخزينة الرئيسية', 'Main Cashbox', 'main', TRUE, TRUE);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION setup_company_warehouses IS 'تهيئة المخازن والخزائن الافتراضية عند إنشاء شركة جديدة';
