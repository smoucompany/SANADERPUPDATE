import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Calendar, Download, Search, FileText, ArrowRight, Printer, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { PrintAccountingHeader, PrintAccountingFooter } from '@/components/print/PrintAccountingHeader'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'

interface LedgerLine {
  id: string
  debit: number
  credit: number
  description: string
  journal_entry: {
    id: string
    entry_number: string
    entry_date: string
    description: string
    status: string
    company_id: string
  }
}

export default function GeneralLedgerPage() {
  const { user } = useAuthStore()
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(today())
  const [searchTerm, setSearchTerm] = useState('')

  // 1. Fetch active detail accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts-detail', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return []
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('is_detail', true)
        .eq('is_active', true)
        .order('code')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.company_id
  })

  // 2. Fetch journal lines for selected account
  const { data: rawLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['ledger-lines', user?.company_id, selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return []
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit,
          credit,
          description,
          journal_entry:journal_entries(
            id,
            entry_number,
            entry_date,
            description,
            status,
            company_id
          )
        `)
        .eq('account_id', selectedAccountId)
      if (error) throw error
      return (data || []) as unknown as LedgerLine[]
    },
    enabled: !!user?.company_id && !!selectedAccountId
  })

  // Filter and process ledger lines
  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  const { ledgerLines, beginningBalance, totalDebit, totalCredit, endingBalance } = (() => {
    let beginningBalance = 0
    let totalDebit = 0
    let totalCredit = 0
    const periodLines: Array<LedgerLine & { runningBalance: number }> = []

    if (!selectedAccount) {
      return { ledgerLines: [], beginningBalance: 0, totalDebit: 0, totalCredit: 0, endingBalance: 0 }
    }

    // Sort all lines by date & entry_number
    const sorted = [...rawLines]
      .filter(line => line.journal_entry?.status === 'posted' && line.journal_entry?.company_id === user?.company_id)
      .sort((a, b) => {
        const dateDiff = new Date(a.journal_entry.entry_date).getTime() - new Date(b.journal_entry.entry_date).getTime()
        if (dateDiff !== 0) return dateDiff
        return a.journal_entry.entry_number.localeCompare(b.journal_entry.entry_number)
      })

    // Account normal balance side
    const isDebitNormal = ['asset', 'expense'].includes(selectedAccount.type)

    // Calculate beginning balance (up to dateFrom) and period items
    let runningBal = 0

    sorted.forEach(line => {
      const lineDate = line.journal_entry.entry_date
      const effect = isDebitNormal ? (line.debit - line.credit) : (line.credit - line.debit)

      if (lineDate < dateFrom) {
        beginningBalance += effect
      } else if (lineDate <= dateTo) {
        if (periodLines.length === 0) {
          runningBal = beginningBalance + effect
        } else {
          runningBal += effect
        }
        totalDebit += line.debit
        totalCredit += line.credit
        periodLines.push({
          ...line,
          runningBalance: runningBal
        })
      }
    })

    const endingBalance = beginningBalance + (isDebitNormal ? (totalDebit - totalCredit) : (totalCredit - totalDebit))

    return {
      ledgerLines: periodLines,
      beginningBalance,
      totalDebit,
      totalCredit,
      endingBalance
    }
  })()

  // Filter by search inside the ledger lines
  const filteredLines = ledgerLines.filter(line => {
    if (!searchTerm) return true
    return (
      line.journal_entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.journal_entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Export to Excel helper
  const handleExport = () => {
    if (!selectedAccount) return
    const rows = filteredLines.map(l => ({
      'رقم القيد': l.journal_entry.entry_number,
      'التاريخ': formatDate(l.journal_entry.entry_date),
      'البيان': l.description || l.journal_entry.description,
      'مدين': l.debit,
      'دائن': l.credit,
      'الرصيد التراكمي': l.runningBalance
    }))

    // Add beginning and ending rows
    const headerRow = {
      'رقم القيد': 'رصيد افتتاحي',
      'التاريخ': formatDate(dateFrom),
      'البيان': 'الرصيد قبل الفترة المحددة',
      'مدين': 0,
      'دائن': 0,
      'الرصيد التراكمي': beginningBalance
    }

    const footerRow = {
      'رقم القيد': 'رصيد ختامي',
      'التاريخ': formatDate(dateTo),
      'البيان': 'إجمالي الرصيد بنهاية الفترة',
      'مدين': totalDebit,
      'دائن': totalCredit,
      'الرصيد التراكمي': endingBalance
    }

    const data = [headerRow, ...rows, footerRow]
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'دفتر الأستاذ')
    XLSX.writeFile(workbook, `دفتر_أستاذ_${selectedAccount.code}_${selectedAccount.name_ar}.xlsx`)
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredAccounts = accounts.filter(acc =>
    acc.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.code.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* ── PRINT HEADER ── */}
      {selectedAccount && (
        <PrintAccountingHeader
          reportTitle="كشف تفصيلي لدفتر الأستاذ العام"
          reportTitleEn="GENERAL LEDGER STATEMENT"
          dateFrom={dateFrom}
          dateTo={dateTo}
          subtitle={`${selectedAccount.code} — ${selectedAccount.name_ar}`}
          extraMeta={[
            { label: 'الرصيد الافتتاحي', value: formatCurrency(beginningBalance) },
            { label: 'الرصيد الختامي', value: formatCurrency(endingBalance) },
          ]}
        />
      )}

      {/* Page Header */}
      <div className="no-print">
        <PageHeader
          title="دفتر الأستاذ العام"
          subtitle="كشف تفصيلي لحركات الحسابات والأرصدة خلال فترة زمنية"
          actions={
            selectedAccountId && (
              <div className="flex gap-2">
                <button type="button" onClick={handlePrint} className="btn-outline gap-1.5 border-border hover:bg-muted text-foreground cursor-pointer">
                  <Printer className="w-4 h-4" /> طباعة الكشف
                </button>
                <button onClick={handleExport} className="btn-primary gap-1.5 bg-primary text-white hover:brightness-110 cursor-pointer">
                  <Download className="w-4 h-4" /> تصدير Excel
                </button>
              </div>
            )
          }
        />
      </div>

      {/* Main filters box */}
      <div className="no-print bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Account selector */}
          <div className="md:col-span-2">
            <label className="form-label font-semibold text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" /> اختر الحساب الفرعي
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="form-select h-10 text-sm font-semibold rounded-xl border border-input shadow-sm focus:ring-primary/20"
            >
              <option value="">-- اختر حساباً فرعياً --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name_ar} ({acc.type === 'asset' ? 'أصول' : acc.type === 'liability' ? 'خصوم' : acc.type === 'equity' ? 'حقوق ملكية' : acc.type === 'revenue' ? 'إيرادات' : 'مصروفات'})
                </option>
              ))}
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

        {/* Quick Date Presets */}
        <div className="flex gap-2 pt-1 border-t border-border/40">
          {[
            { label: 'اليوم', fn: () => { setDateFrom(today()); setDateTo(today()) } },
            { label: 'الشهر الحالي', fn: () => { const d = new Date(); setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]); setDateTo(today()) } },
            { label: 'العام المالي الحالي', fn: () => { setDateFrom(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); setDateTo(today()) } }
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.fn}
              className="px-3 py-1.5 text-xs rounded-xl bg-secondary/60 hover:bg-secondary/90 text-secondary-foreground font-medium transition-all"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard cards for the selected ledger */}
      <AnimatePresence mode="wait">
        {selectedAccount ? (
          <motion.div
            key={selectedAccountId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* Card 1: Beginning Balance */}
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-blue-500/70" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">الرصيد الافتتاحي (قبل الفترة)</p>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground mt-3 tabular-nums">{formatCurrency(beginningBalance)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">تاريخ البدء: {formatDate(dateFrom)}</p>
            </div>

            {/* Card 2: Period Debit */}
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-emerald-500/70" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">إجمالي الحركات المدينة</p>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600 animate-pulse" />
                </div>
              </div>
              <p className="text-xl font-bold text-emerald-600 mt-3 tabular-nums">{formatCurrency(totalDebit)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">مجموع حركات المدين للفترة</p>
            </div>

            {/* Card 3: Period Credit */}
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-red-500/70" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">إجمالي الحركات الدائنة</p>
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-red-500 mt-3 tabular-nums">{formatCurrency(totalCredit)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">مجموع حركات الدائن للفترة</p>
            </div>

            {/* Card 4: Ending Balance */}
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-600" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground font-bold">الرصيد الختامي المتوقع</p>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-xl font-bold mt-3 text-indigo-600 dark:text-indigo-400 tabular-nums">
                {formatCurrency(endingBalance)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">تاريخ النهاية: {formatDate(dateTo)}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Ledger statement list */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        {selectedAccountId ? (
          <>
            <div className="px-5 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 no-print">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-primary" /> كشف حساب: {selectedAccount?.code} - {selectedAccount?.name_ar}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  الفترة من {formatDate(dateFrom)} إلى {formatDate(dateTo)}
                </p>
              </div>

              <div className="relative no-print max-w-xs w-full">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="بحث برقم القيد أو البيان..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pr-9 h-9 text-xs w-full rounded-xl"
                />
              </div>
            </div>

            {linesLoading ? (
              <div className="p-8 space-y-3">
                <div className="skeleton h-8 w-1/4 rounded" />
                <div className="skeleton h-12 rounded-xl" />
                <div className="skeleton h-12 rounded-xl" />
                <div className="skeleton h-12 rounded-xl" />
              </div>
            ) : filteredLines.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                <p className="text-sm font-semibold">لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة</p>
                <p className="text-xs text-muted-foreground/60 mt-1">تأكد من تاريخ الفلترة أو من ترحيل القيود اليومية</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/60 text-xs font-bold text-muted-foreground">
                      <th className="px-5 py-3.5 w-32">التاريخ</th>
                      <th className="px-5 py-3.5 w-32">رقم القيد</th>
                      <th className="px-5 py-3.5">البيان</th>
                      <th className="px-5 py-3.5 text-left w-36">مدين (+)</th>
                      <th className="px-5 py-3.5 text-left w-36">دائن (-)</th>
                      <th className="px-5 py-3.5 text-left w-40">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-sm">
                    {/* Beginning Balance row */}
                    <tr className="bg-blue-500/[0.02] font-semibold text-muted-foreground">
                      <td className="px-5 py-3 text-xs">{formatDate(dateFrom)}</td>
                      <td className="px-5 py-3 text-xs">—</td>
                      <td className="px-5 py-3">رصيد افتتاحي (ما قبل الفترة)</td>
                      <td className="px-5 py-3 text-left tabular-nums">—</td>
                      <td className="px-5 py-3 text-left tabular-nums">—</td>
                      <td className="px-5 py-3 text-left font-bold text-foreground tabular-nums">{formatCurrency(beginningBalance)}</td>
                    </tr>

                    {/* Transaction rows */}
                    {filteredLines.map((line) => (
                      <tr key={line.id} className="hover:bg-accent/20 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(line.journal_entry.entry_date)}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                          {line.journal_entry.entry_number}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-foreground">{line.description || line.journal_entry.description}</p>
                          {line.description && line.journal_entry.description && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{line.journal_entry.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-left font-semibold text-blue-600 tabular-nums">
                          {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-left font-semibold text-red-500 tabular-nums">
                          {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-left font-bold text-foreground tabular-nums">
                          {formatCurrency(line.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border/80 bg-muted/30 font-bold text-sm">
                    <tr>
                      <td colSpan={3} className="px-5 py-4">إجمالي الحركات والأرصدة</td>
                      <td className="px-5 py-4 text-left text-blue-600 tabular-nums">{formatCurrency(totalDebit)}</td>
                      <td className="px-5 py-4 text-left text-red-500 tabular-nums">{formatCurrency(totalCredit)}</td>
                      <td className="px-5 py-4 text-left text-indigo-600 dark:text-indigo-400 font-extrabold tabular-nums">
                        {formatCurrency(endingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center px-4">
            <BookOpen className="w-16 h-16 text-primary/30 mb-4 animate-bounce" />
            <h4 className="text-base font-bold text-foreground">الرجاء اختيار الحساب أولاً</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              اختر حساباً فرعياً من شجرة الحسابات لعرض تفاصيل المعاملات ودفتر الأستاذ الخاص به وتصديره.
            </p>
          </div>
        )}
      </div>

      {/* ── PRINT FOOTER ── */}
      <PrintAccountingFooter pageNote="دفتر الأستاذ العام — وثيقة سرية" />
    </div>
  )
}
