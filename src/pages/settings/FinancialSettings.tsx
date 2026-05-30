import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Percent, CreditCard, Layers, Zap, QrCode, Hash, Tag, BookOpen, Save, Loader2, RefreshCw } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

// ─── Default chart fallback (detail accounts only) ────────────────────────────
const FALLBACK_ACCOUNTS = [
  // أصول
  { code:'1111', name_ar:'صندوق المقر الرئيسي',            type:'asset'    },
  { code:'1112', name_ar:'صندوق الفروع',                   type:'asset'    },
  { code:'1121', name_ar:'بنك الراجحي - جاري',             type:'asset'    },
  { code:'1122', name_ar:'البنك الأهلي - جاري',            type:'asset'    },
  { code:'1123', name_ar:'بنك الرياض - جاري',              type:'asset'    },
  { code:'1131', name_ar:'ذمم عملاء محليون',               type:'asset'    },
  { code:'1132', name_ar:'ذمم عملاء دوليون',               type:'asset'    },
  { code:'1151', name_ar:'مخزون بضائع',                    type:'asset'    },
  { code:'1152', name_ar:'مخزون مواد خام',                 type:'asset'    },
  { code:'1161', name_ar:'إيجار مدفوع مقدماً',             type:'asset'    },
  { code:'1170', name_ar:'ضريبة القيمة المضافة المدخلات',  type:'asset'    },
  { code:'1180', name_ar:'دفعات مقدمة للموردين',           type:'asset'    },
  // خصوم
  { code:'2111', name_ar:'ذمم موردين محليون',              type:'liability' },
  { code:'2140', name_ar:'ضريبة القيمة المضافة المخرجات',  type:'liability' },
  { code:'2150', name_ar:'رواتب وأجور مستحقة',             type:'liability' },
  { code:'2160', name_ar:'مصروفات مستحقة الدفع',           type:'liability' },
  // حقوق ملكية
  { code:'3110', name_ar:'رأس المال المدفوع',              type:'equity'   },
  { code:'3150', name_ar:'الأرباح المبقاة',                type:'equity'   },
  { code:'3160', name_ar:'أرباح (خسائر) العام الحالي',     type:'equity'   },
  // إيرادات
  { code:'4110', name_ar:'مبيعات البضائع والمنتجات',       type:'revenue'  },
  { code:'4120', name_ar:'مبيعات الخدمات',                 type:'revenue'  },
  // تكلفة المبيعات
  { code:'5110', name_ar:'تكلفة مبيعات البضائع',           type:'expense'  },
  { code:'5120', name_ar:'مشتريات البضائع والمواد',        type:'expense'  },
  // مصروفات
  { code:'6210', name_ar:'الرواتب والأجور - إداريون',      type:'expense'  },
  { code:'6220', name_ar:'الإيجارات',                      type:'expense'  },
  { code:'6280', name_ar:'مخصص استهلاك الأصول',            type:'expense'  },
  { code:'6350', name_ar:'مصروفات متنوعة إدارية',          type:'expense'  },
  { code:'6410', name_ar:'فوائد القروض والتمويل',           type:'expense'  },
  { code:'6420', name_ar:'الرسوم والعمولات البنكية',        type:'expense'  },
]

const TYPE_LABEL: Record<string, string> = {
  asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات',
}

// ─── Account selector dropdown ────────────────────────────────────────────────
function AccountSelect({
  value, onChange, accounts, placeholder = 'اختر الحساب'
}: {
  value: string
  onChange: (v: string) => void
  accounts: { code: string; name_ar: string; type: string }[]
  placeholder?: string
}) {
  const grouped = ['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => ({
    type, label: TYPE_LABEL[type], items: accounts.filter(a => a.type === type)
  })).filter(g => g.items.length > 0)

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="form-select text-sm"
    >
      <option value="">{placeholder}</option>
      {grouped.map(group => (
        <optgroup key={group.type} label={`── ${group.label} ──`}>
          {group.items.map(a => (
            <option key={a.code} value={a.code}>
              {a.code} — {a.name_ar}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

// ─── LS key for settings ──────────────────────────────────────────────────────
const LS_FIN_SETTINGS = 'financial_default_accounts'

function loadLocalSettings() {
  try { return JSON.parse(localStorage.getItem(LS_FIN_SETTINGS) || '{}') } catch { return {} }
}
function saveLocalSettings(s: Record<string, string>) {
  localStorage.setItem(LS_FIN_SETTINGS, JSON.stringify(s))
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FinancialSettings() {
  const { sub } = useParams<{ sub: string }>()
  const { user } = useAuthStore()

  // ── General toggles ──
  const [autoJournal, setAutoJournal] = useState(true)
  const [zatca, setZatca]             = useState(true)
  const [roundAmounts, setRoundAmounts] = useState(false)
  const [priceIncTax, setPriceIncTax] = useState(false)
  const [cash, setCash]               = useState(true)
  const [mada, setMada]               = useState(true)
  const [transfer, setTransfer]       = useState(true)
  const [credit, setCredit]           = useState(true)
  const [deferred, setDeferred]       = useState(true)
  const [visa, setVisa]               = useState(true)
  const [stc, setStc]                 = useState(false)
  const [autoPost, setAutoPost]       = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)

  // ── Default accounts ──
  const DEFAULT_KEYS = [
    { key: 'sales_account',         label: 'حساب المبيعات الافتراضي',        hint: 'يُقيَّد فيه إيراد المبيعات'                },
    { key: 'purchases_account',     label: 'حساب المشتريات الافتراضي',       hint: 'يُقيَّد فيه تكلفة المشتريات'               },
    { key: 'cash_account',          label: 'حساب الصندوق الافتراضي',         hint: 'يمثل النقدية في الصندوق'                   },
    { key: 'vat_output_account',    label: 'حساب ضريبة المخرجات (المحصلة)',  hint: 'ضريبة القيمة المضافة على المبيعات'          },
    { key: 'vat_input_account',     label: 'حساب ضريبة المدخلات (المدفوعة)', hint: 'ضريبة القيمة المضافة على المشتريات'        },
    { key: 'pnl_account',           label: 'حساب الأرباح والخسائر',          hint: 'يُستخدم عند إقفال الفترة المحاسبية'        },
    { key: 'inventory_account',     label: 'حساب المخزون الافتراضي',         hint: 'يُمثل قيمة البضائع في المخزن'              },
    { key: 'expenses_account',      label: 'حساب المصروفات العامة',          hint: 'للمصروفات التي لا تنتمي لمركز تكلفة محدد'  },
    { key: 'ar_account',            label: 'حساب الذمم المدينة',             hint: 'ذمم العملاء'                               },
    { key: 'ap_account',            label: 'حساب الذمم الدائنة',             hint: 'ذمم الموردين'                              },
  ]

  const [acctVals, setAcctVals] = useState<Record<string, string>>(loadLocalSettings)

  // ── Load accounts from Supabase ──
  const { data: dbAccounts = [], isLoading: acctLoading, refetch } = useQuery({
    queryKey: ['accounts-for-settings', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('accounts')
        .select('code, name_ar, type')
        .eq('company_id', user.company_id)
        .eq('is_active', true)
        .eq('is_detail', true)
        .order('code')
      if (error || !data?.length) return []
      return data as { code: string; name_ar: string; type: string }[]
    },
    enabled: !!user && sub === 'accounts',
  })

  const accounts = dbAccounts.length > 0 ? dbAccounts : FALLBACK_ACCOUNTS

  const setAcct = (key: string, val: string) =>
    setAcctVals(prev => ({ ...prev, [key]: val }))

  const saveAccounts = async () => {
    saveLocalSettings(acctVals)
    // Try saving to Supabase company settings if table exists
    try {
      if (user) {
        await supabase.from('company_settings').upsert({
          company_id: user.company_id,
          key: 'default_accounts',
          value: JSON.stringify(acctVals),
        }, { onConflict: 'company_id,key' })
      }
    } catch { /* local save is enough */ }
    toast.success('تم حفظ الحسابات الافتراضية بنجاح')
  }

  // Load from company_settings on mount
  useEffect(() => {
    if (!user || sub !== 'accounts') return
    Promise.resolve(
      supabase.from('company_settings')
        .select('value').eq('company_id', user.company_id).eq('key', 'default_accounts')
        .maybeSingle()
    ).then(({ data }) => {
      if (data?.value) {
        try { setAcctVals(JSON.parse(data.value)) } catch { /* use localStorage */ }
      }
    }).catch(() => { /* use localStorage */ })
  }, [user, sub])

  const SaveBtn = ({ onSave }: { onSave?: () => void }) => (
    <div className="flex justify-end pt-2">
      <button onClick={onSave ?? (() => toast.success('تم حفظ الإعدادات'))} className="btn-primary gap-2">
        <Save className="w-4 h-4" />حفظ التغييرات
      </button>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  if (sub === 'tax') return (
    <div className="space-y-4">
      <SectionCard title="إعدادات الضريبة والزكاة" icon={Percent} iconColor="apple-red">
        <SettingRow icon={QrCode} iconColor="apple-blue" label="تفعيل ZATCA (الفوترة الإلكترونية)" desc="توافق مع هيئة الزكاة والضريبة والجمارك">
          <Toggle checked={zatca} onChange={setZatca} />
        </SettingRow>
        <SettingRow icon={Hash} iconColor="apple-purple" label="تقريب المبالغ" desc="تقريب المبالغ لأقرب رقمين عشريين">
          <Toggle checked={roundAmounts} onChange={setRoundAmounts} />
        </SettingRow>
        <SettingRow icon={Tag} iconColor="apple-green" label="الأسعار شاملة الضريبة" desc="عرض الأسعار شاملة لضريبة القيمة المضافة افتراضياً">
          <Toggle checked={priceIncTax} onChange={setPriceIncTax} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">طريقة احتساب الضريبة</label>
            <select className="form-select">
              <option>ضريبة القيمة المضافة (VAT) — 15%</option>
              <option>الزكاة — 2.5%</option>
              <option>معفى من الضريبة</option>
            </select>
          </div>
          <div>
            <label className="form-label">رقم تسجيل ضريبي (VATID)</label>
            <input className="form-input" dir="ltr" placeholder="30XXXXXXXXXXX003" />
          </div>
          <div>
            <label className="form-label">رقم تسجيل ZATCA</label>
            <input className="form-input" dir="ltr" placeholder="ZATCA-XXXXX" />
          </div>
          <div>
            <label className="form-label">دورة تقديم الإقرارات</label>
            <select className="form-select">
              <option>شهرية</option>
              <option>ربع سنوية</option>
              <option>سنوية</option>
            </select>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  if (sub === 'accounts') return (
    <div className="space-y-4">
      <SectionCard title="الحسابات الافتراضية" icon={Layers} iconColor="apple-indigo">

        {/* Header info */}
        <div className="flex items-center justify-between py-2 mb-2">
          <p className="text-xs text-muted-foreground">
            {dbAccounts.length > 0
              ? `تم تحميل ${dbAccounts.length} حساب من قاعدة البيانات`
              : `يتم عرض الحسابات الافتراضية — اضغط "تحميل الشجرة" في صفحة شجرة الحسابات لربطها بقاعدة البيانات`}
          </p>
          <button onClick={() => refetch()} disabled={acctLoading}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            {acctLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            تحديث الحسابات
          </button>
        </div>

        {/* Account selectors grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pb-3">
          {DEFAULT_KEYS.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="form-label">
                {label}
                <span className="text-[10px] text-muted-foreground font-normal mr-1">({hint})</span>
              </label>
              {acctLoading ? (
                <div className="skeleton h-9 rounded-lg" />
              ) : (
                <AccountSelect
                  value={acctVals[key] ?? ''}
                  onChange={v => setAcct(key, v)}
                  accounts={accounts}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current selections summary */}
        {Object.keys(acctVals).length > 0 && (
          <div className="border-t border-border/50 pt-4 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">الحسابات المختارة حالياً:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DEFAULT_KEYS.filter(d => acctVals[d.key]).map(({ key, label }) => {
                const acc = accounts.find(a => a.code === acctVals[key])
                return acc ? (
                  <div key={key} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <span className="font-mono text-[10px] text-primary font-bold">{acc.code}</span>
                    <span className="text-[11px] truncate">{acc.name_ar}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}
      </SectionCard>
      <SaveBtn onSave={saveAccounts} />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  if (sub === 'payments') return (
    <div className="space-y-4">
      <SectionCard title="طرق الدفع المتاحة" icon={CreditCard} iconColor="apple-blue">
        <SettingRow label="نقدي" desc="دفع نقدي مباشر"><Toggle checked={cash} onChange={setCash} /></SettingRow>
        <SettingRow label="مدى" desc="البطاقات المصرفية مدى"><Toggle checked={mada} onChange={setMada} /></SettingRow>
        <SettingRow label="تحويل بنكي" desc="تحويل مصرفي"><Toggle checked={transfer} onChange={setTransfer} /></SettingRow>
        <SettingRow label="بطاقة ائتمان" desc="Visa / Mastercard"><Toggle checked={credit} onChange={setCredit} /></SettingRow>
        <SettingRow label="Visa / Master" desc="بطاقات دولية"><Toggle checked={visa} onChange={setVisa} /></SettingRow>
        <SettingRow label="STC Pay" desc="محفظة STC الإلكترونية"><Toggle checked={stc} onChange={setStc} /></SettingRow>
        <SettingRow label="آجل" desc="الدفع الآجل بالأجل"><Toggle checked={deferred} onChange={setDeferred} /></SettingRow>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  if (sub === 'journal') return (
    <div className="space-y-4">
      <SectionCard title="إعدادات القيود اليومية" icon={BookOpen} iconColor="apple-teal">
        <SettingRow icon={Zap} iconColor="apple-orange" label="القيود التلقائية" desc="إنشاء قيد محاسبي تلقائياً عند كل عملية">
          <Toggle checked={autoJournal} onChange={setAutoJournal} />
        </SettingRow>
        <SettingRow icon={QrCode} iconColor="apple-purple" label="يتطلب موافقة قبل الترحيل" desc="مراجعة القيد قبل ترحيله للحسابات">
          <Toggle checked={requireApproval} onChange={setRequireApproval} />
        </SettingRow>
        <SettingRow icon={Hash} iconColor="apple-blue" label="ترحيل تلقائي" desc="ترحيل القيود تلقائياً عند الحفظ">
          <Toggle checked={autoPost} onChange={setAutoPost} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">بادئة رقم القيد</label>
            <input className="form-input" dir="ltr" defaultValue="JRN-" />
          </div>
          <div>
            <label className="form-label">بادئة رقم القيد التلقائي</label>
            <input className="form-input" dir="ltr" defaultValue="AUTO-" />
          </div>
          <div>
            <label className="form-label">دفتر اليومية الافتراضي</label>
            <select className="form-select">
              <option>اليومية العامة</option>
              <option>يومية المبيعات</option>
              <option>يومية المشتريات</option>
              <option>يومية الصندوق</option>
              <option>يومية البنك</option>
            </select>
          </div>
          <div>
            <label className="form-label">عملة القيود الافتراضية</label>
            <select className="form-select">
              <option>ريال سعودي (SAR)</option>
              <option>دولار أمريكي (USD)</option>
              <option>يورو (EUR)</option>
            </select>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  return null
}
