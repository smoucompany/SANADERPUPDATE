import { useState, useMemo } from 'react'
import {
  Plus, Search, Download, RefreshCw, Trash2, AlertCircle, Loader2, TrendingUp
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function BankDepositsPage() {
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [showModal, setShowModal]         = useState(false)
  const [search, setSearch]               = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [saving, setSaving]               = useState(false)
  const [deleteId, setDeleteId]           = useState<string | null>(null)
  const [adminPassword, setAdminPassword] = useState('')

  const [form, setForm] = useState({
    deposit_date: today(),
    bank_account_id: '',
    depositor_name: '',
    depositor_entity: '',
    amount: '',
    reference: '',
    notes: ''
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('bank_accounts')
        .select('id, bank_name, account_number, balance')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: deposits = [], isLoading, refetch } = useQuery({
    queryKey: ['bank-deposits', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase
        .from('bank_deposits')
        .select('*, bank_account:bank_accounts(bank_name, account_number)')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('deposit_date', { ascending: false })
      return data || []
    },
    enabled: !!company?.id
  })

  const filtered = useMemo(() =>
    (deposits as any[]).filter(d =>
      (!search || d.deposit_number?.includes(search) || d.depositor_name?.includes(search) ||
        d.bank_account?.bank_name?.includes(search)) &&
      (!dateFrom || d.deposit_date >= dateFrom) &&
      (!dateTo || d.deposit_date <= dateTo)
    ), [deposits, search, dateFrom, dateTo])

  const totalDeposits = useMemo(() =>
    filtered.reduce((s, d) => s + (d.amount || 0), 0), [filtered])

  const getNextNumber = async () => {
    const { data } = await supabase.rpc('get_next_document_number', {
      p_company_id: company!.id, p_type: 'bank_deposit', p_prefix: 'DEP'
    })
    return data || `DEP-${Date.now()}`
  }

  const handleSave = async () => {
    if (!form.bank_account_id) return toast.error('اختر الحساب البنكي')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('يجب إدخال قيمة صحيحة')

    setSaving(true)
    try {
      const depositNumber = await getNextNumber()
      const { error } = await supabase.from('bank_deposits').insert({
        company_id:       company!.id,
        deposit_number:   depositNumber,
        deposit_date:     form.deposit_date,
        bank_account_id:  form.bank_account_id,
        depositor_name:   form.depositor_name || null,
        depositor_entity: form.depositor_entity || null,
        amount:           parseFloat(form.amount),
        reference:        form.reference || null,
        notes:            form.notes || null,
        user_id:          user?.id,
        is_posted:        true
      })
      if (error) throw error

      toast.success('✅ تم تسجيل الإيداع وتحديث رصيد البنك')
      setShowModal(false)
      setForm({ deposit_date: today(), bank_account_id: '', depositor_name: '', depositor_entity: '', amount: '', reference: '', notes: '' })
      refetch()
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
      const { data: dep } = await supabase.from('bank_deposits').select('*').eq('id', deleteId).single()
      if (dep?.is_posted) {
        // عكس رصيد البنك
        const { data: ba } = await supabase.from('bank_accounts').select('balance').eq('id', dep.bank_account_id).single()
        await supabase.from('bank_accounts').update({ balance: (ba?.balance || 0) - dep.amount }).eq('id', dep.bank_account_id)
      }
      await supabase.from('bank_deposits').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId)
      toast.success('تم حذف الإيداع')
      setDeleteId(null); setAdminPassword('')
      refetch(); queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = filtered.map(d => ({
      'رقم الإيداع':  d.deposit_number,
      'التاريخ':      formatDate(d.deposit_date),
      'البنك':        d.bank_account?.bank_name || '',
      'اسم المودع':   d.depositor_name || '',
      'الجهة':        d.depositor_entity || '',
      'القيمة':       d.amount,
      'مرجع':         d.reference || '',
      'ملاحظات':      d.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الإيداعات')
    XLSX.writeFile(wb, `bank_deposits_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إيداعات البنك"
        subtitle="تسجيل وإدارة الإيداعات البنكية"
        actions={
          <div className="flex gap-2">
            <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} /> إيداع جديد
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
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => refetch()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
            <RefreshCw size={13} /> تحديث
          </button>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد إيداعات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الإيداع</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">البنك</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">اسم المودع</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">القيمة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">ملاحظات</th>
                  <th className="text-center px-4 py-3">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-700">{d.deposit_number}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(d.deposit_date)}</td>
                    <td className="px-4 py-3 font-medium">{d.bank_account?.bank_name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.depositor_name || '—'}</td>
                    <td className="px-4 py-3 text-left font-bold text-green-700">{formatCurrency(d.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.notes || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setDeleteId(d.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t bg-green-50 px-4 py-2 flex justify-between text-sm">
          <span className="text-gray-600">عدد الإيداعات: {filtered.length}</span>
          <span className="font-bold text-green-700">الإجمالي: {formatCurrency(totalDeposits)}</span>
        </div>
      </div>

      {/* نافذة إضافة */}
      <Modal open={showModal} title="تسجيل إيداع بنكي جديد" onClose={() => setShowModal(false)}>
        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">التاريخ <span className="text-red-500">*</span></label>
              <input type="date" value={form.deposit_date}
                onChange={e => setForm(f => ({ ...f, deposit_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">الجهة المودعة</label>
              <input value={form.depositor_entity} onChange={e => setForm(f => ({ ...f, depositor_entity: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="شركة/جهة" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اسم الشخص</label>
              <input value={form.depositor_name} onChange={e => setForm(f => ({ ...f, depositor_name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">القيمة <span className="text-red-500">*</span></label>
              <input type="number" value={form.amount} min="0.01" step="0.01"
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رقم المرجع</label>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full border rounded-lg px-3 py-2 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 font-medium flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              تسجيل الإيداع
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2.5">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* حوار الحذف */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-red-600">حذف الإيداع</h3>
            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              سيتم عكس أثره على رصيد البنك. يتطلب كلمة مرور الإدارة.
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
