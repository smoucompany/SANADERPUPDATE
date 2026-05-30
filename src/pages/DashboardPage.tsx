import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, ShoppingCart, Package, Users, AlertTriangle,
  DollarSign, CreditCard, BarChart2, ArrowUpRight, Clock, Sparkles
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useDashboardSummary, useTopProducts, useMonthlySales, useRecentInvoices } from '@/hooks/useDashboard'
import { useAuthStore } from '@/store/authStore'
import StatCard from '@/components/shared/StatCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, generateColors } from '@/lib/utils'

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (!(active as boolean) || !(payload as unknown[])?.[0]) return null
  return (
    <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-3 shadow-2xl text-sm">
      <p className="font-bold mb-2 text-foreground">{label as string}</p>
      {(payload as Array<{ name: string; value: number; color: string }>).map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-2 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { company, user } = useAuthStore()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: topProducts = [] } = useTopProducts(8)
  const { data: monthlySales = [] } = useMonthlySales()
  const { data: recentInvoices = [] } = useRecentInvoices(8)
  const [chartType] = useState<'area' | 'bar'>('area')

  const chartData = monthlySales.map((m, i) => ({
    name: ARABIC_MONTHS[i],
    'المبيعات': m.sales_total,
    'المشتريات': m.purchases_total,
    'الأرباح': m.profit
  }))

  const pieColors = generateColors(topProducts.length)

  return (
    <div className="space-y-6">
      {/* Welcome Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-l from-primary/5 via-card to-card border border-border/50 rounded-2xl p-6 shadow-sm"
      >
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                مرحباً، {user?.full_name?.split(' ')[0]} 👋
              </h1>
              <p className="text-muted-foreground text-sm mt-1 font-medium">
                {company?.name_ar} — {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/pos')}
            className="btn-primary gap-2 self-start sm:self-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
            <ShoppingCart className="w-4 h-4" />
            نقطة البيع
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="مبيعات اليوم" value={summary?.today_sales || 0} icon={TrendingUp} color="blue" index={0}
          subtitle="المبيعات حتى الآن" />
        <StatCard title="مبيعات الشهر" value={summary?.month_sales || 0} icon={BarChart2} color="green" index={1}
          subtitle="إجمالي هذا الشهر" />
        <StatCard title="الآجل المستحق" value={summary?.outstanding_debt || 0} icon={CreditCard} color="orange" index={2}
          subtitle="ديون العملاء" onClick={() => navigate('/customers')} />
        <StatCard title="مشتريات اليوم" value={summary?.today_purchases || 0} icon={Package} color="purple" index={3} />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="مصروفات الشهر" value={summary?.month_expenses || 0} icon={DollarSign} color="red" index={4} />
        <StatCard title="منتجات نفد مخزونها" value={summary?.low_stock_count || 0} icon={AlertTriangle} color="orange" index={5}
          isCurrency={false} onClick={() => navigate('/inventory')} />
        <StatCard title="إجمالي العملاء" value={0} icon={Users} color="cyan" index={6} isCurrency={false}
          onClick={() => navigate('/customers')} />
        <StatCard title="أرباح الشهر" value={Math.max(0, (summary?.month_sales || 0) - (summary?.today_purchases || 0))}
          icon={TrendingUp} color="green" index={7} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="xl:col-span-2 premium-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg apple-blue flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-white" />
                </div>
                المبيعات والمشتريات الشهرية
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-medium">مقارنة الأداء المالي لهذا العام</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="المبيعات" stroke="#3B82F6" strokeWidth={2.5} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="المشتريات" stroke="#10B981" strokeWidth={2.5} fill="url(#colorPurchases)" />
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'Cairo' }} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="font-cairo text-xs">{v}</span>} />
                <Bar dataKey="المبيعات" fill="#3B82F6" radius={[6,6,0,0]} />
                <Bar dataKey="المشتريات" fill="#10B981" radius={[6,6,0,0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Top Products Pie */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg apple-orange flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-extrabold text-foreground">أكثر المنتجات مبيعاً</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4 font-medium">آخر 30 يوم</p>
          {topProducts.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <Package className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topProducts} dataKey="total_revenue" nameKey="product_name" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={pieColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs group">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: pieColors[i] }} />
                    <span className="flex-1 text-foreground font-medium truncate group-hover:text-primary transition-colors">{p.product_name}</span>
                    <span className="text-muted-foreground font-bold tabular-nums">{formatCurrency(p.total_revenue)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="premium-card">
        <div className="px-6 py-4.5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg apple-green flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-foreground">آخر الفواتير</h3>
              <p className="text-[11px] text-muted-foreground font-medium">أحدث عمليات البيع</p>
            </div>
          </div>
          <button onClick={() => navigate('/sales')} className="text-xs text-primary hover:underline flex items-center gap-1 font-bold">
            عرض الكل <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>التاريخ</th>
                <th>المبلغ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">لا توجد فواتير</td></tr>
              ) : recentInvoices.map((inv: Record<string, unknown>) => (
                <tr key={inv.id as string} className="cursor-pointer" onClick={() => navigate(`/sales/${inv.id}/edit`)}>
                  <td className="font-mono text-sm text-primary font-bold">{inv.invoice_number as string}</td>
                  <td className="font-medium">{(inv.customer as Record<string,string>)?.name_ar || '—'}</td>
                  <td className="text-muted-foreground">{formatDate(inv.invoice_date as string)}</td>
                  <td className="font-bold tabular-nums">{formatCurrency(inv.total as number)}</td>
                  <td><StatusBadge status={inv.status as string} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
