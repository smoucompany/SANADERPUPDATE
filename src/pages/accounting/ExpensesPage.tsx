import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Receipt, Search, Download, RefreshCw, AlertCircle, Loader2, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import StatusBadge from '@/components/shared/StatusBadge'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'نقدي (خزينة رئيسية)', icon: '💵' },
  { value: 'transfer', label: 'تحويل بنكي',           icon: '🏦' },
  { value: 'mada',     label: 'بطاقة / فيزا',         icon: '💳' },
]

export default function ExpensesPage() {
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [showModal, setShowModal]         = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [search, setSearch]               = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [saving, setSaving]               = useState(false)
  const [deleteId, setDeleteId]           = useState<string | null>(null)
  const [adminPassword, setAdminPassword] = useState('')

  const [form, setForm] = useState({
    expense_date:   today(),
    category_id:    '',
    description:    '',
    amount:         '',
    vat_amount:     '',
    payment_method: 'cash',
    bank_account_id: '',
    notes:          ''
  })

  const [catForm, setCatForm] = useState({ name_ar: '', code: '', description: '' })

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['expense-categories', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('expense_categories')
        .select('*').eq('company_id', company.id).eq('is_active', true).order('name_ar')
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('bank_accounts')
        .select('id, bank_name, account_number, balance')
        .eq('company_id', company.id).eq('is_active', true).is('deleted_at', null)
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: expenses = [], isLoading, refetch } = useQuery({
    queryKey: ['expenses', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(name_ar), bank_account:bank_accounts(bank_name)')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('expense_date', { ascending: false })
      return data || []
    },
    enabled: !!company?.id
  })

  const filtered = useMemo(() =>
    (expenses as any[]).filter(e =>
      (!search || e.description?.includes(search) || e.document_number?.includes(search)) &&
      (!categoryFilter || e.category_id === categoryFilter) &&
      (!dateFrom || e.expense_date >= dateFrom) &&
      (!dateTo || e.expense_date <= dateTo)
    ), [expenses, search, categoryFilter, dateFrom, dateTo])

  const totals = useMemo(() => ({
    count:  filtered.length,
    amount: filtered.reduce((s, e) => s + (e.amount || 0), 0),
    vat:    filtered.reduce((s, e) => s + (e.vat_amount || 0), 0),
    total:  filtered.reduce((s, e) => s + (e.total_amount || 0), 0),
  }), [filtered])

  const getNextNumber = async () => {
    const { data } = await supabase.rpc('get_next_document_number', {
      p_company_id: company!.id, p_type: 'expense', p_prefix: 'EXP'
    })
    return data || `EXP-${Date.now()}`
  }

  const handleSave = async () => {
    if (!form.description) return toast.error('يجب إدخال بيان المصروف')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('يجب إدخال قيمة صحيحة')
    if (form.payment_method !== 'cash' && !form.bank_account_id) return toast.error('اختر الحساب البنكي')

    setSaving(true)
    try {
      const docNumber  = await getNextNumber()
      const amount     = parseFloat(form.amount)
      const vatAmount  = parseFloat(form.vat_amount || '0')
      const totalAmount = amount + vatAmount

      const { data: newExp, error } = await supabase.from('expenses').insert({
        company_id:      company!.id,
        category_id:     form.category_id || null,
        document_number: docNumber,
        expense_date:    form.expense_date,
        description:     form.description,
        amount,
        vat_amount:      vatAmount,
        total_amount:    totalAmount,
        payment_method:  form.payment_method,
        bank_account_id: form.payment_method !== 'cash' ? form.bank_account_id || null : null,
        notes:           form.notes || null,
        user_id:         user?.id,
        is_posted:       false
      }).select('id').single()

      if (error) throw error

      // إنشاء قيد محاسبي وخصم الخزينة/البنك
      if (newExp?.id) {
        await supabase.rpc('post_expense', { p_expense_id: newExp.id })
      }

      toast.success('✅ تم تسجيل المصروف وإنشاء القيد المحاسبي')
      setShowModal(false)
      setForm({ expense_date: today(), category_id: '', description: '', amount: '', vat_amount: '', payment_method: 'cash', bank_account_id: '', notes: '' })
      refetch()
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (adminPassword !== 'Admin@123') return toast.error('كلمة المرور غير صحيحة')
    if (!deleteId) return
    try {
      const { data: exp } = await supabase.from('expenses').select('*').eq('id', deleteId).single()
      if (exp?.is_posted) {
        // عكس الخزينة
        if (exp.payment_method === 'cash') {
          await supabase.from('cashboxes')
            .update({ balance: supabase.rpc as any })
          const { data: mainBox } = await supabase.from('cashboxes')
            .select('id, balance').eq('company_id', company!.id).eq('is_main', true).single()
          if (mainBox) {
            await supabase.from('cashboxes').update({ balance: mainBox.balance + exp.total_amount }).eq('id', mainBox.id)
          }
        } else if (exp.bank_account_id) {
          const { data: ba } = await supabase.from('bank_accounts').select('balance').eq('id', exp.bank_account_id).single()
          await supabase.from('bank_accounts').update({ balance: (ba?.balance || 0) + exp.total_amount }).eq('id', exp.bank_account_id)
        }
      }
      await supabase.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId)
      toast.success('تم حذف المصروف وعكس أثره')
      setDeleteId(null); setAdminPassword('')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleAddCategory = async () => {
    if (!catForm.name_ar) return toast.error('اسم الفئة مطلوب')
    try {
      await supabase.from('expense_categories').insert({
        company_id: company!.id,
        name_ar:    catForm.name_ar,
        code:       catForm.code || null,
        description: catForm.description || null,
        is_active:  true
      })
      toast.success('تم إضافة فئة المصروف')
      setCatForm({ name_ar: '', code: '', description: '' })
      refetchCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const exportExcel = () => {
    const rows = filtered.map(e => ({
      'رقم المستند':  e.document_number || '',
      'التاريخ':     formatDate(e.expense_date),
      'الفئة':       e.category?.name_ar || 'غير محدد',
      'البيان':      e.description,
      'المبلغ':      e.amount,
      'الضريبة':     e.vat_amount,
      'الإجمالي':    e.total_amount,
      'طريقة الدفع': PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات')
    XLSX.writeFile(wb, `expenses_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة المصروفات"
        subtitle="تسجيل وتتبع جميع المصروفات مع القيود المحاسبية"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Settings size={14} /> فئات المصروفات
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} /> مصروف جديد
            </button>
          </div>
        }
      />

      {/* فلاتر */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 pr-9 text-sm w-48" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع الفئات</option>
            {(categories as any[]).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name_ar}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => refetch()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
            <RefreshCw size={13} /> تحديث
          </button>
        </div>
      </div>

      {/* جدول المصروفات */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Receipt size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد مصروفات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم المستند</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الفئة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">البيان</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">طريقة الدفع</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">المبلغ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">الإجمالي</th>
                  <th className="text-center px-4 py-3">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-700 text-xs">{e.document_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {e.category?.name_ar || 'غير محدد'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{e.description}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method}
                    </td>
                    <td className="px-4 py-3 text-left">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-left font-bold text-red-600">{formatCurrency(e.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setDeleteId(e.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t bg-orange-50 px-4 py-3 grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-500 text-xs">عدد المصروفات</div>
            <div className="font-bold text-orange-700 text-xl">{totals.count}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">إجمالي المبالغ</div>
            <div className="font-bold text-orange-700">{formatCurrency(totals.amount)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">الضرائب</div>
            <div className="font-bold text-orange-700">{formatCurrency(totals.vat)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">الإجمالي الكلي</div>
            <div className="font-bold text-red-700 text-xl">{formatCurrency(totals.total)}</div>
          </div>
        </div>
      </div>

      {/* نافذة إضافة مصروف */}
      <Modal open={showModal} title="تسجيل مصروف جديد" onClose={() => setShowModal(false)}>
        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">التاريخ <span className="text-red-500">*</span></label>
              <input type="date" value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع المصروف</label>
              <select value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">-- اختر الفئة --</option>
                {(categories as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">البيان <span className="text-red-500">*</span></label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2" placeholder="وصف المصروف..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">القيمة <span className="text-red-500">*</span></label>
              <input type="number" value={form.amount} min="0" step="0.01"
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ضريبة القيمة المضافة</label>
              <input type="number" value={form.vat_amount} min="0" step="0.01"
                onChange={e => setForm(f => ({ ...f, vat_amount: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">طريقة الدفع <span className="text-red-500">*</span></label>
            <select value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2">
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          {form.payment_method !== 'cash' && (
            <div>
              <label className="block text-sm font-medium mb-1">الحساب البنكي <span className="text-red-500">*</span></label>
              <select value={form.bank_account_id}
                onChange={e => setForm(f => ({ ...f, bank_account_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">-- اختر --</option>
                {(bankAccounts as any[]).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bank_name} ({formatCurrency(b.balance)})</option>
                ))}
              </select>
            </div>
          )}

          {form.amount && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              الإجمالي: <strong className="text-red-600">
                {formatCurrency((parseFloat(form.amount) || 0) + (parseFloat(form.vat_amount) || 0))}
              </strong>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full border rounded-lg px-3 py-2 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 font-medium flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              تسجيل المصروف
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2.5">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* نافذة فئات المصروفات */}
      <Modal open={showCategoryModal} title="إدارة فئات المصروفات" onClose={() => setShowCategoryModal(false)}>
        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">اسم الفئة <span className="text-red-500">*</span></label>
              <input value={catForm.name_ar} onChange={e => setCatForm(f => ({ ...f, name_ar: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="مثال: إيجار" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رمز الفئة</label>
              <input value={catForm.code} onChange={e => setCatForm(f => ({ ...f, code: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="EXP-01" />
            </div>
          </div>
          <button onClick={handleAddCategory}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium">
            + إضافة الفئة
          </button>

          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-700 mb-2">الفئات الموجودة</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(categories as any[]).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  <span>{c.name_ar}</span>
                  {c.code && <span className="text-gray-400 text-xs">{c.code}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* حوار الحذف */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-red-600">حذف المصروف</h3>
            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              سيتم عكس أثره على الخزينة/البنك. يتطلب كلمة مرور الإدارة.
            </div>
            <input type="password" placeholder="كلمة مرور الإدارة" value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white rounded-lg py-2">تأكيد</button>
              <button onClick={() => { setDeleteId(null); setAdminPassword('') }}
                className="flex-1 border rounded-lg py-2">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
