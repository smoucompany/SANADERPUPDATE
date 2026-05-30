import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useCustomers } from '@/hooks/useCustomers'
import { useSuppliers } from '@/hooks/useSuppliers'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import DataTable, { Column } from '@/components/shared/DataTable'
import { formatCurrency, formatDate, getPaymentMethodLabel, today } from '@/lib/utils'
import type { Payment } from '@/types'
import toast from 'react-hot-toast'

export default function PaymentsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState<'receipt' | 'payment'>('receipt')
  const [page, setPage] = useState(1)
  const { data: customers = [] } = useCustomers()
  const { data: suppliers = [] } = useSuppliers()

  const [form, setForm] = useState({
    type: 'receipt', customer_id: '', supplier_id: '',
    payment_date: today(), method: 'cash', amount: '', reference: '', notes: ''
  })

  const { data: result, isLoading } = useQuery({
    queryKey: ['payments', user?.company_id, type, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('payments')
        .select('*, customer:customers(name_ar), supplier:suppliers(name_ar)', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .eq('type', type)
        .order('payment_date', { ascending: false })
        .range((page-1)*20, page*20-1)
      if (error) throw error
      return { data: data as Payment[], total: count || 0 }
    },
    enabled: !!user
  })

  const createPayment = useMutation({
    mutationFn: async () => {
      if (!form.amount || parseFloat(form.amount) <= 0) throw new Error('المبلغ مطلوب')
      const { data: seq } = await supabase.rpc('get_next_sequence', { p_company_id: user!.company_id, p_type: form.type === 'receipt' ? 'receipt' : 'payment' })
      const { error } = await supabase.from('payments').insert({
        company_id: user!.company_id, user_id: user!.id,
        payment_number: seq, type: form.type,
        customer_id: form.customer_id || null,
        supplier_id: form.supplier_id || null,
        payment_date: form.payment_date,
        method: form.method, amount: parseFloat(form.amount),
        reference: form.reference, notes: form.notes, is_posted: true
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('تم حفظ السند بنجاح')
      setShowModal(false)
      setForm({ type: 'receipt', customer_id: '', supplier_id: '', payment_date: today(), method: 'cash', amount: '', reference: '', notes: '' })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const payments = result?.data || []
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0)

  const columns: Column<Payment>[] = [
    { key: 'payment_number', label: 'رقم السند', render: v => <span className="font-mono text-primary text-sm">{String(v)}</span> },
    { key: 'payment_date', label: 'التاريخ', render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span> },
    { key: 'customer', label: 'العميل/المورد', render: (_, row) => <span className="text-sm">{row.customer?.name_ar || row.supplier?.name_ar || '—'}</span> },
    { key: 'method', label: 'الطريقة', render: v => <span className="text-sm">{getPaymentMethodLabel(String(v))}</span> },
    { key: 'amount', label: 'المبلغ', render: v => <span className={`font-bold text-sm ${type === 'receipt' ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(Number(v))}</span> },
    { key: 'reference', label: 'المرجع', render: v => <span className="text-xs text-muted-foreground">{String(v || '—')}</span> }
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="سندات القبض والصرف" subtitle={`${result?.total || 0} سند`}
        actions={
          <>
            <button onClick={() => { setShowModal(true); setForm(p => ({...p, type: 'receipt'})) }} className="btn-primary gap-1.5">
              <TrendingUp className="w-4 h-4" />سند قبض
            </button>
            <button onClick={() => { setShowModal(true); setForm(p => ({...p, type: 'payment'})) }} className="btn-outline gap-1.5">
              <TrendingDown className="w-4 h-4" />سند صرف
            </button>
          </>
        }
      />

      <div className="flex gap-2">
        {(['receipt', 'payment'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${type === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
            {t === 'receipt' ? 'سندات القبض' : 'سندات الصرف'}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{type === 'receipt' ? 'إجمالي المقبوض' : 'إجمالي المصروف'}</p>
        <p className={`font-bold text-lg ${type === 'receipt' ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(totalAmount)}</p>
      </div>

      <DataTable data={payments} columns={columns} loading={isLoading}
        pagination={{ page, limit: 20, total: result?.total || 0, onPageChange: setPage }}
        emptyMessage="لا توجد سندات" />

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={form.type === 'receipt' ? 'سند قبض جديد' : 'سند صرف جديد'} size="sm"
        footer={<><button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button><button onClick={() => createPayment.mutate()} disabled={createPayment.isPending} className="btn-primary gap-1.5"><DollarSign className="w-4 h-4" />حفظ السند</button></>}>
        <div className="space-y-3">
          {form.type === 'receipt' ? (
            <div><label className="form-label">العميل</label>
              <select value={form.customer_id} onChange={e=>setForm(p=>({...p,customer_id:e.target.value}))} className="form-select">
                <option value="">اختر العميل</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
          ) : (
            <div><label className="form-label">المورد</label>
              <select value={form.supplier_id} onChange={e=>setForm(p=>({...p,supplier_id:e.target.value}))} className="form-select">
                <option value="">اختر المورد</option>
                {suppliers.map(s=><option key={s.id} value={s.id}>{s.name_ar}</option>)}
              </select>
            </div>
          )}
          <div><label className="form-label">التاريخ</label><input type="date" value={form.payment_date} onChange={e=>setForm(p=>({...p,payment_date:e.target.value}))} className="form-input" /></div>
          <div><label className="form-label">المبلغ *</label><input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className="form-input text-lg font-bold" dir="ltr" placeholder="0.00" /></div>
          <div><label className="form-label">طريقة الدفع</label>
            <select value={form.method} onChange={e=>setForm(p=>({...p,method:e.target.value}))} className="form-select">
              <option value="cash">نقدي</option><option value="mada">مدى</option>
              <option value="transfer">تحويل</option><option value="credit">بطاقة ائتمان</option>
            </select>
          </div>
          <div><label className="form-label">المرجع / رقم التحويل</label><input value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} className="form-input" dir="ltr" /></div>
          <div><label className="form-label">ملاحظات</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="form-input resize-none h-16 text-sm" /></div>
        </div>
      </Modal>
    </div>
  )
}
