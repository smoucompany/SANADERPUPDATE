import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, FileText, Printer, ShieldCheck, Scale, Award, TrendingUp, DollarSign } from 'lucide-react'
import TradingAccountTab from './TradingAccountTab'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'

export default function FinancialStatementsPage() {
  const { company, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cashflow' | 'trading' | 'ratios'>('income')

  // 1. Fetch all accounts and their current balances
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['financial-accounts', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return []
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('is_active', true)
        .order('code')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.company_id
  })

  // Group and process accounts
  const processedData = (() => {
    if (accounts.length === 0) {
      return {
        assets: [], liabilities: [], equity: [], revenues: [], expenses: [],
        totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalRevenues: 0, totalExpenses: 0, netProfit: 0,
        changeAR: 0, changeInv: 0, changeOtherAssets: 0, changeAP: 0, changeOtherLiabs: 0, opCashFlow: 0,
        invCashFlow: 0, finCashFlow: 0, netChangeInCash: 0, cashAtBeginning: 0, cashAtEnd: 0
      }
    }

    // Detail accounts for base aggregation
    const details = accounts.filter(a => a.is_detail)

    // Aggregate detail accounts
    const totalAssets = details.filter(a => a.type === 'asset').reduce((s, a) => s + (a.balance || 0), 0)
    const totalLiabilities = details.filter(a => a.type === 'liability').reduce((s, a) => s + (a.balance || 0), 0)
    const totalEquity = details.filter(a => a.type === 'equity').reduce((s, a) => s + (a.balance || 0), 0)
    const totalRevenues = details.filter(a => a.type === 'revenue').reduce((s, a) => s + (a.balance || 0), 0)
    const totalExpenses = details.filter(a => a.type === 'expense').reduce((s, a) => s + (a.balance || 0), 0)

    const netProfit = totalRevenues - totalExpenses

    // ── حساب المتاجرة ──────────────────────────────────────────
    // المبيعات الصافية
    const salesAccounts    = details.filter(a => a.type === 'revenue' && (a.code.startsWith('41') || a.code.startsWith('4')))
    const salesReturns     = details.filter(a => a.code.startsWith('412') || a.name_ar.includes('مردودات المبيعات'))
    const netSales         = salesAccounts.reduce((s,a) => s + (a.balance||0), 0)
                           - salesReturns.reduce((s,a) => s + (a.balance||0), 0)

    // تكلفة البضاعة المباعة
    const cogsAccounts     = details.filter(a => a.type === 'expense' && (a.code.startsWith('51') || a.name_ar.includes('تكلفة')))
    const totalCOGS        = cogsAccounts.reduce((s,a) => s + (a.balance||0), 0)

    // مخزون آخر المدة (من الأصول)
    const closingInventory = details.filter(a => a.code.startsWith('114') || a.code.startsWith('115'))
                                    .reduce((s,a) => s + (a.balance||0), 0)

    // مشتريات الفترة
    const purchaseAccounts = details.filter(a => a.code.startsWith('512') || a.name_ar.includes('مشتريات'))
    const totalPurchases   = purchaseAccounts.reduce((s,a) => s + (a.balance||0), 0)

    // مجمل الربح
    const grossProfit      = netSales - totalCOGS

    // Cash Flow calculations
    const arAccounts = details.filter(a => a.code.startsWith('113'))
    const arBalance = arAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const changeAR = -arBalance

    const invAccounts = details.filter(a => a.code.startsWith('115'))
    const invBalance = invAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const changeInv = -invBalance

    const otherAssets = details.filter(a => a.code.startsWith('116') || a.code.startsWith('117'))
    const otherAssetsBalance = otherAssets.reduce((sum, a) => sum + (a.balance || 0), 0)
    const changeOtherAssets = -otherAssetsBalance

    const apAccounts = details.filter(a => a.code.startsWith('211'))
    const apBalance = apAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const changeAP = apBalance

    const otherLiabilities = details.filter(a => a.code.startsWith('212') || a.code.startsWith('213') || a.code.startsWith('214'))
    const otherLiabBalance = otherLiabilities.reduce((sum, a) => sum + (a.balance || 0), 0)
    const changeOtherLiabs = otherLiabBalance

    const opCashFlow = netProfit + changeAR + changeInv + changeOtherAssets + changeAP + changeOtherLiabs

    const fixedAssets = details.filter(a => a.code.startsWith('12'))
    const fixedAssetsBalance = fixedAssets.reduce((sum, a) => sum + (a.balance || 0), 0)
    const invCashFlow = -fixedAssetsBalance

    const equityAccounts = details.filter(a => a.code.startsWith('3') && a.code !== '3120')
    const equityBalance = equityAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const finCashFlow = equityBalance

    const netChangeInCash = opCashFlow + invCashFlow + finCashFlow

    const cashAccounts = details.filter(a => a.code.startsWith('111') || a.code.startsWith('112'))
    const cashAtEnd = cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const cashAtBeginning = cashAtEnd - netChangeInCash

    // Get hierarchical list for presentation (levels 1, 2, 3)
    const getList = (type: string) => accounts.filter(a => a.type === type)

    return {
      assets: getList('asset'),
      liabilities: getList('liability'),
      equity: getList('equity'),
      revenues: getList('revenue'),
      expenses: getList('expense'),
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenues,
      totalExpenses,
      netProfit,
      netSales, totalCOGS, closingInventory, totalPurchases, grossProfit,
      salesAccounts, salesReturns, cogsAccounts, purchaseAccounts,
      changeAR,
      changeInv,
      changeOtherAssets,
      changeAP,
      changeOtherLiabs,
      opCashFlow,
      invCashFlow,
      finCashFlow,
      netChangeInCash,
      cashAtBeginning,
      cashAtEnd
    }
  })()

  const {
    assets, liabilities, equity, revenues, expenses,
    totalAssets, totalLiabilities, totalEquity, totalRevenues, totalExpenses, netProfit,
    netSales, totalCOGS, closingInventory, totalPurchases, grossProfit,
    salesAccounts, salesReturns, cogsAccounts, purchaseAccounts,
    changeAR, changeInv, changeOtherAssets, changeAP, changeOtherLiabs, opCashFlow,
    invCashFlow, finCashFlow, netChangeInCash, cashAtBeginning, cashAtEnd
  } = processedData

  // Export helper
  const handleExport = () => {
    let exportData: any[] = []
    let filename = 'القوائم_المالية'

    if (activeTab === 'income') {
      filename = 'قائمة_الدخل'
      exportData = [
        { 'البند المحاسبي': 'الإيرادات التشغيلية', 'المبلغ': '' },
        ...revenues.map(r => ({ 'البند المحاسبي': `  ${r.code} - ${r.name_ar}`, 'المبلغ': r.balance })),
        { 'البند المحاسبي': 'إجمالي الإيرادات', 'المبلغ': totalRevenues },
        { 'البند المحاسبي': '', 'المبلغ': '' },
        { 'البند المحاسبي': 'المصروفات وال تكاليف', 'المبلغ': '' },
        ...expenses.map(e => ({ 'البند المحاسبي': `  ${e.code} - ${e.name_ar}`, 'المبلغ': e.balance })),
        { 'البند المحاسبي': 'إجمالي المصروفات', 'المبلغ': totalExpenses },
        { 'البند المحاسبي': '', 'المبلغ': '' },
        { 'البند المحاسبي': 'صافي الأرباح والخسائر', 'المبلغ': netProfit }
      ]
    } else if (activeTab === 'balance') {
      filename = 'الميزانية_العمومية'
      exportData = [
        { 'البند': 'الأصول', 'المبلغ': '' },
        ...assets.map(a => ({ 'البند': `  ${a.code} - ${a.name_ar}`, 'المبلغ': a.balance })),
        { 'البند': 'إجمالي الأصول', 'المبلغ': totalAssets },
        { 'البند': '', 'المبلغ': '' },
        { 'البند': 'الالتزامات', 'المبلغ': '' },
        ...liabilities.map(l => ({ 'البند': `  ${l.code} - ${l.name_ar}`, 'المبلغ': l.balance })),
        { 'البند': 'إجمالي الالتزامات', 'المبلغ': totalLiabilities },
        { 'البند': '', 'المبلغ': '' },
        { 'البند': 'حقوق الملكية', 'المبلغ': '' },
        ...equity.map(eq => ({ 'البند': `  ${eq.code} - ${eq.name_ar}`, 'المبلغ': eq.balance })),
        { 'البند': 'أرباح العام الحالية (من قائمة الدخل)', 'المبلغ': netProfit },
        { 'البند': 'إجمالي حقوق الملكية والالتزامات', 'المبلغ': totalLiabilities + totalEquity + netProfit }
      ]
    } else if (activeTab === 'cashflow') {
      filename = 'قائمة_التدفقات_النقدية'
      exportData = [
        { 'البند': 'التدفقات النقدية من الأنشطة التشغيلية', 'المبلغ': '' },
        { 'البند': '  صافي الربح للعام', 'المبلغ': netProfit },
        { 'البند': '  التغير في العملاء والذمم المدينة', 'المبلغ': changeAR },
        { 'البند': '  التغير في المخزون السلعي', 'المبلغ': changeInv },
        { 'البند': '  التغير في الأصول المتداولة الأخرى', 'المبلغ': changeOtherAssets },
        { 'البند': '  التغير في الموردين والذمم الدائنة', 'المبلغ': changeAP },
        { 'البند': '  التغير في الالتزامات المتداولة الأخرى', 'المبلغ': changeOtherLiabs },
        { 'البند': 'صافي النقد من الأنشطة التشغيلية', 'المبلغ': opCashFlow },
        { 'البند': '', 'المبلغ': '' },
        { 'البند': 'التدفقات النقدية من الأنشطة الاستثمارية', 'المبلغ': '' },
        { 'البند': '  شراء أصول ثابتة وممتلكات جديدة', 'المبلغ': invCashFlow },
        { 'البند': 'صافي النقد من الأنشطة الاستثمارية', 'المبلغ': invCashFlow },
        { 'البند': '', 'المبلغ': '' },
        { 'البند': 'التدفقات النقدية من الأنشطة التمويلية', 'المبلغ': '' },
        { 'البند': '  زيادة رأس المال والمساهمات', 'المبلغ': finCashFlow },
        { 'البند': 'صافي النقد من الأنشطة التمويلية', 'المبلغ': finCashFlow },
        { 'البند': '', 'المبلغ': '' },
        { 'البند': 'صافي التغير في النقدية وشبه النقدية', 'المبلغ': netChangeInCash },
        { 'البند': 'النقدية في بداية الفترة المالية', 'المبلغ': cashAtBeginning },
        { 'البند': 'النقدية في نهاية الفترة المالية', 'المبلغ': cashAtEnd }
      ]
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'income' ? 'قائمة الدخل' : 'الميزانية العمومية')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }

  // Print helper
  const handlePrint = () => {
    window.print()
  }

  // Financial ratios calculations
  const grossMargin = totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0
  const currentRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities) : 0

  return (
    <div className="space-y-6">
      {/* ── PRINT ONLY REPORT HEADER ── */}
      <div className="print-only mb-6" dir="rtl">
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-black">مؤسسة سند للحلول التقنية</h2>
            <p className="text-xs text-muted-foreground mt-1">قسم الإدارة المالية والمحاسبة</p>
            <p className="text-[10px] text-muted-foreground">الرقم الضريبي: 300123456700003</p>
          </div>
          <div className="text-left" dir="ltr">
            <h2 className="text-lg font-black text-black">SANAD SYSTEMS</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Corporate Financial Statements</p>
            <p className="text-[10px] text-muted-foreground">Date: {new Date().toLocaleDateString('en-US')}</p>
          </div>
        </div>
        <div className="text-center my-6">
          <h1 className="text-2xl font-black text-black border-2 border-black py-2 bg-slate-50">
            {activeTab === 'income'   ? 'قائمة الدخل (الأرباح والخسائر)'
           : activeTab === 'balance'  ? 'الميزانية العمومية (المركز المالي)'
           : activeTab === 'trading'  ? 'حساب المتاجرة'
           : activeTab === 'cashflow' ? 'قائمة التدفقات النقدية'
           : 'المؤشرات المالية والنسب'}
          </h1>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            للسنة المالية الجارية المنتهية في 31 ديسمبر {new Date().getFullYear()}م
          </p>
        </div>
      </div>

      {/* Page Header */}
      <div className="no-print">
        <PageHeader
          title="القوائم المالية والتحليلات"
          subtitle="ميزان الميزانية العمومية وقائمة الدخل وصافي الأرباح ومؤشرات الأداء"
          actions={
            <div className="flex gap-2">
              <button onClick={handlePrint} className="btn-outline gap-1.5 border-border hover:bg-muted text-foreground cursor-pointer">
                <Printer className="w-4 h-4" /> طباعة التقارير
              </button>
              {activeTab !== 'ratios' && (
                <button onClick={handleExport} className="btn-primary gap-1.5 bg-primary text-white hover:brightness-110 cursor-pointer">
                  <Download className="w-4 h-4" /> تصدير Excel
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Tabs Menu */}
      <div className="no-print flex p-1.5 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl max-w-4xl gap-1 shadow-sm">
        {[
          { id: 'income',   label: 'قائمة الدخل',          icon: BarChart3   },
          { id: 'balance',  label: 'الميزانية العمومية',    icon: Scale       },
          { id: 'trading',  label: 'حساب المتاجرة',        icon: TrendingUp  },
          { id: 'cashflow', label: 'التدفقات النقدية',     icon: DollarSign  },
          { id: 'ratios',   label: 'المؤشرات المالية',     icon: Award       }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="p-8 space-y-3">
          <div className="skeleton h-8 w-1/4 rounded" />
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* 1. INCOME STATEMENT */}
          {activeTab === 'income' && (
            <motion.div
              key="income"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Income statement dynamic metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Revenue Card */}
                <div className="bg-card/75 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground">إجمالي الإيرادات والمبيعات</p>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-emerald-600 mt-4 tabular-nums">{formatCurrency(totalRevenues)}</p>
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-4">
                    <div className="bg-emerald-500 h-full w-full rounded-full" />
                  </div>
                </div>

                {/* Expense Card */}
                <div className="bg-card/75 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground">إجمالي التكاليف والمصروفات</p>
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                      <Scale className="w-4.5 h-4.5 text-rose-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-rose-500 mt-4 tabular-nums">{formatCurrency(totalExpenses)}</p>
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-4">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalRevenues > 0 ? Math.min((totalExpenses / totalRevenues) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Profit/Loss Card */}
                <div className="bg-card/75 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
                  <div className={`absolute top-0 right-0 w-1.5 h-full ${netProfit >= 0 ? 'bg-blue-600' : 'bg-destructive'}`} />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground">صافي الأرباح والخسائر</p>
                    <div className={`w-8 h-8 rounded-lg ${netProfit >= 0 ? 'bg-blue-500/10' : 'bg-destructive/10'} flex items-center justify-center`}>
                      <DollarSign className={`w-4.5 h-4.5 ${netProfit >= 0 ? 'text-blue-600' : 'text-destructive'}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-black mt-4 tabular-nums ${netProfit >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                    {formatCurrency(netProfit)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1.5 font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    هامش الربح الصافي: <span className="font-extrabold text-foreground">{grossMargin.toFixed(1)}%</span>
                  </p>
                </div>
              </div>

              {/* Detailed statement table */}
              <div className="bg-card border border-border/60 rounded-2xl shadow-md overflow-hidden">
                <div className="px-6 py-4.5 border-b border-border/50 bg-muted/15 flex items-center justify-between no-print">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-primary" /> تفاصيل بنود قائمة الدخل
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-extrabold shadow-sm">
                    العملة المعتمدة: {company?.currency || 'SAR'}
                  </span>
                </div>

                <div className="divide-y divide-border/40 text-sm">
                  {/* Revenue section */}
                  <div className="bg-emerald-500/[0.03] px-6 py-3 font-extrabold text-xs text-emerald-700 tracking-wide uppercase flex items-center justify-between">
                    <span>1. الإيرادات والمبيعات التشغيلية</span>
                    <span className="text-[10px] opacity-70 font-semibold">REVENUES & SALES</span>
                  </div>
                  {revenues.map(item => (
                    <div key={item.id} className="flex justify-between px-8 py-3.5 hover:bg-accent/5 transition-colors border-b border-border/10">
                      <span className="text-muted-foreground font-medium animate-pulse-subtle" style={{ paddingRight: `${(item.level - 1) * 20}px` }}>
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded mr-1 text-xs text-primary">{item.code}</span> — {item.name_ar}
                      </span>
                      <span className="font-bold text-foreground font-mono tabular-nums">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-6 py-4 bg-emerald-500/[0.06] font-black text-emerald-600 border-t border-emerald-500/20 text-sm">
                    <span>إجمالي الإيرادات</span>
                    <span className="font-mono tabular-nums underline decoration-double decoration-2 underline-offset-4">{formatCurrency(totalRevenues)}</span>
                  </div>

                  {/* Expenses section */}
                  <div className="bg-rose-500/[0.03] px-6 py-3 font-extrabold text-xs text-rose-700 tracking-wide uppercase flex items-center justify-between">
                    <span>2. المصاريف والتشغيل والتكاليف</span>
                    <span className="text-[10px] opacity-70 font-semibold">OPERATING EXPENSES</span>
                  </div>
                  {expenses.map(item => (
                    <div key={item.id} className="flex justify-between px-8 py-3.5 hover:bg-accent/5 transition-colors border-b border-border/10">
                      <span className="text-muted-foreground font-medium cursor-pointer" style={{ paddingRight: `${(item.level - 1) * 20}px` }}>
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded mr-1 text-xs text-primary">{item.code}</span> — {item.name_ar}
                      </span>
                      <span className="font-bold text-rose-600 font-mono tabular-nums">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-6 py-4 bg-rose-500/[0.06] font-black text-rose-600 border-t border-rose-500/20 text-sm">
                    <span>إجمالي المصروفات والتكاليف</span>
                    <span className="font-mono tabular-nums underline decoration-double decoration-2 underline-offset-4">{formatCurrency(totalExpenses)}</span>
                  </div>

                  {/* Summary Net Profit */}
                  <div className="flex justify-between px-6 py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-base rounded-b-2xl shadow-inner">
                    <span className="flex items-center gap-2">صافي الأرباح / الخسائر المتبقية للعام</span>
                    <span className="font-mono tabular-nums text-lg border-b-4 border-double border-white/60 pb-0.5">{formatCurrency(netProfit)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. BALANCE SHEET */}
          {activeTab === 'balance' && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Balance Verification message */}
              <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-indigo-500/30 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-right">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6.5 h-6.5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200">معادلة الميزانية متوازنة تماماً</p>
                    <p className="text-xs text-indigo-600/80 dark:text-indigo-400 mt-1">
                      الأصول = الالتزامات + حقوق الملكية. نظام القيد المزدوج المحاسبي يعمل بكفاءة 100%.
                    </p>
                  </div>
                </div>
                <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-center md:text-right shadow-md shrink-0">
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">قيمة الميزانية الإجمالية</p>
                  <p className="text-lg font-black mt-0.5 font-mono tabular-nums">{formatCurrency(totalAssets)}</p>
                </div>
              </div>

              {/* Two columns layout: Assets vs Liabilities & Equity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Assets */}
                <div className="bg-card border border-border/60 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-5 py-4 border-b border-border/50 bg-blue-500/[0.04] flex justify-between items-center no-print">
                      <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                        <Scale className="w-4.5 h-4.5 text-blue-600" /> الأصول (ممتلكات المنشأة)
                      </h3>
                      <span className="text-[10px] text-blue-600 font-extrabold bg-blue-500/10 px-2 py-0.5 rounded-full">ASSETS</span>
                    </div>

                    <div className="divide-y divide-border/40 text-sm">
                      {assets.map(item => (
                        <div key={item.id} className="flex justify-between px-6 py-3 hover:bg-accent/5 transition-colors border-b border-border/10">
                          <span className="text-muted-foreground font-medium" style={{ paddingRight: `${(item.level - 1) * 20}px` }}>
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded mr-1 text-primary">{item.code}</span> — {item.name_ar}
                          </span>
                          <span className="font-bold text-foreground font-mono tabular-nums">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between px-5 py-4.5 bg-blue-500/[0.08] font-black text-blue-700 border-t border-blue-500/20 text-sm mt-auto">
                    <span>إجمالي الأصول</span>
                    <span className="font-mono tabular-nums underline decoration-double decoration-2 underline-offset-4">{formatCurrency(totalAssets)}</span>
                  </div>
                </div>

                {/* Column 2: Liabilities & Equity */}
                <div className="bg-card border border-border/60 rounded-2xl shadow-md overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-5 py-4 border-b border-border/50 bg-rose-500/[0.04] flex justify-between items-center no-print">
                      <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                        <Scale className="w-4.5 h-4.5 text-rose-500" /> الالتزامات وحقوق الملكية
                      </h3>
                      <span className="text-[10px] text-rose-600 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded-full">LIABILITIES & EQUITY</span>
                    </div>

                    {/* Liabilities */}
                    <div className="bg-rose-500/[0.02] px-5 py-2 font-extrabold text-xs text-rose-700 border-b border-border/10 flex justify-between">
                      <span>1. الالتزامات والخصوم المتداولة</span>
                      <span className="text-[9px] font-semibold opacity-70">LIABILITIES</span>
                    </div>
                    <div className="divide-y divide-border/40 text-sm">
                      {liabilities.map(item => (
                        <div key={item.id} className="flex justify-between px-6 py-3 hover:bg-accent/5 transition-colors border-b border-border/10">
                          <span className="text-muted-foreground font-medium" style={{ paddingRight: `${(item.level - 1) * 20}px` }}>
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded mr-1 text-primary">{item.code}</span> — {item.name_ar}
                          </span>
                          <span className="font-bold text-rose-600 font-mono tabular-nums">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-6 py-3.5 bg-rose-500/[0.03] font-extrabold text-xs text-rose-600 border-b border-border/10">
                        <span>إجمالي الالتزامات</span>
                        <span className="font-mono tabular-nums">{formatCurrency(totalLiabilities)}</span>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="bg-indigo-500/[0.02] px-5 py-2 font-extrabold text-xs text-indigo-700 border-b border-border/10 flex justify-between mt-2">
                      <span>2. حقوق ملكية المساهمين والشركاء</span>
                      <span className="text-[9px] font-semibold opacity-70">OWNERS EQUITY</span>
                    </div>
                    <div className="divide-y divide-border/40 text-sm">
                      {equity.map(item => (
                        <div key={item.id} className="flex justify-between px-6 py-3 hover:bg-accent/5 transition-colors border-b border-border/10">
                          <span className="text-muted-foreground font-medium" style={{ paddingRight: `${(item.level - 1) * 20}px` }}>
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded mr-1 text-primary">{item.code}</span> — {item.name_ar}
                          </span>
                          <span className="font-bold text-foreground font-mono tabular-nums">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      {/* Retained net profit from income statement */}
                      <div className="flex justify-between px-6 py-3.5 hover:bg-accent/5 transition-colors font-medium border-b border-border/10 bg-indigo-500/[0.02]">
                        <span className="text-indigo-600 font-extrabold">أرباح العام الحالية (المرحلة من قائمة الدخل)</span>
                        <span className="font-bold text-indigo-600 font-mono tabular-nums">{formatCurrency(netProfit)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between px-5 py-4.5 bg-indigo-500/[0.08] font-black text-indigo-700 border-t border-indigo-500/20 text-sm mt-auto">
                    <span>إجمالي الالتزامات وحقوق الملكية</span>
                    <span className="font-mono tabular-nums underline decoration-double decoration-2 underline-offset-4">{formatCurrency(totalLiabilities + totalEquity + netProfit)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. RATIOS & KPIS */}
          {activeTab === 'ratios' && (
            <motion.div
              key="ratios"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Ratio 1: Profit Margin */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md flex flex-col justify-between h-60 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5.5 h-5.5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">هامش صافي الربح</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">NET PROFIT MARGIN</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed font-medium">
                    يقيس نسبة المتبقي من كل ريال مبيعات كصافي ربح بعد خصم جميع المصاريف والتشغيل.
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-2xl font-black text-emerald-600 font-mono">{grossMargin.toFixed(1)}%</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full font-bold">الهدف: &gt; 15%</span>
                  </div>
                  <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(Math.max(grossMargin, 0), 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Ratio 2: Leverage Ratio */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md flex flex-col justify-between h-60 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                      <Scale className="w-5.5 h-5.5 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">نسبة الالتزامات إلى الأصول</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">DEBT RATIO</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed font-medium">
                    يقيس نسبة تمويل أصول وممتلكات المنشأة من خلال الديون والالتزامات الخارجية.
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-2xl font-black text-rose-500 font-mono">{debtRatio.toFixed(1)}%</span>
                    <span className="text-[10px] bg-rose-500/10 text-rose-700 px-2 py-0.5 rounded-full font-bold">الحد الآمن: &lt; 50%</span>
                  </div>
                  <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(Math.max(debtRatio, 0), 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Ratio 3: Liquidity Ratio */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md flex flex-col justify-between h-60 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="w-5.5 h-5.5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">نسبة السيولة المتداولة</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">CURRENT RATIO</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed font-medium">
                    يقيس قدرة المنشأة على سداد الالتزامات والخصوم قصيرة الأجل بواسطة أصولها المتداولة.
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-2xl font-black text-blue-600 font-mono">{currentRatio.toFixed(2)}x</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentRatio >= 1.5 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                      {currentRatio >= 1.5 ? 'سيولة ممتازة' : 'بحاجة لمتابعة'}
                    </span>
                  </div>
                  <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((currentRatio / 2) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── حساب المتاجرة ── */}
          {activeTab === 'trading' && (
            <TradingAccountTab
              netSales={netSales ?? 0}
              totalCOGS={totalCOGS ?? 0}
              closingInventory={closingInventory ?? 0}
              totalPurchases={totalPurchases ?? 0}
              grossProfit={grossProfit ?? 0}
              salesAccounts={salesAccounts ?? []}
              salesReturns={salesReturns ?? []}
              cogsAccounts={cogsAccounts ?? []}
            />
          )}

          {/* 3. CASH FLOW STATEMENT */}
          {activeTab === 'cashflow' && (
            <motion.div
              key="cashflow"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Cash flow header summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-card/75 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
                  <p className="text-xs font-bold text-muted-foreground">صافي النقد من الأنشطة التشغيلية</p>
                  <p className={`text-2xl font-black mt-4 tabular-nums ${opCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(opCashFlow)}
                  </p>
                </div>
                <div className="bg-card/75 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500" />
                  <p className="text-xs font-bold text-muted-foreground">صافي النقد من الأنشطة الاستثمارية</p>
                  <p className={`text-2xl font-black mt-4 tabular-nums ${invCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(invCashFlow)}
                  </p>
                </div>
                <div className="bg-card/75 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600" />
                  <p className="text-xs font-bold text-muted-foreground">صافي النقد من الأنشطة التمويلية</p>
                  <p className={`text-2xl font-black mt-4 tabular-nums ${finCashFlow >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {formatCurrency(finCashFlow)}
                  </p>
                </div>
              </div>

              {/* Detailed statement card */}
              <div className="bg-card border border-border/60 rounded-2xl shadow-md overflow-hidden">
                <div className="px-6 py-4.5 border-b border-border/50 bg-muted/15 flex items-center justify-between no-print">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <DollarSign className="w-4.5 h-4.5 text-primary" /> قائمة التدفقات النقدية التفصيلية (الطريقة غير المباشرة)
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-extrabold">
                    {company?.currency || 'SAR'}
                  </span>
                </div>

                <div className="divide-y divide-border/40 text-sm">
                  {/* Operating Section */}
                  <div className="bg-emerald-500/[0.03] px-6 py-3 font-extrabold text-xs text-emerald-700 uppercase flex justify-between">
                    <span>أولاً: التدفقات النقدية من الأنشطة التشغيلية</span>
                    <span className="text-[10px] opacity-70">OPERATING ACTIVITIES</span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">صافي الربح للعام الحالي</span>
                    <span className="font-mono tabular-nums">{formatCurrency(netProfit)}</span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">التغير في الذمم المدينة (العملاء)</span>
                    <span className={`font-mono tabular-nums ${changeAR >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(changeAR)}
                    </span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">التغير في المخزون السلعي</span>
                    <span className={`font-mono tabular-nums ${changeInv >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(changeInv)}
                    </span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">التغير في الأصول المتداولة الأخرى</span>
                    <span className={`font-mono tabular-nums ${changeOtherAssets >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(changeOtherAssets)}
                    </span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">التغير في الذمم الدائنة (الموردين)</span>
                    <span className={`font-mono tabular-nums ${changeAP >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(changeAP)}
                    </span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">التغير في الالتزامات المتداولة الأخرى</span>
                    <span className={`font-mono tabular-nums ${changeOtherLiabs >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(changeOtherLiabs)}
                    </span>
                  </div>
                  <div className="flex justify-between px-6 py-3.5 bg-emerald-500/[0.06] font-black text-emerald-600">
                    <span>صافي النقد المتوفر من الأنشطة التشغيلية</span>
                    <span className="font-mono tabular-nums">{formatCurrency(opCashFlow)}</span>
                  </div>

                  {/* Investing Section */}
                  <div className="bg-rose-500/[0.03] px-6 py-3 font-extrabold text-xs text-rose-700 uppercase flex justify-between">
                    <span>ثانياً: التدفقات النقدية من الأنشطة الاستثمارية</span>
                    <span className="text-[10px] opacity-70">INVESTING ACTIVITIES</span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">المدفوعات لشراء أصول ثابتة وممتلكات جديدة</span>
                    <span className="font-mono text-rose-600 tabular-nums">{formatCurrency(invCashFlow)}</span>
                  </div>
                  <div className="flex justify-between px-6 py-3.5 bg-rose-500/[0.06] font-black text-rose-600">
                    <span>صافي التدفقات النقدية المستخدمة في الأنشطة الاستثمارية</span>
                    <span className="font-mono tabular-nums">{formatCurrency(invCashFlow)}</span>
                  </div>

                  {/* Financing Section */}
                  <div className="bg-blue-500/[0.03] px-6 py-3 font-extrabold text-xs text-blue-700 uppercase flex justify-between">
                    <span>ثالثاً: التدفقات النقدية من الأنشطة التمويلية</span>
                    <span className="text-[10px] opacity-70">FINANCING ACTIVITIES</span>
                  </div>
                  <div className="flex justify-between px-8 py-3.5 hover:bg-accent/5">
                    <span className="text-muted-foreground">التغير في رأس المال ومساهمات الملكية</span>
                    <span className="font-mono text-blue-600 tabular-nums">{formatCurrency(finCashFlow)}</span>
                  </div>
                  <div className="flex justify-between px-6 py-3.5 bg-blue-500/[0.06] font-black text-blue-600">
                    <span>صافي التدفقات النقدية الناتجة من الأنشطة التمويلية</span>
                    <span className="font-mono tabular-nums">{formatCurrency(finCashFlow)}</span>
                  </div>

                  {/* End Summary */}
                  <div className="bg-card px-6 py-3.5 font-bold border-t border-border flex justify-between">
                    <span className="text-foreground">صافي التغير في النقدية خلال العام</span>
                    <span className={`font-mono font-black tabular-nums ${netChangeInCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(netChangeInCash)}
                    </span>
                  </div>
                  <div className="bg-card px-6 py-3.5 font-bold border-t border-border flex justify-between">
                    <span className="text-muted-foreground">النقدية وما يعادلها في بداية الفترة المالية</span>
                    <span className="font-mono text-foreground font-semibold tabular-nums">{formatCurrency(cashAtBeginning)}</span>
                  </div>
                  <div className="flex justify-between px-6 py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-base rounded-b-2xl shadow-inner">
                    <span>النقدية وما يعادلها في نهاية الفترة المالية</span>
                    <span className="font-mono tabular-nums text-lg border-b-4 border-double border-white/60 pb-0.5">{formatCurrency(cashAtEnd)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
