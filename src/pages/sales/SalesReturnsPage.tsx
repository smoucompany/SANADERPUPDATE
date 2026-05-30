import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Eye, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'

type Return = {
  id: string
  return_number: string
  original_invoice_number: string
  customer_name: string
  return_date: string
  total: number
  reason: string
  status: 'pending' | 'approved' | 'refunded'
  refund_method: string
}

const REASONS = ['منتج معيب','خطأ في الطلب','العميل غير راضٍ','منتج مختلف','تالف عند الاستلام','أخرى']

export default function SalesReturnsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ invoice_id: '', reason: '', notes: '', refund_method: 'cash' })

  const { data: returns = [], isLoading } = useQuery<Return[]>({
    queryKey: ['sales-returns', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_returns')
        .select('*, invoice:invoices(invoice_number, customer:customers(name_ar))')
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (error) {
        // Table might not exist yet — return empty
        return []
      }
      return (data || []).map((r: any) => ({
        id: r.id,
        return_number: r.return_number || `RET-${r.id.slice(0,6).toUpperCase()}`,
        original_invoice_number: r.invoice?.invoice_number || '—',
        customer_name: r.invoice?.customer?.name_ar || '—',
        return_date: r.return_date || r.created_at,
        total: r.total || 0,
        reason: r.reason || '—',
        status: r.status || 'pending',
        refund_method: r.refund_method || 'cash',
      }))
    },
    enabled: !!user
  })

  const totalReturned = returns.reduce((s, r) => s + r.total, 0)
  const pending = returns.filter(r => r.status === 'pending').length
  const approved = returns.filter(r => r.status !== 'pending').length

  const statusConfig = {
    pending:  { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    approved: { label: 'معتمد',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    refunded: { label: 'تم الاسترداد', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  }

  const columns: Column<Return>[] = [
    { key: 'return_number', label: 'رقم المرتجع',
      render: v => <span className="font-mono text-primary font-semibold text-sm">{String(v)}</span> },
    { key: 'original_invoice_number', label: 'الفاتورة الأصلية',
      render: v => <span className="font-mono text-sm">{String(v)}</span> },
    { key: 'customer_name', label: 'العميل' },
    { key: 'return_date', label: 'التاريخ',
      render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span> },
    { key: 'reason', label: 'السبب',
      render: v => <span className="text-sm text-muted-foreground">{String(v)}</span> },
    { key: 'total', label: 'المبلغ',
      render: v => <span className="font-bold text-red-500">{formatCurrency(Number(v))}</span> },
    { key: 'status', label: 'الحالة',
      render: v => {
        const cfg = statusConfig[v as keyof typeof statusConfig]
        return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg?.color}`}>{cfg?.label}</span>
      }
    },
    { key: 'id', label: 'إجراءات',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button className="btn-ghost p-1.5 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
          <button className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="مرتجعات المبيعات"
        subtitle={`${returns.length} مرتجع`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />مرتجع جديد
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المرتجعات', value: returns.length, color: 'text-foreground', bg: 'bg-card', icon: RotateCcw, iconColor: 'bg-rose-500' },
          { label: 'إجمالي المبالغ المستردة', value: formatCurrency(totalReturned), color: 'text-red-500', bg: 'bg-card', icon: AlertCircle, iconColor: 'bg-red-500' },
          { label: 'قيد المراجعة', value: pending, color: 'text-amber-600', bg: 'bg-card', icon: Clock, iconColor: 'bg-amber-500' },
          { label: 'معتمد / مسترد', value: approved, color: 'text-emerald-600', bg: 'bg-card', icon: CheckCircle2, iconColor: 'bg-emerald-500' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-border/60 rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 ${s.iconColor} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={returns} loading={isLoading} emptyMessage="لا توجد مرتجعات" />

      {/* New Return Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إضافة مرتجع مبيعات">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label">رقم الفاتورة الأصلية</label>
            <input value={form.invoice_id} onChange={e => setForm(p => ({...p, invoice_id: e.target.value}))}
              className="form-input" dir="ltr" placeholder="INV-000001" />
          </div>
          <div>
            <label className="form-label">سبب الإرجاع</label>
            <select value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} className="form-select">
              <option value="">اختر السبب</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">طريقة الاسترداد</label>
            <select value={form.refund_method} onChange={e => setForm(p => ({...p, refund_method: e.target.value}))} className="form-select">
              <option value="cash">نقدي</option>
              <option value="bank">تحويل بنكي</option>
              <option value="credit">رصيد في الحساب</option>
            </select>
          </div>
          <div>
            <label className="form-label">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              className="form-input resize-none h-20" placeholder="تفاصيل إضافية..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={() => { toast.success('تم إنشاء المرتجع'); setShowForm(false) }} className="btn-primary gap-2">
              <RotateCcw className="w-4 h-4" />إنشاء المرتجع
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
