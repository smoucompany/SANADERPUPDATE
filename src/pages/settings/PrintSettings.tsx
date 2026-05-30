import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Building2, QrCode, Percent, Eye, PiggyBank, Receipt, BarChart2, Download, Save } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import toast from 'react-hot-toast'

export default function PrintSettings() {
  const { sub } = useParams<{ sub: string }>()
  const [showLogo, setShowLogo] = useState(true)
  const [showQR, setShowQR] = useState(true)
  const [showVatBreakdown, setShowVatBreakdown] = useState(true)
  const [footerNote, setFooterNote] = useState('شكراً لتعاملكم معنا')

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => toast.success('تم حفظ الإعدادات')} className="btn-primary gap-2">
        <Save className="w-4 h-4" />حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'invoice') return (
    <div className="space-y-4">
      <SectionCard title="قالب الفاتورة" icon={FileText} iconColor="apple-indigo">
        <SettingRow icon={Building2} iconColor="apple-blue" label="عرض شعار الشركة" desc="إظهار الشعار في رأس الفاتورة">
          <Toggle checked={showLogo} onChange={setShowLogo} />
        </SettingRow>
        <SettingRow icon={QrCode} iconColor="apple-purple" label="رمز QR (ZATCA)" desc="إضافة رمز QR متوافق مع متطلبات ZATCA">
          <Toggle checked={showQR} onChange={setShowQR} />
        </SettingRow>
        <SettingRow icon={Percent} iconColor="apple-orange" label="تفاصيل ضريبة القيمة المضافة" desc="إظهار تفاصيل الضريبة في الفاتورة">
          <Toggle checked={showVatBreakdown} onChange={setShowVatBreakdown} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">حجم الخط الرئيسي</label>
            <select className="form-select">
              <option>صغير</option>
              <option>متوسط</option>
              <option>كبير</option>
            </select>
          </div>
          <div>
            <label className="form-label">نوع الورق</label>
            <select className="form-select">
              <option>A4</option>
              <option>A5</option>
              <option>80mm حراري</option>
              <option>58mm حراري</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="form-label">نص تذييل الفاتورة</label>
            <input value={footerNote} onChange={e => setFooterNote(e.target.value)} className="form-input" placeholder="شكراً لتعاملكم معنا" />
          </div>
        </div>
      </SectionCard>

      <div className="bg-card border-2 border-dashed border-border/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">معاينة مباشرة</p>
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 max-w-xs mx-auto text-[11px] shadow-sm">
          {showLogo && (
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 gradient-blue rounded-xl flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
          <p className="font-bold text-center text-[13px] mb-1">فاتورة ضريبية</p>
          <p className="text-center text-muted-foreground mb-3">INV-000001</p>
          <div className="border-t border-dashed border-border my-2" />
          <div className="space-y-1">
            <div className="flex justify-between"><span>المنتج × 2</span><span>100.00</span></div>
            {showVatBreakdown && <div className="flex justify-between text-muted-foreground"><span>الضريبة 15%</span><span>15.00</span></div>}
            <div className="flex justify-between font-bold border-t border-dashed border-border pt-1 mt-1"><span>الإجمالي</span><span>115.00</span></div>
          </div>
          {showQR && (
            <div className="flex justify-center mt-3">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          )}
          {footerNote && <p className="text-center text-muted-foreground mt-3 text-[10px]">{footerNote}</p>}
        </div>
      </div>
      <SaveBtn />
    </div>
  )

  if (sub === 'receipt') return (
    <div className="space-y-4">
      <SectionCard title="قالب الإيصال الحراري" icon={Receipt} iconColor="apple-orange">
        <SettingRow icon={Building2} iconColor="apple-blue" label="عرض شعار الشركة" desc="إظهار الشعار في رأس الإيصال">
          <Toggle checked={showLogo} onChange={setShowLogo} />
        </SettingRow>
        <SettingRow icon={Percent} iconColor="apple-orange" label="عرض تفاصيل الضريبة" desc="إظهار الضريبة بشكل منفصل">
          <Toggle checked={showVatBreakdown} onChange={setShowVatBreakdown} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">حجم ورق الإيصال</label>
            <select className="form-select">
              <option>80mm (القياسي)</option>
              <option>58mm</option>
            </select>
          </div>
          <div>
            <label className="form-label">عدد النسخ</label>
            <select className="form-select" dir="ltr">
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="form-label">نص تذييل الإيصال</label>
            <input className="form-input" defaultValue="شكراً لزيارتكم" />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'reports') return (
    <div className="space-y-4">
      <SectionCard title="تصدير التقارير" icon={BarChart2} iconColor="apple-teal">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">تنسيق التصدير الافتراضي</label>
            <select className="form-select">
              <option>Excel (.xlsx)</option>
              <option>PDF</option>
              <option>CSV</option>
            </select>
          </div>
          <div>
            <label className="form-label">لغة التقارير</label>
            <select className="form-select">
              <option>العربية</option>
              <option>English</option>
              <option>الاثنان</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => toast.success('جاري تصدير تقرير المبيعات...')} className="btn-outline text-xs gap-2">
              <Download className="w-3.5 h-3.5" />تصدير المبيعات
            </button>
            <button onClick={() => toast.success('جاري تصدير تقرير المخزون...')} className="btn-outline text-xs gap-2">
              <Download className="w-3.5 h-3.5" />تصدير المخزون
            </button>
            <button onClick={() => toast.success('جاري تصدير تقرير الحسابات...')} className="btn-outline text-xs gap-2">
              <Download className="w-3.5 h-3.5" />تصدير الحسابات
            </button>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  return null
}
