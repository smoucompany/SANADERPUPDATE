import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Printer, Edit2, Send, FileCheck, Clock, XCircle, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:    { label: 'مسودة',    color: 'text-gray-600 bg-gray-100 dark:bg-gray-800',            icon: FileText },
  sent:     { label: 'مُرسَل',   color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',          icon: Send },
  accepted: { label: 'مقبول',   color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  rejected: { label: 'مرفوض',   color: 'text-red-600 bg-red-100 dark:bg-red-900/30',             icon: XCircle },
  expired:  { label: 'منتهي',   color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',    icon: AlertCircle },
}

export default function QuotationDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      if (!user?.company_id || !id) return null
      const { data, error } = await supabase
        .from('quotations')
        .select('*, customer:customers(name_ar, phone, email), items:quotation_items(*, product:products(name_ar, barcode))')
        .eq('id', id)
        .eq('company_id', user.company_id)
        .single()
      if (error) return null
      return data
    },
    enabled: !!id && !!user?.company_id,
  })

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: (_, newStatus) => {
      qc.invalidateQueries({ queryKey: ['quotation', id] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      toast.success(newStatus === 'sent' ? 'تم إرسال عرض السعر للعميل' : 'تم تحديث حالة العرض')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!quotation) return (
    <div className="text-center py-20 text-muted-foreground">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>لم يتم العثور على عرض السعر</p>
      <button onClick={() => navigate('/quotations')} className="btn-outline mt-4 gap-1.5">
        <ArrowRight className="w-4 h-4" />العودة لعروض الأسعار
      </button>
    </div>
  )

  const status = STATUS_MAP[quotation.status || 'draft']
  const StatusIcon = status?.icon || Clock
  const isExpired = quotation.valid_until && new Date(quotation.valid_until) < new Date()
  const items = quotation.items || []

  return (
    <div className="space-y-5">
      <PageHeader
        title={`عرض السعر ${quotation.quote_number}`}
        subtitle={`تاريخ الإصدار: ${formatDate(quotation.quote_date)}`}
        actions={
          <>
            <button onClick={() => navigate('/quotations')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            {quotation.status === 'draft' && (
              <button onClick={() => updateStatus.mutate('sent')} disabled={updateStatus.isPending} className="btn-outline gap-1.5">
                <Send className="w-4 h-4" />إرسال للعميل
              </button>
            )}
            {quotation.status === 'accepted' && (
              <button onClick={() => navigate('/sales/new')} className="btn-outline gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <FileCheck className="w-4 h-4" />تحويل لفاتورة
              </button>
            )}
            <button type="button" onClick={() => window.print()} className="btn-outline gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
            <button onClick={() => navigate(`/quotations/${id}/edit`)} className="btn-primary gap-1.5">
              <Edit2 className="w-4 h-4" />تعديل
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          {/* Header card */}
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-3xl font-black text-foreground">{quotation.quote_number}</p>
                <p className="text-muted-foreground mt-1">تاريخ الإصدار: {formatDate(quotation.quote_date)}</p>
              </div>
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${status?.color}`}>
                <StatusIcon className="w-4 h-4" />{status?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'العميل', value: quotation.customer?.name_ar || quotation.customer_name || '—' },
                { label: 'تاريخ الصلاحية', value: quotation.valid_until ? formatDate(quotation.valid_until) : '—' },
                { label: 'الهاتف', value: quotation.customer?.phone || '—' },
                { label: 'البريد', value: quotation.customer?.email || '—' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-semibold mt-0.5 text-sm">{f.value}</p>
                </div>
              ))}
            </div>
            {isExpired && quotation.status !== 'accepted' && quotation.status !== 'rejected' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-xl px-4 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                انتهت صلاحية هذا العرض في {formatDate(quotation.valid_until)}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50">
              <h3 className="font-semibold">بنود عرض السعر</h3>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">لا توجد بنود</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المنتج / الخدمة</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الكمية</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">سعر الوحدة</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الخصم</th>
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
                      <td className="px-5 py-3 text-center">{item.discount_pct || item.discount ? `${item.discount_pct || item.discount}%` : '—'}</td>
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
                  <span className="font-medium">{formatCurrency(quotation.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة 15%</span>
                  <span className="font-medium">{formatCurrency(quotation.tax_amount || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                  <span>الإجمالي</span>
                  <span className="text-primary">{formatCurrency(quotation.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-2">ملاحظات</h3>
              <p className="text-sm text-muted-foreground">{quotation.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">ملخص العرض</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">رقم العرض</span>
                <span className="font-mono font-bold">{quotation.quote_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">تاريخ الإنشاء</span>
                <span>{formatDate(quotation.quote_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">صالح حتى</span>
                <span>{quotation.valid_until ? formatDate(quotation.valid_until) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border/50">
                <span>إجمالي العرض</span>
                <span className="text-primary">{formatCurrency(quotation.total || 0)}</span>
              </div>
            </div>
          </div>

          {quotation.status === 'sent' && (
            <div className="space-y-2">
              <button onClick={() => updateStatus.mutate('accepted')} disabled={updateStatus.isPending}
                className="btn-primary gap-2 w-full bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" />تسجيل قبول العميل
              </button>
              <button onClick={() => updateStatus.mutate('rejected')} disabled={updateStatus.isPending}
                className="btn-outline gap-2 w-full text-red-600 border-red-300">
                <XCircle className="w-4 h-4" />تسجيل رفض العميل
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
