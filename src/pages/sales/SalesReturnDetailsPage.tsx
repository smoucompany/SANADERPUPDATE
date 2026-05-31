import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Printer, CheckCircle2, Clock, XCircle, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'قيد المراجعة', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',      icon: Clock },
  approved:  { label: 'مقبول',        color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  rejected:  { label: 'مرفوض',        color: 'text-red-600 bg-red-100 dark:bg-red-900/30',             icon: XCircle },
  processed: { label: 'تمت المعالجة', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',          icon: CheckCircle2 },
}

const REFUND_METHODS: Record<string, string> = {
  cash: 'نقدي', bank: 'تحويل بنكي', credit_note: 'قيد دائن', wallet: 'رصيد العميل'
}

const REASONS: Record<string, string> = {
  defective: 'منتج معيب أو تالف', wrong: 'منتج خاطئ', quality: 'جودة غير مقبولة',
  customer_change: 'تغيير رأي العميل', excess: 'كمية زائدة', other: 'سبب آخر'
}

export default function SalesReturnDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: returnData, isLoading } = useQuery({
    queryKey: ['sale_return', id],
    queryFn: async () => {
      if (!user?.company_id || !id) return null
      const { data, error } = await supabase
        .from('sale_returns')
        .select('*, customer:customers(name_ar, phone), items:sale_return_items(*, product:products(name_ar))')
        .eq('id', id)
        .eq('company_id', user.company_id)
        .single()
      if (error) return null
      return data
    },
    enabled: !!id && !!user?.company_id,
  })

  const approve = useMutation({
    mutationFn: async (action: 'approved' | 'rejected') => {
      const { error } = await supabase
        .from('sale_returns')
        .update({
          status: action,
          approved_by: user?.full_name || 'المستخدم',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: (_, action) => {
      qc.invalidateQueries({ queryKey: ['sale_return', id] })
      qc.invalidateQueries({ queryKey: ['sale_returns'] })
      toast.success(action === 'approved' ? 'تمت الموافقة على المرتجع' : 'تم رفض المرتجع')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!returnData) return (
    <div className="text-center py-20 text-muted-foreground">
      <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="mb-4">لم يتم العثور على مرتجع البيع</p>
      <button onClick={() => navigate('/sales/returns')} className="btn-outline gap-1.5">
        <ArrowRight className="w-4 h-4" />العودة للمرتجعات
      </button>
    </div>
  )

  const status = STATUS_MAP[returnData.status || 'pending']
  const StatusIcon = status?.icon || Clock
  const items = returnData.items || []
  const customerName = returnData.customer?.name_ar || returnData.customer_name || '—'

  return (
    <div className="space-y-5">
      <PageHeader
        title={`مرتجع بيع ${returnData.return_number || returnData.id?.slice(0,8)}`}
        subtitle={`الفاتورة الأصلية: ${returnData.invoice_number || '—'}`}
        actions={
          <>
            <button onClick={() => navigate('/sales/returns')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button type="button" onClick={() => window.print()} className="btn-outline gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
            {returnData.status === 'pending' && (
              <>
                <button onClick={() => approve.mutate('rejected')} disabled={approve.isPending}
                  className="btn-outline gap-1.5 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <XCircle className="w-4 h-4" />رفض
                </button>
                <button onClick={() => approve.mutate('approved')} disabled={approve.isPending}
                  className="btn-primary gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />موافقة
                </button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          {/* Header */}
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-3xl font-black">{returnData.return_number || returnData.id?.slice(0,8)}</p>
                <p className="text-muted-foreground mt-1">تاريخ المرتجع: {formatDate(returnData.return_date || returnData.created_at)}</p>
              </div>
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${status?.color}`}>
                <StatusIcon className="w-4 h-4" />{status?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'العميل', value: customerName },
                { label: 'الفاتورة الأصلية', value: returnData.invoice_number || '—' },
                { label: 'سبب الإرجاع', value: REASONS[returnData.reason] || returnData.reason || '—' },
                { label: 'طريقة الاسترداد', value: REFUND_METHODS[returnData.refund_method] || returnData.refund_method || '—' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-semibold text-sm mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
            {returnData.notes && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                <span className="font-semibold">ملاحظة: </span>{returnData.notes}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50">
              <h3 className="font-semibold">المنتجات المُرجَعة</h3>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">لا توجد تفاصيل</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المنتج</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الكمية</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">السعر</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => (
                    <tr key={item.id || i} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3 font-medium">{item.product?.name_ar || item.product_name || item.name}</td>
                      <td className="px-5 py-3 text-center">{item.quantity || item.qty}</td>
                      <td className="px-5 py-3 text-center">{formatCurrency(item.unit_price || item.price || 0)}</td>
                      <td className="px-5 py-3 text-center font-bold">{formatCurrency(item.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
              <div className="max-w-xs mr-auto space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{formatCurrency(returnData.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة</span>
                  <span className="font-medium">{formatCurrency(returnData.tax_amount || returnData.vat || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                  <span>إجمالي الاسترداد</span>
                  <span className="text-primary">{formatCurrency(returnData.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">ملخص الاسترداد</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">العميل</span>
                <span className="font-medium">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">طريقة الاسترداد</span>
                <span className="font-medium">{REFUND_METHODS[returnData.refund_method] || '—'}</span>
              </div>
              {returnData.approved_by && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">معتمد من</span>
                  <span className="font-medium">{returnData.approved_by}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="font-bold">إجمالي الاسترداد</span>
                <span className="font-black text-primary text-base">{formatCurrency(returnData.total || 0)}</span>
              </div>
            </div>
          </div>

          {returnData.status === 'pending' && (
            <div className="flex flex-col gap-2">
              <button onClick={() => approve.mutate('approved')} disabled={approve.isPending}
                className="btn-primary gap-2 w-full bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" />قبول المرتجع
              </button>
              <button onClick={() => approve.mutate('rejected')} disabled={approve.isPending}
                className="btn-outline gap-2 w-full text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                <XCircle className="w-4 h-4" />رفض المرتجع
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
