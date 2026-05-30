import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Printer, Edit2, Send, FileCheck, Clock, XCircle, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

const MOCK_QUOTATIONS: Record<string, any> = {
  'Q-2026-001': {
    id: 'Q-2026-001', number: 'Q-2026-001', customer: 'شركة الأفق للتجارة',
    customer_phone: '0500000001', customer_email: 'alhofuq@example.com',
    date: '2026-05-20', validity: '2026-06-20', status: 'sent',
    notes: 'يرجى الرد خلال مدة الصلاحية',
    terms: 'الأسعار شاملة ضريبة القيمة المضافة',
    items: [
      { id: 1, name: 'جهاز لابتوب Dell', qty: 5, price: 4500, discount: 5, total: 21375 },
      { id: 2, name: 'طابعة HP LaserJet', qty: 2, price: 1800, discount: 0, total: 3600 },
      { id: 3, name: 'ماوس لاسلكي', qty: 10, price: 150, discount: 10, total: 1350 },
    ],
    subtotal: 26325, vat: 3948.75, total: 30273.75,
  },
  'Q-2026-002': {
    id: 'Q-2026-002', number: 'Q-2026-002', customer: 'مجموعة المستقبل',
    customer_phone: '0500000002', customer_email: 'future@example.com',
    date: '2026-05-22', validity: '2026-06-22', status: 'accepted',
    notes: '',
    terms: 'الدفع خلال 30 يوم من تاريخ الفاتورة',
    items: [
      { id: 1, name: 'خوادم Dell PowerEdge', qty: 2, price: 35000, discount: 0, total: 70000 },
      { id: 2, name: 'Switch شبكي 48 Port', qty: 3, price: 5500, discount: 5, total: 15675 },
    ],
    subtotal: 85675, vat: 12851.25, total: 98526.25,
  },
}

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

  const quotation = MOCK_QUOTATIONS[id as string] || Object.values(MOCK_QUOTATIONS)[0]
  const status = STATUS_MAP[quotation?.status || 'draft']
  const StatusIcon = status?.icon || Clock

  const isExpired = quotation?.validity && new Date(quotation.validity) < new Date()

  if (!quotation) return (
    <div className="text-center py-20 text-muted-foreground">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>لم يتم العثور على عرض السعر</p>
      <button onClick={() => navigate('/quotations')} className="btn-outline mt-4 gap-1.5">
        <ArrowRight className="w-4 h-4" />العودة لعروض الأسعار
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title={`عرض السعر ${quotation.number}`}
        subtitle={`تاريخ الإصدار: ${formatDate(quotation.date)}`}
        actions={
          <>
            <button onClick={() => navigate('/quotations')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            {quotation.status === 'draft' && (
              <button onClick={() => toast.success('تم إرسال عرض السعر للعميل')} className="btn-outline gap-1.5">
                <Send className="w-4 h-4" />إرسال
              </button>
            )}
            {quotation.status === 'accepted' && (
              <button onClick={() => navigate('/sales/new')} className="btn-outline gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <FileCheck className="w-4 h-4" />تحويل لفاتورة
              </button>
            )}
            <button onClick={() => window.print()} className="btn-outline gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
            <button onClick={() => navigate(`/quotations/${id}/edit`)} className="btn-primary gap-1.5">
              <Edit2 className="w-4 h-4" />تعديل
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        {/* Main content */}
        <div className="space-y-5">
          {/* Header card */}
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-3xl font-black text-foreground">{quotation.number}</p>
                <p className="text-muted-foreground mt-1">تاريخ الإصدار: {formatDate(quotation.date)}</p>
              </div>
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${status.color}`}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'العميل', value: quotation.customer },
                { label: 'تاريخ الصلاحية', value: formatDate(quotation.validity) },
                { label: 'الهاتف', value: quotation.customer_phone },
                { label: 'البريد', value: quotation.customer_email },
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
                انتهت صلاحية هذا العرض في {formatDate(quotation.validity)}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50">
              <h3 className="font-semibold">بنود عرض السعر</h3>
            </div>
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
                {quotation.items.map((item: any, i: number) => (
                  <tr key={item.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3 font-medium">{item.name}</td>
                    <td className="px-5 py-3 text-center">{item.qty}</td>
                    <td className="px-5 py-3 text-center">{formatCurrency(item.price)}</td>
                    <td className="px-5 py-3 text-center">{item.discount ? `${item.discount}%` : '—'}</td>
                    <td className="px-5 py-3 text-center font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
              <div className="max-w-xs mr-auto space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{formatCurrency(quotation.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة 15%</span>
                  <span className="font-medium">{formatCurrency(quotation.vat)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                  <span>الإجمالي الشامل</span>
                  <span className="text-primary">{formatCurrency(quotation.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {(quotation.notes || quotation.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotation.notes && (
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">ملاحظات</h3>
                  <p className="text-sm">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">الشروط والأحكام</h3>
                  <p className="text-sm">{quotation.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">بيانات العميل</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {quotation.customer?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm">{quotation.customer}</p>
                <p className="text-xs text-muted-foreground">{quotation.customer_phone}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{quotation.customer_email}</p>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">ملخص العرض</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد البنود</span>
                <span className="font-semibold">{quotation.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع قبل الضريبة</span>
                <span className="font-semibold">{formatCurrency(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="font-bold">الإجمالي الشامل</span>
                <span className="font-black text-primary text-base">{formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button onClick={() => window.print()} className="btn-outline gap-2 w-full">
              <Printer className="w-4 h-4" />طباعة العرض
            </button>
            {quotation.status === 'accepted' && (
              <button onClick={() => navigate('/sales/new')} className="btn-primary gap-2 w-full">
                <FileCheck className="w-4 h-4" />تحويل لفاتورة بيع
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
