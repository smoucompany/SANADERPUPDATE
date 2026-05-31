import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCcw, Search, AlertCircle, Trash2, Eye, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function DeletedPurchasesPage() {
  const navigate = useNavigate()
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [search, setSearch]             = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [restoreId, setRestoreId]       = useState<string | null>(null)
  const [permDeleteId, setPermDeleteId] = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)

  const { data: deleted = [], isLoading, refetch } = useQuery({
    queryKey: ['deleted-purchases', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(name_ar)')
        .eq('company_id', company.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  const filtered = useMemo(() =>
    (deleted as any[]).filter(p =>
      !search || p.purchase_number?.includes(search) || p.supplier?.name_ar?.includes(search)
    ), [deleted, search])

  const handleRestore = async (id: string) => {
    setLoading(true)
    try {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('*, items:purchase_items(*)')
        .eq('id', id)
        .single()

      // إعادة تفعيل الدفعات إن كانت موجودة
      if (purchase?.is_posted) {
        await supabase.from('inventory_batches')
          .update({ is_active: true })
          .eq('purchase_id', id)

        // إعادة تحديث inventory
        const { data: batches } = await supabase
          .from('inventory_batches')
          .select('*')
          .eq('purchase_id', id)

        for (const b of batches || []) {
          await supabase.from('inventory')
            .upsert({
              product_id: b.product_id,
              warehouse_id: b.warehouse_id,
              quantity: b.quantity_remaining,
              batch_number: b.batch_number,
              expiry_date: b.expiry_date
            }, { onConflict: 'product_id,warehouse_id,batch_number' })
        }

        // إعادة تأثير رصيد المورد
        if (purchase.payment_method === 'deferred' && purchase.supplier_id) {
          await supabase.from('suppliers')
            .update({ balance: supabase.rpc('update_supplier_balance', {
              p_supplier_id: purchase.supplier_id,
              p_amount: purchase.total,
              p_direction: 'increase'
            }) })
        }
      }

      await supabase.from('purchases')
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq('id', id)

      toast.success('تم استعادة الفاتورة بنجاح')
      setRestoreId(null)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الاستعادة')
    } finally {
      setLoading(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (adminPassword !== 'Admin@123') {
      toast.error('كلمة المرور غير صحيحة')
      return
    }
    if (!permDeleteId) return

    setLoading(true)
    try {
      await supabase.from('purchase_items').delete().eq('purchase_id', permDeleteId)
      await supabase.from('purchases').delete().eq('id', permDeleteId)
      toast.success('تم الحذف النهائي')
      setPermDeleteId(null)
      setAdminPassword('')
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = filtered.map(p => ({
      'رقم الفاتورة': p.purchase_number,
      'المورد': p.supplier?.name_ar || '',
      'التاريخ': formatDate(p.purchase_date),
      'تاريخ الحذف': formatDate(p.deleted_at),
      'الإجمالي': p.total,
      'الحالة': p.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المحذوفات')
    XLSX.writeFile(wb, `deleted_purchases_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="فواتير المشتريات المحذوفة"
        subtitle="سلة المحذوفات — يمكن استعادة الفواتير أو حذفها نهائياً"
        actions={
          <div className="flex gap-2">
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              تصدير Excel
            </button>
            <button onClick={() => navigate('/purchases')}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowRight size={15} /> رجوع للمشتريات
            </button>
          </div>
        }
      />

      {/* بحث */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="بحث برقم الفاتورة أو المورد..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 pr-9 text-sm" />
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
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Trash2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد فواتير محذوفة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الفاتورة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المورد</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">تاريخ الفاتورة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">تاريخ الحذف</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">الإجمالي</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">كانت مرحّلة؟</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-700">{p.purchase_number}</td>
                    <td className="px-4 py-3">{p.supplier?.name_ar || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{formatDate(p.deleted_at)}</td>
                    <td className="px-4 py-3 text-left font-medium">{formatCurrency(p.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_posted ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_posted ? 'نعم - تم عكسها' : 'لا'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setRestoreId(p.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                          <RotateCcw size={12} /> استعادة
                        </button>
                        <button onClick={() => setPermDeleteId(p.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                          <Trash2 size={12} /> حذف نهائي
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t bg-gray-50 px-4 py-2 text-sm text-gray-500">
          إجمالي المحذوفات: {filtered.length} فاتورة
        </div>
      </div>

      {/* حوار الاستعادة */}
      {restoreId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-green-600">
              <RotateCcw size={24} />
              <h3 className="font-bold text-lg">استعادة الفاتورة</h3>
            </div>
            <p className="text-gray-600 text-sm">
              سيتم استعادة الفاتورة وإعادة تفعيل آثارها في المخزون وحسابات المورد.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleRestore(restoreId)} disabled={loading}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 hover:bg-green-700 font-medium">
                {loading ? 'جاري الاستعادة...' : 'تأكيد الاستعادة'}
              </button>
              <button onClick={() => setRestoreId(null)}
                className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* حوار الحذف النهائي */}
      {permDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 size={24} />
              <h3 className="font-bold text-lg">حذف نهائي</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الفاتورة نهائياً من قاعدة البيانات.
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">كلمة مرور الإدارة <span className="text-red-500">*</span></label>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="flex gap-3">
              <button onClick={handlePermanentDelete} disabled={loading}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 font-medium">
                {loading ? 'جاري الحذف...' : 'حذف نهائي'}
              </button>
              <button onClick={() => { setPermDeleteId(null); setAdminPassword('') }}
                className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
