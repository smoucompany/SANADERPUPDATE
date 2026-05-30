// =====================================================
// TypeScript Types - ERP System
// =====================================================

export type UserRole = 'admin' | 'accountant' | 'cashier' | 'employee' | 'manager'
export type InvoiceStatus = 'draft' | 'confirmed' | 'paid' | 'partial' | 'cancelled' | 'returned'
export type PaymentMethod = 'cash' | 'mada' | 'transfer' | 'credit' | 'mixed' | 'deferred'
export type PaymentType = 'receipt' | 'payment'
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type JournalEntryStatus = 'draft' | 'posted' | 'cancelled'
export type MovementType = 'in' | 'out' | 'transfer' | 'adjustment' | 'return'
export type NotificationType = 'info' | 'warning' | 'error' | 'success'
export type ShiftStatus = 'open' | 'closed'
export type DiscountType = 'percentage' | 'fixed'

export interface Company {
  id: string
  name_ar: string
  name_en?: string
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  tax_number?: string
  commercial_reg?: string
  currency: string
  vat_rate: number
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  company_id: string
  name_ar: string
  name_en?: string
  code?: string
  address?: string
  phone?: string
  is_active: boolean
  is_main: boolean
  created_at: string
}

export interface Warehouse {
  id: string
  company_id: string
  branch_id?: string
  name_ar: string
  name_en?: string
  code?: string
  is_active: boolean
  is_default: boolean
}

export interface User {
  id: string
  company_id: string
  branch_id?: string
  role: UserRole
  full_name: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  permissions: Record<string, boolean>
  last_login?: string
  created_at: string
  email?: string
}

export interface Account {
  id: string
  company_id: string
  parent_id?: string | null
  code: string
  name_ar: string
  name_en?: string
  type: AccountType
  level: number
  is_detail: boolean
  is_active: boolean
  notes?: string
  balance: number
  normal_balance?: 'debit' | 'credit'
  children?: Account[]
}

export interface Customer {
  id: string
  company_id: string
  account_id?: string
  code?: string
  name_ar: string
  name_en?: string
  phone?: string
  phone2?: string
  email?: string
  address?: string
  city?: string
  tax_number?: string
  credit_limit: number
  payment_days: number
  balance: number
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  company_id: string
  account_id?: string
  code?: string
  name_ar: string
  name_en?: string
  phone?: string
  phone2?: string
  email?: string
  address?: string
  city?: string
  tax_number?: string
  bank_account?: string
  commercial_registration?: string
  credit_limit?: number
  category?: string
  document_urls?: string[]
  payment_days: number
  balance: number
  is_active: boolean
  notes?: string
  created_at: string
}

export interface Category {
  id: string
  company_id: string
  parent_id?: string
  name_ar: string
  name_en?: string
  code?: string
  image_url?: string
  is_active: boolean
  sort_order: number
}

export interface Unit {
  id: string
  company_id: string
  name_ar: string
  name_en?: string
  abbreviation?: string
  is_active: boolean
}

export interface Product {
  id: string
  company_id: string
  category_id?: string
  unit_id?: string
  code?: string
  barcode?: string
  name_ar: string
  name_en?: string
  description?: string
  image_url?: string
  cost_price: number
  selling_price: number
  min_selling_price: number
  vat_rate: number
  is_vat_inclusive: boolean
  track_inventory: boolean
  allow_negative_stock: boolean
  min_stock_alert: number
  max_stock_level?: number
  is_active: boolean
  is_service: boolean
  expiry_tracking: boolean
  notes?: string
  created_at: string
  updated_at: string
  // Joined fields
  category?: Category
  unit?: Unit
  current_stock?: number
}

export interface Inventory {
  id: string
  product_id: string
  warehouse_id: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  batch_number?: string
  expiry_date?: string
  updated_at: string
  product?: Product
  warehouse?: Warehouse
}

export interface Cashbox {
  id: string
  company_id: string
  branch_id?: string
  name_ar: string
  name_en?: string
  account_id?: string
  balance: number
  is_active: boolean
  is_default: boolean
}

export interface Shift {
  id: string
  company_id: string
  cashbox_id: string
  user_id: string
  status: ShiftStatus
  opening_balance: number
  closing_balance?: number
  expected_balance?: number
  difference?: number
  opened_at: string
  closed_at?: string
  notes?: string
  cashbox?: Cashbox
  user?: User
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id?: string
  product_name: string
  barcode?: string
  unit_name?: string
  quantity: number
  unit_price: number
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total: number
  notes?: string
  sort_order: number
  product?: Product
}

export interface Invoice {
  id: string
  company_id: string
  branch_id?: string
  warehouse_id?: string
  customer_id?: string
  cashbox_id?: string
  shift_id?: string
  user_id?: string
  invoice_number: string
  invoice_date: string
  due_date?: string
  status: InvoiceStatus
  payment_method: PaymentMethod
  subtotal: number
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  tax_amount: number
  total: number
  paid_amount: number
  remaining_amount: number
  notes?: string
  terms?: string
  is_pos: boolean
  qr_code?: string
  created_at: string
  updated_at: string
  // Joined
  customer?: Customer
  items?: InvoiceItem[]
  user?: User
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total: number
  expiry_date?: string
  batch_number?: string
  product?: Product
}

export interface Purchase {
  id: string
  company_id: string
  branch_id?: string
  warehouse_id?: string
  supplier_id?: string
  user_id?: string
  purchase_number: string
  purchase_date: string
  due_date?: string
  status: InvoiceStatus
  payment_method: PaymentMethod
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  paid_amount: number
  remaining_amount: number
  notes?: string
  created_at: string
  supplier?: Supplier
  items?: PurchaseItem[]
}

export interface Expense {
  id: string
  company_id: string
  branch_id?: string
  category_id?: string
  cashbox_id?: string
  user_id?: string
  expense_number?: string
  expense_date: string
  description: string
  amount: number
  vat_amount: number
  total_amount: number
  payment_method: PaymentMethod
  receipt_url?: string
  notes?: string
  created_at: string
  category?: { name_ar: string }
}

export interface Payment {
  id: string
  company_id: string
  customer_id?: string
  supplier_id?: string
  invoice_id?: string
  purchase_id?: string
  cashbox_id?: string
  shift_id?: string
  user_id?: string
  payment_number: string
  payment_date: string
  type: PaymentType
  method: PaymentMethod
  amount: number
  reference?: string
  bank_account?: string
  notes?: string
  is_posted: boolean
  created_at: string
  customer?: Customer
  supplier?: Supplier
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  account_id: string
  description?: string
  debit: number
  credit: number
  sort_order: number
  account?: Account
}

export interface JournalEntry {
  id: string
  company_id: string
  user_id?: string
  reference_type?: string
  reference_id?: string
  entry_number: string
  entry_date: string
  status: JournalEntryStatus
  description: string
  total_debit: number
  total_credit: number
  is_auto: boolean
  created_at: string
  lines?: JournalEntryLine[]
}

export interface Notification {
  id: string
  company_id: string
  user_id?: string
  type: NotificationType
  title: string
  message?: string
  is_read: boolean
  data: Record<string, unknown>
  created_at: string
}

export interface ActivityLog {
  id: string
  company_id: string
  user_id?: string
  action: string
  module: string
  record_id?: string
  record_type?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  created_at: string
  user?: User
}

export interface Settings {
  [key: string]: string | number | boolean | Record<string, unknown>
}

// POS Cart Item
export interface CartItem {
  id: string
  product_id: string
  product_name: string
  barcode?: string
  unit_name?: string
  quantity: number
  unit_price: number
  original_price: number
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total: number
  max_stock?: number
}

// Dashboard Summary
export interface DashboardSummary {
  today_sales: number
  month_sales: number
  today_purchases: number
  month_expenses: number
  outstanding_debt: number
  low_stock_count: number
}

// Report filters
export interface ReportFilters {
  date_from?: string
  date_to?: string
  customer_id?: string
  supplier_id?: string
  product_id?: string
  user_id?: string
  branch_id?: string
  warehouse_id?: string
  status?: string
  payment_method?: string
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
  total?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}
