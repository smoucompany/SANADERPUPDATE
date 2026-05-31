import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ArrowRight, ArrowLeftRight, Download,
  RefreshCw, Search, AlertCircle, Trash2, Lock, Loader2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

export default function CashboxTransfersPage() {
  const navigate = useNavigate()
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [showModal, setShowModal]           = useState(false)
  const [search, setSearch]                 = useState('')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const [saving, setSaving]                 = useState(false)
  const [deleteId, setDeleteId]             = useState<string | null>(null)
  const [adminPassword, setAdminPassword]   = useState('')
  const [loadingDelete, setLoadingDelete]   = useState(false)

  const [form, setForm] = useState({
    transfer_date: today(),
    from_cashbox_id: '',
    amount: '',
    notes: ''
  })

  const { data: cashboxes = [] } = useQuery({
    queryKey: ['cashboxes', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('cashboxes')
        .select('id, name_ar, is_main, balance, cashbox_type')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('is_main', { ascending: false })
      return data || []
    },
    enabled: !!company?.id
  })

  const mainCashbox = (cashboxes as any[]).find(c => c.is_main)
  const subCashboxes = (cashboxes as any[]).filter(c => !c.is_main)

  const { data: transfers = [], isLoading, refetch } = useQuery({
    queryKey: ['cashbox-transfers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase
        .from('cashbox_transfers')
        .select('*, from_cashbox:cashboxes!from_cashbox_id(name_ar), to_cashbox:cashboxes!to_cashbox_id(name_ar)')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('transfer_date', { ascending: false })
      return data || []
    },
    enabled: !!company?.id
  })

  const filtered = useMemo(() =>
    (transfers as any[]).filter(t =>
      (!search || t.transfer_number?.includes(search) || t.from_cashbox?.name_ar?.includes(search)) &&
      (!dateFrom || t.transfer_date >= dateFrom) &&
      (!dateTo || t.transfer_date <= dateTo)
    ), [transfers, search, dateFrom, dateTo])

  // توليد رقم مستند تلقائي
  const getNextNumber = async () => {
    const { data } = await supabase.rpc('get_next_document_number', {
      p_company_id: company!.id,
      p_type: 'cashbox_transfer',
      p_prefix: 'CBT'
    })
    return data || `CBT-${Date.now()}`
  }

  const handleSave = async () => {
    if (!form.from_cashbox_id) return toast.error('اختر الخزينة المحولة منها')
    if (!mainCashbox) return toast.error('لا توجد خزينة رئيسية')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('يجب إدخال قيمة صحيحة')

    const fromBox = (cashboxes as any[]).find(c => c.id === form.from_cashbox_id)
    if (fromBox && fromBox.balance < parseFloat(form.amount)) {
      return toast.error(`رصيد الخزينة (${formatCurrency(fromBox.balance)}) غير كافٍ`)
    }

    setSaving(true)
    try {
      const transferNumber = await getNextNumber()

      const { error } = await supabase.from('cashbox_transfers').insert({
        company_id:      company!.id,
        transfer_number: transferNumber,
        transfer_date:   form.transfer_date,
        from_cashbox_id: form.from_cashbox_id,
        to_cashbox_id:   mainCashbox.id,
        amount:          parseFloat(form.amount),
        notes:           form.notes || null,
        user_id:         user?.id,
        is_posted:       true
      })

      if (error) throw error

      toast.success('✅ تم إنشاء مستند التحويل بنجاح')
      setShowModal(false)
      setForm({ transfer_date: today(), from_cashbox_id: '', amount: '', notes: '' })
      refetch()
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (adminPassword !== 'Admin@123') {
      return toast.error('كلمة المرور غير صحيحة')
    }
    if (!deleteId) return
    setLoadingDelete(true)
    try {
      const { data: transfer } = await supabase
        .from('cashbox_transfers')
        .select('*')
        .eq('id', deleteId)
        .single()

      if (transfer?.is_posted) {
        // عكس التحويل
        await supabase.from('cashboxes')
          .update({ balance: supabase.rpc as any })

        // إعادة الرصيد للخزينة المحولة منها
        const { data: fromBox } = await supabase.from('cashboxes').select('balance').eq('id', transfer.from_cashbox_id).single()
        await supabase.from('cashboxes').update({ balance: (fromBox?.balance || 0) + transfer.amount }).eq('id', transfer.from_cashbox_id)

        // تخفيض من الخزينة المحولة إليها
        const { data: toBox } = await supabase.from('cashboxes').select('balance').eq('id', transfer.to_cashbox_id).single()
        await supabase.from('cashboxes').update({ balance: Math.max(0, (toBox?.balance || 0) - transfer.amount) }).eq('id', transfer.to_cashbox_id)
      }

      await supabase.from('cashbox_transfers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteId)

      toast.success('تم حذف مستند التحويل وعكس آثاره')
      setDeleteId(null)
      setAdminPassword('')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setLoadingDelete(false)
    }
  }

  const exportExcel = () => {
    const rows = filtered.map(t => ({
      'رقم المستند':    t.transfer_number,
      'التاريخ':       formatDate(t.transfer_date),
      'من خزينة':      t.from_cashbox?.name_ar || '',
      'إلى خزينة':     t.to_cashbox?.name_ar || '',
      'القيمة':        t.amount,
      'ملاحظات':       t.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'تحويلات الخزائن')
    XLSX.writeFile(wb, `cashbox_transfers_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مستندات تحويل الخزائن"
        subtitle="التحويل من الخزائن الفرعية إلى الخزينة الرئيسية"
        actions={
          <div className="flex gap-2">
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => navigate('/cashbox')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowRight size={14} /> رجوع
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} /> مستند تحويل جديد
            </button>
          </div>
        }
      />

      {/* تنبيه */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Lock size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <strong>قاعدة التحويل:</strong> التحويل يكون دائماً من الخزائن الفرعية إلى الخزينة الرئيسية فقط.
          الخزينة الرئيسية مخصصة لسداد الموردين والمصروفات.
        </div>
      </div>

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
          <button onClick={() => refetch()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
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
            <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد مستندات تحويل</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">رقم المستند</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">من خزينة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">إلى خزينة</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">القيمة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">ملاحظات</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-700">{t.transfer_number}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(t.transfer_date)}</td>
                  <td className="px-4 py-3">{t.from_cashbox?.name_ar}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">{t.to_cashbox?.name_ar}</td>
                  <td className="px-4 py-3 text-left font-bold text-green-700">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.notes || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setDeleteId(t.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="border-t bg-blue-50 px-4 py-2 flex justify-between text-sm">
          <span className="text-gray-600">عدد المستندات: {filtered.length}</span>
          <span className="font-bold text-blue-700">
            إجمالي التحويلات: {formatCurrency(filtered.reduce((s, t) => s + (t.amount || 0), 0))}
          </span>
        </div>
      </div>

      {/* نافذة إنشاء مستند */}
      <Modal open={showModal} title="مستند تحويل خزينة جديد" onClose={() => setShowModal(false)}>
        <div className="space-y-4" dir="rtl">
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
            <ArrowLeftRight size={14} />
            التحويل يكون من الخزائن الفرعية إلى الخزينة الرئيسية دائماً
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">التاريخ <span className="text-red-500">*</span></label>
            <input type="date" value={form.transfer_date}
              onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">من خزينة <span className="text-red-500">*</span></label>
            <select value={form.from_cashbox_id}
              onChange={e => setForm(f => ({ ...f, from_cashbox_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2">
              <option value="">-- اختر الخزينة الفرعية --</option>
              {subCashboxes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar} (الرصيد: {formatCurrency(c.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">إلى خزينة</label>
            <div className="border rounded-lg px-3 py-2 bg-gray-50 text-gray-600">
              {mainCashbox?.name_ar || 'الخزينة الرئيسية'} (ثابتة)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">القيمة <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount} min="0.01" step="0.01"
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2" placeholder="0.00" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full border rounded-lg px-3 py-2 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 hover:bg-blue-700 font-medium flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              إنشاء مستند التحويل
            </button>
            <button onClick={() => setShowModal(false)}
              className="flex-1 border rounded-lg py-2.5 hover:bg-gray-50">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* حوار الحذف */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 size={24} />
              <h3 className="font-bold text-lg">حذف مستند التحويل</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              سيتم عكس التحويل وإعادة الأرصدة لما كانت عليه. يتطلب كلمة مرور الإدارة.
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">كلمة مرور الإدارة <span className="text-red-500">*</span></label>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={loadingDelete}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 font-medium">
                {loadingDelete ? 'جاري...' : 'تأكيد الحذف'}
              </button>
              <button onClick={() => { setDeleteId(null); setAdminPassword('') }}
                className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
