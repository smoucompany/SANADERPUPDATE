import { useState, useMemo } from 'react'
import { Plus, Search, Download } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function BankWithdrawalsPage() {
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    withdrawal_date: today(),
    bank_account_id: '',
    beneficiary_name: '',
    beneficiary_entity: '',
    amount: 0,
    reference: '',
    notes: ''
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: withdrawals = [], isLoading, refetch } = useQuery({
    queryKey: ['bank-withdrawals', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('bank_withdrawals')
        .select('*, bank_account:bank_accounts(bank_name), user:users(full_name)')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('withdrawal_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  const filtered = useMemo(() =>
    withdrawals.filter(w =>
      !search ||
      w.withdrawal_number?.includes(search) ||
      w.beneficiary_name?.includes(search) ||
      (w.bank_account as any)?.bank_name?.includes(search)
    ), [withdrawals, search])

  const handleSave = async () => {
    if (!form.bank_account_id) { toast.error('اختر الحساب البنكي'); return }
    if (!form.amount || form.amount <= 0) { toast.error('القيمة يجب أن تكون أكبر من الصفر'); return }

    const acc = bankAccounts.find((a: any) => a.id === form.bank_account_id)
    if (acc && acc.balance < form.amount) {
      toast.error(`رصيد الحساب البنكي غير كافٍ (المتاح: ${formatCurrency(acc.balance)})`)
      return
    }

    setSaving(true)
    try {
      const { data: docNum } = await supabase.rpc('get_next_document_number', {
        p_company_id: company!.id, p_type: 'bank_withdrawal', p_prefix: 'WTH'
      })

      const { data: wth, error } = await supabase.from('bank_withdrawals').insert({
        company_id:          company!.id,
        withdrawal_number:   docNum,
        withdrawal_date:     form.withdrawal_date,
        bank_account_id:     form.bank_account_id,
        beneficiary_name:    form.beneficiary_name,
        beneficiary_entity:  form.beneficiary_entity,
        amount:              form.amount,
        reference:           form.reference,
        notes:               form.notes,
        user_id:             user?.id,
        is_posted:           true
      }).select().single()
      if (error) throw error

      await supabase.from('bank_movements').insert({
        company_id:       company!.id,
        bank_account_id:  form.bank_account_id,
        movement_date:    form.withdrawal_date,
        reference_type:   'bank_withdrawal',
        reference_id:     wth.id,
        reference_number: docNum,
        description:      `سحب إلى ${form.beneficiary_name || form.beneficiary_entity || 'غير محدد'}`,
        debit:            0,
        credit:           form.amount,
        user_id:          user?.id
      })

      if (acc) {
        await supabase.from('bank_accounts')
          .update({ balance: (acc.balance || 0) - form.amount })
          .eq('id', form.bank_account_id)
      }

      toast.success('تم تسجيل السحب بنجاح')
      queryClient.invalidateQueries({ queryKey: ['bank-withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setShowModal(false)
      setForm({ withdrawal_date: today(), bank_account_id: '', beneficiary_name: '', beneficiary_entity: '', amount: 0, reference: '', notes: '' })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = filtered.map(w => ({
      'رقم المستند':       w.withdrawal_number,
      'التاريخ':           formatDate(w.withdrawal_date),
      'الحساب البنكي':     (w.bank_account as any)?.bank_name || '',
      'الجهة المسحوب إليها': w.beneficiary_entity || w.beneficiary_name || '',
      'القيمة':            w.amount,
      'المرجع':            w.reference || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'سحوبات البنك')
    XLSX.writeFile(wb, `bank_withdrawals_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مستندات السحب البنكي"
        subtitle={`${filtered.length} مستند`}
        actions={
          <div className="flex gap-2">
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={15} /> Excel
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Plus size={16} /> سحب جديد
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="بحث..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 pr-9 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">رقم المستند</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الحساب البنكي</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الجهة المسحوب إليها</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">القيمة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">المرجع</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(w => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-red-700">{w.withdrawal_number}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(w.withdrawal_date)}</td>
                <td className="px-4 py-3">{(w.bank_account as any)?.bank_name || '—'}</td>
                <td className="px-4 py-3">{w.beneficiary_entity || w.beneficiary_name || '—'}</td>
                <td className="px-4 py-3 text-left font-bold text-red-700">{formatCurrency(w.amount)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{w.reference || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">لا توجد مستندات سحب</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} title="مستند سحب بنكي جديد" onClose={() => setShowModal(false)}>
        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ السحب</label>
              <input type="date" value={form.withdrawal_date}
                onChange={e => setForm(f => ({ ...f, withdrawal_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الحساب البنكي <span className="text-red-500">*</span></label>
              <select value={form.bank_account_id}
                onChange={e => setForm(f => ({ ...f, bank_account_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">-- اختر --</option>
                {bankAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} (رصيد: {formatCurrency(a.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الجهة المسحوب إليها</label>
              <input value={form.beneficiary_entity}
                onChange={e => setForm(f => ({ ...f, beneficiary_entity: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="الجهة / الشركة" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اسم الشخص</label>
              <input value={form.beneficiary_name}
                onChange={e => setForm(f => ({ ...f, beneficiary_name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">القيمة <span className="text-red-500">*</span></label>
              <input type="number" min="0.01" step="0.01" value={form.amount || ''}
                onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-3 py-2 text-left" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رقم المرجع</label>
              <input value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 resize-none" rows={2} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 disabled:opacity-50 font-medium">
              {saving ? 'جاري الحفظ...' : 'حفظ السحب'}
            </button>
            <button onClick={() => setShowModal(false)}
              className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
