import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, AlertCircle, CheckCircle2, Clock, Eye, Trash2, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

type PurchaseReturn = {
  id: string
  return_number: string
  purchase_id: string
  original_purchase_number: string
  supplier_id: string
  supplier_name: string
  return_date: string
  total: number
  reason: string
  created_at: string
}

const REASONS = ['منتج معيب', 'خطأ في الطلب', 'منتج مختلف', 'تالف عند الاستلام', 'أخرى']

export default function PurchaseReturnsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    purchase_id: '',
    reason: '',
    notes: '',
    total: ''
  })

  // 1. Fetch Purchase Returns from Supabase
  const { data: returns = [], isLoading } = useQuery<PurchaseReturn[]>({
    queryKey: ['purchase-returns', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_returns')
        .select('*, purchase:purchases(purchase_number), supplier:suppliers(name_ar)')
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching purchase returns:', error)
        return []
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        return_number: r.return_number || `PRET-${r.id.slice(0, 6).toUpperCase()}`,
        purchase_id: r.purchase_id,
        original_purchase_number: r.purchase?.purchase_number || '—',
        supplier_id: r.supplier_id,
        supplier_name: r.supplier?.name_ar || '—',
        return_date: r.return_date || r.created_at,
        total: Number(r.total) || 0,
        reason: r.reason || '—',
        created_at: r.created_at
      }))
    },
    enabled: !!user
  })

  // 2. Fetch active purchases for the dropdown
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases-dropdown', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(name_ar)')
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (error) return []
      return data || []
    },
    enabled: !!user && showForm
  })

  // 3. Create Return Mutation
  const createReturn = useMutation({
    mutationFn: async () => {
      if (!user) return
      const selectedPurchase = purchases.find(p => p.id === form.purchase_id)
      if (!selectedPurchase) throw new Error('يرجى تحديد فاتورة شراء صالحة')
      if (!form.reason) throw new Error('يرجى تحديد سبب الإرجاع')
      if (!form.total || Number(form.total) <= 0) throw new Error('يرجى إدخال مبلغ مرتجع صحيح')

      const nextNum = String(returns.length + 1).padStart(5, '0')
      const returnNumber = `PRET-${nextNum}`

      const combinedReason = form.notes 
        ? `${form.reason} - (ملاحظات: ${form.notes})`
        : form.reason

      const payload = {
        company_id: user.company_id,
        purchase_id: form.purchase_id,
        supplier_id: selectedPurchase.supplier_id,
        user_id: user.id,
        return_number: returnNumber,
        return_date: new Date().toISOString().split('T')[0],
        reason: combinedReason,
        total: Number(form.total)
      }

      const { error } = await supabase.from('purchase_returns').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-returns'] })
      toast.success('تم تسجيل مرتجع المشتريات بنجاح!')
      setShowForm(false)
      setForm({ purchase_id: '', reason: '', notes: '', total: '' })
    },
    onError: (err: any) => {
      toast.error('خطأ أثناء تسجيل المرتجع: ' + err.message)
    }
  })

  // 4. Delete Return Mutation
  const deleteReturn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('purchase_returns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-returns'] })
      toast.success('تم حذف المرتجع بنجاح')
    },
    onError: (err: any) => {
      toast.error('خطأ أثناء حذف المرتجع: ' + err.message)
    }
  })

  // Filtered returns based on search
  const filteredReturns = returns.filter(r => 
    r.return_number.toLowerCase().includes(search.toLowerCase()) ||
    r.original_purchase_number.toLowerCase().includes(search.toLowerCase()) ||
    r.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
    r.reason.toLowerCase().includes(search.toLowerCase())
  )

  const totalReturned = returns.reduce((s, r) => s + r.total, 0)

  const columns: Column<PurchaseReturn>[] = [
    { key: 'return_number', label: 'رقم المرتجع',
      render: v => <span className="font-mono text-primary font-bold text-sm">{String(v)}</span> },
    { key: 'original_purchase_number', label: 'فاتورة الشراء الأصلية',
      render: v => <span className="font-mono text-sm font-semibold">{String(v)}</span> },
    { key: 'supplier_name', label: 'المورد',
      render: v => <span className="font-medium text-foreground">{String(v)}</span> },
    { key: 'return_date', label: 'التاريخ',
      render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span> },
    { key: 'reason', label: 'السبب والملاحظات',
      render: v => <span className="text-sm text-muted-foreground max-w-[300px] truncate block">{String(v)}</span> },
    { key: 'total', label: 'مبلغ المرتجع',
      render: v => <span className="font-extrabold text-red-600 dark:text-red-400">{formatCurrency(Number(v))}</span> },
    { key: 'id', label: 'إجراءات',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => {
              if (confirm('هل أنت متأكد من رغبتك في حذف هذا المرتجع؟')) {
                deleteReturn.mutate(row.id)
              }
            }}
            className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
            title="حذف المرتجع"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ]

  // When a purchase invoice is selected in the form, automatically default the return total
  const handlePurchaseChange = (purchaseId: string) => {
    const selected = purchases.find(p => p.id === purchaseId)
    setForm(prev => ({
      ...prev,
      purchase_id: purchaseId,
      total: selected ? String(selected.total) : ''
    }))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="مرتجع المشتريات"
        subtitle={`${returns.length} مرتجع مسجل بالنظام`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5 cursor-pointer shadow-md hover:shadow-lg transition-all duration-200">
            <Plus className="w-4 h-4" />تسجيل مرتجع جديد
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'إجمالي عمليات المرتجعات', value: returns.length, color: 'text-foreground', iconColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', icon: RotateCcw },
          { label: 'إجمالي المبالغ المستردة', value: formatCurrency(totalReturned), color: 'text-red-600 dark:text-red-400', iconColor: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: AlertCircle },
          { label: 'حالة المعالجة المالية', value: 'معتمد وتلقائي', color: 'text-emerald-600 dark:text-emerald-400', iconColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 }
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className={`w-12 h-12 ${s.iconColor} rounded-2xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-2xl font-black ${s.color} tracking-tight`}>{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 flex-wrap bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث برقم المرتجع، رقم فاتورة الشراء أو اسم المورد..."
            className="form-input pr-10 h-10 text-sm rounded-xl"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <DataTable columns={columns} data={filteredReturns} loading={isLoading} emptyMessage="لا توجد مرتجعات مشتريات مسجلة" />

      {/* Add Return Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="تسجيل مرتجع مشتريات جديد">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label font-bold mb-1">فاتورة الشراء الأصلية</label>
            <select
              value={form.purchase_id}
              onChange={e => handlePurchaseChange(e.target.value)}
              className="form-select rounded-xl h-11 text-sm font-semibold"
            >
              <option value="">اختر فاتورة الشراء</option>
              {purchases.map(p => (
                <option key={p.id} value={p.id}>
                  {p.purchase_number} — {p.supplier?.name_ar || 'مورد غير معروف'} ({formatCurrency(p.total)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label font-bold mb-1">مبلغ المرتجع (ر.س)</label>
            <input
              type="number"
              value={form.total}
              onChange={e => setForm(p => ({ ...p, total: e.target.value }))}
              className="form-input rounded-xl h-11 text-sm font-bold text-red-600 dark:text-red-400"
              placeholder="0.00"
              dir="ltr"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">يتم تعبئة كامل قيمة الفاتورة تلقائياً عند الاختيار، ويمكنك تعديلها في حال الإرجاع الجزئي.</span>
          </div>

          <div>
            <label className="form-label font-bold mb-1">سبب الإرجاع</label>
            <select
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              className="form-select rounded-xl h-11 text-sm"
            >
              <option value="">اختر السبب</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label font-bold mb-1">ملاحظات تفصيلية</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="form-input resize-none h-24 rounded-xl text-sm"
              placeholder="اكتب تفاصيل المنتجات المرجعة أو أي ملاحظات أخرى..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
            <button onClick={() => setShowForm(false)} className="btn-outline px-5 h-11 rounded-xl cursor-pointer">إلغاء</button>
            <button
              onClick={() => createReturn.mutate()}
              disabled={createReturn.isPending}
              className="btn-primary px-6 h-11 rounded-xl gap-2 cursor-pointer bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 border-0"
            >
              <RotateCcw className="w-4 h-4" />
              {createReturn.isPending ? 'جاري التسجيل...' : 'تسجيل المرتجع'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
