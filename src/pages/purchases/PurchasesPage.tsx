import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit2, Trash2, FileText, Download,
  Lock, RefreshCw, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', confirmed: 'معتمدة', paid: 'مسددة',
  partial: 'جزئي', cancelled: 'ملغاة', returned: 'مردودة'
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي', mada: 'بطاقة', transfer: 'تحويل',
  credit: 'ائتمان', deferred: 'آجل', mixed: 'مختلط'
}
const PAGE_SIZES = [25, 50, 100, 200]

export default function PurchasesPage() {
  const navigate     = useNavigate()
  const { company, user } = useAuthStore()
  const qc           = useQueryClient()

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [pageSize, setPageSize]       = useState(25)
  const [page, setPage]               = useState(1)

  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [unlockId, setUnlockId]       = useState<string | null>(null)
  const [adminPwd, setAdminPwd]       = useState('')
  const [saving, setSaving]           = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchases-list', company?.id, search, statusFilter, dateFrom, dateTo, page, pageSize],
    queryFn: async () => {
      if (!company?.id) return { rows: [], total: 0 }

      let q = supabase
        .from('purchases')
        .select('id, purchase_number, purchase_date, supplier_id, payment_method, status, subtotal, discount_amount, tax_amount, total, paid_amount, remaining_amount, is_locked, is_posted, supplier:suppliers(name_ar)', { count: 'exact' })
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('purchase_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (search)       q = q.ilike('purchase_number', `%${search}%`)
      if (statusFilter) q = q.eq('status', statusFilter)
      if (dateFrom)     q = q.gte('purchase_date', dateFrom)
      if (dateTo)       q = q.lte('purchase_date', dateTo)

      const { data: rows, error, count } = await q
      if (error) throw error
      return { rows: rows || [], total: count || 0 }
    },
    enabled: !!company?.id,
    staleTime: 30_000,
  } as any)

  const rows  = (data as any)?.rows  || []
  const total = (data as any)?.total || 0
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const totals = useMemo(() => ({
    value: rows.reduce((s: number, p: any) => s + Math.max(0, (p.subtotal || 0) - (p.discount_amount || 0)), 0),
    vat:   rows.reduce((s: number, p: any) => s + (p.tax_amount || 0), 0),
    total: rows.reduce((s: number, p: any) => s + (p.total || 0), 0),
  }), [rows])

  const applySearch = useCallback((v: string) => { setSearch(v); setPage(1) }, [])

  const handleDeleteRequest = (p: any) => {
    if (p.is_locked) { setUnlockId(p.id) } else { setDeleteId(p.id) }
  }

  const performDelete = async (id: string) => {
    setSaving(true)
    try {
      const { data: result, error } = await supabase.rpc('reverse_purchase', {
        p_purchase_id: id, p_user_id: user!.id, p_reason: 'حذف من قائمة الفواتير'
      })
      if (error) throw error
      if (!(result as any)?.success) throw new Error((result as any)?.message)
      toast.success('تم نقل الفاتورة للمحذوفات')
      qc.invalidateQueries({ queryKey: ['purchases-list'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleLockedDelete = async () => {
    if (adminPwd !== 'Admin@123') return toast.error('كلمة المرور غير صحيحة')
    if (!unlockId) return
    setSaving(true)
    try {
      await supabase.from('purchases').update({ is_locked: false }).eq('id', unlockId)
      await performDelete(unlockId)
      setUnlockId(null); setAdminPwd('')
    } finally { setSaving(false) }
  }

  const exportExcel = async () => {
    if (!company?.id) return
    toast.loading('جاري التصدير...', { id: 'exp' })
    try {
      let q = supabase.from('purchases')
        .select('purchase_number, purchase_date, supplier:suppliers(name_ar), status, payment_method, subtotal, discount_amount, tax_amount, total, paid_amount, remaining_amount')
        .eq('company_id', company.id).is('deleted_at', null)
        .order('purchase_date', { ascending: false })
      if (search)       q = q.ilike('purchase_number', `%${search}%`)
      if (statusFilter) q = q.eq('status', statusFilter)
      if (dateFrom)     q = q.gte('purchase_date', dateFrom)
      if (dateTo)       q = q.lte('purchase_date', dateTo)
      const { data: all } = await q
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet((all || []).map((p: any) => ({
        'رقم الفاتورة': p.purchase_number, 'التاريخ': formatDate(p.purchase_date),
        'المورد': p.supplier?.name_ar || '', 'الحالة': STATUS_LABELS[p.status] || p.status,
        'الدفع': PAYMENT_LABELS[p.payment_method] || '', 'الإجمالي': p.total,
        'المدفوع': p.paid_amount, 'المتبقي': p.remaining_amount,
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'مشتريات')
      XLSX.writeFile(wb, `purchases_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success(`تم تصدير ${(all || []).length} سجل`, { id: 'exp' })
    } catch (err: any) { toast.error(err.message, { id: 'exp' }) }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="فواتير المشتريات"
        subtitle={`${total.toLocaleString('ar')} فاتورة`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/purchases/deleted')}
              className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm">
              <Trash2 size={14} /> المحذوفات
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => navigate('/purchases/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={15} /> فاتورة جديدة
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="بحث برقم الفاتورة..." value={search}
              onChange={e => applySearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 pr-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">عدد الصفوف:</span>
            {PAGE_SIZES.map(n => (
              <button key={n} onClick={() => { setPageSize(n); setPage(1) }}
                className={`px-3 py-1 rounded border text-xs ${pageSize === n ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
            <RefreshCw size={13} /> تحديث
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400">جاري التحميل...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الفاتورة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المورد</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الدفع</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">الإجمالي</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">المتبقي</th>
                  <th className="text-center px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-blue-700 font-medium text-sm">
                        {p.is_locked && <Lock size={11} className="text-amber-500" />}
                        {p.purchase_number}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-3 font-medium text-sm">{p.supplier?.name_ar || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{PAYMENT_LABELS[p.payment_method] || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-left font-medium text-sm">{formatCurrency(p.total)}</td>
                    <td className={`px-4 py-3 text-left font-medium text-sm ${(p.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(p.remaining_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/purchases/${p.id}`)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="عرض">
                          <Eye size={14} />
                        </button>
                        {!p.is_locked && (
                          <button onClick={() => navigate(`/purchases/${p.id}/edit`)}
                            className="p-1.5 hover:bg-green-50 rounded text-green-600" title="تعديل">
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDeleteRequest(p)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500" title="حذف">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="py-16 text-center text-gray-400">
                    <FileText size={36} className="mx-auto mb-2 opacity-30" />
                    لا توجد فواتير
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t bg-blue-50 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-xs text-gray-500">القيمة</div>
              <div className="font-bold text-blue-700">{formatCurrency(totals.value)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">الضريبة</div>
              <div className="font-bold text-orange-600">{formatCurrency(totals.vat)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">الإجمالي</div>
              <div className="font-bold text-green-700 text-lg">{formatCurrency(totals.total)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">
              {((page-1)*pageSize+1).toLocaleString('ar')}–{Math.min(page*pageSize,total).toLocaleString('ar')} / {total.toLocaleString('ar')}
            </span>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="p-1 border rounded disabled:opacity-40 hover:bg-white bg-white"><ChevronRight size={15} /></button>
            <span>{page}/{pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page>=pages}
              className="p-1 border rounded disabled:opacity-40 hover:bg-white bg-white"><ChevronLeft size={15} /></button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="تأكيد الحذف"
        message="سيتم نقل الفاتورة للمحذوفات وعكس آثارها."
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={async () => { await performDelete(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />

      {unlockId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle size={22} /><h3 className="font-bold text-lg">فاتورة مقفلة</h3>
            </div>
            <p className="text-sm text-gray-600">يتطلب كلمة مرور الإدارة.</p>
            <input type="password" placeholder="كلمة مرور الإدارة" value={adminPwd}
              onChange={e => setAdminPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLockedDelete()}
              className="w-full border rounded-lg px-3 py-2" />
            <div className="flex gap-3">
              <button onClick={handleLockedDelete} disabled={saving}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 font-medium disabled:opacity-50">
                {saving ? 'جاري...' : 'تأكيد'}
              </button>
              <button onClick={() => { setUnlockId(null); setAdminPwd('') }}
                className="flex-1 border rounded-lg py-2">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
