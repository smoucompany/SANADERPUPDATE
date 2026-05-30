import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Account { id: string; code: string; name_ar: string; balance: number }

interface Props {
  netSales:         number
  totalCOGS:        number
  closingInventory: number
  totalPurchases:   number
  grossProfit:      number
  salesAccounts:    Account[]
  salesReturns:     Account[]
  cogsAccounts:     Account[]
}

export default function TradingAccountTab({
  netSales, totalCOGS, closingInventory, totalPurchases, grossProfit,
  salesAccounts, salesReturns, cogsAccounts
}: Props) {
  return (
    <motion.div key="trading"
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
      className="space-y-5">

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'صافي المبيعات',         value: netSales,    color: 'text-emerald-600', bar: 'bg-emerald-500', pct: false },
          { label: 'تكلفة البضاعة المباعة', value: totalCOGS,  color: 'text-rose-600',    bar: 'bg-rose-500',    pct: false },
          { label: 'مجمل الربح (الخسارة)',  value: grossProfit, color: grossProfit >= 0 ? 'text-blue-600' : 'text-red-600', bar: grossProfit >= 0 ? 'bg-blue-500' : 'bg-red-500', pct: false },
          { label: 'هامش الربح الإجمالي',   value: netSales > 0 ? (grossProfit / netSales * 100) : 0, color: 'text-purple-600', bar: 'bg-purple-500', pct: true },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border/60 rounded-2xl p-5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-1.5 h-full ${k.bar}`} />
            <p className="text-xs text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-xl font-black tabular-nums ${k.color}`}>
              {k.pct ? `${k.value.toFixed(1)}%` : formatCurrency(k.value)}
            </p>
          </div>
        ))}
      </div>

      {/* T-Account */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-l from-slate-700 to-slate-800 px-5 py-3.5 text-white flex items-center justify-between">
          <h3 className="font-bold text-base">حـ/ المتاجرة — Trading Account</h3>
          <p className="text-slate-300 text-xs">للسنة المالية {new Date().getFullYear()}م</p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/60">
          {/* ── Dr. ── */}
          <div>
            <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 border-b border-border/40">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">الجانب المدين — Dr.</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {closingInventory > 0 && (
                  <tr className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">مخزون أول المدة</td>
                    <td className="px-4 py-2.5 text-left font-mono">{formatCurrency(closingInventory)}</td>
                  </tr>
                )}
                {totalPurchases > 0 && (
                  <tr className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">مشتريات الفترة</td>
                    <td className="px-4 py-2.5 text-left font-mono">{formatCurrency(totalPurchases)}</td>
                  </tr>
                )}
                {cogsAccounts.map(a => (
                  <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <span className="font-mono text-xs text-muted-foreground/60 ml-2">{a.code}</span>
                      {a.name_ar}
                    </td>
                    <td className="px-4 py-2.5 text-left font-mono">{formatCurrency(a.balance || 0)}</td>
                  </tr>
                ))}
                {closingInventory > 0 && (
                  <tr className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">يُطرح: مخزون آخر المدة</td>
                    <td className="px-4 py-2.5 text-left font-mono text-rose-600">({formatCurrency(closingInventory)})</td>
                  </tr>
                )}
                <tr className="bg-rose-50/50 dark:bg-rose-900/10 border-b border-border/40">
                  <td className="px-4 py-2.5 font-bold text-rose-700 dark:text-rose-400">تكلفة البضاعة المباعة</td>
                  <td className="px-4 py-2.5 text-left font-black font-mono text-rose-600">{formatCurrency(totalCOGS)}</td>
                </tr>
                {grossProfit >= 0 && (
                  <tr className="bg-emerald-50/50 dark:bg-emerald-900/10">
                    <td className="px-4 py-2.5 font-bold text-emerald-700 dark:text-emerald-400">مجمل الربح (يُرحَّل)</td>
                    <td className="px-4 py-2.5 text-left font-black font-mono text-emerald-600">{formatCurrency(grossProfit)}</td>
                  </tr>
                )}
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className="px-4 py-3 font-black text-foreground border-t-2 border-double border-border">الإجمالي</td>
                  <td className="px-4 py-3 text-left font-black font-mono border-t-2 border-double border-border">{formatCurrency(netSales)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Cr. ── */}
          <div>
            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-border/40">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">الجانب الدائن — Cr.</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {salesAccounts.map(a => (
                  <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <span className="font-mono text-xs text-muted-foreground/60 ml-2">{a.code}</span>
                      {a.name_ar}
                    </td>
                    <td className="px-4 py-2.5 text-left font-mono">{formatCurrency(a.balance || 0)}</td>
                  </tr>
                ))}
                {salesReturns.map(a => (
                  <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground">يُطرح: {a.name_ar}</td>
                    <td className="px-4 py-2.5 text-left font-mono text-rose-600">({formatCurrency(a.balance || 0)})</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-border/40">
                  <td className="px-4 py-2.5 font-bold text-emerald-700 dark:text-emerald-400">صافي المبيعات</td>
                  <td className="px-4 py-2.5 text-left font-black font-mono text-emerald-600">{formatCurrency(netSales)}</td>
                </tr>
                {grossProfit < 0 && (
                  <tr className="bg-red-50/50 dark:bg-red-900/10">
                    <td className="px-4 py-2.5 font-bold text-red-700">مجمل الخسارة (يُرحَّل)</td>
                    <td className="px-4 py-2.5 text-left font-black font-mono text-red-600">{formatCurrency(Math.abs(grossProfit))}</td>
                  </tr>
                )}
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className="px-4 py-3 font-black text-foreground border-t-2 border-double border-border">الإجمالي</td>
                  <td className="px-4 py-3 text-left font-black font-mono border-t-2 border-double border-border">{formatCurrency(netSales)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary bar */}
        <div className={`px-5 py-4 flex items-center justify-between border-t-2 border-double border-border ${grossProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <div>
            <p className={`font-bold text-sm ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {grossProfit >= 0 ? '✓ مجمل الربح الإجمالي' : '✗ مجمل الخسارة الإجمالية'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">يُرحَّل إلى قائمة الدخل (حـ/ الأرباح والخسائر)</p>
          </div>
          <p className={`text-2xl font-black tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(grossProfit))}
          </p>
        </div>
      </div>

      {netSales === 0 && totalCOGS === 0 && (
        <div className="text-center py-10 text-muted-foreground bg-card border border-border/60 rounded-2xl">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">لا توجد بيانات كافية لعرض حساب المتاجرة</p>
          <p className="text-xs mt-1">تأكد من وجود حسابات المبيعات وتكلفة البضائع في شجرة الحسابات</p>
        </div>
      )}
    </motion.div>
  )
}
