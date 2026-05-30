import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Printer, Download, Share2, CheckCircle, Clock } from 'lucide-react'
import { useVoucher } from '@/hooks/useVouchers'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency, formatDate, getPaymentMethodLabel, today } from '@/lib/utils'
import { useReactToPrint } from 'react-to-print'
import { jsPDF } from 'jspdf'

export default function VoucherDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)
  const { company } = useAuthStore()

  const { data: voucher, isLoading } = useVoucher(id)

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `سند_${voucher?.payment_number || id}`
  })

  const handleDownloadPDF = () => {
    if (!printRef.current) return
    const doc = new jsPDF('p', 'mm', 'a4')
    doc.text(`Voucher: ${voucher?.payment_number}`, 10, 10)
    doc.text(`Amount: ${voucher?.amount} SAR`, 10, 20)
    doc.text(`Date: ${voucher?.payment_date}`, 10, 30)
    doc.save(`سند_${voucher?.payment_number}.pdf`)
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">جاري تحميل تفاصيل السند المالي...</div>
  }

  if (!voucher) {
    return (
      <div className="p-8 text-center text-rose-500">
        لم يتم العثور على السند المالي المطلوب أو تم حذفه مؤخراً.
      </div>
    )
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `Voucher: ${voucher.payment_number}\nAmount: ${voucher.amount} SAR\nDate: ${voucher.payment_date}\nCompany: ${company?.name_ar || ''}`
  )}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full max-w-4xl mx-auto"
    >
      <PageHeader
        title={`عرض سند رقم: ${voucher.payment_number}`}
        subtitle="تفاصيل قيد وتأكيد الدفعة النقدية"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/vouchers')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold">
              <ArrowRight className="w-4 h-4 ml-1" />رجوع للوحة السندات
            </button>
            <button onClick={handlePrint} className="btn-primary gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md active:scale-[0.97] transition-all">
              <Printer className="w-4 h-4" />طباعة السند
            </button>
          </div>
        }
      />

      {/* Modern Quick Information Summary Card */}
      <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center ${voucher.type === 'receipt' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {voucher.type === 'receipt' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </span>
          <div>
            <h4 className="font-bold text-sm text-foreground">تم الاعتماد والتأثير بالخزائن</h4>
            <p className="text-xs text-muted-foreground">التاريخ: {formatDate(voucher.payment_date)} • طريقة الدفع: {getPaymentMethodLabel(voucher.method)}</p>
          </div>
        </div>
        <div className="text-center md:text-left">
          <p className="text-[10px] text-muted-foreground font-bold">مبلغ السند الإجمالي</p>
          <p className={`text-2xl font-black ${voucher.type === 'receipt' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {formatCurrency(voucher.amount)}
          </p>
        </div>
      </div>

      {/* Printable Area - Premium Bank Style Receipt */}
      <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-8 space-y-8 font-sans" ref={printRef} dir="rtl">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 border-slate-100 gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">{company?.name_ar || 'مؤسسة اختبار النظام المتكامل'}</h2>
            <p className="text-[10px] text-slate-500">الرقم الضريبي: {company?.tax_number || '300012345600003'}</p>
            <p className="text-[10px] text-slate-500">الهاتف: {company?.phone || '+966 500 000 000'}</p>
          </div>

          <div className="text-center sm:text-left sm:self-start">
            <h1 className="text-2xl font-black text-slate-900 tracking-wide">
              {voucher.type === 'receipt' ? 'سند قـبـض' : 'سند صـرف'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {voucher.type === 'receipt' ? 'Receipt Voucher' : 'Payment Voucher'}
            </p>
          </div>
        </div>

        {/* Voucher Main Fields Grid */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs border-b pb-6 border-slate-100">
          <div>
            <span className="text-slate-400 block font-bold text-[10px]">رقم السند / Voucher No:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{voucher.payment_number}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-bold text-[10px]">تاريخ السند / Date:</span>
            <span className="text-slate-900">{formatDate(voucher.payment_date)}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-bold text-[10px]">
              {voucher.type === 'receipt' ? 'استلمنا من / Received From:' : 'صرفنا إلى / Paid To:'}
            </span>
            <span className="text-slate-900 font-bold text-sm">
              {voucher.customer?.name_ar || voucher.supplier?.name_ar || 'عميل / مورد نقدي عام'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-bold text-[10px]">طريقة الدفع / Payment Method:</span>
            <span className="text-slate-900">{getPaymentMethodLabel(voucher.method)}</span>
          </div>

          <div className="col-span-2">
            <span className="text-slate-400 block font-bold text-[10px]">مبلغ وقدره / The Sum Of:</span>
            <span className="font-bold text-slate-900 text-sm">{formatCurrency(voucher.amount)} ر.س</span>
          </div>

          {voucher.reference && (
            <div>
              <span className="text-slate-400 block font-bold text-[10px]">المرجع / Ref No:</span>
              <span className="text-slate-900 font-mono">{voucher.reference}</span>
            </div>
          )}

          <div>
            <span className="text-slate-400 block font-bold text-[10px]">الخزينة المودعة / Cashbox:</span>
            <span className="text-slate-900">{voucher.cashbox?.name_ar || 'الخزينة الرئيسية'}</span>
          </div>
        </div>

        {/* Notes / Description */}
        <div className="space-y-2 border-b pb-6 border-slate-100">
          <span className="text-slate-400 block font-bold text-[10px]">وذلك عن / Being For:</span>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl font-medium border border-slate-100">
            {voucher.notes || 'سداد حركات حسابية مسجلة بالنظام.'}
          </p>
        </div>

        {/* Bottom Section with QR Code and Authorized Signatures */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
          {/* QR Code */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <img src={qrCodeUrl} alt="Voucher QR Code" className="w-24 h-24 shrink-0 rounded-lg shadow-sm border bg-white" />
            <div className="text-[9px] text-slate-400 space-y-0.5 leading-tight">
              <p className="font-bold text-slate-500">تحقق مالي فوري</p>
              <p>مسح الرمز ضوئياً للتحقق</p>
              <p>من موثوقية وتأثير السند</p>
              <p>على أرصدة الصناديق</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex-1 w-full grid grid-cols-3 gap-4 text-center text-[10px] text-slate-400 mt-4 sm:mt-0">
            <div className="space-y-12">
              <p className="font-bold text-slate-600">المستلم / Receiver</p>
              <div className="border-t border-slate-200 pt-1 text-slate-500">التوقيع / Sign</div>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-slate-600">أمين الصندوق / Cashier</p>
              <div className="border-t border-slate-200 pt-1 text-slate-500">التوقيع / Sign</div>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-slate-600">المدير العام / Manager</p>
              <div className="border-t border-slate-200 pt-1 text-slate-500">الاعتماد / Approve</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
