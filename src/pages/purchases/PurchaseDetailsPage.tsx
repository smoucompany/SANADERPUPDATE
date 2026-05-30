import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Printer, Edit2, Download, CheckCircle2, Clock, XCircle, AlertCircle, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'مسودة',     color: 'text-gray-600 bg-gray-100 dark:bg-gray-800',            icon: Clock },
  confirmed: { label: 'مؤكدة',     color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',          icon: CheckCircle2 },
  received:  { label: 'مستلمة',    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  partial:   { label: 'جزئي',      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',       icon: AlertCircle },
  cancelled: { label: 'ملغاة',     color: 'text-red-600 bg-red-100 dark:bg-red-900/30',             icon: XCircle },
}

export default function PurchaseDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(*), items:purchase_items(*, product:products(name_ar, barcode, unit))')
        .eq('id', id!)
        .eq('company_id', user!.company_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id && !!user
  })

  const status = STATUS_MAP[purchase?.status || 'draft']
  const StatusIcon = status?.icon || Clock

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!purchase) return (
    <div className="text-center py-20 text-muted-foreground">
      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>لم يتم العثور على فاتورة الشراء</p>
      <button onClick={() => navigate('/purchases')} className="btn-outline mt-4 gap-1.5">
        <ArrowRight className="w-4 h-4" />العودة للمشتريات
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title={`فاتورة شراء ${purchase.purchase_number || purchase.id?.slice(0, 8)}`}
        subtitle={formatDate(purchase.purchase_date || purchase.created_at)}
        actions={
          <>
            <button onClick={() => navigate('/purchases')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => window.print()} className="btn-outline gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
            <button onClick={() => navigate(`/purchases/${id}/edit`)} className="btn-primary gap-1.5">
              <Edit2 className="w-4 h-4" />تعديل
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Main content */}
        <div className="space-y-5">
          {/* Header info */}
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-3xl font-black text-foreground">
                  {purchase.purchase_number || `#${purchase.id?.slice(0, 8).toUpperCase()}`}
                </p>
                <p className="text-muted-foreground mt-1">{formatDate(purchase.purchase_date || purchase.created_at)}</p>
              </div>
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${status?.color}`}>
                <StatusIcon className="w-4 h-4" />
                {status?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'المورد', value: purchase.supplier?.name_ar || '—' },
                { label: 'طريقة الدفع', value: purchase.payment_method === 'cash' ? 'نقدي' : purchase.payment_method === 'credit' ? 'آجل' : (purchase.payment_method || '—') },
                { label: 'تاريخ الاستحقاق', value: purchase.due_date ? formatDate(purchase.due_date) : '—' },
                { label: 'رقم المرجع', value: purchase.reference || '—' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-semibold mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Items table */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50">
              <h3 className="font-semibold">بنود فاتورة الشراء</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المنتج</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الكمية</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">سعر الوحدة</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الخصم</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(purchase.items || []).map((item: any, i: number) => (
                  <tr key={item.id || i} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium">{item.product?.name_ar || item.product_name || '—'}</p>
                      {item.product?.barcode && <p className="text-xs text-muted-foreground font-mono">{item.product.barcode}</p>}
                    </td>
                    <td className="px-5 py-3 text-center">{item.quantity} {item.product?.unit || item.unit || ''}</td>
                    <td className="px-5 py-3 text-center">{formatCurrency(item.unit_price || item.cost || 0)}</td>
                    <td className="px-5 py-3 text-center">{item.discount ? `${item.discount}%` : '—'}</td>
                    <td className="px-5 py-3 text-center font-bold">{formatCurrency(item.total || (item.quantity * (item.unit_price || item.cost || 0)))}</td>
                  </tr>
                ))}
                {(!purchase.items || purchase.items.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground text-sm">لا توجد بنود</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
              <div className="max-w-xs mr-auto space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{formatCurrency(purchase.subtotal || 0)}</span>
                </div>
                {(purchase.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>الخصم</span>
                    <span>- {formatCurrency(purchase.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الضريبة {purchase.vat_rate || 15}%</span>
                  <span className="font-medium">{formatCurrency(purchase.tax_amount || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                  <span>الإجمالي</span>
                  <span className="text-primary">{formatCurrency(purchase.total || 0)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>المدفوع</span>
                  <span className="font-bold">{formatCurrency(purchase.paid_amount || 0)}</span>
                </div>
                {(purchase.remaining_amount || 0) > 0 && (
                  <div className="flex justify-between text-orange-500 font-bold">
                    <span>المتبقي</span>
                    <span>{formatCurrency(purchase.remaining_amount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {purchase.notes && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground">ملاحظات</h3>
              <p className="text-sm">{purchase.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {purchase.supplier && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">بيانات المورد</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-bold text-sm">
                    {purchase.supplier.name_ar?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{purchase.supplier.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{purchase.supplier.phone || '—'}</p>
                  </div>
                </div>
                {purchase.supplier.email && <p className="text-muted-foreground text-xs">{purchase.supplier.email}</p>}
                {purchase.supplier.address && <p className="text-muted-foreground text-xs">{purchase.supplier.address}</p>}
                {purchase.supplier.tax_number && (
                  <p className="text-xs text-muted-foreground">رقم ضريبي: <span className="font-mono">{purchase.supplier.tax_number}</span></p>
                )}
              </div>
            </div>
          )}

          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">ملخص المبالغ</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-sm text-muted-foreground">إجمالي الفاتورة</span>
                <span className="font-bold">{formatCurrency(purchase.total || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-sm text-muted-foreground">المدفوع</span>
                <span className="font-bold text-emerald-600">{formatCurrency(purchase.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold">الرصيد المتبقي</span>
                <span className={`font-bold text-lg ${(purchase.remaining_amount || 0) > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                  {formatCurrency(purchase.remaining_amount || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => window.print()} className="btn-outline gap-2 w-full">
              <Printer className="w-4 h-4" />طباعة الفاتورة
            </button>
            <button className="btn-outline gap-2 w-full">
              <Download className="w-4 h-4" />تحميل PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
