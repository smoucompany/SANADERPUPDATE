import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Download, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import { formatCurrency, formatDate, exportToExcel, today, generateColors } from '@/lib/utils'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { Supplier } from '@/types'

export default function SupplierReportsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  const { data: suppliers = [] } = useQuery({
    queryKey: ['supplier-report-balances', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id,name_ar,balance,is_active')
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('balance', { ascending: false })
      if (error) throw error
      return data as Supplier[]
    },
    enabled: !!user
  })

  const { data: duePurchases = [] } = useQuery({
    queryKey: ['supplier-report-aging', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('remaining_amount,due_date,supplier: suppliers(name_ar)')
        .eq('company_id', user!.company_id)
        .gt('remaining_amount', 0)
        .not('status', 'in', '(cancelled,draft)')
        .is('deleted_at', null)
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })

  const topSuppliers = useMemo(() => {
    const report = suppliers.slice(0, 10).map(s => ({ name: s.name_ar, balance: Number(s.balance || 0) }))
    return report
  }, [suppliers])

  const agingBuckets = useMemo(() => {
    const todayDate = new Date(today())
    const buckets = { overdue: 0, current: 0, next30: 0, later: 0 }
    duePurchases.forEach((purchase: any) => {
      const due = purchase.due_date ? new Date(purchase.due_date) : null
      const amount = Number(purchase.remaining_amount || 0)
      if (!due) return
      const diff = Math.floor((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diff < 0) buckets.overdue += amount
      else if (diff <= 0) buckets.current += amount
      else if (diff <= 30) buckets.next30 += amount
      else buckets.later += amount
    })
    return buckets
  }, [duePurchases])

  const barData = topSuppliers.map((supplier, index) => ({ name: supplier.name, value: supplier.balance, fill: generateColors(10)[index] }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="تقارير الموردين"
        subtitle="تحليلات المركز المالي للموردين والتزامات الدفع المتأخرة"
        actions={
          <button onClick={() => exportToExcel(suppliers.map(s => ({ المورد: s.name_ar, الرصيد: s.balance, الحالة: s.is_active ? 'نشط' : 'موقوف' })), 'تقرير-رصيد-الموردين')} className="btn-outline gap-1.5">
            <Download className="w-4 h-4" />تصدير
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">إجمالي رصيد الموردين</p>
          <p className="text-2xl font-bold mt-3">{formatCurrency(suppliers.reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0))}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">أعلى 10 موردين</p>
          <p className="text-2xl font-bold mt-3">{topSuppliers.length}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">الفواتير المتأخرة</p>
          <p className="text-2xl font-bold mt-3">{formatCurrency(agingBuckets.overdue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">أهم الموردين حسب الرصيد</h3>
              <p className="text-xs text-muted-foreground">تحليل الموردين الأكثر اعتمادًا على الشركة.</p>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" tickFormatter={value => `${(value / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">المبالغ حسب حالة الاستحقاق</p>
                <p className="text-lg font-semibold mt-2">{formatCurrency(agingBuckets.overdue + agingBuckets.current + agingBuckets.next30 + agingBuckets.later)}</p>
              </div>
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-5 grid gap-3">
            {(['overdue', 'current', 'next30', 'later'] as const).map(key => (
              <div key={key} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{key === 'overdue' ? 'متأخر' : key === 'current' ? 'حالي' : key === 'next30' ? 'خلال 30 يوم' : 'أبعد'}</span>
                <strong className="text-foreground">{formatCurrency(agingBuckets[key])}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold">رصيد الموردين</h3>
            <p className="text-xs text-muted-foreground">عرض تفصيلي لكافة الموردين وترتيبهم حسب الرصيد.</p>
          </div>
          <button onClick={() => exportToExcel(suppliers.map(s => ({ المورد: s.name_ar, الرصيد: s.balance, الحالة: s.is_active ? 'نشط' : 'موقوف' })), 'تقرير-رصيد-الموردين')} className="btn-outline gap-1.5 text-xs">
            <Download className="w-4 h-4" />تصدير
          </button>
        </div>
        <DataTable
          data={suppliers}
          columns={[
            { key: 'name_ar', label: 'المورد' },
            { key: 'balance', label: 'الرصيد', render: v => formatCurrency(Number(v || 0)) },
            { key: 'is_active', label: 'الحالة', render: v => v ? 'نشط' : 'موقوف' },
          ] as Column<Supplier>[]}
          loading={!suppliers}
          searchable
          searchPlaceholder="بحث بالمورد"
          emptyMessage="لا يوجد موردون"
        />
      </div>
    </div>
  )
}
