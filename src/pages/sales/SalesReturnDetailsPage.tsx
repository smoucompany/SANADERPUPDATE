import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Printer, CheckCircle2, Clock, XCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'قيد المراجعة', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',   icon: Clock },
  approved: { label: 'مقبول',        color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  rejected: { label: 'مرفوض',        color: 'text-red-600 bg-red-100 dark:bg-red-900/30',          icon: XCircle },
  processed:{ label: 'تمت المعالجة', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',       icon: CheckCircle2 },
}

const REFUND_METHODS: Record<string, string> = {
  cash: 'نقدي', bank: 'تحويل بنكي', credit_note: 'قيد دائن', wallet: 'رصيد العميل'
}

const REASONS: Record<string, string> = {
  defective: 'منتج معيب أو تالف', wrong: 'منتج خاطئ', quality: 'جودة غير مقبولة',
  customer_change: 'تغيير رأي العميل', excess: 'كمية زائدة', other: 'سبب آخر'
}

const MOCK_RETURNS: Record<string, any> = {
  'RET-2026-001': {
    id: 'RET-2026-001', number: 'RET-2026-001',
    invoice_number: 'INV-2026-032', invoice_date: '2026-05-15',
    customer: 'شركة الأفق للتجارة', customer_phone: '0500000001',
    date: '2026-05-20', status: 'approved',
    reason: 'defective', refund_method: 'bank', notes: 'المنتج وصل مكسوراً',
    items: [
      { name: 'شاشة Samsung 27"', qty: 1, price: 1200, total: 1200 },
      { name: 'لوحة مفاتيح ميكانيكية', qty: 2, price: 320, total: 640 },
    ],
    subtotal: 1840, vat: 276, total: 2116,
    approved_by: 'أحمد العمري', approved_date: '2026-05-21',
  },
  'RET-2026-002': {
    id: 'RET-2026-002', number: 'RET-2026-002',
    invoice_number: 'INV-2026-038', invoice_date: '2026-05-18',
    customer: 'مجموعة المستقبل', customer_phone: '0500000002',
    date: '2026-05-22', status: 'pending',
    reason: 'quality', refund_method: 'credit_note', notes: '',
    items: [
      { name: 'ماوس لاسلكي Logitech', qty: 5, price: 150, total: 750 },
    ],
    subtotal: 750, vat: 112.5, total: 862.5,
    approved_by: null, approved_date: null,
  },
}

export default function SalesReturnDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const returnData = MOCK_RETURNS[id as string] || Object.values(MOCK_RETURNS)[0]
  const status = STATUS_MAP[returnData?.status || 'pending']
  const StatusIcon = status?.icon || Clock

  const handleApprove = (action: 'approve' | 'reject') => {
    toast.success(action === 'approve' ? 'تمت الموافقة على المرتجع' : 'تم رفض المرتجع')
    navigate('/sales/returns')
  }

  if (!returnData) return (
    <div className="text-center py-20 text-muted-foreground">
      <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>لم يتم العثور على مرتجع البيع</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title={`مرتجع بيع ${returnData.number}`}
        subtitle={`الفاتورة الأصلية: ${returnData.invoice_number}`}
        actions={
          <>
            <button onClick={() => navigate('/sales/returns')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => window.print()} className="btn-outline gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
            {returnData.status === 'pending' && (
              <>
                <button onClick={() => handleApprove('reject')}
                  className="btn-outline gap-1.5 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <XCircle className="w-4 h-4" />رفض
                </button>
                <button onClick={() => handleApprove('approve')} className="btn-primary gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />موافقة
                </button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          {/* Header card */}
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-3xl font-black">{returnData.number}</p>
                <p className="text-muted-foreground mt-1">تاريخ المرتجع: {formatDate(returnData.date)}</p>
              </div>
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${status.color}`}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'العميل', value: returnData.customer },
                { label: 'الفاتورة الأصلية', value: returnData.invoice_number },
                { label: 'سبب الإرجاع', value: REASONS[returnData.reason] || returnData.reason },
                { label: 'طريقة الاسترداد', value: REFUND_METHODS[returnData.refund_method] || returnData.refund_method },
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
                {returnData.items.map((item: any, i: number) => (
                  <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3 font-medium">{item.name}</td>
                    <td className="px-5 py-3 text-center">{item.qty}</td>
                    <td className="px-5 py-3 text-center">{formatCurrency(item.price)}</td>
                    <td className="px-5 py-3 text-center font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
              <div className="max-w-xs mr-auto space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{formatCurrency(returnData.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة 15%</span>
                  <span className="font-medium">{formatCurrency(returnData.vat)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                  <span>إجمالي الاسترداد</span>
                  <span className="text-primary">{formatCurrency(returnData.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">بيانات العميل</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {returnData.customer?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm">{returnData.customer}</p>
                <p className="text-xs text-muted-foreground">{returnData.customer_phone}</p>
              </div>
            </div>
            <button onClick={() => navigate('/sales?search=' + returnData.invoice_number)}
              className="text-xs text-primary hover:underline">
              عرض الفاتورة الأصلية: {returnData.invoice_number}
            </button>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">ملخص الاسترداد</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">طريقة الاسترداد</span>
                <span className="font-medium">{REFUND_METHODS[returnData.refund_method]}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="font-bold">إجمالي الاسترداد</span>
                <span className="font-black text-primary text-base">{formatCurrency(returnData.total)}</span>
              </div>
            </div>
          </div>

          {returnData.approved_by && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">بيانات الموافقة</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مُعتمَد من</span>
                  <span className="font-medium">{returnData.approved_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ الموافقة</span>
                  <span className="font-medium">{formatDate(returnData.approved_date)}</span>
                </div>
              </div>
            </div>
          )}

          {returnData.status === 'pending' && (
            <div className="flex flex-col gap-2">
              <button onClick={() => handleApprove('approve')} className="btn-primary gap-2 w-full bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" />قبول المرتجع
              </button>
              <button onClick={() => handleApprove('reject')}
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
