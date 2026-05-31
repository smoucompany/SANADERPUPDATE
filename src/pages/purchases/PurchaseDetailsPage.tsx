import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight, Edit2, Trash2, CheckCircle, Lock, Unlock,
  Printer, FileText, AlertCircle, Package, Loader2, Eye
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي (خزينة رئيسية)', mada: 'بطاقة / فيزا',
  transfer: 'تحويل بنكي', deferred: 'آجل', credit: 'ائتمان'
}

export default function PurchaseDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [loading, setLoading]                   = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [adminPassword, setAdminPassword]       = useState('')
  const [deleteReason, setDeleteReason]         = useState('')

  const { data: purchase, isLoading, refetch } = useQuery({
    queryKey: ['purchase-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          supplier:suppliers(id, name_ar, phone, balance),
          items:purchase_items(*),
          locked_user:users!locked_by(full_name),
          confirmed_user:users!confirmed_by(full_name)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id
  })

  const handleApprove = async () => {
    if (!purchase || !user) return
    if (!purchase.supplier_id) return toast.error('يجب أن يكون للفاتورة مورد')

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('approve_purchase', {
        p_purchase_id: purchase.id,
        p_user_id: user.id
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.message || 'فشل الاعتماد')

      toast.success('✅ تم اعتماد الفاتورة وترحيلها للمخزن والحسابات')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الاعتماد')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (adminPassword !== 'Admin@123') {
      toast.error('كلمة المرور غير صحيحة')
      return
    }
    setLoading(true)
    try {
      await supabase.from('purchases').update({
        is_locked: false, updated_at: new Date().toISOString()
      }).eq('id', id!)

      toast.success('تم فك قفل الفاتورة')
      setShowUnlockDialog(false)
      setAdminPassword('')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (purchase?.is_locked && adminPassword !== 'Admin@123') {
      toast.error('كلمة المرور غير صحيحة')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('reverse_purchase', {
        p_purchase_id: purchase!.id,
        p_user_id: user!.id,
        p_reason: deleteReason || null
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.message)

      toast.success('تم نقل الفاتورة للمحذوفات وعكس آثارها')
      navigate('/purchases')
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="text-center py-20 text-gray-400" dir="rtl">
        <FileText size={48} className="mx-auto mb-3 opacity-30" />
        <p>الفاتورة غير موجودة</p>
        <button onClick={() => navigate('/purchases')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          العودة للقائمة
        </button>
      </div>
    )
  }

  const isApproved = purchase.status !== 'draft'
  const isLocked   = purchase.is_locked

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={`فاتورة مشتريات: ${purchase.purchase_number}`}
        subtitle={`${purchase.supplier?.name_ar || 'بدون مورد'} — ${formatDate(purchase.purchase_date)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/purchases')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowRight size={14} /> رجوع
            </button>

            {!isLocked && (
              <button onClick={() => navigate(`/purchases/${id}/edit`)}
                className="flex items-center gap-2 px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                <Edit2 size={14} /> تعديل
              </button>
            )}

            {!isApproved && (
              <button onClick={handleApprove} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                اعتماد وترحيل
              </button>
            )}

            {isLocked && (
              <button onClick={() => setShowUnlockDialog(true)}
                className="flex items-center gap-2 px-3 py-2 border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 text-sm">
                <Unlock size={14} /> فك القفل
              </button>
            )}

            <button onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm">
              <Trash2 size={14} /> حذف
            </button>

            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Printer size={14} /> طباعة
            </button>
          </div>
        }
      />

      {/* شارة الحالة */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={purchase.status} />
        {isLocked && (
          <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            <Lock size={13} /> مقفلة ومعتمدة
          </span>
        )}
        {purchase.is_posted && (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle size={13} /> مرحّلة للمخزن والحسابات
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* تفاصيل الفاتورة */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              بيانات الفاتورة
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs mb-1">رقم الفاتورة</div>
                <div className="font-mono font-bold text-blue-700">{purchase.purchase_number}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">تاريخ الفاتورة</div>
                <div className="font-medium">{formatDate(purchase.purchase_date)}</div>
              </div>
              {purchase.due_date && (
                <div>
                  <div className="text-gray-500 text-xs mb-1">تاريخ الاستحقاق</div>
                  <div className="font-medium">{formatDate(purchase.due_date)}</div>
                </div>
              )}
              <div>
                <div className="text-gray-500 text-xs mb-1">طريقة الدفع</div>
                <div className="font-medium">{PAYMENT_LABELS[purchase.payment_method] || purchase.payment_method}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">الحالة</div>
                <StatusBadge status={purchase.status} />
              </div>
              {purchase.confirmed_user?.full_name && (
                <div>
                  <div className="text-gray-500 text-xs mb-1">اعتمد بواسطة</div>
                  <div className="font-medium">{purchase.confirmed_user.full_name}</div>
                </div>
              )}
            </div>
            {purchase.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <span className="font-medium">ملاحظات: </span>{purchase.notes}
              </div>
            )}
          </div>

          {/* جدول الأصناف */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <Package size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-800">الأصناف ({purchase.items?.length || 0})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">الصنف</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">الصلاحية</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">الدفعة</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">الكمية</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">السعر</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {purchase.items?.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 text-center">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.product_name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.expiry_date ? (
                          <span className={new Date(item.expiry_date) < new Date() ? 'text-red-600' : 'text-green-600'}>
                            {formatDate(item.expiry_date)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.batch_number || '—'}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-center">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-left font-medium text-blue-700">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t p-4 space-y-2 bg-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">الإجمالي قبل الضريبة:</span>
                <span>{formatCurrency(purchase.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">الضريبة:</span>
                <span className="text-orange-600">{formatCurrency(purchase.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>الإجمالي الكلي:</span>
                <span className="text-blue-700">{formatCurrency(purchase.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* الجانب الأيسر */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-4">بيانات المورد</h4>
            {purchase.supplier ? (
              <div className="space-y-3 text-sm">
                <div className="font-semibold text-lg">{purchase.supplier.name_ar}</div>
                {purchase.supplier.phone && <div className="text-gray-500">{purchase.supplier.phone}</div>}
                <div className={`font-bold text-lg ${purchase.supplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  الرصيد: {formatCurrency(purchase.supplier.balance || 0)}
                </div>
                <button onClick={() => navigate(`/suppliers/${purchase.supplier.id}/statement`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                  <Eye size={14} /> كشف حساب المورد
                </button>
              </div>
            ) : <p className="text-gray-400 text-sm">لا توجد بيانات مورد</p>}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h4 className="font-semibold text-gray-800 mb-4">ملخص الدفع</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">الإجمالي:</span>
                <span className="font-bold text-blue-700">{formatCurrency(purchase.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">المدفوع:</span>
                <span className="font-medium text-green-600">{formatCurrency(purchase.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">المتبقي:</span>
                <span className={`font-bold ${(purchase.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(purchase.remaining_amount || 0)}
                </span>
              </div>
            </div>
          </div>

          {!isApproved && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-start gap-2 text-blue-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold mb-1">عند الاعتماد:</div>
                  <ul className="space-y-1 text-xs text-blue-600 list-disc list-inside">
                    <li>ترحيل للمخزن الوارد (1)</li>
                    <li>قيد محاسبي تلقائي</li>
                    <li>تحديث رصيد المورد</li>
                    <li>قفل ضد التعديل</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* حوار فك القفل */}
      {showUnlockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Unlock size={24} />
              <h3 className="font-bold text-lg">فك قفل الفاتورة</h3>
            </div>
            <p className="text-gray-600 text-sm">يتطلب كلمة مرور الإدارة لفك القفل والسماح بالتعديل.</p>
            <input type="password" placeholder="كلمة مرور الإدارة"
              value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              onKeyDown={e => e.key === 'Enter' && handleUnlock()} />
            <div className="flex gap-3">
              <button onClick={handleUnlock} disabled={loading}
                className="flex-1 bg-amber-600 text-white rounded-lg py-2 hover:bg-amber-700 font-medium">
                {loading ? 'جاري...' : 'تأكيد'}
              </button>
              <button onClick={() => { setShowUnlockDialog(false); setAdminPassword('') }}
                className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* حوار الحذف */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 size={24} />
              <h3 className="font-bold text-lg">حذف الفاتورة</h3>
            </div>
            {isLocked && (
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                فاتورة مقفلة — سيتم عكس جميع آثارها من المخزون والخزينة وحساب المورد.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">سبب الحذف</label>
              <input value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="اختياري" />
            </div>
            {isLocked && (
              <div>
                <label className="block text-sm font-medium mb-1">كلمة مرور الإدارة <span className="text-red-500">*</span></label>
                <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={loading}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 font-medium flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                تأكيد الحذف
              </button>
              <button onClick={() => { setShowDeleteDialog(false); setAdminPassword(''); setDeleteReason('') }}
                className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
