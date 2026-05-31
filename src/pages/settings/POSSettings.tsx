import { useParams, Navigate } from 'react-router-dom'
import { Clock, Lock, Printer, QrCode, Percent, CreditCard, Receipt, Save, Loader2 } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import { useModuleSettings } from '@/hooks/useModuleSettings'

const POS_DEFAULTS = {
  require_shift: true,
  auto_close_shift: false,
  shift_start: '08:00',
  shift_end: '22:00',
  print_receipt: true,
  barcode_scanner: true,
  paper_size: '80mm',
  printer_name: '',
  show_logo: true,
  show_vat: true,
  receipt_prefix: 'POS-',
  receipt_footer: 'شكراً لزيارتكم',
  pay_cash: true,
  pay_mada: true,
  pay_credit: true,
  pay_deferred: false,
  discount_limit: 20,
}

export default function POSSettings() {
  const { sub } = useParams<{ sub: string }>()
  const { settings: s, save, isSaving } = useModuleSettings('pos_settings', POS_DEFAULTS)

  const KNOWN_PRINTERS = [
    'POS-Printer-1',
    'POS-Printer-2',
    'Thermal Printer',
    'Receipt Printer',
  ]

  const set = (patch: Partial<typeof POS_DEFAULTS>) => save(patch, true)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => save({})} disabled={isSaving} className="btn-primary gap-2">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'shift') return (
    <div className="space-y-4">
      <SectionCard title="إعدادات الوردية" icon={Clock} iconColor="apple-orange">
        <SettingRow icon={Lock} iconColor="apple-red" label="إلزامية فتح الوردية" desc="يجب فتح وردية قبل استخدام نقطة البيع">
          <Toggle checked={s.require_shift} onChange={v => set({ require_shift: v })} />
        </SettingRow>
        <SettingRow icon={Clock} iconColor="apple-blue" label="إغلاق الوردية تلقائياً" desc="إغلاق الوردية عند انتهاء ساعات العمل">
          <Toggle checked={s.auto_close_shift} onChange={v => set({ auto_close_shift: v })} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">بداية الوردية الافتراضية</label>
            <input type="time" value={s.shift_start} onChange={e => set({ shift_start: e.target.value })} className="form-input" dir="ltr" />
          </div>
          <div>
            <label className="form-label">نهاية الوردية الافتراضية</label>
            <input type="time" value={s.shift_end} onChange={e => set({ shift_end: e.target.value })} className="form-input" dir="ltr" />
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
          <Toggle checked={s.print_receipt} onChange={v => set({ print_receipt: v })} />
        </SettingRow>
        <SettingRow icon={QrCode} iconColor="apple-purple" label="قارئ الباركود" desc="تفعيل قارئ الباركود في نقطة البيع">
          <Toggle checked={s.barcode_scanner} onChange={v => set({ barcode_scanner: v })} />
        </SettingRow>
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">حجم الورق الحراري</label>
            <select value={s.paper_size} onChange={e => set({ paper_size: e.target.value })} className="form-select">
              <option value="80mm">80mm (القياسي)</option>
              <option value="58mm">58mm</option>
              <option value="A4">A4</option>
            </select>
          </div>
          <div>
            <label className="form-label">اسم الطابعة</label>
            <select value={s.printer_name} onChange={e => set({ printer_name: e.target.value })} className="form-select" dir="ltr">
              <option value="">اختر طابعة أو اكتب اسمها يدوياً</option>
              {KNOWN_PRINTERS.map(printer => (
                <option key={printer} value={printer}>{printer}</option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-2">
              في المتصفح العادي لا يمكن قراءة قائمة الطابعات المثبتة مباشرةً من النظام. اختر اسم الطابعة الموجودة لديك أو استخدم تطبيق سطح المكتب للحصول على اختيار الطابعات المثبتة تلقائياً.
            </p>
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
          <Toggle checked={s.show_logo} onChange={v => set({ show_logo: v })} />
        </SettingRow>
        <SettingRow icon={Percent} iconColor="apple-orange" label="عرض تفاصيل الضريبة" desc="إظهار سطر الضريبة بشكل منفصل">
          <Toggle checked={s.show_vat} onChange={v => set({ show_vat: v })} />
        </SettingRow>
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">بادئة رقم الإيصال</label>
            <input value={s.receipt_prefix} onChange={e => set({ receipt_prefix: e.target.value })} className="form-input" dir="ltr" />
          </div>
          <div>
            <label className="form-label">نص تذييل الإيصال</label>
            <input value={s.receipt_footer} onChange={e => set({ receipt_footer: e.target.value })} className="form-input" />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'payments') return (
    <div className="space-y-4">
      <SectionCard title="طرق دفع نقطة البيع" icon={CreditCard} iconColor="apple-green">
        <SettingRow label="نقدي" desc="الدفع النقدي"><Toggle checked={s.pay_cash} onChange={v => set({ pay_cash: v })} /></SettingRow>
        <SettingRow label="مدى" desc="البطاقات المصرفية"><Toggle checked={s.pay_mada} onChange={v => set({ pay_mada: v })} /></SettingRow>
        <SettingRow label="بطاقة ائتمان" desc="Visa / Mastercard"><Toggle checked={s.pay_credit} onChange={v => set({ pay_credit: v })} /></SettingRow>
        <SettingRow label="آجل" desc="بيع بالأجل للعملاء المعتمدين"><Toggle checked={s.pay_deferred} onChange={v => set({ pay_deferred: v })} /></SettingRow>
      </SectionCard>
      <SectionCard title="حدود الخصومات" icon={Percent} iconColor="apple-orange">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">أقصى نسبة خصم مسموح بها للكاشير (%)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={s.discount_limit}
                onChange={e => set({ discount_limit: +e.target.value })} className="flex-1 accent-primary" />
              <span className="text-sm font-bold text-primary w-10 text-center">{s.discount_limit}%</span>
            </div>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  return <Navigate to="/settings/pos/shift" replace />
}
