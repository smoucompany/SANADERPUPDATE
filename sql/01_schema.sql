-- ============================================================
-- الملف الأول: قاعدة البيانات الكاملة
-- شغّل أولاً في Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role        AS ENUM ('admin','accountant','cashier','employee','manager'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE invoice_status   AS ENUM ('draft','confirmed','paid','partial','cancelled','returned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payment_method   AS ENUM ('cash','mada','transfer','credit','mixed','deferred'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payment_type     AS ENUM ('receipt','payment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE account_type     AS ENUM ('asset','liability','equity','revenue','expense'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE journal_entry_status AS ENUM ('draft','posted','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE movement_type    AS ENUM ('in','out','transfer','adjustment','return'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('info','warning','error','success'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE shift_status     AS ENUM ('open','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE discount_type    AS ENUM ('percentage','fixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  logo_url        TEXT,
  address         TEXT,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  website         VARCHAR(255),
  tax_number      VARCHAR(100),
  commercial_reg  VARCHAR(100),
  currency        VARCHAR(10)  DEFAULT 'SAR',
  vat_rate        DECIMAL(5,2) DEFAULT 15.00,
  fiscal_year_start DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  settings        JSONB   DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role        user_role DEFAULT 'employee',
  full_name   VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  phone       VARCHAR(50),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  permissions JSONB   DEFAULT '{}',
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_ar    VARCHAR(255) NOT NULL,
  name_en    VARCHAR(255),
  code       VARCHAR(50),
  address    TEXT,
  phone      VARCHAR(50),
  is_active  BOOLEAN DEFAULT TRUE,
  is_main    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id  UUID REFERENCES branches(id),
  name_ar    VARCHAR(255) NOT NULL,
  name_en    VARCHAR(255),
  code       VARCHAR(50),
  address    TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashboxes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id  UUID REFERENCES branches(id),
  name_ar    VARCHAR(255) NOT NULL,
  name_en    VARCHAR(255),
  account_id UUID,
  balance    DECIMAL(15,2) DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cashbox_id       UUID NOT NULL REFERENCES cashboxes(id),
  user_id          UUID NOT NULL REFERENCES users(id),
  status           shift_status DEFAULT 'open',
  opening_balance  DECIMAL(15,2) DEFAULT 0,
  closing_balance  DECIMAL(15,2),
  expected_balance DECIMAL(15,2),
  difference       DECIMAL(15,2),
  opened_at        TIMESTAMPTZ DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  notes            TEXT
);

-- ============================================================
-- CHART OF ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES accounts(id),
  code        VARCHAR(50) NOT NULL,
  name_ar     VARCHAR(255) NOT NULL,
  name_en     VARCHAR(255),
  type        account_type NOT NULL,
  level       INTEGER DEFAULT 1,
  is_detail   BOOLEAN DEFAULT TRUE,
  is_active   BOOLEAN DEFAULT TRUE,
  notes       TEXT,
  balance     DECIMAL(15,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- ============================================================
-- CATEGORIES & UNITS & PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES categories(id),
  name_ar    VARCHAR(255) NOT NULL,
  name_en    VARCHAR(255),
  code       VARCHAR(50),
  image_url  TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_ar      VARCHAR(100) NOT NULL,
  name_en      VARCHAR(100),
  abbreviation VARCHAR(20),
  is_active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id          UUID REFERENCES categories(id),
  unit_id              UUID REFERENCES units(id),
  account_id           UUID REFERENCES accounts(id),
  code                 VARCHAR(100),
  barcode              VARCHAR(100),
  name_ar              VARCHAR(255) NOT NULL,
  name_en              VARCHAR(255),
  description          TEXT,
  image_url            TEXT,
  cost_price           DECIMAL(15,4) DEFAULT 0,
  selling_price        DECIMAL(15,4) NOT NULL DEFAULT 0,
  min_selling_price    DECIMAL(15,4) DEFAULT 0,
  vat_rate             DECIMAL(5,2)  DEFAULT 15.00,
  is_vat_inclusive     BOOLEAN DEFAULT FALSE,
  track_inventory      BOOLEAN DEFAULT TRUE,
  allow_negative_stock BOOLEAN DEFAULT FALSE,
  min_stock_alert      DECIMAL(15,3) DEFAULT 0,
  max_stock_level      DECIMAL(15,3),
  is_active            BOOLEAN DEFAULT TRUE,
  is_service           BOOLEAN DEFAULT FALSE,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity            DECIMAL(15,3) DEFAULT 0,
  reserved_quantity   DECIMAL(15,3) DEFAULT 0,
  batch_number        VARCHAR(100) DEFAULT '',
  expiry_date         DATE,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id, batch_number)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  warehouse_id     UUID NOT NULL REFERENCES warehouses(id),
  from_warehouse_id UUID REFERENCES warehouses(id),
  reference_type   VARCHAR(50),
  reference_id     UUID,
  movement_type    movement_type NOT NULL,
  quantity         DECIMAL(15,3) NOT NULL,
  cost_price       DECIMAL(15,4),
  batch_number     VARCHAR(100),
  expiry_date      DATE,
  notes            TEXT,
  user_id          UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS & SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id),
  code          VARCHAR(50),
  name_ar       VARCHAR(255) NOT NULL,
  name_en       VARCHAR(255),
  phone         VARCHAR(50),
  phone2        VARCHAR(50),
  email         VARCHAR(255),
  address       TEXT,
  city          VARCHAR(100),
  tax_number    VARCHAR(100),
  credit_limit  DECIMAL(15,2) DEFAULT 0,
  payment_days  INTEGER DEFAULT 30,
  balance       DECIMAL(15,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id),
  code          VARCHAR(50),
  name_ar       VARCHAR(255) NOT NULL,
  name_en       VARCHAR(255),
  phone         VARCHAR(50),
  phone2        VARCHAR(50),
  email         VARCHAR(255),
  address       TEXT,
  city          VARCHAR(100),
  tax_number    VARCHAR(100),
  bank_account  VARCHAR(100),
  payment_days  INTEGER DEFAULT 30,
  balance       DECIMAL(15,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id),
  warehouse_id     UUID REFERENCES warehouses(id),
  customer_id      UUID REFERENCES customers(id),
  cashbox_id       UUID REFERENCES cashboxes(id),
  shift_id         UUID REFERENCES shifts(id),
  user_id          UUID REFERENCES users(id),
  invoice_number   VARCHAR(50) NOT NULL,
  invoice_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE,
  status           invoice_status DEFAULT 'draft',
  payment_method   payment_method DEFAULT 'cash',
  subtotal         DECIMAL(15,2) DEFAULT 0,
  discount_type    discount_type DEFAULT 'percentage',
  discount_value   DECIMAL(15,4) DEFAULT 0,
  discount_amount  DECIMAL(15,2) DEFAULT 0,
  tax_amount       DECIMAL(15,2) DEFAULT 0,
  total            DECIMAL(15,2) DEFAULT 0,
  paid_amount      DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) DEFAULT 0,
  notes            TEXT,
  is_pos           BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  UNIQUE(company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  product_name    VARCHAR(255) NOT NULL,
  barcode         VARCHAR(100),
  unit_name       VARCHAR(100),
  quantity        DECIMAL(15,3) NOT NULL,
  unit_price      DECIMAL(15,4) NOT NULL,
  discount_type   discount_type DEFAULT 'percentage',
  discount_value  DECIMAL(15,4) DEFAULT 0,
  discount_amount DECIMAL(15,4) DEFAULT 0,
  vat_rate        DECIMAL(5,2)  DEFAULT 0,
  vat_amount      DECIMAL(15,4) DEFAULT 0,
  total           DECIMAL(15,4) NOT NULL,
  sort_order      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id    UUID REFERENCES invoices(id),
  customer_id   UUID REFERENCES customers(id),
  user_id       UUID REFERENCES users(id),
  warehouse_id  UUID REFERENCES warehouses(id),
  return_number VARCHAR(50) NOT NULL,
  return_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  reason        TEXT,
  refund_method VARCHAR(50) DEFAULT 'bank',
  status        VARCHAR(20) DEFAULT 'pending',
  subtotal      DECIMAL(15,2) DEFAULT 0,
  vat           DECIMAL(15,2) DEFAULT 0,
  total         DECIMAL(15,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, return_number)
);

CREATE TABLE IF NOT EXISTS quotations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers(id),
  user_id          UUID REFERENCES users(id),
  quotation_number VARCHAR(50) NOT NULL,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until      DATE,
  status           VARCHAR(20) DEFAULT 'draft',
  subtotal         DECIMAL(15,2) DEFAULT 0,
  discount_amount  DECIMAL(15,2) DEFAULT 0,
  tax_amount       DECIMAL(15,2) DEFAULT 0,
  total            DECIMAL(15,2) DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, quotation_number)
);

-- ============================================================
-- PURCHASES
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id),
  warehouse_id     UUID REFERENCES warehouses(id),
  supplier_id      UUID REFERENCES suppliers(id),
  cashbox_id       UUID REFERENCES cashboxes(id),
  user_id          UUID REFERENCES users(id),
  purchase_number  VARCHAR(50) NOT NULL,
  purchase_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE,
  status           invoice_status DEFAULT 'draft',
  payment_method   payment_method DEFAULT 'cash',
  subtotal         DECIMAL(15,2) DEFAULT 0,
  discount_amount  DECIMAL(15,2) DEFAULT 0,
  tax_amount       DECIMAL(15,2) DEFAULT 0,
  total            DECIMAL(15,2) DEFAULT 0,
  paid_amount      DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  UNIQUE(company_id, purchase_number)
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  product_name    VARCHAR(255) NOT NULL,
  quantity        DECIMAL(15,3) NOT NULL,
  unit_price      DECIMAL(15,4) NOT NULL,
  discount_amount DECIMAL(15,4) DEFAULT 0,
  vat_rate        DECIMAL(5,2)  DEFAULT 0,
  vat_amount      DECIMAL(15,4) DEFAULT 0,
  total           DECIMAL(15,4) NOT NULL,
  expiry_date     DATE,
  batch_number    VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  purchase_id   UUID REFERENCES purchases(id),
  supplier_id   UUID REFERENCES suppliers(id),
  user_id       UUID REFERENCES users(id),
  return_number VARCHAR(50) NOT NULL,
  return_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  reason        TEXT,
  status        VARCHAR(20) DEFAULT 'pending',
  total         DECIMAL(15,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES suppliers(id),
  warehouse_id  UUID REFERENCES warehouses(id),
  user_id       UUID REFERENCES users(id),
  order_number  VARCHAR(50) NOT NULL,
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  status        VARCHAR(20) DEFAULT 'draft',
  total         DECIMAL(15,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

-- ============================================================
-- ACCOUNTING
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id),
  reference_type VARCHAR(50),
  reference_id   UUID,
  entry_number   VARCHAR(50) NOT NULL,
  entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status         journal_entry_status DEFAULT 'draft',
  description    TEXT NOT NULL,
  total_debit    DECIMAL(15,2) DEFAULT 0,
  total_credit   DECIMAL(15,2) DEFAULT 0,
  is_auto        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, entry_number)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES accounts(id),
  description      TEXT,
  debit            DECIMAL(15,2) DEFAULT 0,
  credit           DECIMAL(15,2) DEFAULT 0,
  sort_order       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id),
  supplier_id    UUID REFERENCES suppliers(id),
  invoice_id     UUID REFERENCES invoices(id),
  purchase_id    UUID REFERENCES purchases(id),
  cashbox_id     UUID REFERENCES cashboxes(id),
  shift_id       UUID REFERENCES shifts(id),
  user_id        UUID REFERENCES users(id),
  payment_number VARCHAR(50) NOT NULL,
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  type           payment_type NOT NULL,
  method         payment_method DEFAULT 'cash',
  amount         DECIMAL(15,2) NOT NULL,
  reference      VARCHAR(255),
  notes          TEXT,
  is_posted      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, payment_number)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id     UUID REFERENCES accounts(id),
  bank_name      VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),
  iban           VARCHAR(50),
  currency       VARCHAR(10) DEFAULT 'SAR',
  balance        DECIMAL(15,2) DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id          UUID REFERENCES accounts(id),
  name_ar             VARCHAR(255) NOT NULL,
  asset_number        VARCHAR(50),
  category            VARCHAR(100),
  purchase_date       DATE,
  purchase_value      DECIMAL(15,2) DEFAULT 0,
  useful_life_years   INTEGER DEFAULT 5,
  depreciation_method VARCHAR(50) DEFAULT 'straight_line',
  depreciation_rate   DECIMAL(5,2) DEFAULT 20,
  accumulated_dep     DECIMAL(15,2) DEFAULT 0,
  book_value          DECIMAL(15,2) DEFAULT 0,
  status              VARCHAR(20) DEFAULT 'active',
  location            TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_ar    VARCHAR(255) NOT NULL,
  account_id UUID REFERENCES accounts(id),
  is_active  BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id),
  category_id     UUID REFERENCES expense_categories(id),
  cashbox_id      UUID REFERENCES cashboxes(id),
  user_id         UUID REFERENCES users(id),
  expense_number  VARCHAR(50),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL,
  amount          DECIMAL(15,2) NOT NULL,
  vat_amount      DECIMAL(15,2) DEFAULT 0,
  total_amount    DECIMAL(15,2) NOT NULL,
  payment_method  payment_method DEFAULT 'cash',
  receipt_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vouchers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cashbox_id     UUID REFERENCES cashboxes(id),
  user_id        UUID REFERENCES users(id),
  voucher_number VARCHAR(50) NOT NULL,
  voucher_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  type           payment_type NOT NULL,
  amount         DECIMAL(15,2) NOT NULL,
  beneficiary    VARCHAR(255),
  description    TEXT,
  is_posted      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, voucher_number)
);

-- ============================================================
-- HR
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id               UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name                VARCHAR(255) NOT NULL,
  national_id              VARCHAR(20),
  birth_date               DATE,
  nationality              VARCHAR(100) DEFAULT 'سعودي',
  gender                   VARCHAR(10)  DEFAULT 'male',
  marital_status           VARCHAR(20)  DEFAULT 'single',
  phone                    VARCHAR(50),
  email                    VARCHAR(255),
  address                  TEXT,
  employee_number          VARCHAR(50),
  department               VARCHAR(100),
  position                 VARCHAR(100),
  hire_date                DATE,
  contract_type            VARCHAR(30)  DEFAULT 'full_time',
  work_location            VARCHAR(100),
  basic_salary             DECIMAL(12,2) DEFAULT 0,
  housing_allowance        DECIMAL(12,2) DEFAULT 0,
  transportation_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances         DECIMAL(12,2) DEFAULT 0,
  bank_name                VARCHAR(100),
  iban                     VARCHAR(34),
  emergency_name           VARCHAR(255),
  emergency_relation       VARCHAR(100),
  emergency_phone          VARCHAR(50),
  status                   VARCHAR(20) DEFAULT 'active',
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  check_in    TIME,
  check_out   TIME,
  status      VARCHAR(20) DEFAULT 'present',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id, date)
);

CREATE TABLE IF NOT EXISTS leaves (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        INTEGER NOT NULL DEFAULT 1,
  reason      TEXT,
  status      VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id               UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id              UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month                    VARCHAR(7) NOT NULL,
  basic_salary             DECIMAL(12,2) DEFAULT 0,
  housing_allowance        DECIMAL(12,2) DEFAULT 0,
  transportation_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances         DECIMAL(12,2) DEFAULT 0,
  gross_salary             DECIMAL(12,2) DEFAULT 0,
  deductions               DECIMAL(12,2) DEFAULT 0,
  net_salary               DECIMAL(12,2) DEFAULT 0,
  status                   VARCHAR(20) DEFAULT 'pending',
  paid_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id, month)
);

-- ============================================================
-- CRM
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_leads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  company     VARCHAR(255),
  phone       VARCHAR(50),
  email       VARCHAR(255),
  stage       VARCHAR(30) DEFAULT 'new',
  value       DECIMAL(12,2) DEFAULT 0,
  source      VARCHAR(100),
  assigned_to UUID REFERENCES users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  type        VARCHAR(30) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  completed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS & MISC
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key        VARCHAR(255) NOT NULL,
  value      JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, key)
);

CREATE TABLE IF NOT EXISTS invoice_sequences (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type           VARCHAR(50) NOT NULL,
  prefix         VARCHAR(20) DEFAULT '',
  current_number INTEGER DEFAULT 0,
  padding        INTEGER DEFAULT 6,
  UNIQUE(company_id, type)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id),
  type       notification_type DEFAULT 'info',
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  data       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  module      VARCHAR(100) NOT NULL,
  record_id   UUID,
  record_type VARCHAR(100),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_ar     VARCHAR(255) NOT NULL,
  code        VARCHAR(50),
  parent_id   UUID REFERENCES cost_centers(id),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_company    ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode    ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_deleted    ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_company    ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date       ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted    ON invoices(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_company   ON purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier  ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_deleted   ON purchases(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_company   ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_deleted   ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_company   ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product   ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_product     ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_company     ON inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company    ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent     ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_journal_date        ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_company     ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user         ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_company   ON employees(company_id);

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'companies','users','products','customers','suppliers',
    'invoices','purchases','journal_entries','accounts',
    'settings','employees','crm_leads','quotations'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- TRIGGER — update inventory on movement
-- ============================================================

CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type IN ('in','return') THEN
    INSERT INTO inventory (product_id, warehouse_id, quantity, batch_number)
    VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity, COALESCE(NEW.batch_number,''))
    ON CONFLICT (product_id, warehouse_id, batch_number)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW();
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE inventory
    SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = NOW()
    WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_movement ON inventory_movements;
CREATE TRIGGER trg_inventory_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_movement();

SELECT 'Schema created successfully' AS result;
