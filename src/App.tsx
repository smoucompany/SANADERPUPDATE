import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/components/layout/MainLayout'
import LoadingScreen from '@/components/shared/LoadingScreen'

// Lazy load pages for better performance
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const POSPage = lazy(() => import('@/pages/pos/POSPage'))
// Sales
const SalesPage = lazy(() => import('@/pages/sales/SalesPage'))
const SaleFormPage = lazy(() => import('@/pages/sales/SaleFormPage'))
const SaleDetailsPage = lazy(() => import('@/pages/sales/SaleDetailsPage'))
const SalesReturnsPage = lazy(() => import('@/pages/sales/SalesReturnsPage'))
const QuotationsPage = lazy(() => import('@/pages/sales/QuotationsPage'))
const QuotationFormPage = lazy(() => import('@/pages/sales/QuotationFormPage'))
const QuotationDetailsPage = lazy(() => import('@/pages/sales/QuotationDetailsPage'))
// Purchases
const PurchasesPage = lazy(() => import('@/pages/purchases/PurchasesPage'))
const PurchaseFormPage = lazy(() => import('@/pages/purchases/PurchaseFormPage'))
const PurchaseDetailsPage = lazy(() => import('@/pages/purchases/PurchaseDetailsPage'))
const PurchaseReturnsPage = lazy(() => import('@/pages/purchases/PurchaseReturnsPage'))
// Inventory
const ProductsPage = lazy(() => import('@/pages/inventory/ProductsPage'))
const ProductFormPage = lazy(() => import('@/pages/inventory/ProductFormPage'))
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage'))
const CategoriesPage = lazy(() => import('@/pages/inventory/CategoriesPage'))
const StockTransferPage = lazy(() => import('@/pages/inventory/StockTransferPage'))
const StockAdjustmentPage = lazy(() => import('@/pages/inventory/StockAdjustmentPage'))
// Customers
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage'))
const CustomerFormPage = lazy(() => import('@/pages/customers/CustomerFormPage'))
const CustomerAccountPage = lazy(() => import('@/pages/customers/CustomerAccountPage'))
// Suppliers
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage'))
const SupplierFormPage = lazy(() => import('@/pages/suppliers/SupplierFormPage'))
const SupplierAccountPage = lazy(() => import('@/pages/suppliers/SupplierAccountPage'))
const SupplierPaymentsPage = lazy(() => import('@/pages/suppliers/SupplierPaymentsPage'))
const SupplierReportsPage = lazy(() => import('@/pages/suppliers/SupplierReportsPage'))
const SupplierStatementsPage = lazy(() => import('@/pages/suppliers/SupplierStatementsPage'))
// Accounting
const AccountsPage = lazy(() => import('@/pages/accounting/AccountsPage'))
const GeneralLedgerPage = lazy(() => import('@/pages/accounting/GeneralLedgerPage'))
const TrialBalancePage = lazy(() => import('@/pages/accounting/TrialBalancePage'))
const FinancialStatementsPage = lazy(() => import('@/pages/accounting/FinancialStatementsPage'))
const JournalEntriesPage = lazy(() => import('@/pages/accounting/JournalEntriesPage'))
const JournalEntryFormPage = lazy(() => import('@/pages/accounting/JournalEntryFormPage'))
const PaymentsPage = lazy(() => import('@/pages/accounting/PaymentsPage'))
const BankAccountsPage = lazy(() => import('@/pages/accounting/BankAccountsPage'))
const CostCentersPage = lazy(() => import('@/pages/accounting/CostCentersPage'))
const AssetsPage = lazy(() => import('@/pages/accounting/AssetsPage'))
// Vouchers
const VouchersPage = lazy(() => import('@/pages/vouchers/VouchersPage'))
const VoucherFormPage = lazy(() => import('@/pages/vouchers/VoucherFormPage'))
const VoucherDetailsPage = lazy(() => import('@/pages/vouchers/VoucherDetailsPage'))
const VoucherReportsPage = lazy(() => import('@/pages/vouchers/VoucherReportsPage'))
const VoucherSettingsPage = lazy(() => import('@/pages/vouchers/VoucherSettingsPage'))
const ExpensesPage = lazy(() => import('@/pages/accounting/ExpensesPage'))
// HR
const HRDashboardPage = lazy(() => import('@/pages/hr/HRDashboardPage'))
const EmployeesPage = lazy(() => import('@/pages/hr/EmployeesPage'))
const EmployeeFormPage = lazy(() => import('@/pages/hr/EmployeeFormPage'))
const EmployeeDetailsPage = lazy(() => import('@/pages/hr/EmployeeDetailsPage'))
const AttendancePage = lazy(() => import('@/pages/hr/AttendancePage'))
const PayrollPage = lazy(() => import('@/pages/hr/PayrollPage'))
const LeavesPage = lazy(() => import('@/pages/hr/LeavesPage'))
const HRPerformancePage = lazy(() => import('@/pages/hr/HRPerformancePage'))
// CRM
const CRMDashboardPage = lazy(() => import('@/pages/crm/CRMDashboardPage'))
const WhatsappMarketingPage = lazy(() => import('@/pages/crm/WhatsappMarketingPage'))
const CRMLeadsPage = lazy(() => import('@/pages/crm/CRMLeadsPage'))
const CRMActivitiesPage = lazy(() => import('@/pages/crm/CRMActivitiesPage'))
// Profile
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
// Accounting extras
const BankTransactionsPage = lazy(() => import('@/pages/accounting/BankTransactionsPage'))
const AssetDetailsPage = lazy(() => import('@/pages/accounting/AssetDetailsPage'))
// Inventory extras
const ProductBarcodesPage = lazy(() => import('@/pages/inventory/ProductBarcodesPage'))
const ProductDetailsPage = lazy(() => import('@/pages/inventory/ProductDetailsPage'))
const LowStockAlertsPage = lazy(() => import('@/pages/inventory/LowStockAlertsPage'))
const PriceListsPage = lazy(() => import('@/pages/inventory/PriceListsPage'))
// Sales extras
const SalesReturnDetailsPage = lazy(() => import('@/pages/sales/SalesReturnDetailsPage'))
// Purchases extras
const PurchaseOrdersPage = lazy(() => import('@/pages/purchases/PurchaseOrdersPage'))
// Accounting extras
const ExpenseCategoriesPage = lazy(() => import('@/pages/accounting/ExpenseCategoriesPage'))
const TaxReturnsPage = lazy(() => import('@/pages/accounting/TaxReturnsPage'))
const BudgetsPage = lazy(() => import('@/pages/accounting/BudgetsPage'))
const AccountingPeriodsPage = lazy(() => import('@/pages/accounting/AccountingPeriodsPage'))
// Notifications
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))
// Reports
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
// Settings
const UsersPage = lazy(() => import('@/pages/settings/UsersPage'))
const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout'))
const CompanySettings = lazy(() => import('@/pages/settings/CompanySettings'))
const FinancialSettings = lazy(() => import('@/pages/settings/FinancialSettings'))
const InventorySettings = lazy(() => import('@/pages/settings/InventorySettings'))
const POSSettings = lazy(() => import('@/pages/settings/POSSettings'))
const HRSettings = lazy(() => import('@/pages/settings/HRSettings'))
const UsersSettings = lazy(() => import('@/pages/settings/UsersSettings'))
const PrintSettings = lazy(() => import('@/pages/settings/PrintSettings'))
const IntegrationsSettings = lazy(() => import('@/pages/settings/IntegrationsSettings'))
const SecuritySettings = lazy(() => import('@/pages/settings/SecuritySettings'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

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

export default function App() {
  const { loadUserProfile, setSession } = useAuthStore()
  const { applyTheme } = useSettingsStore()
  const remoteUpdateUrl = (import.meta as any).env.VITE_UPDATE_MANIFEST_URL as string
  const currentVersion = (import.meta as any).env.VITE_APP_VERSION as string || '1.0.0'

  useEffect(() => {
    applyTheme()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        loadUserProfile()
      } else {
        useAuthStore.setState({ user: null, company: null, isAuthenticated: false })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (event === 'SIGNED_IN' && session) {
          await loadUserProfile()
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.setState({ user: null, company: null, isAuthenticated: false, isLoading: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!remoteUpdateUrl) return

    const checkExternalUpdate = async () => {
      try {
        const response = await fetch(remoteUpdateUrl, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (data.version && data.version !== currentVersion) {
          toast(
            `يتوفر تحديث جديد ${data.version}. افتح الإعدادات > تحديث النظام لمتابعة التحديث.`,
            { icon: '⬆️', duration: 10000 }
          )
        }
      } catch {
        // Ignore external update check failures silently.
      }
    }

    checkExternalUpdate()
  }, [remoteUpdateUrl, currentVersion])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'font-cairo text-sm',
          duration: 4000,
          style: { direction: 'rtl', textAlign: 'right' }
        }}
      />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          {/* POS â€” full-screen */}
          <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />

            {/* Sales */}
            <Route path="sales" element={<SalesPage />} />
            <Route path="sales/new" element={<SaleFormPage />} />
            <Route path="sales/returns" element={<SalesReturnsPage />} />
            <Route path="sales/returns/:id" element={<SalesReturnDetailsPage />} />
            <Route path="sales/:id" element={<SaleDetailsPage />} />
            <Route path="sales/:id/edit" element={<SaleFormPage />} />

            {/* Quotations */}
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="quotations/new" element={<QuotationFormPage />} />
            <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
            <Route path="quotations/:id" element={<QuotationDetailsPage />} />

            {/* Purchases */}
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/new" element={<PurchaseFormPage />} />
            <Route path="purchases/returns" element={<PurchaseReturnsPage />} />
            <Route path="purchases/orders" element={<PurchaseOrdersPage />} />
            <Route path="purchases/:id/edit" element={<PurchaseFormPage />} />
            <Route path="purchases/:id" element={<PurchaseDetailsPage />} />

            {/* Inventory */}
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/barcodes" element={<ProductBarcodesPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductDetailsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/transfer" element={<StockTransferPage />} />
            <Route path="inventory/adjustment" element={<StockAdjustmentPage />} />
            <Route path="inventory/alerts" element={<LowStockAlertsPage />} />
            <Route path="price-lists" element={<PriceListsPage />} />
            <Route path="categories" element={<CategoriesPage />} />

            {/* Customers */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id" element={<CustomerAccountPage />} />
            <Route path="customers/:id/edit" element={<CustomerFormPage />} />

            {/* Suppliers */}
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/new" element={<SupplierFormPage />} />
            <Route path="suppliers/payments" element={<SupplierPaymentsPage />} />
            <Route path="suppliers/reports" element={<SupplierReportsPage />} />
            <Route path="suppliers/statements" element={<SupplierStatementsPage />} />
            <Route path="suppliers/:id" element={<SupplierAccountPage />} />
            <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />

            {/* Accounting */}
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="general-ledger" element={<GeneralLedgerPage />} />
            <Route path="trial-balance" element={<TrialBalancePage />} />
            <Route path="financial-statements" element={<FinancialStatementsPage />} />
            <Route path="journal" element={<JournalEntriesPage />} />
            <Route path="journal/new" element={<JournalEntryFormPage />} />
            <Route path="journal/:id/edit" element={<JournalEntryFormPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="bank-accounts" element={<BankAccountsPage />} />
            <Route path="bank-accounts/:id" element={<BankTransactionsPage />} />
            <Route path="cost-centers" element={<CostCentersPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="assets/:id" element={<AssetDetailsPage />} />
            <Route path="assets/:id/edit" element={<AssetsPage />} />
            <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
            <Route path="tax-returns" element={<TaxReturnsPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="accounting-periods" element={<AccountingPeriodsPage />} />

            {/* Vouchers */}
            <Route path="vouchers" element={<VouchersPage />} />
            <Route path="vouchers/new" element={<VoucherFormPage />} />
            <Route path="vouchers/reports" element={<VoucherReportsPage />} />
            <Route path="vouchers/settings" element={<VoucherSettingsPage />} />
            <Route path="vouchers/:id" element={<VoucherDetailsPage />} />
            <Route path="vouchers/:id/edit" element={<VoucherFormPage />} />
            <Route path="expenses" element={<ExpensesPage />} />

            {/* HR */}
            <Route path="hr" element={<HRDashboardPage />} />
            <Route path="hr/employees" element={<EmployeesPage />} />
            <Route path="hr/employees/new" element={<EmployeeFormPage />} />
            <Route path="hr/employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="hr/employees/:id" element={<EmployeeDetailsPage />} />
            <Route path="hr/attendance" element={<AttendancePage />} />
            <Route path="hr/payroll" element={<PayrollPage />} />
            <Route path="hr/leaves" element={<LeavesPage />} />
            <Route path="hr/performance" element={<HRPerformancePage />} />

            {/* CRM */}
            <Route path="crm" element={<CRMDashboardPage />} />
            <Route path="crm/whatsapp-marketing" element={<WhatsappMarketingPage />} />
            <Route path="crm/leads" element={<CRMLeadsPage />} />
            <Route path="crm/activities" element={<CRMActivitiesPage />} />

            {/* Profile */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Reports */}
            <Route path="reports" element={<ReportsPage />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="company/info" replace />} />
              <Route path="company/:sub"      element={<CompanySettings />} />
              <Route path="financial/:sub"    element={<FinancialSettings />} />
              <Route path="inventory/:sub"    element={<InventorySettings />} />
              <Route path="pos/:sub"          element={<POSSettings />} />
              <Route path="hr/:sub"           element={<HRSettings />} />
              <Route path="users/:sub"        element={<UsersSettings />} />
              <Route path="print/:sub"        element={<PrintSettings />} />
              <Route path="integrations/:sub" element={<IntegrationsSettings />} />
              <Route path="security/:sub"     element={<SecuritySettings />} />
            </Route>
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

