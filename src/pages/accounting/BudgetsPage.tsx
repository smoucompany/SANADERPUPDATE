import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Plus, BarChart3, DollarSign, AlertTriangle, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

interface BudgetLine {
  id: string
  category: string
  department: string
  budget: number
  actual: number
  variance: number
  variance_pct: number
}

const EMPTY_FORM = { category: '', department: '', budget: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1 }

export default function BudgetsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [dept, setDept] = useState('الكل')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const period = `${new Date().toLocaleString('ar', { month: 'long' })} ${currentYear}`

  // ── Fetch budget lines ────────────────────────────────────────────────────
  const { data: rawBudgets = [], isLoading } = useQuery({
    queryKey: ['budgets', user?.company_id, currentYear],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('year', currentYear)
        .order('category')
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  // ── Fetch monthly chart data (from expenses) ───────────────────────────
  const { data: expensesByMonth = [] } = useQuery({
    queryKey: ['expenses_by_month', user?.company_id, currentYear],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('company_id', user.company_id)
        .gte('date', `${currentYear}-01-01`)
        .lte('date', `${currentYear}-12-31`)
      return data || []
    },
    enabled: !!user,
  })

  // Build chart data from real expenses grouped by month
  const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  const chartData = MONTH_NAMES.slice(0, currentMonth).map((name, i) => {
    const m = i + 1
    const actual = expensesByMonth
      .filter((e: any) => parseInt(e.date?.split('-')[1]) === m)
      .reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const budgetRow = rawBudgets.find((b: any) => b.month === m)
    return { month: name, budget: budgetRow?.budget_total || 0, actual }
  })

  const budgetLines: BudgetLine[] = rawBudgets.map((b: any) => ({
    id:           b.id,
    category:     b.category || '',
    department:   b.department || '',
    budget:       b.budget_amount || b.budget || 0,
    actual:       b.actual_amount || b.actual || 0,
    variance:     (b.budget_amount || 0) - (b.actual_amount || 0),
    variance_pct: b.budget_amount > 0 ? Math.round(((b.actual_amount || 0) / b.budget_amount) * 100) : 0,
  }))

  const departments = ['الكل', ...Array.from(new Set(budgetLines.map(b => b.department).filter(Boolean)))]
  const filtered    = dept === 'الكل' ? budgetLines : budgetLines.filter(b => b.department === dept)

  const totalBudget = filtered.reduce((s, b) => s + b.budget, 0)
  const totalActual = filtered.reduce((s, b) => s + b.actual, 0)
  const overBudget  = filtered.filter(b => b.variance < 0).length

  // ── Create budget line ────────────────────────────────────────────────────
  const createBudget = useMutation({
    mutationFn: async () => {
      if (!form.category || !form.budget) throw new Error('الفئة والميزانية مطلوبتان')
      const { error } = await supabase.from('budgets').insert({
        company_id:    user!.company_id,
        category:      form.category,
        department:    form.department,
        budget_amount: parseFloat(form.budget) || 0,
        actual_amount: 0,
        year:          currentYear,
        month:         currentMonth,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('تم إنشاء الميزانية')
      setShowForm(false)
      setForm(EMPTY_FORM)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="الميزانيات التشغيلية"
        subtitle={`الفترة: ${period}`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />ميزانية جديدة
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الميزانية',  value: formatCurrency(totalBudget),  color: 'apple-blue',   icon: DollarSign },
          { label: 'الفعلي المنصرف',    value: formatCurrency(totalActual),  color: 'apple-orange', icon: TrendingUp },
          { label: 'نسبة الاستهلاك',    value: `${totalBudget > 0 ? Math.round((totalActual/totalBudget)*100) : 0}%`, color: 'apple-purple', icon: BarChart3 },
          { label: 'بنود متجاوزة',      value: String(overBudget),           color: 'apple-red',    icon: AlertTriangle },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border/60 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className={`icon-badge-sm ${k.color}`}><k.icon className="w-4 h-4 text-white" /></span>
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-xl font-black">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <h3 className="font-semibold mb-4">الميزانية مقابل الفعلي ({currentYear})</h3>
        {chartData.some(d => d.budget > 0 || d.actual > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="budget" name="الميزانية" fill="#6366F1" radius={[4,4,0,0]} />
              <Bar dataKey="actual"  name="الفعلي"    fill="#10B981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات كافية لعرض الرسم البياني</div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold">تفاصيل الميزانية</h3>
          <div className="flex gap-1.5 mr-auto">
            {departments.map(d => (
              <button key={d} onClick={() => setDept(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  dept === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}>{d}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد بنود ميزانية — أضف ميزانية جديدة</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">البند</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">القسم</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الميزانية</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الفعلي</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الفارق</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">نسبة الاستهلاك</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const over = b.variance < 0
                const pct  = b.budget > 0 ? Math.round((b.actual / b.budget) * 100) : 0
                return (
                  <tr key={b.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-5 py-3 font-semibold">{b.category}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{b.department || '—'}</td>
                    <td className="px-5 py-3 text-center">{formatCurrency(b.budget)}</td>
                    <td className="px-5 py-3 text-center font-medium">{formatCurrency(b.actual)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-semibold ${over ? 'text-red-500' : 'text-emerald-600'}`}>
                        {over ? '-' : '+'}{formatCurrency(Math.abs(b.variance))}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="max-w-[140px] mx-auto">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={over ? 'text-red-500 font-bold' : 'text-muted-foreground'}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td className="px-5 py-3 font-bold" colSpan={2}>الإجمالي</td>
                <td className="px-5 py-3 text-center font-bold">{formatCurrency(totalBudget)}</td>
                <td className="px-5 py-3 text-center font-bold">{formatCurrency(totalActual)}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`font-bold ${totalActual > totalBudget ? 'text-red-500' : 'text-emerald-600'}`}>
                    {totalActual > totalBudget ? '-' : '+'}{formatCurrency(Math.abs(totalBudget - totalActual))}
                  </span>
                </td>
                <td className="px-5 py-3 text-center font-bold text-primary">
                  {totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Create Budget Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إضافة بند ميزانية">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">البند / الفئة *</label>
              <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="form-input" placeholder="مثال: رواتب، إيجارات" />
            </div>
            <div>
              <label className="form-label">القسم</label>
              <input value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}
                className="form-input" placeholder="مثال: الإدارة، المبيعات" />
            </div>
            <div className="col-span-2">
              <label className="form-label">الميزانية الشهرية (ر.س) *</label>
              <input type="number" value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))}
                className="form-input" min="0" step="0.01" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={() => createBudget.mutate()} disabled={createBudget.isPending} className="btn-primary gap-2">
              {createBudget.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              إضافة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
