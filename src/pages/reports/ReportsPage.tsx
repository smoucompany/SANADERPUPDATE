import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, FileText, TrendingUp, TrendingDown, Package, Users, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency, formatDate, exportToExcel, exportToCSV, today } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { generateColors } from '@/lib/utils'

type ReportType = 'sales' | 'purchases' | 'inventory' | 'customers' | 'expenses' | 'profit'

const reportTypes = [
  { id: 'sales', label: 'تقرير المبيعات', icon: TrendingUp, color: 'text-blue-600' },
  { id: 'purchases', label: 'تقرير المشتريات', icon: TrendingDown, color: 'text-purple-600' },
  { id: 'inventory', label: 'تقرير المخزون', icon: Package, color: 'text-orange-600' },
  { id: 'customers', label: 'تقرير العملاء', icon: Users, color: 'text-emerald-600' },
  { id: 'expenses', label: 'تقرير المصروفات', icon: FileText, color: 'text-red-600' },
  { id: 'profit', label: 'تقرير الأرباح والخسائر', icon: BarChart3, color: 'text-indigo-600' }
]

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [reportType, setReportType] = useState<ReportType>('sales')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(today())
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('month')

  // Sales Report
  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', user?.company_id, dateFrom, dateTo, groupBy],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_date, total, tax_amount, discount_amount, payment_method, status, customer:customers(name_ar)')
        .eq('company_id', user!.company_id)
        .gte('invoice_date', dateFrom).lte('invoice_date', dateTo)
        .not('status', 'in', '(cancelled,draft)')
        .is('deleted_at', null)
        .order('invoice_date')
      if (error) throw error
      return data || []
    },
    enabled: !!user && reportType === 'sales'
  })

  // Purchases Report
  const { data: purchasesData = [] } = useQuery({
    queryKey: ['report-purchases', user?.company_id, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchases')
        .select('purchase_date, total, supplier:suppliers(name_ar), status')
        .eq('company_id', user!.company_id)
        .gte('purchase_date', dateFrom).lte('purchase_date', dateTo)
        .not('status', 'in', '(cancelled,draft)')
        .is('deleted_at', null)
        .order('purchase_date')
      return data || []
    },
    enabled: !!user && reportType === 'purchases'
  })

  // Expenses Report
  const { data: expensesData = [] } = useQuery({
    queryKey: ['report-expenses', user?.company_id, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('expense_date, total_amount, category:expense_categories(name_ar), description')
        .eq('company_id', user!.company_id)
        .gte('expense_date', dateFrom).lte('expense_date', dateTo)
        .order('expense_date')
      return data || []
    },
    enabled: !!user && reportType === 'expenses'
  })

  // Customers Report
  const { data: customersData = [] } = useQuery({
    queryKey: ['report-customers', user?.company_id, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('customer:customers(id, name_ar), total, paid_amount, remaining_amount')
        .eq('company_id', user!.company_id)
        .gte('invoice_date', dateFrom).lte('invoice_date', dateTo)
        .not('status', 'in', '(cancelled,draft)')
        .is('deleted_at', null)
        .not('customer_id', 'is', null)
      if (!data) return []
      const grouped = data.reduce((acc: Record<string, {name: string; total: number; paid: number; remaining: number}>, inv: Record<string, unknown>) => {
        const customer = inv.customer as Record<string,string>
        if (!customer) return acc
        const id = customer.id
        if (!acc[id]) acc[id] = { name: customer.name_ar, total: 0, paid: 0, remaining: 0 }
        acc[id].total += Number(inv.total)
        acc[id].paid += Number(inv.paid_amount)
        acc[id].remaining += Number(inv.remaining_amount)
        return acc
      }, {})
      return Object.values(grouped).sort((a, b) => b.total - a.total)
    },
    enabled: !!user && reportType === 'customers'
  })

  // Inventory Report
  const { data: inventoryData = [] } = useQuery({
    queryKey: ['report-inventory', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory')
        .select('*, product:products(name_ar, barcode, cost_price, selling_price, min_stock_alert), warehouse:warehouses(name_ar)')
        .order('quantity', { ascending: true })
      return data || []
    },
    enabled: !!user && reportType === 'inventory'
  })

  // Monthly aggregation for chart
  const monthlyData = (() => {
    if (reportType === 'sales') {
      const monthly: Record<string, number> = {}
      salesData.forEach((s: Record<string, unknown>) => {
        const month = String(s.invoice_date || '').substring(0, 7)
        monthly[month] = (monthly[month] || 0) + Number(s.total)
      })
      return Object.entries(monthly).map(([month, total]) => ({
        name: MONTHS_AR[parseInt(month.split('-')[1]) - 1] || month,
        value: total
      }))
    }
    return []
  })()

  const totalSales = salesData.reduce((s: number, inv: Record<string, unknown>) => s + Number(inv.total), 0)
  const totalPurchases = purchasesData.reduce((s: number, p: Record<string, unknown>) => s + Number(p.total), 0)
  const totalExpenses = expensesData.reduce((s: number, e: Record<string, unknown>) => s + Number(e.total_amount), 0)

  const handleExport = () => {
    switch (reportType) {
      case 'sales':
        exportToExcel(salesData.map((s: Record<string, unknown>) => ({
          'التاريخ': formatDate(String(s.invoice_date)),
          'العميل': (s.customer as Record<string,string>)?.name_ar || 'نقدي',
          'الإجمالي': s.total,
          'الضريبة': s.tax_amount,
          'طريقة الدفع': s.payment_method
        })), 'تقرير-المبيعات')
        break
      case 'purchases':
        exportToExcel(purchasesData.map((p: Record<string, unknown>) => ({
          'التاريخ': formatDate(String(p.purchase_date)),
          'المورد': (p.supplier as Record<string,string>)?.name_ar,
          'الإجمالي': p.total
        })), 'تقرير-المشتريات')
        break
      case 'expenses':
        exportToExcel(expensesData.map((e: Record<string, unknown>) => ({
          'التاريخ': formatDate(String(e.expense_date)),
          'البيان': e.description,
          'التصنيف': (e.category as Record<string,string>)?.name_ar,
          'المبلغ': e.total_amount
        })), 'تقرير-المصروفات')
        break
    }
  }

  const pieColors = generateColors(10)

  return (
    <div className="space-y-5">
      <PageHeader title="التقارير" subtitle="تقارير شاملة لجميع عمليات النظام"
        actions={<button onClick={handleExport} className="btn-outline gap-1.5"><Download className="w-4 h-4" />تصدير Excel</button>}
      />

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {reportTypes.map(rt => (
          <button key={rt.id} onClick={() => setReportType(rt.id as ReportType)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all
              ${reportType === rt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'}`}>
            <rt.icon className={`w-5 h-5 ${reportType === rt.id ? 'text-primary' : rt.color}`} />
            <span className="text-xs text-center leading-tight">{rt.label}</span>
          </button>
        ))}
      </div>

      {/* Date Filters */}
      <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">من:</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="form-input h-9 text-sm w-40" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">إلى:</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="form-input h-9 text-sm w-40" />
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'اليوم', fn: () => { setDateFrom(today()); setDateTo(today()) } },
            { label: 'هذا الشهر', fn: () => { const d = new Date(); setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]); setDateTo(today()) } },
            { label: 'هذا العام', fn: () => { setDateFrom(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); setDateTo(today()) } }
          ].map(btn => (
            <button key={btn.label} onClick={btn.fn} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 font-medium">{btn.label}</button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {reportType === 'profit' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalSales)}</p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <p className="text-sm text-muted-foreground">إجمالي التكاليف</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalPurchases + totalExpenses)}</p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <p className="text-sm text-muted-foreground">صافي الربح</p>
            <p className={`text-2xl font-bold mt-1 ${totalSales - totalPurchases - totalExpenses >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
              {formatCurrency(totalSales - totalPurchases - totalExpenses)}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      {(reportType === 'sales' || reportType === 'profit') && monthlyData.length > 0 && (
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-5">المبيعات الشهرية</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'Cairo' }} width={45} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelStyle={{ fontFamily: 'Cairo' }} />
              <Bar dataKey="value" name="المبيعات" fill="#3B82F6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            {reportTypes.find(r => r.id === reportType)?.label}
          </h3>
          <span className="text-sm text-muted-foreground">
            {reportType === 'sales' ? `${salesData.length} فاتورة` :
             reportType === 'purchases' ? `${purchasesData.length} فاتورة` :
             reportType === 'expenses' ? `${expensesData.length} مصروف` :
             reportType === 'customers' ? `${customersData.length} عميل` :
             reportType === 'inventory' ? `${inventoryData.length} منتج` : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            {reportType === 'sales' && (
              <>
                <thead><tr><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>الضريبة</th><th>طريقة الدفع</th></tr></thead>
                <tbody>
                  {salesData.map((s: Record<string, unknown>, i: number) => (
                    <tr key={i}>
                      <td className="text-muted-foreground">{formatDate(String(s.invoice_date))}</td>
                      <td>{(s.customer as Record<string,string>)?.name_ar || 'نقدي'}</td>
                      <td className="font-bold">{formatCurrency(Number(s.total))}</td>
                      <td className="text-muted-foreground">{formatCurrency(Number(s.tax_amount))}</td>
                      <td>{String(s.payment_method)}</td>
                    </tr>
                  ))}
                  {salesData.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات</td></tr>}
                </tbody>
                <tfoot><tr className="font-bold bg-muted/30"><td>الإجمالي</td><td /><td className="text-blue-600">{formatCurrency(totalSales)}</td><td /><td /></tr></tfoot>
              </>
            )}
            {reportType === 'customers' && (
              <>
                <thead><tr><th>العميل</th><th>إجمالي المبيعات</th><th>المحصّل</th><th>المتبقي</th></tr></thead>
                <tbody>
                  {(customersData as Array<{name: string; total: number; paid: number; remaining: number}>).map((c, i) => (
                    <tr key={i}>
                      <td className="font-medium">{c.name}</td>
                      <td className="font-bold">{formatCurrency(c.total)}</td>
                      <td className="text-emerald-600">{formatCurrency(c.paid)}</td>
                      <td className={c.remaining > 0 ? 'text-orange-500 font-medium' : 'text-muted-foreground'}>{formatCurrency(c.remaining)}</td>
                    </tr>
                  ))}
                  {customersData.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات</td></tr>}
                </tbody>
              </>
            )}
            {reportType === 'expenses' && (
              <>
                <thead><tr><th>التاريخ</th><th>البيان</th><th>التصنيف</th><th>المبلغ</th></tr></thead>
                <tbody>
                  {expensesData.map((e: Record<string, unknown>, i: number) => (
                    <tr key={i}>
                      <td className="text-muted-foreground">{formatDate(String(e.expense_date))}</td>
                      <td>{String(e.description)}</td>
                      <td className="text-muted-foreground">{(e.category as Record<string,string>)?.name_ar || '—'}</td>
                      <td className="font-bold text-red-500">{formatCurrency(Number(e.total_amount))}</td>
                    </tr>
                  ))}
                  {expensesData.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات</td></tr>}
                </tbody>
                <tfoot><tr className="font-bold bg-muted/30"><td colSpan={3}>الإجمالي</td><td className="text-red-500">{formatCurrency(totalExpenses)}</td></tr></tfoot>
              </>
            )}
            {reportType === 'inventory' && (
              <>
                <thead><tr><th>المنتج</th><th>الباركود</th><th>المستودع</th><th>الكمية</th><th>سعر التكلفة</th><th>قيمة المخزون</th></tr></thead>
                <tbody>
                  {(inventoryData as Array<Record<string, unknown>>).map((item, i) => {
                    const product = item.product as Record<string, unknown>
                    const warehouse = item.warehouse as Record<string, unknown>
                    const qty = Number(item.quantity)
                    const cost = Number(product?.cost_price) || 0
                    return (
                      <tr key={i}>
                        <td className="font-medium text-sm">{String(product?.name_ar || '—')}</td>
                        <td className="font-mono text-xs text-muted-foreground">{String(product?.barcode || '—')}</td>
                        <td className="text-muted-foreground text-sm">{String(warehouse?.name_ar || '—')}</td>
                        <td className={`font-bold ${qty <= Number(product?.min_stock_alert || 0) ? 'text-orange-500' : ''}`}>{qty}</td>
                        <td>{formatCurrency(cost)}</td>
                        <td className="font-bold">{formatCurrency(qty * cost)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
