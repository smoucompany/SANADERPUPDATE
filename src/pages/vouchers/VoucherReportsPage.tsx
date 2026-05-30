import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, PieChart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useVouchers } from '@/hooks/useVouchers'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts'

export default function VoucherReportsPage() {
  const navigate = useNavigate()
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: result, isLoading } = useVouchers({ limit: 1000 })
  const vouchers = result?.data || []

  // Monthly breakdown calculation
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(year, i).toLocaleString('ar', { month: 'short' }),
      قبض: 0,
      صرف: 0
    }))

    vouchers.forEach(v => {
      const date = new Date(v.payment_date)
      if (date.getFullYear() === year) {
        const month = date.getMonth()
        if (v.type === 'receipt') {
          months[month].قبض += v.amount
        } else {
          months[month].صرف += v.amount
        }
      }
    })

    return months
  }, [vouchers, year])

  // Payment methods breakdown calculation
  const methodData = useMemo(() => {
    const methods: Record<string, number> = {
      cash: 0,
      mada: 0,
      transfer: 0,
      credit: 0
    }

    vouchers.forEach(v => {
      if (methods[v.method] !== undefined) {
        methods[v.method] += v.amount
      } else {
        methods.cash += v.amount
      }
    })

    return [
      { name: 'نقدي', value: methods.cash, color: '#10b981' },
      { name: 'شبكة مدى', value: methods.mada, color: '#3b82f6' },
      { name: 'تحويل بنكي', value: methods.transfer, color: '#8b5cf6' },
      { name: 'بطاقة ائتمان', value: methods.credit, color: '#f59e0b' }
    ].filter(item => item.value > 0)
  }, [vouchers])

  // Total summary metrics
  const totals = useMemo(() => {
    let totalInflow = 0
    let totalOutflow = 0
    vouchers.forEach(v => {
      if (v.type === 'receipt') totalInflow += v.amount
      else totalOutflow += v.amount
    })
    return {
      totalInflow,
      totalOutflow,
      netFlow: totalInflow - totalOutflow
    }
  }, [vouchers])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full"
    >
      <PageHeader
        title="تقارير وتحليلات السندات المالية"
        subtitle="شاشة المراقبة اللحظية للسيولة والتدفقات النقدية الجارية"
        actions={
          <button onClick={() => navigate('/vouchers')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm">
            <ArrowRight className="w-4 h-4 ml-1" />رجوع للوحة السندات
          </button>
        }
      />

      {/* Analytics KPI summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">إجمالي التدفقات النقدية الداخلة (Inflow)</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.totalInflow)}</h3>
            <p className="text-[10px] text-muted-foreground font-semibold">مقبوضات فواتير المبيعات والدفعات المباشرة</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">إجمالي التدفقات النقدية الخارجة (Outflow)</p>
            <h3 className="text-2xl font-black text-rose-500">{formatCurrency(totals.totalOutflow)}</h3>
            <p className="text-[10px] text-muted-foreground font-semibold">مدفوعات المشتريات، المصاريف ومستحقات الموظفين</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">صافي نمو السيولة النقدية</p>
            <h3 className={`text-2xl font-black ${totals.netFlow >= 0 ? 'text-primary' : 'text-amber-500'}`}>
              {formatCurrency(totals.netFlow)}
            </h3>
            <p className="text-[10px] text-muted-foreground font-semibold">المؤشر العام للنمو والربحية النقدية</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Double Bar Chart for Monthly Inflows/Outflows */}
        <div className="lg:col-span-2 bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />حجم حركة السيولة الشهرية (مقارنة المقبوضات والمدفوعات)
            </h3>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="form-select bg-muted/20 border-border/40 text-xs w-28 h-9 rounded-xl"
            >
              <option value={2026}>عام 2026</option>
              <option value={2025}>عام 2025</option>
            </select>
          </div>

          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `${formatCurrency(Number(value))}`} />
                <Legend iconType="circle" />
                <Bar dataKey="قبض" name="المقبوضات (سند قبض)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="صرف" name="المدفوعات (سند صرف)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart for payment methods */}
        <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />توزيع التدفقات حسب طرق الدفع
          </h3>

          <div className="h-60 w-full flex items-center justify-center" dir="ltr">
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${formatCurrency(Number(value))}`} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">لا توجد بيانات كافية للرسم البياني</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {methodData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-muted-foreground font-medium">{item.name}:</span>
                <span className="font-bold text-foreground">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
