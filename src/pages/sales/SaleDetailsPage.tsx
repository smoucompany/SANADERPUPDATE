import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Printer, Edit2, Download, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import { PrintInvoiceA4 } from '@/components/print/PrintInvoiceA4'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid:     { label: 'مدفوعة',   color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  partial:  { label: 'جزئي',     color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',       icon: AlertCircle },
  pending:  { label: 'معلقة',    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',           icon: Clock },
  cancelled:{ label: 'ملغاة',    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',              icon: XCircle },
}

export default function SaleDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, company } = useAuthStore()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!user?.company_id) return null
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(*), items:invoice_items(*, product:products(name_ar, barcode))')
        .eq('id', id!)
        .eq('company_id', user.company_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id && !!user?.company_id
  })

  const status = STATUS_MAP[invoice?.status || 'pending']
  const StatusIcon = status?.icon || Clock

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!invoice) return (
    <div className="text-center py-20 text-muted-foreground">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>لم يتم العثور على الفاتورة</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* ── SCREEN ONLY VIEW ── */}
      <div className="no-print space-y-5">
        <PageHeader
          title={`فاتورة ${invoice.invoice_number}`}
          subtitle={formatDate(invoice.invoice_date)}
          actions={
            <>
              <button onClick={() => navigate('/sales')} className="btn-outline gap-1.5">
                <ArrowRight className="w-4 h-4" />رجوع
              </button>
              <button onClick={() => window.print()} className="btn-outline gap-1.5 cursor-pointer">
                <Printer className="w-4 h-4" />طباعة
              </button>
              <button onClick={() => navigate(`/sales/${id}/edit`)} className="btn-primary gap-1.5 cursor-pointer">
                <Edit2 className="w-4 h-4" />تعديل
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          {/* Invoice main */}
          <div className="space-y-5">
            {/* Header info */}
            <div className="bg-card border border-border/60 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-3xl font-black text-foreground">{invoice.invoice_number}</p>
                  <p className="text-muted-foreground mt-1">{formatDate(invoice.invoice_date)}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${status?.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {status?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'العميل', value: invoice.customer?.name_ar || 'عميل نقدي' },
                  { label: 'طريقة الدفع', value: invoice.payment_method === 'cash' ? 'نقدي' : invoice.payment_method === 'credit' ? 'آجل' : invoice.payment_method },
                  { label: 'تاريخ الاستحقاق', value: invoice.due_date ? formatDate(invoice.due_date) : '—' },
                  { label: 'المرجع', value: invoice.reference || '—' },
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
                <h3 className="font-semibold">بنود الفاتورة</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المنتج</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">الكمية</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">السعر</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">الخصم</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item: any, i: number) => (
                    <tr key={item.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{item.product?.name_ar || item.product_name}</p>
                        {item.product?.barcode && <p className="text-xs text-muted-foreground font-mono">{item.product.barcode}</p>}
                      </td>
                      <td className="px-5 py-3">{item.quantity} {item.unit || ''}</td>
                      <td className="px-5 py-3">{formatCurrency(item.unit_price)}</td>
                      <td className="px-5 py-3">{item.discount ? `${item.discount}%` : '—'}</td>
                      <td className="px-5 py-3 font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
                <div className="max-w-xs mr-auto space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal || 0)}</span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>الخصم</span>
                      <span>- {formatCurrency(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الضريبة {invoice.vat_rate || 15}%</span>
                    <span className="font-medium">{formatCurrency(invoice.tax_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                    <span>الإجمالي</span>
                    <span className="text-primary">{formatCurrency(invoice.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>المدفوع</span>
                    <span className="font-bold">{formatCurrency(invoice.paid_amount || 0)}</span>
                  </div>
                  {(invoice.remaining_amount || 0) > 0 && (
                    <div className="flex justify-between text-orange-500 font-bold">
                      <span>المتبقي</span>
                      <span>{formatCurrency(invoice.remaining_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground">ملاحظات</h3>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {invoice.customer && (
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <h3 className="font-semibold mb-3">بيانات العميل</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {invoice.customer.name_ar?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{invoice.customer.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{invoice.customer.phone || '—'}</p>
                    </div>
                  </div>
                  {invoice.customer.email && <p className="text-muted-foreground text-xs">{invoice.customer.email}</p>}
                  {invoice.customer.address && <p className="text-muted-foreground text-xs">{invoice.customer.address}</p>}
                </div>
              </div>
            )}

            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">ملخص المبالغ</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">إجمالي الفاتورة</span>
                  <span className="font-bold">{formatCurrency(invoice.total || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">المدفوع</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(invoice.paid_amount || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-semibold">الرصيد المتبقي</span>
                  <span className={`font-bold text-lg ${(invoice.remaining_amount || 0) > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                    {formatCurrency(invoice.remaining_amount || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => window.print()} className="btn-outline gap-2 w-full cursor-pointer">
                <Printer className="w-4 h-4" />طباعة الفاتورة
              </button>
              <button className="btn-outline gap-2 w-full cursor-pointer">
                <Download className="w-4 h-4" />تحميل PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINT ONLY VIEW — Professional A4 Template ── */}
      <PrintInvoiceA4
        invoice={invoice}
        items={invoice.items || []}
        company={company || {}}
        customer={invoice.customer}
        cashierName={user?.full_name}
      />
    </div>
  )
}
