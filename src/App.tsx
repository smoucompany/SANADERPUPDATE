import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/components/layout/MainLayout'
import LoadingScreen from '@/components/shared/LoadingScreen'
import PageSkeleton from '@/components/shared/PageSkeleton'

// ──────────────────────────────────────────────────────────────────────────────
// صفحات المصادقة
// ──────────────────────────────────────────────────────────────────────────────
const LoginPage    = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))

// ──────────────────────────────────────────────────────────────────────────────
// لوحة التحكم + POS (تُحمَّل أولاً)
// ──────────────────────────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const POSPage       = lazy(() => import('@/pages/pos/POSPage'))

// ──────────────────────────────────────────────────────────────────────────────
// المبيعات — chunk واحد لكل الصفحات
// ──────────────────────────────────────────────────────────────────────────────
const SalesPage             = lazy(() => import('@/pages/sales/SalesPage'))
const SaleFormPage          = lazy(() => import('@/pages/sales/SaleFormPage'))
const SaleDetailsPage       = lazy(() => import('@/pages/sales/SaleDetailsPage'))
const SalesReturnsPage      = lazy(() => import('@/pages/sales/SalesReturnsPage'))
const SalesReturnDetailsPage= lazy(() => import('@/pages/sales/SalesReturnDetailsPage'))
const QuotationsPage        = lazy(() => import('@/pages/sales/QuotationsPage'))
const QuotationFormPage     = lazy(() => import('@/pages/sales/QuotationFormPage'))
const QuotationDetailsPage  = lazy(() => import('@/pages/sales/QuotationDetailsPage'))

// ──────────────────────────────────────────────────────────────────────────────
// المشتريات — chunk واحد
// ──────────────────────────────────────────────────────────────────────────────
const PurchasesPage      = lazy(() => import('@/pages/purchases/PurchasesPage'))
const PurchaseFormPage   = lazy(() => import('@/pages/purchases/PurchaseFormPage'))
const PurchaseDetailsPage= lazy(() => import('@/pages/purchases/PurchaseDetailsPage'))
const PurchaseReturnsPage= lazy(() => import('@/pages/purchases/PurchaseReturnsPage'))
const PurchaseOrdersPage = lazy(() => import('@/pages/purchases/PurchaseOrdersPage'))
const DeletedPurchasesPage=lazy(() => import('@/pages/purchases/DeletedPurchasesPage'))

// ──────────────────────────────────────────────────────────────────────────────
// المخزون — chunk واحد
// ──────────────────────────────────────────────────────────────────────────────
const ProductsPage      = lazy(() => import('@/pages/inventory/ProductsPage'))
const ProductFormPage   = lazy(() => import('@/pages/inventory/ProductFormPage'))
const ProductDetailsPage= lazy(() => import('@/pages/inventory/ProductDetailsPage'))
const ProductBarcodesPage=lazy(() => import('@/pages/inventory/ProductBarcodesPage'))
const InventoryPage     = lazy(() => import('@/pages/inventory/InventoryPage'))
const CategoriesPage    = lazy(() => import('@/pages/inventory/CategoriesPage'))
const StockTransferPage = lazy(() => import('@/pages/inventory/StockTransferPage'))
const StockAdjustmentPage=lazy(() => import('@/pages/inventory/StockAdjustmentPage'))
const LowStockAlertsPage= lazy(() => import('@/pages/inventory/LowStockAlertsPage'))
const PriceListsPage    = lazy(() => import('@/pages/inventory/PriceListsPage'))
const Warehouse1Page    = lazy(() => import('@/pages/inventory/Warehouse1Page'))
const WarehouseTransferPage=lazy(() => import('@/pages/inventory/WarehouseTransferPage'))

// ──────────────────────────────────────────────────────────────────────────────
// العملاء والموردون
// ──────────────────────────────────────────────────────────────────────────────
const CustomersPage       = lazy(() => import('@/pages/customers/CustomersPage'))
const CustomerFormPage    = lazy(() => import('@/pages/customers/CustomerFormPage'))
const CustomerAccountPage = lazy(() => import('@/pages/customers/CustomerAccountPage'))
const SuppliersPage       = lazy(() => import('@/pages/suppliers/SuppliersPage'))
const SupplierFormPage    = lazy(() => import('@/pages/suppliers/SupplierFormPage'))
const SupplierAccountPage = lazy(() => import('@/pages/suppliers/SupplierAccountPage'))
const SupplierPaymentsPage= lazy(() => import('@/pages/suppliers/SupplierPaymentsPage'))
const SupplierReportsPage = lazy(() => import('@/pages/suppliers/SupplierReportsPage'))
const SupplierStatementsPage=lazy(()=> import('@/pages/suppliers/SupplierStatementsPage'))
const SupplierStatementPage=lazy(() => import('@/pages/suppliers/SupplierStatementPage'))

// ──────────────────────────────────────────────────────────────────────────────
// المحاسبة — chunk واحد
// ──────────────────────────────────────────────────────────────────────────────
const AccountsPage          = lazy(() => import('@/pages/accounting/AccountsPage'))
const GeneralLedgerPage     = lazy(() => import('@/pages/accounting/GeneralLedgerPage'))
const TrialBalancePage      = lazy(() => import('@/pages/accounting/TrialBalancePage'))
const FinancialStatementsPage=lazy(() => import('@/pages/accounting/FinancialStatementsPage'))
const JournalEntriesPage    = lazy(() => import('@/pages/accounting/JournalEntriesPage'))
const JournalEntryFormPage  = lazy(() => import('@/pages/accounting/JournalEntryFormPage'))
const PaymentsPage          = lazy(() => import('@/pages/accounting/PaymentsPage'))
const BankAccountsPage      = lazy(() => import('@/pages/accounting/BankAccountsPage'))
const BankTransactionsPage  = lazy(() => import('@/pages/accounting/BankTransactionsPage'))
const BankDepositsPage      = lazy(() => import('@/pages/accounting/BankDepositsPage'))
const BankWithdrawalsPage   = lazy(() => import('@/pages/accounting/BankWithdrawalsPage'))
const CostCentersPage       = lazy(() => import('@/pages/accounting/CostCentersPage'))
const AssetsPage            = lazy(() => import('@/pages/accounting/AssetsPage'))
const AssetDetailsPage      = lazy(() => import('@/pages/accounting/AssetDetailsPage'))
const ExpensesPage          = lazy(() => import('@/pages/accounting/ExpensesPage'))
const ExpenseCategoriesPage = lazy(() => import('@/pages/accounting/ExpenseCategoriesPage'))
const TaxReturnsPage        = lazy(() => import('@/pages/accounting/TaxReturnsPage'))
const BudgetsPage           = lazy(() => import('@/pages/accounting/BudgetsPage'))
const AccountingPeriodsPage = lazy(() => import('@/pages/accounting/AccountingPeriodsPage'))

// ──────────────────────────────────────────────────────────────────────────────
// السندات + الخزائن + المطعم
// ──────────────────────────────────────────────────────────────────────────────
const VouchersPage      = lazy(() => import('@/pages/vouchers/VouchersPage'))
const VoucherFormPage   = lazy(() => import('@/pages/vouchers/VoucherFormPage'))
const VoucherDetailsPage= lazy(() => import('@/pages/vouchers/VoucherDetailsPage'))
const VoucherReportsPage= lazy(() => import('@/pages/vouchers/VoucherReportsPage'))
const VoucherSettingsPage=lazy(() => import('@/pages/vouchers/VoucherSettingsPage'))
const CashboxesPage     = lazy(() => import('@/pages/cashbox/CashboxesPage'))
const CashboxTransfersPage=lazy(()=> import('@/pages/cashbox/CashboxTransfersPage'))
const CashboxMovementsPage=lazy(() => import('@/pages/cashbox/CashboxMovementsPage'))
const RecipesPage       = lazy(() => import('@/pages/restaurant/RecipesPage'))

// ──────────────────────────────────────────────────────────────────────────────
// HR + CRM
// ──────────────────────────────────────────────────────────────────────────────
const HRDashboardPage  = lazy(() => import('@/pages/hr/HRDashboardPage'))
const EmployeesPage    = lazy(() => import('@/pages/hr/EmployeesPage'))
const EmployeeFormPage = lazy(() => import('@/pages/hr/EmployeeFormPage'))
const EmployeeDetailsPage=lazy(()=> import('@/pages/hr/EmployeeDetailsPage'))
const AttendancePage   = lazy(() => import('@/pages/hr/AttendancePage'))
const PayrollPage      = lazy(() => import('@/pages/hr/PayrollPage'))
const LeavesPage       = lazy(() => import('@/pages/hr/LeavesPage'))
const HRPerformancePage= lazy(() => import('@/pages/hr/HRPerformancePage'))
const CRMDashboardPage = lazy(() => import('@/pages/crm/CRMDashboardPage'))
const WhatsappMarketingPage=lazy(()=>import('@/pages/crm/WhatsappMarketingPage'))
const CRMLeadsPage     = lazy(() => import('@/pages/crm/CRMLeadsPage'))
const CRMActivitiesPage= lazy(() => import('@/pages/crm/CRMActivitiesPage'))

// ──────────────────────────────────────────────────────────────────────────────
// الإعدادات + أخرى
// ──────────────────────────────────────────────────────────────────────────────
const ProfilePage          = lazy(() => import('@/pages/ProfilePage'))
const NotificationsPage    = lazy(() => import('@/pages/NotificationsPage'))
const ReportsPage          = lazy(() => import('@/pages/reports/ReportsPage'))
const PermissionsPage      = lazy(() => import('@/pages/settings/PermissionsPage'))
const AuditLogPage         = lazy(() => import('@/pages/settings/AuditLogPage'))
const UsersPage            = lazy(() => import('@/pages/settings/UsersPage'))
const SettingsLayout       = lazy(() => import('@/pages/settings/SettingsLayout'))
const CompanySettings      = lazy(() => import('@/pages/settings/CompanySettings'))
const FinancialSettings    = lazy(() => import('@/pages/settings/FinancialSettings'))
const InventorySettings    = lazy(() => import('@/pages/settings/InventorySettings'))
const POSSettings          = lazy(() => import('@/pages/settings/POSSettings'))
const HRSettings           = lazy(() => import('@/pages/settings/HRSettings'))
const UsersSettings        = lazy(() => import('@/pages/settings/UsersSettings'))
const PrintSettings        = lazy(() => import('@/pages/settings/PrintSettings'))
const IntegrationsSettings = lazy(() => import('@/pages/settings/IntegrationsSettings'))
const SecuritySettings     = lazy(() => import('@/pages/settings/SecuritySettings'))
const NotFoundPage         = lazy(() => import('@/pages/NotFoundPage'))

// ──────────────────────────────────────────────────────────────────────────────
// دالة التحميل المسبق — تُشغَّل بعد ثانية واحدة لتحميل كل الـ chunks في الخلفية
// بعدها أي تنقل = فوري بدون loading
// ──────────────────────────────────────────────────────────────────────────────
function preloadAllChunks() {
  // كل chunk = ملف JS واحد يحتوي على مجموعة صفحات
  const chunks = [
    () => import('@/pages/sales/SalesPage'),
    () => import('@/pages/purchases/PurchasesPage'),
    () => import('@/pages/inventory/InventoryPage'),
    () => import('@/pages/accounting/AccountsPage'),
    () => import('@/pages/hr/HRDashboardPage'),
    () => import('@/pages/crm/CRMDashboardPage'),
    () => import('@/pages/cashbox/CashboxesPage'),
    () => import('@/pages/suppliers/SuppliersPage'),
    () => import('@/pages/customers/CustomersPage'),
    () => import('@/pages/vouchers/VouchersPage'),
    () => import('@/pages/settings/CompanySettings'),
    () => import('@/pages/restaurant/RecipesPage'),
    () => import('@/pages/reports/ReportsPage'),
  ]
  // تحميل بفارق 100ms بين كل chunk لتجنب إغراق الشبكة
  chunks.forEach((fn, i) => setTimeout(fn, i * 100))
}

// ──────────────────────────────────────────────────────────────────────────────
// Route Guards
// ──────────────────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

// ──────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { loadUserProfile, setSession, isAuthenticated } = useAuthStore()
  const { applyTheme } = useSettingsStore()
  const remoteUpdateUrl = (import.meta as any).env.VITE_UPDATE_MANIFEST_URL as string
  const currentVersion  = (import.meta as any).env.VITE_APP_VERSION as string || '1.0.0'

  // Auth init
  useEffect(() => {
    applyTheme()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadUserProfile()
      else useAuthStore.setState({ user: null, company: null, isAuthenticated: false })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && session)  await loadUserProfile()
      if (event === 'SIGNED_OUT') useAuthStore.setState({ user: null, company: null, isAuthenticated: false, isLoading: false })
    })
    return () => subscription.unsubscribe()
  }, [])

  // ★ التحميل المسبق لكل الصفحات بعد 1.5 ثانية من تسجيل الدخول
  useEffect(() => {
    if (!isAuthenticated) return
    const t = setTimeout(preloadAllChunks, 1500)
    return () => clearTimeout(t)
  }, [isAuthenticated])

  // تحديث تلقائي من السيرفر
  useEffect(() => {
    if (!remoteUpdateUrl) return
    const check = async () => {
      try {
        const res  = await fetch(remoteUpdateUrl, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!data.version || data.version === currentVersion) return
        const key = 'erp_notified_v'
        if (sessionStorage.getItem(key) === data.version) return
        sessionStorage.setItem(key, data.version)
        toast(`⬆️ تحديث جديد: ${currentVersion} → ${data.version}`, {
          duration: 15000,
          style: { background: '#0d1b2a', color: '#fff', border: '1px solid #b8934a', direction: 'rtl', textAlign: 'right', fontWeight: 600, maxWidth: 400 },
          icon: null,
        })
      } catch {}
    }
    check()
    const t = setInterval(check, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [remoteUpdateUrl, currentVersion])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{ className: 'font-cairo text-sm', duration: 3000, style: { direction: 'rtl', textAlign: 'right' } }}
      />

      {/* Suspense الخارجي — للتحميل الأول فقط */}
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/pos"      element={<ProtectedRoute><POSPage /></ProtectedRoute>} />

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            {/* ★ كل Route له Suspense خاص يعرض skeleton بدل شاشة تحميل كاملة */}
            <Route index element={<S><DashboardPage /></S>} />

            {/* ── المبيعات ── */}
            <Route path="sales"              element={<S><SalesPage /></S>} />
            <Route path="sales/new"          element={<S><SaleFormPage /></S>} />
            <Route path="sales/returns"      element={<S><SalesReturnsPage /></S>} />
            <Route path="sales/returns/:id"  element={<S><SalesReturnDetailsPage /></S>} />
            <Route path="sales/:id/edit"     element={<S><SaleFormPage /></S>} />
            <Route path="sales/:id"          element={<S><SaleDetailsPage /></S>} />
            <Route path="quotations"         element={<S><QuotationsPage /></S>} />
            <Route path="quotations/new"     element={<S><QuotationFormPage /></S>} />
            <Route path="quotations/:id/edit"element={<S><QuotationFormPage /></S>} />
            <Route path="quotations/:id"     element={<S><QuotationDetailsPage /></S>} />

            {/* ── المشتريات ── */}
            <Route path="purchases"          element={<S><PurchasesPage /></S>} />
            <Route path="purchases/new"      element={<S><PurchaseFormPage /></S>} />
            <Route path="purchases/returns"  element={<S><PurchaseReturnsPage /></S>} />
            <Route path="purchases/orders"   element={<S><PurchaseOrdersPage /></S>} />
            <Route path="purchases/deleted"  element={<S><DeletedPurchasesPage /></S>} />
            <Route path="purchases/:id/edit" element={<S><PurchaseFormPage /></S>} />
            <Route path="purchases/:id"      element={<S><PurchaseDetailsPage /></S>} />

            {/* ── المخزون ── */}
            <Route path="products"               element={<S><ProductsPage /></S>} />
            <Route path="products/new"           element={<S><ProductFormPage /></S>} />
            <Route path="products/barcodes"      element={<S><ProductBarcodesPage /></S>} />
            <Route path="products/:id/edit"      element={<S><ProductFormPage /></S>} />
            <Route path="products/:id"           element={<S><ProductDetailsPage /></S>} />
            <Route path="inventory"              element={<S><InventoryPage /></S>} />
            <Route path="inventory/transfer"     element={<S><StockTransferPage /></S>} />
            <Route path="inventory/warehouse1"   element={<S><Warehouse1Page /></S>} />
            <Route path="inventory/warehouse-transfer" element={<S><WarehouseTransferPage /></S>} />
            <Route path="inventory/adjustment"   element={<S><StockAdjustmentPage /></S>} />
            <Route path="inventory/alerts"       element={<S><LowStockAlertsPage /></S>} />
            <Route path="price-lists"            element={<S><PriceListsPage /></S>} />
            <Route path="categories"             element={<S><CategoriesPage /></S>} />

            {/* ── العملاء والموردون ── */}
            <Route path="customers"              element={<S><CustomersPage /></S>} />
            <Route path="customers/new"          element={<S><CustomerFormPage /></S>} />
            <Route path="customers/:id"          element={<S><CustomerAccountPage /></S>} />
            <Route path="customers/:id/edit"     element={<S><CustomerFormPage /></S>} />
            <Route path="suppliers"              element={<S><SuppliersPage /></S>} />
            <Route path="suppliers/new"          element={<S><SupplierFormPage /></S>} />
            <Route path="suppliers/payments"     element={<S><SupplierPaymentsPage /></S>} />
            <Route path="suppliers/reports"      element={<S><SupplierReportsPage /></S>} />
            <Route path="suppliers/statements"   element={<S><SupplierStatementsPage /></S>} />
            <Route path="suppliers/:id/statement"element={<S><SupplierStatementPage /></S>} />
            <Route path="suppliers/:id"          element={<S><SupplierAccountPage /></S>} />
            <Route path="suppliers/:id/edit"     element={<S><SupplierFormPage /></S>} />

            {/* ── المحاسبة ── */}
            <Route path="accounts"              element={<S><AccountsPage /></S>} />
            <Route path="general-ledger"        element={<S><GeneralLedgerPage /></S>} />
            <Route path="trial-balance"         element={<S><TrialBalancePage /></S>} />
            <Route path="financial-statements"  element={<S><FinancialStatementsPage /></S>} />
            <Route path="journal"               element={<S><JournalEntriesPage /></S>} />
            <Route path="journal/new"           element={<S><JournalEntryFormPage /></S>} />
            <Route path="journal/:id/edit"      element={<S><JournalEntryFormPage /></S>} />
            <Route path="payments"              element={<S><PaymentsPage /></S>} />
            <Route path="bank-accounts"         element={<S><BankAccountsPage /></S>} />
            <Route path="bank-accounts/:id"     element={<S><BankTransactionsPage /></S>} />
            <Route path="bank/deposits"         element={<S><BankDepositsPage /></S>} />
            <Route path="bank/withdrawals"      element={<S><BankWithdrawalsPage /></S>} />
            <Route path="cost-centers"          element={<S><CostCentersPage /></S>} />
            <Route path="assets"                element={<S><AssetsPage /></S>} />
            <Route path="assets/:id"            element={<S><AssetDetailsPage /></S>} />
            <Route path="assets/:id/edit"       element={<S><AssetsPage /></S>} />
            <Route path="expense-categories"    element={<S><ExpenseCategoriesPage /></S>} />
            <Route path="tax-returns"           element={<S><TaxReturnsPage /></S>} />
            <Route path="budgets"               element={<S><BudgetsPage /></S>} />
            <Route path="accounting-periods"    element={<S><AccountingPeriodsPage /></S>} />
            <Route path="expenses"              element={<S><ExpensesPage /></S>} />

            {/* ── السندات ── */}
            <Route path="vouchers"              element={<S><VouchersPage /></S>} />
            <Route path="vouchers/new"          element={<S><VoucherFormPage /></S>} />
            <Route path="vouchers/reports"      element={<S><VoucherReportsPage /></S>} />
            <Route path="vouchers/settings"     element={<S><VoucherSettingsPage /></S>} />
            <Route path="vouchers/:id"          element={<S><VoucherDetailsPage /></S>} />
            <Route path="vouchers/:id/edit"     element={<S><VoucherFormPage /></S>} />

            {/* ── الخزائن ── */}
            <Route path="cashbox"               element={<S><CashboxesPage /></S>} />
            <Route path="cashbox/transfers"     element={<S><CashboxTransfersPage /></S>} />
            <Route path="cashbox/movements"     element={<S><CashboxMovementsPage /></S>} />

            {/* ── المطعم ── */}
            <Route path="recipes"               element={<S><RecipesPage /></S>} />

            {/* ── HR ── */}
            <Route path="hr"                    element={<S><HRDashboardPage /></S>} />
            <Route path="hr/employees"          element={<S><EmployeesPage /></S>} />
            <Route path="hr/employees/new"      element={<S><EmployeeFormPage /></S>} />
            <Route path="hr/employees/:id/edit" element={<S><EmployeeFormPage /></S>} />
            <Route path="hr/employees/:id"      element={<S><EmployeeDetailsPage /></S>} />
            <Route path="hr/attendance"         element={<S><AttendancePage /></S>} />
            <Route path="hr/payroll"            element={<S><PayrollPage /></S>} />
            <Route path="hr/leaves"             element={<S><LeavesPage /></S>} />
            <Route path="hr/performance"        element={<S><HRPerformancePage /></S>} />

            {/* ── CRM ── */}
            <Route path="crm"                        element={<S><CRMDashboardPage /></S>} />
            <Route path="crm/whatsapp-marketing"     element={<S><WhatsappMarketingPage /></S>} />
            <Route path="crm/leads"                  element={<S><CRMLeadsPage /></S>} />
            <Route path="crm/activities"             element={<S><CRMActivitiesPage /></S>} />

            {/* ── أخرى ── */}
            <Route path="profile"               element={<S><ProfilePage /></S>} />
            <Route path="notifications"         element={<S><NotificationsPage /></S>} />
            <Route path="reports"               element={<S><ReportsPage /></S>} />
            <Route path="permissions"           element={<S><PermissionsPage /></S>} />
            <Route path="audit-log"             element={<S><AuditLogPage /></S>} />
            <Route path="users"                 element={<S><UsersPage /></S>} />

            {/* ── الإعدادات ── */}
            <Route path="settings" element={<S><SettingsLayout /></S>}>
              <Route index element={<Navigate to="company/info" replace />} />
              <Route path="company/:sub"       element={<S><CompanySettings /></S>} />
              <Route path="financial/:sub"     element={<S><FinancialSettings /></S>} />
              <Route path="inventory/:sub"     element={<S><InventorySettings /></S>} />
              <Route path="pos/:sub"           element={<S><POSSettings /></S>} />
              <Route path="hr/:sub"            element={<S><HRSettings /></S>} />
              <Route path="users/:sub"         element={<S><UsersSettings /></S>} />
              <Route path="print/:sub"         element={<S><PrintSettings /></S>} />
              <Route path="integrations/:sub"  element={<S><IntegrationsSettings /></S>} />
              <Route path="security/:sub"      element={<S><SecuritySettings /></S>} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

// ★ Skeleton Suspense wrapper — يعرض skeleton بدل LoadingScreen عند التنقل بين الصفحات
function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}
