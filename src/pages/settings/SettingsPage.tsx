import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, DollarSign, Boxes, ShoppingCart, Users, Printer,
  Plug, Shield, Save, RotateCcw, Download, Upload, FlaskConical,
  Search, ChevronLeft, CheckCircle2, Wifi, Database, HardDrive,
  Bell, Globe, Sun, Moon, Monitor, Loader2, Eye, EyeOff,
  Palette, CreditCard, Percent, Clock, Key,
  Lock, UserCheck, Activity, Smartphone, Mail, MessageSquare,
  QrCode, AlignLeft, FileText, Zap, BarChart3, PiggyBank,
  Hash, Package, Tag, ToggleLeft, Layers, Wallet, Briefcase,
  Calendar, MapPin, Phone, AtSign, Link2, AlertTriangle,
  Edit2, Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type SectionId =
  | 'company' | 'financial' | 'inventory' | 'pos'
  | 'hr' | 'users' | 'print' | 'integrations' | 'security'

interface NavGroup {
  label: string
  icon: React.ElementType
  iconColor: string
  id: SectionId
  items: { id: string; label: string }[]
}

// ─────────────────────────────────────────────
// Navigation structure
// ─────────────────────────────────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'إعدادات المؤسسة', icon: Building2, iconColor: 'apple-blue', id: 'company',
    items: [
      { id: 'company-info',     label: 'بيانات الشركة' },
      { id: 'company-currency', label: 'العملة والضريبة' },
      { id: 'company-locale',   label: 'المنطقة الزمنية' },
      { id: 'company-fiscal',   label: 'السنة المالية' },
    ]
  },
  {
    label: 'الإعدادات المالية', icon: DollarSign, iconColor: 'apple-green', id: 'financial',
    items: [
      { id: 'fin-tax',      label: 'الضرائب والزكاة' },
      { id: 'fin-accounts', label: 'الحسابات الافتراضية' },
      { id: 'fin-payments', label: 'طرق الدفع' },
      { id: 'fin-journal',  label: 'القيود اليومية' },
    ]
  },
  {
    label: 'إعدادات المخزون', icon: Boxes, iconColor: 'apple-teal', id: 'inventory',
    items: [
      { id: 'inv-warehouses', label: 'المخازن' },
      { id: 'inv-units',      label: 'وحدات القياس' },
      { id: 'inv-pricing',    label: 'طرق التسعير' },
      { id: 'inv-limits',     label: 'حدود المخزون' },
      { id: 'inv-numbering',  label: 'الترقيم التلقائي' },
    ]
  },
  {
    label: 'نقطة البيع', icon: ShoppingCart, iconColor: 'apple-orange', id: 'pos',
    items: [
      { id: 'pos-shift',    label: 'فتح وإغلاق الوردية' },
      { id: 'pos-printers', label: 'الطابعات والباركود' },
      { id: 'pos-invoices', label: 'فواتير POS' },
      { id: 'pos-payments', label: 'طرق الدفع' },
    ]
  },
  {
    label: 'الموارد البشرية', icon: Briefcase, iconColor: 'apple-purple', id: 'hr',
    items: [
      { id: 'hr-attendance', label: 'الحضور والانصراف' },
      { id: 'hr-payroll',    label: 'الرواتب والأجور' },
      { id: 'hr-leaves',     label: 'الإجازات والسلف' },
    ]
  },
  {
    label: 'المستخدمون والصلاحيات', icon: Users, iconColor: 'apple-pink', id: 'users',
    items: [
      { id: 'users-roles',    label: 'الأدوار والصلاحيات' },
      { id: 'users-sessions', label: 'جلسات الدخول' },
      { id: 'users-activity', label: 'سجل النشاط' },
    ]
  },
  {
    label: 'الطباعة والتقارير', icon: Printer, iconColor: 'apple-indigo', id: 'print',
    items: [
      { id: 'print-invoice',  label: 'قالب الفاتورة' },
      { id: 'print-receipt',  label: 'قالب الإيصال' },
      { id: 'print-reports',  label: 'تصدير التقارير' },
    ]
  },
  {
    label: 'التكاملات', icon: Plug, iconColor: 'apple-cyan', id: 'integrations',
    items: [
      { id: 'int-whatsapp', label: 'WhatsApp' },
      { id: 'int-email',    label: 'البريد الإلكتروني' },
      { id: 'int-sms',      label: 'الرسائل النصية' },
      { id: 'int-api',      label: 'مفاتيح API' },
    ]
  },
  {
    label: 'الأمان والنسخ الاحتياطي', icon: Shield, iconColor: 'apple-red', id: 'security',
    items: [
      { id: 'sec-password', label: 'كلمة المرور' },
      { id: 'sec-2fa',      label: 'المصادقة الثنائية' },
      { id: 'sec-backup',   label: 'النسخ الاحتياطي' },
      { id: 'sec-audit',    label: 'سجلات التدقيق' },
    ]
  },
]

// ─────────────────────────────────────────────
// Small reusable primitives
// ─────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
        ${checked ? 'right-1' : 'right-6'}`} />
    </button>
  )
}

function SettingRow({
  icon: Icon, iconColor, label, desc, children
}: {
  icon?: React.ElementType; iconColor?: string; label: string; desc?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && iconColor && (
          <span className={`icon-badge-sm ${iconColor}`}>
            <Icon className="w-3 h-3 text-white" />
          </span>
        )}
        <div>
          <p className="text-[13px] font-medium text-foreground">{label}</p>
          {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, iconColor, children }: {
  title: string; icon?: React.ElementType; iconColor?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden
                    shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-muted/30">
        {Icon && iconColor && (
          <span className={`icon-badge ${iconColor}`}>
            <Icon className="w-4 h-4 text-white" />
          </span>
        )}
        <h3 className="font-semibold text-[14px]">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className={`text-[11px] font-medium ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
          {ok ? 'متصل' : 'غير متصل'}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Section content renderers
// ─────────────────────────────────────────────
function CompanySection({ company, onSave, saving }: { company: any; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    name_ar: company?.name_ar || '',
    name_en: company?.name_en || '',
    phone: company?.phone || '',
    email: company?.email || '',
    address: company?.address || '',
    tax_number: company?.tax_number || '',
    commercial_reg: company?.commercial_reg || '',
    vat_rate: company?.vat_rate || 15,
    currency: company?.currency || 'SAR',
    website: company?.website || ''
  })
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <SectionCard title="معلومات الشركة الأساسية" icon={Building2} iconColor="apple-blue">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="form-label">اسم الشركة بالعربية *</label>
            <input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} className="form-input" placeholder="اسم الشركة" />
          </div>
          <div>
            <label className="form-label">اسم الشركة بالإنجليزية</label>
            <input value={form.name_en} onChange={e => set('name_en', e.target.value)} className="form-input" dir="ltr" placeholder="Company Name" />
          </div>
          <div>
            <label className="form-label">رقم الهاتف</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="form-input pr-9" dir="ltr" placeholder="+966 5x xxx xxxx" />
            </div>
          </div>
          <div>
            <label className="form-label">البريد الإلكتروني</label>
            <div className="relative">
              <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.email} onChange={e => set('email', e.target.value)} className="form-input pr-9" dir="ltr" type="email" placeholder="info@company.com" />
            </div>
          </div>
          <div>
            <label className="form-label">الموقع الإلكتروني</label>
            <div className="relative">
              <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.website} onChange={e => set('website', e.target.value)} className="form-input pr-9" dir="ltr" placeholder="https://www.company.com" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="form-label">العنوان</label>
            <div className="relative">
              <MapPin className="absolute right-3 top-3 w-3.5 h-3.5 text-muted-foreground" />
              <textarea value={form.address} onChange={e => set('address', e.target.value)} className="form-input pr-9 resize-none h-16 text-sm" placeholder="المدينة، الحي، الشارع" />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="البيانات الرسمية" icon={FileText} iconColor="apple-indigo">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">الرقم الضريبي</label>
            <input value={form.tax_number} onChange={e => set('tax_number', e.target.value)} className="form-input" dir="ltr" placeholder="3xxxxxxxxxxxxxxxxx" />
          </div>
          <div>
            <label className="form-label">السجل التجاري</label>
            <input value={form.commercial_reg} onChange={e => set('commercial_reg', e.target.value)} className="form-input" dir="ltr" placeholder="1xxxxxxxxx" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="العملة والضريبة" icon={DollarSign} iconColor="apple-green">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">العملة الافتراضية</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className="form-select">
              {[['SAR','ريال سعودي'],['USD','دولار أمريكي'],['AED','درهم إماراتي'],['KWD','دينار كويتي'],['BHD','دينار بحريني'],['OMR','ريال عُماني'],['QAR','ريال قطري'],['EGP','جنيه مصري'],['JOD','دينار أردني']].map(([v,l]) => (
                <option key={v} value={v}>{l} ({v})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">نسبة ضريبة القيمة المضافة %</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.vat_rate} onChange={e => set('vat_rate', parseFloat(e.target.value) || 0)} type="number" className="form-input pl-9" dir="ltr" min="0" max="100" step="0.5" />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={() => onSave(form)} disabled={saving} className="btn-primary gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ إعدادات الشركة
        </button>
      </div>
    </div>
  )
}

function FinancialSection() {
  const [autoJournal, setAutoJournal] = useState(true)
  const [zatca, setZatca] = useState(true)
  const [roundAmounts, setRoundAmounts] = useState(false)
  const [priceIncTax, setPriceIncTax] = useState(false)

  return (
    <div className="space-y-4">
      <SectionCard title="إعدادات الضرائب" icon={Percent} iconColor="apple-red">
        <SettingRow icon={Zap} iconColor="apple-orange" label="القيود اليومية التلقائية" desc="إنشاء قيد محاسبي تلقائياً عند كل عملية">
          <Toggle checked={autoJournal} onChange={setAutoJournal} />
        </SettingRow>
        <SettingRow icon={QrCode} iconColor="apple-blue" label="تفعيل ZATCA (الفوترة الإلكترونية)" desc="توافق مع هيئة الزكاة والضريبة والجمارك">
          <Toggle checked={zatca} onChange={setZatca} />
        </SettingRow>
        <SettingRow icon={Hash} iconColor="apple-purple" label="تقريب المبالغ" desc="تقريب المبالغ لأقرب رقمين عشريين">
          <Toggle checked={roundAmounts} onChange={setRoundAmounts} />
        </SettingRow>
        <SettingRow icon={Tag} iconColor="apple-green" label="الأسعار شاملة الضريبة" desc="عرض الأسعار شاملة لضريبة القيمة المضافة افتراضياً">
          <Toggle checked={priceIncTax} onChange={setPriceIncTax} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="طرق الدفع المتاحة" icon={CreditCard} iconColor="apple-blue">
        {[
          { key: 'cash', label: 'نقدي', desc: 'دفع نقدي مباشر' },
          { key: 'mada', label: 'مدى', desc: 'البطاقات المصرفية مدى' },
          { key: 'transfer', label: 'تحويل بنكي', desc: 'تحويل مصرفي' },
          { key: 'credit', label: 'بطاقة ائتمان', desc: 'Visa / Mastercard' },
          { key: 'deferred', label: 'آجل', desc: 'الدفع الآجل بالأجل' },
        ].map(m => {
          const [on, setOn] = useState(true)
          return (
            <SettingRow key={m.key} label={m.label} desc={m.desc}>
              <Toggle checked={on} onChange={setOn} />
            </SettingRow>
          )
        })}
      </SectionCard>

      <SectionCard title="الحسابات الافتراضية" icon={Layers} iconColor="apple-indigo">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'حساب المبيعات الافتراضي',
            'حساب المشتريات الافتراضي',
            'حساب الصندوق الافتراضي',
            'حساب ضريبة المخرجات',
            'حساب ضريبة المدخلات',
            'حساب الأرباح والخسائر',
          ].map(label => (
            <div key={label}>
              <label className="form-label">{label}</label>
              <select className="form-select text-sm">
                <option>اختر الحساب</option>
              </select>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function UnitsManager() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: units = [], isLoading } = useQuery<{ id: string; name_ar: string; name_en?: string; abbreviation: string; is_active: boolean }[]>({
    queryKey: ['units', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').eq('company_id', user!.company_id).order('name_ar')
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })

  const [form, setForm] = useState({ name_ar: '', name_en: '', abbreviation: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const DEFAULT_UNITS = [
    { name_ar: 'قطعة', name_en: 'Piece', abbreviation: 'قطعة' },
    { name_ar: 'كيلوغرام', name_en: 'Kilogram', abbreviation: 'كغ' },
    { name_ar: 'جرام', name_en: 'Gram', abbreviation: 'غ' },
    { name_ar: 'لتر', name_en: 'Liter', abbreviation: 'لتر' },
    { name_ar: 'متر', name_en: 'Meter', abbreviation: 'م' },
    { name_ar: 'صندوق', name_en: 'Box', abbreviation: 'صندوق' },
    { name_ar: 'دزينة', name_en: 'Dozen', abbreviation: 'دز' },
    { name_ar: 'طن', name_en: 'Ton', abbreviation: 'طن' },
  ]

  const handleSeed = async () => {
    setSaving(true)
    try {
      const rows = DEFAULT_UNITS.map(u => ({ ...u, company_id: user!.company_id, is_active: true }))
      const { error } = await supabase.from('units').upsert(rows, { onConflict: 'company_id,name_ar', ignoreDuplicates: true })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['units'] })
      toast.success('تم إضافة الوحدات الافتراضية')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (!form.name_ar.trim() || !form.abbreviation.trim()) { toast.error('الاسم والاختصار مطلوبان'); return }
    setSaving(true)
    try {
      if (editId) {
        const { error } = await supabase.from('units').update({ name_ar: form.name_ar, name_en: form.name_en, abbreviation: form.abbreviation }).eq('id', editId)
        if (error) throw error
        toast.success('تم تحديث الوحدة')
      } else {
        const { error } = await supabase.from('units').insert({ company_id: user!.company_id, name_ar: form.name_ar, name_en: form.name_en, abbreviation: form.abbreviation, is_active: true })
        if (error) throw error
        toast.success('تم إضافة الوحدة')
      }
      qc.invalidateQueries({ queryKey: ['units'] })
      setForm({ name_ar: '', name_en: '', abbreviation: '' })
      setEditId(null)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('units').update({ is_active: !active }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['units'] })
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('units').delete().eq('id', id)
    if (error) { toast.error('لا يمكن حذف وحدة مستخدمة في منتجات'); return }
    qc.invalidateQueries({ queryKey: ['units'] })
    toast.success('تم الحذف')
  }

  return (
    <SectionCard title="وحدات القياس" icon={Package} iconColor="apple-teal">
      <div className="py-3 space-y-4">
        {/* Add form */}
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="form-label">الاسم بالعربية *</label>
            <input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} className="form-input" placeholder="كيلوغرام" />
          </div>
          <div>
            <label className="form-label">الاختصار *</label>
            <input value={form.abbreviation} onChange={e => setForm(p => ({ ...p, abbreviation: e.target.value }))} className="form-input" placeholder="كغ" dir="ltr" />
          </div>
          <div>
            <label className="form-label">الاسم بالإنجليزية</label>
            <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} className="form-input" placeholder="Kilogram" dir="ltr" />
          </div>
          <div className="col-span-3 flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? 'تحديث الوحدة' : 'إضافة وحدة'}
            </button>
            {editId && (
              <button onClick={() => { setEditId(null); setForm({ name_ar: '', name_en: '', abbreviation: '' }) }} className="btn-outline">إلغاء</button>
            )}
            {units.length === 0 && (
              <button onClick={handleSeed} disabled={saving} className="btn-outline gap-2 mr-auto text-sm">
                <Zap className="w-3.5 h-3.5" />إضافة الوحدات الشائعة تلقائياً
              </button>
            )}
          </div>
        </div>

        {/* Units list */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : units.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-2xl">
            <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد وحدات قياس بعد</p>
            <button onClick={handleSeed} disabled={saving} className="mt-3 btn-primary text-xs gap-1.5">
              <Zap className="w-3.5 h-3.5" />إضافة الوحدات الشائعة
            </button>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الاسم</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الاختصار</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الإنجليزية</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الحالة</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={u.id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{u.name_ar}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{u.abbreviation}</span></td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs" dir="ltr">{u.name_en || '—'}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleToggle(u.id, u.is_active)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors
                          ${u.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {u.is_active ? 'نشط' : 'موقوف'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditId(u.id); setForm({ name_ar: u.name_ar, name_en: u.name_en || '', abbreviation: u.abbreviation }) }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function InventorySection() {
  const [negativeStock, setNegativeStock] = useState(false)
  const [autoReorder, setAutoReorder] = useState(true)
  const [batchTracking, setBatchTracking] = useState(false)
  const [expiryTracking, setExpiryTracking] = useState(true)

  return (
    <div className="space-y-4">
      <UnitsManager />

      <SectionCard title="إعدادات المخزون العامة" icon={Boxes} iconColor="apple-teal">
        <SettingRow icon={AlertTriangle} iconColor="apple-red" label="السماح بالمخزون السالب" desc="السماح ببيع المنتجات عند نفاد المخزون">
          <Toggle checked={negativeStock} onChange={setNegativeStock} />
        </SettingRow>
        <SettingRow icon={Bell} iconColor="apple-orange" label="إعادة الطلب التلقائي" desc="إشعار عند وصول المخزون للحد الأدنى">
          <Toggle checked={autoReorder} onChange={setAutoReorder} />
        </SettingRow>
        <SettingRow icon={Hash} iconColor="apple-purple" label="تتبع الدفعات (Batch)" desc="تتبع المخزون بأرقام الدفعات">
          <Toggle checked={batchTracking} onChange={setBatchTracking} />
        </SettingRow>
        <SettingRow icon={Calendar} iconColor="apple-pink" label="تتبع تواريخ الانتهاء" desc="تنبيهات انتهاء صلاحية المنتجات">
          <Toggle checked={expiryTracking} onChange={setExpiryTracking} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="التسعير والتكلفة" icon={Tag} iconColor="apple-green">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">طريقة احتساب تكلفة المخزون</label>
            <select className="form-select">
              <option value="avg">المتوسط المرجح (WAVG)</option>
              <option value="fifo">الوارد أولاً صادر أولاً (FIFO)</option>
              <option value="lifo">الوارد أخيراً صادر أولاً (LIFO)</option>
              <option value="standard">التكلفة المعيارية</option>
            </select>
          </div>
          <div>
            <label className="form-label">حد التنبيه الافتراضي للمخزون</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={10} min="0" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="الترقيم التلقائي" icon={Hash} iconColor="apple-blue">
        <div className="py-3 grid grid-cols-2 gap-4">
          {[
            { label: 'بادئة الفاتورة', val: 'INV-' },
            { label: 'بادئة المشتريات', val: 'PUR-' },
            { label: 'بادئة قيود اليومية', val: 'JRN-' },
            { label: 'عدد أرقام الرمز', val: '6' },
          ].map(f => (
            <div key={f.label}>
              <label className="form-label">{f.label}</label>
              <input className="form-input" dir="ltr" defaultValue={f.val} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function POSSection() {
  const [requireShift, setRequireShift] = useState(true)
  const [printReceipt, setPrintReceipt] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)
  const [discountLimit, setDiscountLimit] = useState(20)

  return (
    <div className="space-y-4">
      <SectionCard title="إعدادات الوردية" icon={Clock} iconColor="apple-orange">
        <SettingRow icon={Lock} iconColor="apple-red" label="إلزامية فتح الوردية" desc="يجب فتح وردية قبل استخدام نقطة البيع">
          <Toggle checked={requireShift} onChange={setRequireShift} />
        </SettingRow>
        <SettingRow icon={Printer} iconColor="apple-blue" label="طباعة الإيصال تلقائياً" desc="طباعة الإيصال فور إتمام البيع">
          <Toggle checked={printReceipt} onChange={setPrintReceipt} />
        </SettingRow>
        <SettingRow icon={QrCode} iconColor="apple-purple" label="قارئ الباركود" desc="تفعيل قارئ الباركود في نقطة البيع">
          <Toggle checked={showBarcode} onChange={setShowBarcode} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="حدود الخصومات" icon={Percent} iconColor="apple-green">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">أقصى نسبة خصم مسموح بها للكاشير (%)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={discountLimit} onChange={e => setDiscountLimit(+e.target.value)} className="flex-1 accent-primary" />
              <span className="text-sm font-bold text-primary w-10 text-center">{discountLimit}%</span>
            </div>
          </div>
          <div>
            <label className="form-label">حجم الورق الحراري</label>
            <select className="form-select">
              <option value="80mm">80mm (القياسي)</option>
              <option value="58mm">58mm</option>
              <option value="A4">A4</option>
            </select>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function HRSection() {
  const [trackAttendance, setTrackAttendance] = useState(true)
  const [overtimeEnabled, setOvertimeEnabled] = useState(true)
  const [advanceEnabled, setAdvanceEnabled] = useState(true)

  return (
    <div className="space-y-4">
      <SectionCard title="الحضور والانصراف" icon={UserCheck} iconColor="apple-purple">
        <SettingRow icon={Clock} iconColor="apple-blue" label="تتبع الحضور والانصراف" desc="تسجيل أوقات الحضور والانصراف">
          <Toggle checked={trackAttendance} onChange={setTrackAttendance} />
        </SettingRow>
        <SettingRow icon={Zap} iconColor="apple-orange" label="العمل الإضافي" desc="احتساب ساعات العمل الإضافي">
          <Toggle checked={overtimeEnabled} onChange={setOvertimeEnabled} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">وقت بداية الدوام</label>
            <input type="time" className="form-input" dir="ltr" defaultValue="08:00" />
          </div>
          <div>
            <label className="form-label">وقت نهاية الدوام</label>
            <input type="time" className="form-input" dir="ltr" defaultValue="17:00" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="الرواتب والمزايا" icon={Wallet} iconColor="apple-green">
        <SettingRow icon={DollarSign} iconColor="apple-pink" label="السلفيات" desc="السماح للموظفين بطلب سلف">
          <Toggle checked={advanceEnabled} onChange={setAdvanceEnabled} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">دورة الرواتب</label>
            <select className="form-select">
              <option>شهرية</option>
              <option>نصف شهرية</option>
              <option>أسبوعية</option>
            </select>
          </div>
          <div>
            <label className="form-label">نسبة التأمينات الاجتماعية %</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={9.75} step="0.25" />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function UsersSection() {
  return (
    <div className="space-y-4">
      <SectionCard title="سياسة كلمات المرور" icon={Lock} iconColor="apple-red">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">الحد الأدنى لطول كلمة المرور</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={8} min={6} max={32} />
          </div>
          {[
            { label: 'إلزامية الأحرف الكبيرة', id: 'upper' },
            { label: 'إلزامية الأرقام', id: 'nums' },
            { label: 'إلزامية الرموز الخاصة', id: 'symbols' },
          ].map(rule => {
            const [on, setOn] = useState(true)
            return (
              <SettingRow key={rule.id} label={rule.label}>
                <Toggle checked={on} onChange={setOn} />
              </SettingRow>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="إعدادات الجلسات" icon={Activity} iconColor="apple-blue">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">مدة انتهاء الجلسة (دقيقة)</label>
            <select className="form-select">
              <option value="30">30 دقيقة</option>
              <option value="60">ساعة واحدة</option>
              <option value="120">ساعتان</option>
              <option value="480">8 ساعات</option>
              <option value="0">بدون انتهاء</option>
            </select>
          </div>
          <div>
            <label className="form-label">الحد الأقصى لمحاولات الدخول الفاشلة</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={5} min={3} max={10} />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function PrintSection() {
  const [showLogo, setShowLogo] = useState(true)
  const [showQR, setShowQR] = useState(true)
  const [showVatBreakdown, setShowVatBreakdown] = useState(true)
  const [footerNote, setFooterNote] = useState('شكراً لتعاملكم معنا')

  return (
    <div className="space-y-4">
      <SectionCard title="إعدادات قالب الفاتورة" icon={FileText} iconColor="apple-indigo">
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
              <option selected>متوسط</option>
              <option>كبير</option>
            </select>
          </div>
          <div>
            <label className="form-label">نوع الورق</label>
            <select className="form-select">
              <option>80mm حراري</option>
              <option>58mm حراري</option>
              <option>A4</option>
              <option>A5</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="form-label">نص تذييل الفاتورة</label>
            <input value={footerNote} onChange={e => setFooterNote(e.target.value)} className="form-input" placeholder="شكراً لتعاملكم معنا" />
          </div>
        </div>
      </SectionCard>

      {/* Live preview card */}
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
    </div>
  )
}

function IntegrationsSection() {
  const [waEnabled, setWaEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [showToken, setShowToken] = useState(false)

  return (
    <div className="space-y-4">
      <SectionCard title="واتساب كلاود" icon={MessageSquare} iconColor="apple-green">
        <SettingRow icon={Smartphone} iconColor="apple-green" label="تفعيل WhatsApp API" desc="إرسال الفواتير والإشعارات عبر WhatsApp">
          <Toggle checked={waEnabled} onChange={setWaEnabled} />
        </SettingRow>
        {waEnabled && (
          <div className="py-3 space-y-3">
            <div>
              <label className="form-label">WhatsApp Token</label>
              <div className="relative">
                <input type={showToken ? 'text' : 'password'} className="form-input pl-10" dir="ltr" placeholder="EAAxxxxx..." />
                <button onClick={() => setShowToken(!showToken)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Phone Number ID</label>
              <input className="form-input" dir="ltr" placeholder="1234567890" />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="البريد الإلكتروني SMTP" icon={Mail} iconColor="apple-blue">
        <SettingRow icon={Mail} iconColor="apple-blue" label="تفعيل البريد الإلكتروني" desc="إرسال الفواتير والتقارير بالبريد">
          <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
        </SettingRow>
        {emailEnabled && (
          <div className="py-3 grid grid-cols-2 gap-3">
            {[
              { label: 'SMTP Host', ph: 'smtp.gmail.com', ltr: true },
              { label: 'SMTP Port', ph: '587', ltr: true },
              { label: 'اسم المستخدم', ph: 'user@gmail.com', ltr: true },
              { label: 'كلمة المرور', ph: '••••••••', ltr: true, pw: true },
            ].map(f => (
              <div key={f.label}>
                <label className="form-label">{f.label}</label>
                <input type={f.pw ? 'password' : 'text'} className="form-input" dir={f.ltr ? 'ltr' : 'rtl'} placeholder={f.ph} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="الرسائل النصية SMS" icon={Smartphone} iconColor="apple-orange">
        <SettingRow icon={Smartphone} iconColor="apple-orange" label="تفعيل الرسائل النصية" desc="إرسال إشعارات SMS للعملاء">
          <Toggle checked={smsEnabled} onChange={setSmsEnabled} />
        </SettingRow>
        {smsEnabled && (
          <div className="py-3 space-y-3">
            <div>
              <label className="form-label">مزود الخدمة</label>
              <select className="form-select">
                <option>Unifonic</option>
                <option>Msegat</option>
                <option>Taqnyat</option>
              </select>
            </div>
            <div>
              <label className="form-label">API Key</label>
              <input className="form-input" dir="ltr" placeholder="sk_xxxxxxxxxxxxx" />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function SecuritySection() {
  const [twoFA, setTwoFA] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)

  return (
    <div className="space-y-4">
      <SectionCard title="تغيير كلمة المرور" icon={Key} iconColor="apple-red">
        <div className="py-3 space-y-3">
          {[
            { label: 'كلمة المرور الحالية', val: currentPw, set: setCurrentPw },
            { label: 'كلمة المرور الجديدة', val: newPw, set: setNewPw },
            { label: 'تأكيد كلمة المرور', val: confirmPw, set: setConfirmPw },
          ].map(f => (
            <div key={f.label}>
              <label className="form-label">{f.label}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)} className="form-input pl-10" dir="ltr" />
                <button onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
          <button className="btn-primary gap-2 mt-1">
            <Save className="w-4 h-4" />تحديث كلمة المرور
          </button>
        </div>
      </SectionCard>

      <SectionCard title="الأمان المتقدم" icon={Shield} iconColor="apple-indigo">
        <SettingRow icon={Smartphone} iconColor="apple-blue" label="المصادقة الثنائية (2FA)" desc="طبقة حماية إضافية عبر رمز OTP">
          <Toggle checked={twoFA} onChange={setTwoFA} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="النسخ الاحتياطي" icon={Database} iconColor="apple-teal">
        <SettingRow icon={HardDrive} iconColor="apple-green" label="النسخ الاحتياطي التلقائي" desc="Supabase يحتفظ بنسخة احتياطية يومية">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[12px] font-medium text-emerald-600">نشط</span>
          </div>
        </SettingRow>
        <div className="py-3 flex flex-wrap gap-2">
          <button className="btn-outline text-xs gap-2"><Download className="w-3.5 h-3.5" />تصدير JSON</button>
          <button className="btn-outline text-xs gap-2"><Download className="w-3.5 h-3.5" />تصدير Excel</button>
          <button className="btn-outline text-xs gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Upload className="w-3.5 h-3.5" />استيراد نسخة احتياطية
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="space-y-4">
      <SectionCard title="وضع العرض" icon={Palette} iconColor="apple-purple">
        <div className="py-4 grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'فاتح', icon: Sun, preview: 'bg-[#F5F5F7] border border-zinc-200' },
            { value: 'dark',  label: 'داكن', icon: Moon, preview: 'bg-zinc-900 border border-zinc-700' },
            { value: 'system',label: 'تلقائي', icon: Monitor, preview: 'bg-gradient-to-l from-zinc-900 to-[#F5F5F7] border border-zinc-300' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setTheme(opt.value as any)}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all
                ${theme === opt.value
                  ? 'border-primary bg-primary/5 shadow-[0_0_0_4px_rgba(0,122,255,0.12)]'
                  : 'border-border hover:border-primary/40'}`}>
              <div className={`w-14 h-9 rounded-xl ${opt.preview}`} />
              <div className="flex items-center gap-1.5">
                <opt.icon className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">{opt.label}</span>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function SettingsPage() {
  const { user, company } = useAuthStore()
  const qc = useQueryClient()

  const [activeSection, setActiveSection] = useState<SectionId>('company')
  const [activeSubId, setActiveSubId] = useState('company-info')
  const [search, setSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<SectionId[]>(['company'])

  // Flatten all items for search
  const allItems = useMemo(() =>
    NAV_GROUPS.flatMap(g => g.items.map(i => ({ ...i, section: g.id, groupLabel: g.label }))),
    []
  )

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allItems.filter(i => i.label.toLowerCase().includes(q) || i.groupLabel.toLowerCase().includes(q))
  }, [search, allItems])

  const saveCompany = useMutation({
    mutationFn: async (data: Record<string,unknown>) => {
      const { error } = await supabase.from('companies').update(data).eq('id', company!.id)
      if (error) throw error
    },
    onSuccess: () => toast.success('تم حفظ إعدادات الشركة'),
    onError: (e: Error) => toast.error(e.message)
  })

  const toggleGroup = (id: SectionId) => {
    setExpandedGroups(p =>
      p.includes(id) ? p.filter(g => g !== id) : [...p, id]
    )
    setActiveSection(id)
  }

  const activeGroup = NAV_GROUPS.find(g => g.id === activeSection)!

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden -m-4 md:-m-6">

      {/* ── LEFT NAV ── */}
      <aside className="w-56 shrink-0 border-l border-border/50 bg-card flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الإعدادات..."
              className="w-full pr-8 pl-3 py-1.5 text-[12px] bg-muted rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Search results */}
        {search && (
          <div className="absolute top-32 right-0 w-56 z-50 bg-card border border-border rounded-2xl shadow-xl p-2 max-h-64 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-4">لا نتائج</p>
            ) : searchResults.map(r => (
              <button key={r.id} onClick={() => {
                setActiveSection(r.section as SectionId)
                setActiveSubId(r.id)
                setExpandedGroups(p => p.includes(r.section as SectionId) ? p : [...p, r.section as SectionId])
                setSearch('')
              }}
                className="flex flex-col w-full px-3 py-2 rounded-xl hover:bg-muted text-right">
                <span className="text-[12px] font-medium">{r.label}</span>
                <span className="text-[10px] text-muted-foreground">{r.groupLabel}</span>
              </button>
            ))}
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 scrollbar-none">
          {NAV_GROUPS.map(group => {
            const isOpen = expandedGroups.includes(group.id)
            const isActive = activeSection === group.id
            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-[12px] font-semibold transition-all
                    ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  <span className={`icon-badge-sm ${group.iconColor}`}>
                    <group.icon className="w-3 h-3 text-white" />
                  </span>
                  <span className="flex-1 text-right">{group.label}</span>
                  <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${isOpen ? '-rotate-90' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden mr-4 pr-2 border-r-2 border-border/40"
                    >
                      {group.items.map(item => (
                        <button key={item.id}
                          onClick={() => { setActiveSection(group.id); setActiveSubId(item.id) }}
                          className={`flex items-center w-full px-2.5 py-1.5 rounded-xl text-[12px] transition-colors text-right
                            ${activeSubId === item.id && activeSection === group.id
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* ── CENTER CONTENT ── */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Section header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-3.5 flex items-center gap-3">
          <span className={`icon-badge ${activeGroup.iconColor}`}>
            <activeGroup.icon className="w-4 h-4 text-white" />
          </span>
          <div>
            <h1 className="text-[15px] font-bold">{activeGroup.label}</h1>
            <p className="text-[11px] text-muted-foreground">{activeGroup.items.length} قسم</p>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeSection === 'company'      && <CompanySection company={company} onSave={d => saveCompany.mutate(d)} saving={saveCompany.isPending} />}
              {activeSection === 'financial'    && <FinancialSection />}
              {activeSection === 'inventory'    && <InventorySection />}
              {activeSection === 'pos'          && <POSSection />}
              {activeSection === 'hr'           && <HRSection />}
              {activeSection === 'users'        && <UsersSection />}
              {activeSection === 'print'        && <PrintSection />}
              {activeSection === 'integrations' && <IntegrationsSection />}
              {activeSection === 'security'     && <SecuritySection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── RIGHT PANEL ── */}
      <aside className="w-52 shrink-0 border-r border-border/50 bg-card flex flex-col overflow-y-auto p-3 gap-3">

        {/* System Status */}
        <div className="bg-muted/40 rounded-2xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">حالة النظام</p>
          <StatusDot ok={true}  label="قاعدة البيانات" />
          <StatusDot ok={true}  label="Supabase API" />
          <StatusDot ok={true}  label="التخزين" />
          <StatusDot ok={false} label="Firebase" />
        </div>

        {/* Quick actions */}
        <div className="bg-muted/40 rounded-2xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">إجراءات سريعة</p>
          <div className="space-y-1.5">
            <button
              onClick={() => { if (activeSection === 'company') saveCompany.mutate({}); else toast.success('تم حفظ الإعدادات') }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-primary hover:bg-primary/10">
              <Save className="w-3.5 h-3.5 shrink-0" />حفظ التغييرات
            </button>
            <button
              onClick={async () => {
                if (!confirm('هل تريد استعادة الإعدادات الافتراضية؟')) return
                toast.success('تم استعادة الإعدادات الافتراضية')
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />استعادة الافتراضي
            </button>
            <button
              onClick={async () => {
                try {
                  const { data: companyData } = await supabase.from('companies').select('*').eq('id', company!.id).single()
                  const { data: unitsData } = await supabase.from('units').select('*').eq('company_id', user!.company_id)
                  const exportData = { company: companyData, units: unitsData, exported_at: new Date().toISOString() }
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `settings-${new Date().toISOString().slice(0,10)}.json`; a.click()
                  URL.revokeObjectURL(url)
                  toast.success('تم تصدير الإعدادات')
                } catch { toast.error('فشل التصدير') }
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
              <Download className="w-3.5 h-3.5 shrink-0" />تصدير الإعدادات
            </button>
            <label className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
              <Upload className="w-3.5 h-3.5 shrink-0" />استيراد الإعدادات
              <input type="file" accept=".json" className="hidden" onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return
                try {
                  const text = await file.text()
                  const data = JSON.parse(text)
                  if (data.company) { await supabase.from('companies').update(data.company).eq('id', company!.id); qc.invalidateQueries() }
                  toast.success('تم استيراد الإعدادات بنجاح')
                } catch { toast.error('ملف غير صالح') }
                e.target.value = ''
              }} />
            </label>
            <button
              onClick={async () => {
                toast.loading('جاري اختبار الاتصال...', { id: 'test' })
                try {
                  const { error } = await supabase.from('companies').select('id').limit(1)
                  if (error) throw error
                  toast.success('الاتصال بقاعدة البيانات يعمل بشكل صحيح ✓', { id: 'test' })
                } catch { toast.error('فشل الاتصال بقاعدة البيانات', { id: 'test' }) }
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20">
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />اختبار النظام
            </button>
          </div>
        </div>

        {/* User info */}
        <div className="bg-muted/40 rounded-2xl p-3 mt-auto">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">المستخدم الحالي</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full gradient-blue flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {user?.full_name?.charAt(0) || 'م'}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold truncate">{user?.full_name}</p>
              <p className="text-[10px] text-muted-foreground">{user?.role === 'admin' ? 'مدير النظام' : user?.role}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] text-emerald-600 font-medium">صلاحية كاملة</span>
          </div>
        </div>

      </aside>
    </div>
  )
}
