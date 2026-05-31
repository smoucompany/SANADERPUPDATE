import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit2, Trash2, FileText, Download,
  Lock, Filter, RefreshCw, AlertCircle
} from 'lucide-react'
import { usePurchases, useDeletePurchase } from '@/hooks/usePurchases'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', confirmed: 'معتمدة', paid: 'مسددة',
  partial: 'جزئي', cancelled: 'ملغاة', returned: 'مردودة'
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي', mada: 'بطاقة', transfer: 'تحويل',
  credit: 'ائتمان', deferred: 'آجل', mixed: 'مختلط'
}

const DISPLAY_OPTIONS = [50, 200, 400, 800]

export default function PurchasesPage() {
  const navigate  = useNavigate()
  const { company, user } = useAuthStore()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [displayLimit, setDisplayLimit] = useState(50)
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [showLockedDialog, setShowLockedDialog] = useState(false)
  const [pendingDeleteId, setPendingDeleteId]   = useState<string | null>(null)

  const { data: purchasesResult, isLoading, refetch } = usePurchases()
  const purchases = (purchasesResult as any)?.data || purchasesResult || []
  const { data: suppliers = [] } = useSuppliers()

  const filtered = useMemo(() => {
    return (purchases as any[])
      .filter((p: any) => p.deleted_at == null)
      .filter((p: any) => !search || p.purchase_number.includes(search) ||
        p.supplier?.name_ar?.includes(search))
      .filter((p: any) => !statusFilter || p.status === statusFilter)
      .filter((p: any) => !supplierFilter || p.supplier_id === supplierFilter)
      .filter((p: any) => !dateFrom || p.purchase_date >= dateFrom)
      .filter((p: any) => !dateTo || p.purchase_date <= dateTo)
      .slice(0, displayLimit)
  }, [purchases, search, statusFilter, supplierFilter, dateFrom, dateTo, displayLimit])

  const totals = useMemo(() => ({
    count: filtered.length,
    value: filtered.reduce((s: number, p: any) => s + ((p.subtotal || 0) - (p.discount_amount || 0)), 0),
    vat:   filtered.reduce((s: number, p: any) => s + (p.tax_amount || 0), 0),
    total: filtered.reduce((s: number, p: any) => s + (p.total || 0), 0),
  }), [filtered])

  const handleDeleteRequest = (purchase: any) => {
    if ((purchase as any).is_locked) {
      setPendingDeleteId(purchase.id)
      setShowLockedDialog(true)
    } else {
      setDeleteId(purchase.id)
    }
  }

  const performSoftDelete = async (id: string) => {
    try {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('*, items:purchase_items(*)')
        .eq('id', id)
        .single()

      if (purchase?.status === 'confirmed' || (purchase as any)?.is_posted) {
        // عكس آثار المخزون
        await supabase.from('inventory_batches')
          .update({ is_active: false })
          .eq('purchase_id', id)

        // عكس آثار الخزينة/البنك إن كانت مدفوعة
        if (purchase.payment_method === 'cash' && purchase.paid_amount > 0) {
          const { data: mainBox } = await supabase
            .from('cashboxes')
            .select('id, balance')
            .eq('company_id', company!.id)
            .eq('is_main', true)
            .single()
          if (mainBox) {
            await supabase.from('cashboxes')
              .update({ balance: mainBox.balance + purchase.paid_amount })
              .eq('id', mainBox.id)
          }
        }

        // عكس رصيد المورد إن كان آجل
        if (purchase.payment_method === 'deferred' && purchase.supplier_id) {
          const { data: sup } = await supabase
            .from('suppliers')
            .select('balance')
            .eq('id', purchase.supplier_id)
            .single()
          if (sup) {
            await supabase.from('suppliers')
              .update({ balance: (sup.balance || 0) - purchase.total })
              .eq('id', purchase.supplier_id)
          }
        }
      }

      await supabase.from('purchases')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      toast.success('تم نقل الفاتورة إلى سلة المحذوفات')
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    }
  }

  const confirmNormalDelete = async () => {
    if (!deleteId) return
    await performSoftDelete(deleteId)
    setDeleteId(null)
  }

  const confirmLockedDelete = async () => {
    if (!pendingDeleteId) return
    if (deletePassword !== 'Admin@123') {
      toast.error('كلمة المرور غير صحيحة')
      return
    }
    await supabase.from('purchases').update({ is_locked: false }).eq('id', pendingDeleteId)
    await performSoftDelete(pendingDeleteId)
    setShowLockedDialog(false)
    setPendingDeleteId(null)
    setDeletePassword('')
  }

  const exportExcel = () => {
    const rows = filtered.map(p => ({
      'رقم الفاتورة':         p.purchase_number,
      'التاريخ':              formatDate(p.purchase_date),
      'المورد':               p.supplier?.name_ar || '',
      'الحالة':               STATUS_LABELS[p.status] || p.status,
      'طريقة الدفع':         PAYMENT_LABELS[p.payment_method] || '',
      'الإجمالي قبل الضريبة': p.subtotal - p.discount_amount,
      'الضريبة':              p.tax_amount,
      'الإجمالي الكلي':       p.total,
      'المدفوع':              p.paid_amount,
      'المتبقي':              p.remaining_amount,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'فواتير المشتريات')
    XLSX.writeFile(wb, `purchases_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="فواتير المشتريات"
        subtitle={`${filtered.length} فاتورة`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/purchases/deleted')}
              className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm">
              <Trash2 size={15} /> المحذوفات
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={15} /> Excel
            </button>
            <button onClick={() => navigate('/purchases/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} /> فاتورة جديدة
            </button>
          </div>
        }
      />

      {/* فلاتر */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="بحث برقم الفاتورة أو المورد..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 pr-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع الموردين</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-2 text-sm" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">عرض:</span>
            {DISPLAY_OPTIONS.map(n => (
              <button key={n} onClick={() => setDisplayLimit(n)}
                className={`px-3 py-1 rounded border text-xs ${
                  displayLimit === n ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'
                }`}>{n}</button>
            ))}
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
            <RefreshCw size={14} /> تحديث
          </button>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الفاتورة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المورد</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">طريقة الدفع</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">الإجمالي</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">المتبقي</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-700 font-medium">
                      <div className="flex items-center gap-1">
                        {(p as any).is_locked && <Lock size={12} className="text-amber-500" aria-label="مقفلة" />}
                        {p.purchase_number}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-3 font-medium">{p.supplier?.name_ar || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{PAYMENT_LABELS[p.payment_method] || p.payment_method}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-left font-medium">{formatCurrency(p.total)}</td>
                    <td className={`px-4 py-3 text-left font-medium ${p.remaining_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(p.remaining_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/purchases/${p.id}`)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="عرض">
                          <Eye size={15} />
                        </button>
                        {!(p as any).is_locked && (
                          <button onClick={() => navigate(`/purchases/${p.id}/edit`)}
                            className="p-1.5 hover:bg-green-50 rounded text-green-600" title="تعديل">
                            <Edit2 size={15} />
                          </button>
                        )}
                        <button onClick={() => handleDeleteRequest(p)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500" title="حذف">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">لا توجد فواتير</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* إجماليات أسفل الجدول */}
        <div className="border-t bg-blue-50 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-500 text-xs">عدد الفواتير</div>
            <div className="font-bold text-blue-700 text-xl">{totals.count}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">إجمالي القيمة</div>
            <div className="font-bold text-blue-700">{formatCurrency(totals.value)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">إجمالي الضريبة</div>
            <div className="font-bold text-orange-600">{formatCurrency(totals.vat)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">الإجمالي الكلي</div>
            <div className="font-bold text-green-700 text-xl">{formatCurrency(totals.total)}</div>
          </div>
        </div>
      </div>

      {/* حوار الحذف العادي */}
      <ConfirmDialog
        open={!!deleteId}
        title="تأكيد الحذف"
        message="سيتم نقل الفاتورة إلى سلة المحذوفات وعكس آثارها من المخزون والحسابات."
        confirmLabel="نقل للمحذوفات"
        variant="destructive"
        onConfirm={confirmNormalDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* حوار حذف فاتورة مقفلة */}
      {showLockedDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" dir="rtl">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle size={24} />
              <h3 className="font-bold text-lg">فاتورة مقفلة ومعتمدة</h3>
            </div>
            <p className="text-gray-600 text-sm">
              هذه الفاتورة مقفلة بعد الاعتماد. لحذفها يلزم كلمة مرور الإدارة.
              سيتم عكس جميع آثارها من المخزون والخزينة والحسابات.
            </p>
            <input type="password" placeholder="كلمة مرور الإدارة"
              value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              onKeyDown={e => e.key === 'Enter' && confirmLockedDelete()} />
            <div className="flex gap-3">
              <button onClick={confirmLockedDelete}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 font-medium">
                تأكيد الحذف
              </button>
              <button onClick={() => {
                setShowLockedDialog(false); setPendingDeleteId(null); setDeletePassword('')
              }} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
