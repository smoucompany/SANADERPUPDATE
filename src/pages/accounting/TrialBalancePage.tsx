import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Calendar, Download, FileText, Printer, CheckCircle, AlertTriangle, ChevronRight, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'

interface TrialBalanceRow {
  id: string
  code: string
  name_ar: string
  type: string
  level: number
  is_detail: boolean
  parent_id?: string
  begDebit: number
  begCredit: number
  periodDebit: number
  periodCredit: number
  endDebit: number
  endCredit: number
}

export default function TrialBalancePage() {
  const { user } = useAuthStore()
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(today())
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all')

  // 1. Fetch all accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts-all', user?.company_id],
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

  // 2. Fetch all posted journal lines
  const { data: journalLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['trial-balance-lines', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return []
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          account_id,
          debit,
          credit,
          journal_entry:journal_entries(
            entry_date,
            status,
            company_id
          )
        `)
      if (error) throw error

      // Filter in memory for safety
      return (data || []).filter((line: any) =>
        line.journal_entry?.status === 'posted' &&
        line.journal_entry?.company_id === user.company_id
      )
    },
    enabled: !!user?.company_id
  })

  const { balanceRows, totals } = (() => {
    if (accounts.length === 0) {
      return {
        balanceRows: [],
        totals: { begDebit: 0, begCredit: 0, periodDebit: 0, periodCredit: 0, endDebit: 0, endCredit: 0 }
      }
    }

    // 1. Map to store temporary balance info per account
    const rowMap: Record<string, TrialBalanceRow> = {}

    accounts.forEach(acc => {
      rowMap[acc.id] = {
        id: acc.id,
        code: acc.code,
        name_ar: acc.name_ar,
        type: acc.type,
        level: acc.level,
        is_detail: acc.is_detail,
        parent_id: acc.parent_id,
        begDebit: 0,
        begCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        endDebit: 0,
        endCredit: 0
      }
    })

    // 2. Calculate values for detail accounts directly from journal lines
    journalLines.forEach((line: any) => {
      const row = rowMap[line.account_id]
      if (!row) return // Should not happen in consistent DB

      const date = line.journal_entry.entry_date
      const debit = Number(line.debit) || 0
      const credit = Number(line.credit) || 0

      if (date < dateFrom) {
        row.begDebit += debit
        row.begCredit += credit
      } else if (date <= dateTo) {
        row.periodDebit += debit
        row.periodCredit += credit
      }
    })

    // 3. Roll up balances from deepest levels to top levels
    // Sort accounts by level descending
    const sortedAccsDesc = [...accounts].sort((a, b) => b.level - a.level)

    sortedAccsDesc.forEach(acc => {
      const row = rowMap[acc.id]
      if (!row) return

      // Add normal logic for ending balance per account type
      // Assets & Expenses: normal Debit. Liabilities, Equities, Revenues: normal Credit
      const isDebitNormal = ['asset', 'expense'].includes(acc.type)

      // Calculate initial Ending Balance for this node
      const netBeg = row.begDebit - row.begCredit
      const netPeriod = row.periodDebit - row.periodCredit
      const netTotal = netBeg + netPeriod

      if (isDebitNormal) {
        if (netTotal >= 0) {
          row.endDebit = netTotal
          row.endCredit = 0
        } else {
          row.endDebit = 0
          row.endCredit = Math.abs(netTotal)
        }

        // Adjust beginning for normal presentation if needed, but standard trial balance
        // simply keeps cumulative debits and credits
        if (netBeg >= 0) {
          row.begDebit = netBeg
          row.begCredit = 0
        } else {
          row.begDebit = 0
          row.begCredit = Math.abs(netBeg)
        }
      } else {
        // Credit normal
        if (netTotal <= 0) {
          row.endDebit = 0
          row.endCredit = Math.abs(netTotal)
        } else {
          row.endDebit = netTotal
          row.endCredit = 0
        }

        if (netBeg <= 0) {
          row.begDebit = 0
          row.begCredit = Math.abs(netBeg)
        } else {
          row.begDebit = netBeg
          row.begCredit = 0
        }
      }

      // Roll up to parent if exists
      if (acc.parent_id && rowMap[acc.parent_id]) {
        const parentRow = rowMap[acc.parent_id]
        parentRow.begDebit += row.begDebit
        parentRow.begCredit += row.begCredit
        parentRow.periodDebit += row.periodDebit
        parentRow.periodCredit += row.periodCredit
      }
    })

    // 4. Calculate grand totals for Level 1 accounts to avoid double counting
    const level1Rows = Object.values(rowMap).filter(r => r.level === 1)
    const totals = {
      begDebit: level1Rows.reduce((s, r) => s + r.begDebit, 0),
      begCredit: level1Rows.reduce((s, r) => s + r.begCredit, 0),
      periodDebit: level1Rows.reduce((s, r) => s + r.periodDebit, 0),
      periodCredit: level1Rows.reduce((s, r) => s + r.periodCredit, 0),
      endDebit: level1Rows.reduce((s, r) => s + r.endDebit, 0),
      endCredit: level1Rows.reduce((s, r) => s + r.endCredit, 0)
    }

    // Convert map to sorted list
    const balanceRows = Object.values(rowMap).sort((a, b) => a.code.localeCompare(b.code))

    return { balanceRows, totals }
  })()

  // Filter rows by level
  const filteredRows = balanceRows.filter(r => {
    if (selectedLevel === 'all') return true
    return r.level === selectedLevel
  })

  const isBalanced =
    Math.abs(totals.begDebit - totals.begCredit) < 0.05 &&
    Math.abs(totals.periodDebit - totals.periodCredit) < 0.05 &&
    Math.abs(totals.endDebit - totals.endCredit) < 0.05

  // Export to Excel
  const handleExport = () => {
    const rows = filteredRows.map(r => ({
      'كود الحساب': r.code,
      'اسم الحساب': r.name_ar,
      'المستوى': r.level,
      'تفصيلي؟': r.is_detail ? 'نعم' : 'لا',
      'الرصيد الافتتاحي - مدين': r.begDebit,
      'الرصيد الافتتاحي - دائن': r.begCredit,
      'حركات الفترة - مدين': r.periodDebit,
      'حركات الفترة - دائن': r.periodCredit,
      'الرصيد الختامي - مدين': r.endDebit,
      'الرصيد الختامي - دائن': r.endCredit
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ميزان المراجعة')
    XLSX.writeFile(workbook, `ميزان_المراجعة_${dateFrom}_إلى_${dateTo}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* ── PRINT ONLY REPORT HEADER ── */}
      <div className="print-only mb-6" dir="rtl">
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-black">مؤسسة سند للحلول التقنية</h2>
            <p className="text-xs text-muted-foreground mt-1">قسم الحسابات والميزانية العامة</p>
            <p className="text-[10px] text-muted-foreground">الرقم الضريبي: 300123456700003</p>
          </div>
          <div className="text-left" dir="ltr">
            <h2 className="text-lg font-black text-black">SANAD SYSTEMS</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Financial Reports Division</p>
            <p className="text-[10px] text-muted-foreground">Date: {formatDate(today())}</p>
          </div>
        </div>
        <div className="text-center my-6">
          <h1 className="text-2xl font-black text-black border-2 border-black py-2 bg-slate-50">
            كشف ميزان المراجعة بالأرصدة والمجاميع
          </h1>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            للفترة الممتدة من {formatDate(dateFrom)} إلى {formatDate(dateTo)}
          </p>
        </div>
      </div>

      {/* Page Header */}
      <div className="no-print">
        <PageHeader
          title="ميزان المراجعة"
          subtitle="ميزان المراجعة بالأرصدة والمجاميع للتأكد من توازن الحسابات وصحة العمليات"
          actions={
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="btn-outline gap-1.5 border-border hover:bg-muted text-foreground cursor-pointer">
                <Printer className="w-4 h-4" /> طباعة الميزان
              </button>
              <button onClick={handleExport} className="btn-primary gap-1.5 bg-primary text-white hover:brightness-110 cursor-pointer">
                <Download className="w-4 h-4" /> تصدير Excel
              </button>
            </div>
          }
        />
      </div>

      {/* Alert Balance Message */}
      <div className="no-print">
        {isBalanced ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold">ميزان المراجعة متوازن بالكامل</p>
              <p className="text-xs opacity-80 mt-0.5">مجموع الأرصدة المدينة يطابق تماماً مجموع الأرصدة الدائنة.</p>
            </div>
          </div>
        ) : (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-bold">ميزان المراجعة غير متوازن!</p>
              <p className="text-xs opacity-80 mt-0.5">يوجد فروقات بين الأرصدة المدينة والدائنة. يرجى مراجعة قيود اليومية.</p>
            </div>
          </div>
        )}
      </div>

      {/* Date Filters & Levels */}
      <div className="no-print bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Level Filter */}
          <div>
            <label className="form-label font-semibold text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> مستوى العرض
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="form-select h-10 text-sm font-semibold rounded-xl border border-input shadow-sm focus:ring-primary/20"
            >
              <option value="all">كل المستويات (شجرة كاملة)</option>
              <option value="1">المستوى الأول (حسابات رئيسية)</option>
              <option value="2">المستوى الثاني</option>
              <option value="3">المستوى الثالث</option>
              <option value="4">المستوى الرابع (الحسابات التفصيلية)</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="form-label font-semibold text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> من تاريخ
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="form-input h-10 text-sm font-medium rounded-xl border border-input shadow-sm focus:ring-primary/20"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="form-label font-semibold text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> إلى تاريخ
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="form-input h-10 text-sm font-medium rounded-xl border border-input shadow-sm focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Trial Balance Main Card */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 bg-muted/20 no-print">
          <h3 className="font-bold text-sm text-foreground">
            كشف ميزان المراجعة للفترة من {formatDate(dateFrom)} إلى {formatDate(dateTo)}
          </h3>
        </div>

        {accountsLoading || linesLoading ? (
          <div className="p-8 space-y-3">
            <div className="skeleton h-8 w-1/4 rounded" />
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="text-sm font-semibold">لا توجد بيانات حسابات لعرضها</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60 text-[11px] font-bold text-muted-foreground text-center">
                  <th className="px-4 py-3 text-right" rowSpan={2}>كود الحساب</th>
                  <th className="px-4 py-3 text-right" rowSpan={2}>اسم الحساب</th>
                  <th className="px-4 py-3 border-r border-border/60" colSpan={2}>الرصيد الافتتاحي</th>
                  <th className="px-4 py-3 border-r border-border/60" colSpan={2}>حركات الفترة</th>
                  <th className="px-4 py-3 border-r border-border/60" colSpan={2}>الرصيد الختامي</th>
                </tr>
                <tr className="bg-muted/25 border-b border-border/60 text-[10px] font-bold text-muted-foreground text-center">
                  <th className="px-3 py-2 border-r border-border/60 w-28">مدين</th>
                  <th className="px-3 py-2 w-28">دائن</th>
                  <th className="px-3 py-2 border-r border-border/60 w-28">مدين</th>
                  <th className="px-3 py-2 w-28">دائن</th>
                  <th className="px-3 py-2 border-r border-border/60 w-28">مدين</th>
                  <th className="px-3 py-2 w-28">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs font-medium">
                {filteredRows.map((row) => {
                  const padding = (row.level - 1) * 16
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-accent/10 transition-colors ${
                        !row.is_detail ? 'bg-muted/10 font-bold text-foreground' : 'text-muted-foreground font-normal'
                      }`}
                    >
                      {/* Code */}
                      <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap w-24">
                        {row.code}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-2.5 whitespace-nowrap" style={{ paddingRight: `${padding + 16}px` }}>
                        <span className="flex items-center gap-1.5">
                          {!row.is_detail && <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />}
                          {row.name_ar}
                        </span>
                      </td>

                      {/* Beginning Balance */}
                      <td className="px-3 py-2.5 text-left border-r border-border/60 font-mono tabular-nums text-foreground">
                        {row.begDebit > 0 ? formatCurrency(row.begDebit) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-left font-mono tabular-nums text-foreground">
                        {row.begCredit > 0 ? formatCurrency(row.begCredit) : '—'}
                      </td>

                      {/* Period Transactions */}
                      <td className="px-3 py-2.5 text-left border-r border-border/60 font-mono tabular-nums text-blue-600">
                        {row.periodDebit > 0 ? formatCurrency(row.periodDebit) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-left font-mono tabular-nums text-red-500">
                        {row.periodCredit > 0 ? formatCurrency(row.periodCredit) : '—'}
                      </td>

                      {/* Ending Balance */}
                      <td className="px-3 py-2.5 text-left border-r border-border/60 font-mono tabular-nums font-bold text-foreground">
                        {row.endDebit > 0 ? formatCurrency(row.endDebit) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-left font-mono tabular-nums font-bold text-foreground">
                        {row.endCredit > 0 ? formatCurrency(row.endCredit) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-border/80 bg-muted/30 font-bold text-xs text-center">
                <tr className="font-extrabold text-foreground">
                  <td className="px-4 py-3 text-right" colSpan={2}>
                    الإجمالي العام
                  </td>
                  <td className="px-3 py-3 text-left border-r border-border/60 tabular-nums">{formatCurrency(totals.begDebit)}</td>
                  <td className="px-3 py-3 text-left tabular-nums">{formatCurrency(totals.begCredit)}</td>
                  <td className="px-3 py-3 text-left border-r border-border/60 text-blue-600 tabular-nums">{formatCurrency(totals.periodDebit)}</td>
                  <td className="px-3 py-3 text-left text-red-500 tabular-nums">{formatCurrency(totals.periodCredit)}</td>
                  <td className="px-3 py-3 text-left border-r border-border/60 text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(totals.endDebit)}</td>
                  <td className="px-3 py-3 text-left text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(totals.endCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
