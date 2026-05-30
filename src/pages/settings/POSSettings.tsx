import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, Lock, Printer, QrCode, Percent, CreditCard, Receipt, Save } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import toast from 'react-hot-toast'

export default function POSSettings() {
  const { sub } = useParams<{ sub: string }>()
  const [requireShift, setRequireShift] = useState(true)
  const [printReceipt, setPrintReceipt] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)
  const [autoClose, setAutoClose] = useState(false)
  const [discountLimit, setDiscountLimit] = useState(20)
  const [cash, setCash] = useState(true)
  const [mada, setMada] = useState(true)
  const [credit, setCredit] = useState(true)
  const [deferred, setDeferred] = useState(false)
  const [showLogo, setShowLogo] = useState(true)
  const [showVat, setShowVat] = useState(true)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => toast.success('تم حفظ الإعدادات')} className="btn-primary gap-2">
        <Save className="w-4 h-4" />حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'shift') return (
    <div className="space-y-4">
      <SectionCard title="إعدادات الوردية" icon={Clock} iconColor="apple-orange">
        <SettingRow icon={Lock} iconColor="apple-red" label="إلزامية فتح الوردية" desc="يجب فتح وردية قبل استخدام نقطة البيع">
          <Toggle checked={requireShift} onChange={setRequireShift} />
        </SettingRow>
        <SettingRow icon={Clock} iconColor="apple-blue" label="إغلاق الوردية تلقائياً" desc="إغلاق الوردية عند انتهاء ساعات العمل">
          <Toggle checked={autoClose} onChange={setAutoClose} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">بداية الوردية الافتراضية</label>
            <input type="time" className="form-input" dir="ltr" defaultValue="08:00" />
          </div>
          <div>
            <label className="form-label">نهاية الوردية الافتراضية</label>
            <input type="time" className="form-input" dir="ltr" defaultValue="22:00" />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'printers') return (
    <div className="space-y-4">
      <SectionCard title="إعدادات الطابعة والباركود" icon={Printer} iconColor="apple-blue">
        <SettingRow icon={Printer} iconColor="apple-blue" label="طباعة الإيصال تلقائياً" desc="طباعة الإيصال فور إتمام البيع">
          <Toggle checked={printReceipt} onChange={setPrintReceipt} />
        </SettingRow>
        <SettingRow icon={QrCode} iconColor="apple-purple" label="قارئ الباركود" desc="تفعيل قارئ الباركود في نقطة البيع">
          <Toggle checked={showBarcode} onChange={setShowBarcode} />
        </SettingRow>
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">حجم الورق الحراري</label>
            <select className="form-select">
              <option value="80mm">80mm (القياسي)</option>
              <option value="58mm">58mm</option>
              <option value="A4">A4</option>
            </select>
          </div>
          <div>
            <label className="form-label">اسم الطابعة</label>
            <input className="form-input" dir="ltr" placeholder="POS-Printer-1" />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'invoices') return (
    <div className="space-y-4">
      <SectionCard title="إعدادات فواتير POS" icon={Receipt} iconColor="apple-indigo">
        <SettingRow icon={Receipt} iconColor="apple-indigo" label="عرض شعار الشركة في الإيصال" desc="إضافة الشعار لرأس الإيصال">
          <Toggle checked={showLogo} onChange={setShowLogo} />
        </SettingRow>
        <SettingRow icon={Percent} iconColor="apple-orange" label="عرض تفاصيل الضريبة" desc="إظهار سطر الضريبة بشكل منفصل">
          <Toggle checked={showVat} onChange={setShowVat} />
        </SettingRow>
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">بادئة رقم الإيصال</label>
            <input className="form-input" dir="ltr" defaultValue="POS-" />
          </div>
          <div>
            <label className="form-label">نص تذييل الإيصال</label>
            <input className="form-input" defaultValue="شكراً لزيارتكم" />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'payments') return (
    <div className="space-y-4">
      <SectionCard title="طرق دفع نقطة البيع" icon={CreditCard} iconColor="apple-green">
        <SettingRow label="نقدي" desc="الدفع النقدي"><Toggle checked={cash} onChange={setCash} /></SettingRow>
        <SettingRow label="مدى" desc="البطاقات المصرفية"><Toggle checked={mada} onChange={setMada} /></SettingRow>
        <SettingRow label="بطاقة ائتمان" desc="Visa / Mastercard"><Toggle checked={credit} onChange={setCredit} /></SettingRow>
        <SettingRow label="آجل" desc="بيع بالأجل للعملاء المعتمدين"><Toggle checked={deferred} onChange={setDeferred} /></SettingRow>
      </SectionCard>
      <SectionCard title="حدود الخصومات" icon={Percent} iconColor="apple-orange">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">أقصى نسبة خصم مسموح بها للكاشير (%)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={discountLimit} onChange={e => setDiscountLimit(+e.target.value)} className="flex-1 accent-primary" />
              <span className="text-sm font-bold text-primary w-10 text-center">{discountLimit}%</span>
            </div>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  return null
}
