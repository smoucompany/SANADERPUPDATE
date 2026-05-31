import { useParams, Navigate } from 'react-router-dom'
import { FileText, Building2, QrCode, Percent, Eye, PiggyBank, Receipt, BarChart2, Download, Save, Loader2 } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import { useModuleSettings } from '@/hooks/useModuleSettings'
import toast from 'react-hot-toast'

const PRINT_DEFAULTS = {
  invoice_show_logo: true,
  invoice_show_qr: true,
  invoice_show_vat_breakdown: true,
  invoice_font_size: 'متوسط',
  invoice_paper: 'A4',
  invoice_footer: 'شكراً لتعاملكم معنا',
  receipt_show_logo: true,
  receipt_show_vat: true,
  receipt_paper: '80mm',
  receipt_copies: '1',
  receipt_footer: 'شكراً لزيارتكم',
  report_format: 'Excel (.xlsx)',
  report_language: 'العربية',
}

export default function PrintSettings() {
  const { sub } = useParams<{ sub: string }>()
  const { settings: s, save, isSaving } = useModuleSettings('print_settings', PRINT_DEFAULTS)

  const set = (patch: Partial<typeof PRINT_DEFAULTS>) => save(patch, true)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => save({})} disabled={isSaving} className="btn-primary gap-2">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'invoice') return (
    <div className="space-y-4">
      <SectionCard title="قالب الفاتورة" icon={FileText} iconColor="apple-indigo">
        <SettingRow icon={Building2} iconColor="apple-blue" label="عرض شعار الشركة" desc="إظهار الشعار في رأس الفاتورة">
          <Toggle checked={s.invoice_show_logo} onChange={v => set({ invoice_show_logo: v })} />
        </SettingRow>
        <SettingRow icon={QrCode} iconColor="apple-purple" label="رمز QR (ZATCA)" desc="إضافة رمز QR متوافق مع متطلبات ZATCA">
          <Toggle checked={s.invoice_show_qr} onChange={v => set({ invoice_show_qr: v })} />
        </SettingRow>
        <SettingRow icon={Percent} iconColor="apple-orange" label="تفاصيل ضريبة القيمة المضافة" desc="إظهار تفاصيل الضريبة في الفاتورة">
          <Toggle checked={s.invoice_show_vat_breakdown} onChange={v => set({ invoice_show_vat_breakdown: v })} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">حجم الخط الرئيسي</label>
            <select value={s.invoice_font_size} onChange={e => set({ invoice_font_size: e.target.value })} className="form-select">
              <option>صغير</option>
              <option>متوسط</option>
              <option>كبير</option>
            </select>
          </div>
          <div>
            <label className="form-label">نوع الورق</label>
            <select value={s.invoice_paper} onChange={e => set({ invoice_paper: e.target.value })} className="form-select">
              <option>A4</option>
              <option>A5</option>
              <option>80mm حراري</option>
              <option>58mm حراري</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="form-label">نص تذييل الفاتورة</label>
            <input value={s.invoice_footer} onChange={e => set({ invoice_footer: e.target.value })} className="form-input" placeholder="شكراً لتعاملكم معنا" />
          </div>
        </div>
      </SectionCard>

      {/* Live preview */}
      <div className="bg-card border-2 border-dashed border-border/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">معاينة مباشرة</p>
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 max-w-xs mx-auto text-[11px] shadow-sm">
          {s.invoice_show_logo && (
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
            {s.invoice_show_vat_breakdown && <div className="flex justify-between text-muted-foreground"><span>الضريبة 15%</span><span>15.00</span></div>}
            <div className="flex justify-between font-bold border-t border-dashed border-border pt-1 mt-1"><span>الإجمالي</span><span>115.00</span></div>
          </div>
          {s.invoice_show_qr && (
            <div className="flex justify-center mt-3">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          )}
          {s.invoice_footer && <p className="text-center text-muted-foreground mt-3 text-[10px]">{s.invoice_footer}</p>}
        </div>
      </div>
      <SaveBtn />
    </div>
  )

  if (sub === 'receipt') return (
    <div className="space-y-4">
      <SectionCard title="قالب الإيصال الحراري" icon={Receipt} iconColor="apple-orange">
        <SettingRow icon={Building2} iconColor="apple-blue" label="عرض شعار الشركة" desc="إظهار الشعار في رأس الإيصال">
          <Toggle checked={s.receipt_show_logo} onChange={v => set({ receipt_show_logo: v })} />
        </SettingRow>
        <SettingRow icon={Percent} iconColor="apple-orange" label="عرض تفاصيل الضريبة" desc="إظهار الضريبة بشكل منفصل">
          <Toggle checked={s.receipt_show_vat} onChange={v => set({ receipt_show_vat: v })} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">حجم ورق الإيصال</label>
            <select value={s.receipt_paper} onChange={e => set({ receipt_paper: e.target.value })} className="form-select">
              <option value="80mm">80mm (القياسي)</option>
              <option value="58mm">58mm</option>
            </select>
          </div>
          <div>
            <label className="form-label">عدد النسخ</label>
            <select value={s.receipt_copies} onChange={e => set({ receipt_copies: e.target.value })} className="form-select" dir="ltr">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="form-label">نص تذييل الإيصال</label>
            <input value={s.receipt_footer} onChange={e => set({ receipt_footer: e.target.value })} className="form-input" />
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
            <select value={s.report_format} onChange={e => set({ report_format: e.target.value })} className="form-select">
              <option>Excel (.xlsx)</option>
              <option>PDF</option>
              <option>CSV</option>
            </select>
          </div>
          <div>
            <label className="form-label">لغة التقارير</label>
            <select value={s.report_language} onChange={e => set({ report_language: e.target.value })} className="form-select">
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

  return <Navigate to="/settings/print/invoice" replace />
}
