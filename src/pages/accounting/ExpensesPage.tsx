import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import DataTable, { Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatDate, getPaymentMethodLabel, today } from '@/lib/utils'
import type { Expense } from '@/types'
import toast from 'react-hot-toast'

export default function ExpensesPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({ category_id: '', expense_date: today(), description: '', amount: '', vat_amount: '', payment_method: 'cash', notes: '' })

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories', user?.company_id],
    queryFn: async () => { const { data } = await supabase.from('expense_categories').select('*').eq('company_id', user!.company_id); return data || [] },
    enabled: !!user
  })

  const { data: result, isLoading } = useQuery({
    queryKey: ['expenses', user?.company_id, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('expenses').select('*, category:expense_categories(name_ar)', { count: 'exact' })
        .eq('company_id', user!.company_id).order('expense_date', { ascending: false })
        .range((page-1)*20, page*20-1)
      if (error) throw error
      return { data: data as Expense[], total: count || 0 }
    },
    enabled: !!user
  })

  const createExpense = useMutation({
    mutationFn: async () => {
      if (!form.description || !form.amount) throw new Error('البيان والمبلغ مطلوبان')
      const amount = parseFloat(form.amount)
      const vatAmount = parseFloat(form.vat_amount) || 0
      const { data: seq } = await supabase.rpc('get_next_sequence', { p_company_id: user!.company_id, p_type: 'expense' })
      const { error } = await supabase.from('expenses').insert({
        company_id: user!.company_id, user_id: user!.id,
        expense_number: seq,
        category_id: form.category_id || null,
        expense_date: form.expense_date,
        description: form.description,
        amount, vat_amount: vatAmount, total_amount: amount + vatAmount,
        payment_method: form.payment_method,
        notes: form.notes
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('تم تسجيل المصروف بنجاح')
      setShowModal(false)
      setForm({ category_id: '', expense_date: today(), description: '', amount: '', vat_amount: '', payment_method: 'cash', notes: '' })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => { await supabase.from('expenses').delete().eq('id', id) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('تم حذف المصروف') }
  })

  const expenses = result?.data || []
  const totalExpenses = expenses.reduce((s, e) => s + e.total_amount, 0)

  const columns: Column<Expense>[] = [
    { key: 'expense_number', label: 'الرقم', render: v => <span className="font-mono text-xs text-muted-foreground">{String(v || '—')}</span> },
    { key: 'expense_date', label: 'التاريخ', render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span> },
    { key: 'description', label: 'البيان', render: v => <span className="text-sm">{String(v)}</span> },
    { key: 'category', label: 'التصنيف', render: (_, row) => <span className="text-sm text-muted-foreground">{row.category?.name_ar || '—'}</span> },
    { key: 'amount', label: 'المبلغ', render: v => <span className="text-sm">{formatCurrency(Number(v))}</span> },
    { key: 'vat_amount', label: 'ض.ق.م', render: v => <span className="text-sm text-muted-foreground">{formatCurrency(Number(v))}</span> },
    { key: 'total_amount', label: 'الإجمالي', render: v => <span className="font-bold text-red-500">{formatCurrency(Number(v))}</span> },
    { key: 'payment_method', label: 'طريقة الدفع', render: v => <span className="text-xs">{getPaymentMethodLabel(String(v))}</span> },
    { key: 'id', label: '', render: (_, row) => (
      <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
    )}
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="المصروفات" subtitle={`${result?.total || 0} مصروف`}
        actions={<button onClick={() => setShowModal(true)} className="btn-primary gap-1.5"><Plus className="w-4 h-4" />إضافة مصروف</button>} />

      <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-red-500" /><p className="text-sm text-muted-foreground">إجمالي المصروفات</p></div>
        <p className="font-bold text-lg text-red-500">{formatCurrency(totalExpenses)}</p>
      </div>

      <DataTable data={expenses} columns={columns} loading={isLoading}
        pagination={{ page, limit: 20, total: result?.total || 0, onPageChange: setPage }}
        emptyMessage="لا توجد مصروفات" />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="تسجيل مصروف" size="sm"
        footer={<><button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button><button onClick={() => createExpense.mutate()} disabled={createExpense.isPending} className="btn-primary gap-1.5"><Plus className="w-4 h-4" />حفظ</button></>}>
        <div className="space-y-3">
          <div><label className="form-label">التصنيف</label>
            <select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))} className="form-select">
              <option value="">اختر التصنيف</option>
              {categories.map((c: Record<string,string>) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <div><label className="form-label">التاريخ</label><input type="date" value={form.expense_date} onChange={e=>setForm(p=>({...p,expense_date:e.target.value}))} className="form-input" /></div>
          <div><label className="form-label">البيان *</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="form-input" placeholder="وصف المصروف" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">المبلغ *</label><input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className="form-input" dir="ltr" /></div>
            <div><label className="form-label">ض.ق.م</label><input type="number" value={form.vat_amount} onChange={e=>setForm(p=>({...p,vat_amount:e.target.value}))} className="form-input" dir="ltr" /></div>
          </div>
          <div><label className="form-label">طريقة الدفع</label>
            <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))} className="form-select">
              <option value="cash">نقدي</option><option value="mada">مدى</option><option value="transfer">تحويل</option>
            </select>
          </div>
          <div><label className="form-label">ملاحظات</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="form-input resize-none h-16 text-sm" /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="حذف المصروف" message="هل أنت متأكد من حذف هذا المصروف؟"
        onConfirm={() => { if (deleteId) { deleteExpense.mutate(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)} loading={deleteExpense.isPending} />
    </div>
  )
}
