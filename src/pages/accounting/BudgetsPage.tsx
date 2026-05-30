import { useState } from 'react'
import { TrendingUp, Plus, BarChart3, DollarSign, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
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

const MOCK_BUDGET: BudgetLine[] = [
  { id: '1', category: 'الرواتب',           department: 'الموارد البشرية', budget: 80000, actual: 75000,  variance: 5000,   variance_pct: 6.3  },
  { id: '2', category: 'الإيجارات',          department: 'الإدارة',         budget: 15000, actual: 15000,  variance: 0,      variance_pct: 0    },
  { id: '3', category: 'التسويق',            department: 'المبيعات',        budget: 10000, actual: 12500,  variance: -2500,  variance_pct: -25  },
  { id: '4', category: 'المرافق',            department: 'الإدارة',         budget: 5000,  actual: 3800,   variance: 1200,   variance_pct: 24   },
  { id: '5', category: 'السفر والتنقلات',   department: 'المبيعات',        budget: 3000,  actual: 4200,   variance: -1200,  variance_pct: -40  },
  { id: '6', category: 'التدريب والتطوير',  department: 'الموارد البشرية', budget: 6000,  actual: 2000,   variance: 4000,   variance_pct: 66.7 },
  { id: '7', category: 'الصيانة',           department: 'العمليات',        budget: 4000,  actual: 3200,   variance: 800,    variance_pct: 20   },
  { id: '8', category: 'خدمات مهنية',        department: 'الإدارة',         budget: 8000,  actual: 9500,   variance: -1500,  variance_pct: -18.8},
]

const CHART_DATA = [
  { month: 'يناير', budget: 110000, actual: 98000 },
  { month: 'فبراير', budget: 110000, actual: 105000 },
  { month: 'مارس',  budget: 115000, actual: 112000 },
  { month: 'أبريل', budget: 115000, actual: 118000 },
  { month: 'مايو',  budget: 131000, actual: 125200 },
]

const DEPARTMENTS = ['الكل', 'الإدارة', 'المبيعات', 'الموارد البشرية', 'العمليات']

export default function BudgetsPage() {
  const [dept, setDept] = useState('الكل')
  const [period] = useState('مايو 2026')

  const filtered = dept === 'الكل' ? MOCK_BUDGET : MOCK_BUDGET.filter(b => b.department === dept)

  const totalBudget = filtered.reduce((s, b) => s + b.budget, 0)
  const totalActual = filtered.reduce((s, b) => s + b.actual, 0)
  const overBudget  = filtered.filter(b => b.variance < 0).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="الميزانيات التشغيلية"
        subtitle={`الفترة: ${period}`}
        actions={
          <button onClick={() => toast.success('إنشاء ميزانية جديدة')} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />ميزانية جديدة
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الميزانية',    value: formatCurrency(totalBudget),  color: 'apple-blue',   icon: DollarSign },
          { label: 'الفعلي المنصرف',      value: formatCurrency(totalActual),  color: 'apple-orange', icon: TrendingUp },
          { label: 'نسبة الاستهلاك',      value: `${Math.round((totalActual/totalBudget)*100)}%`, color: 'apple-purple', icon: BarChart3 },
          { label: 'بنود متجاوزة',        value: String(overBudget),           color: 'apple-red',    icon: AlertTriangle },
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
        <h3 className="font-semibold mb-4">الميزانية مقابل الفعلي (أشهر 2026)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="budget" name="الميزانية"  fill="#6366F1" radius={[4,4,0,0]} />
            <Bar dataKey="actual" name="الفعلي"     fill="#10B981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department filter + table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold">تفاصيل الميزانية</h3>
          <div className="flex gap-1.5 mr-auto">
            {DEPARTMENTS.map(d => (
              <button key={d} onClick={() => setDept(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  dept === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}>{d}</button>
            ))}
          </div>
        </div>

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
              const pct = Math.round((b.actual / b.budget) * 100)
              return (
                <tr key={b.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="px-5 py-3 font-semibold">{b.category}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{b.department}</td>
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
                {Math.round((totalActual / totalBudget) * 100)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
