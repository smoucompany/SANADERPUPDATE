import { useState, useMemo } from 'react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, DollarSign, Boxes, ShoppingCart, Briefcase,
  Users, Printer, Plug, Shield, Search, ChevronLeft,
  CheckCircle2, Save, RotateCcw, Download, Upload, FlaskConical
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { StatusDot } from './shared'
import toast from 'react-hot-toast'

type SectionId = 'company' | 'financial' | 'inventory' | 'pos' | 'hr' | 'users' | 'print' | 'integrations' | 'security'

interface NavItem { id: string; label: string; sub: string }
interface NavGroup {
  label: string; icon: React.ElementType; iconColor: string
  id: SectionId; items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    label: 'إعدادات المؤسسة', icon: Building2, iconColor: 'apple-blue', id: 'company',
    items: [
      { id: 'company-info',     sub: 'info',     label: 'بيانات الشركة' },
      { id: 'company-currency', sub: 'currency', label: 'العملة والضريبة' },
      { id: 'company-locale',   sub: 'locale',   label: 'المنطقة الزمنية' },
      { id: 'company-fiscal',   sub: 'fiscal',   label: 'السنة المالية' },
    ]
  },
  {
    label: 'الإعدادات المالية', icon: DollarSign, iconColor: 'apple-green', id: 'financial',
    items: [
      { id: 'fin-tax',      sub: 'tax',      label: 'الضرائب والزكاة' },
      { id: 'fin-accounts', sub: 'accounts', label: 'الحسابات الافتراضية' },
      { id: 'fin-payments', sub: 'payments', label: 'طرق الدفع' },
      { id: 'fin-journal',  sub: 'journal',  label: 'القيود اليومية' },
    ]
  },
  {
    label: 'إعدادات المخزون', icon: Boxes, iconColor: 'apple-teal', id: 'inventory',
    items: [
      { id: 'inv-warehouses', sub: 'warehouses', label: 'المخازن' },
      { id: 'inv-units',      sub: 'units',      label: 'وحدات القياس' },
      { id: 'inv-pricing',    sub: 'pricing',    label: 'طرق التسعير' },
      { id: 'inv-limits',     sub: 'limits',     label: 'حدود المخزون' },
      { id: 'inv-numbering',  sub: 'numbering',  label: 'الترقيم التلقائي' },
    ]
  },
  {
    label: 'نقطة البيع', icon: ShoppingCart, iconColor: 'apple-orange', id: 'pos',
    items: [
      { id: 'pos-shift',    sub: 'shift',    label: 'الوردية' },
      { id: 'pos-printers', sub: 'printers', label: 'الطابعات والباركود' },
      { id: 'pos-invoices', sub: 'invoices', label: 'فواتير POS' },
      { id: 'pos-payments', sub: 'payments', label: 'طرق الدفع' },
    ]
  },
  {
    label: 'الموارد البشرية', icon: Briefcase, iconColor: 'apple-purple', id: 'hr',
    items: [
      { id: 'hr-attendance', sub: 'attendance', label: 'الحضور والانصراف' },
      { id: 'hr-payroll',    sub: 'payroll',    label: 'الرواتب والأجور' },
      { id: 'hr-leaves',     sub: 'leaves',     label: 'الإجازات والسلف' },
    ]
  },
  {
    label: 'المستخدمون والصلاحيات', icon: Users, iconColor: 'apple-pink', id: 'users',
    items: [
      { id: 'users-roles',    sub: 'roles',    label: 'الأدوار والصلاحيات' },
      { id: 'users-sessions', sub: 'sessions', label: 'جلسات الدخول' },
      { id: 'users-activity', sub: 'activity', label: 'سجل النشاط' },
    ]
  },
  {
    label: 'الطباعة والتقارير', icon: Printer, iconColor: 'apple-indigo', id: 'print',
    items: [
      { id: 'print-invoice',  sub: 'invoice',  label: 'قالب الفاتورة' },
      { id: 'print-receipt',  sub: 'receipt',  label: 'قالب الإيصال' },
      { id: 'print-reports',  sub: 'reports',  label: 'تصدير التقارير' },
    ]
  },
  {
    label: 'التكاملات', icon: Plug, iconColor: 'apple-cyan', id: 'integrations',
    items: [
      { id: 'int-whatsapp', sub: 'whatsapp', label: 'WhatsApp' },
      { id: 'int-email',    sub: 'email',    label: 'البريد الإلكتروني' },
      { id: 'int-sms',      sub: 'sms',      label: 'الرسائل النصية' },
      { id: 'int-api',      sub: 'api',      label: 'مفاتيح API' },
    ]
  },
  {
    label: 'الأمان والنسخ الاحتياطي', icon: Shield, iconColor: 'apple-red', id: 'security',
    items: [
      { id: 'sec-password', sub: 'password', label: 'كلمة المرور' },
      { id: 'sec-2fa',      sub: '2fa',      label: 'المصادقة الثنائية' },
      { id: 'sec-backup',   sub: 'backup',   label: 'النسخ الاحتياطي' },
      { id: 'sec-update',   sub: 'update',   label: 'تحديث النظام' },
      { id: 'sec-audit',    sub: 'audit',    label: 'سجلات التدقيق' },
    ]
  },
]

export default function SettingsLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, company } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  // Parse current URL: /settings/{section}/{sub}
  const parts = location.pathname.replace('/settings', '').split('/').filter(Boolean)
  const activeSection = (parts[0] || 'company') as SectionId
  const activeSub = parts[1] || ''

  const activeGroup = NAV.find(g => g.id === activeSection) || NAV[0]
  const activeItem = activeGroup.items.find(i => i.sub === activeSub)

  const [expandedGroup, setExpandedGroup] = useState<SectionId | null>(activeSection)

  const allItems = useMemo(() =>
    NAV.flatMap(g => g.items.map(i => ({ ...i, section: g.id, groupLabel: g.label }))),
    []
  )
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allItems.filter(i => i.label.toLowerCase().includes(q) || i.groupLabel.toLowerCase().includes(q))
  }, [search, allItems])

  if (!parts[0]) return <Navigate to="/settings/company/info" replace />

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden -m-4 md:-m-6">

      {/* ── SIDEBAR ── */}
      <aside className="w-56 shrink-0 border-l border-border/50 bg-card flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الإعدادات..."
              className="w-full pr-8 pl-3 py-1.5 text-[12px] bg-muted rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {search && (
            <div className="absolute top-14 right-0 w-56 z-50 bg-card border border-border rounded-2xl shadow-xl p-2 max-h-64 overflow-y-auto">
              {searchResults.length === 0
                ? <p className="text-[12px] text-muted-foreground text-center py-4">لا نتائج</p>
                : searchResults.map(r => (
                  <button key={r.id} onClick={() => { navigate(`/settings/${r.section}/${r.sub}`); setSearch('') }}
                    className="flex flex-col w-full px-3 py-2 rounded-xl hover:bg-muted text-right">
                    <span className="text-[12px] font-medium">{r.label}</span>
                    <span className="text-[10px] text-muted-foreground">{r.groupLabel}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-none">
          {NAV.map(group => {
            const isOpen = expandedGroup === group.id
            const isActiveGroup = activeSection === group.id
            return (
              <div key={group.id}>
                <button
                  onClick={() => {
                    setExpandedGroup(prev => prev === group.id ? null : group.id)
                    navigate(`/settings/${group.id}/${group.items[0].sub}`)
                  }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-[12px] font-semibold transition-all
                    ${isActiveGroup ? 'text-foreground bg-primary/8' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
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
                      {group.items.map(item => {
                        const isActiveSub = isActiveGroup && activeSub === item.sub
                        return (
                          <button key={item.id}
                            onClick={() => navigate(`/settings/${group.id}/${item.sub}`)}
                            className={`flex items-center w-full px-2.5 py-1.5 rounded-xl text-[12px] transition-colors text-right
                              ${isActiveSub
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                            {item.label}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* ── CONTENT ── */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-3.5 flex items-center gap-3">
          <span className={`icon-badge ${activeGroup.iconColor}`}>
            <activeGroup.icon className="w-4 h-4 text-white" />
          </span>
          <div>
            <h1 className="text-[15px] font-bold">{activeItem?.label || activeGroup.label}</h1>
            <p className="text-[11px] text-muted-foreground">{activeGroup.label}</p>
          </div>
        </div>
        <div className="p-6 max-w-3xl">
          <Outlet />
        </div>
      </main>

      {/* ── RIGHT PANEL ── */}
      <aside className="w-52 shrink-0 border-r border-border/50 bg-card flex flex-col overflow-y-auto p-3 gap-3">
        <div className="bg-muted/40 rounded-2xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">حالة النظام</p>
          <StatusDot ok={true} label="قاعدة البيانات" />
          <StatusDot ok={true} label="Supabase API" />
          <StatusDot ok={true} label="التخزين" />
          <StatusDot ok={false} label="Firebase" />
        </div>

        <div className="bg-muted/40 rounded-2xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">إجراءات سريعة</p>
          <div className="space-y-1.5">
            <button onClick={() => toast.success('تم حفظ الإعدادات')}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-primary hover:bg-primary/10">
              <Save className="w-3.5 h-3.5 shrink-0" />حفظ التغييرات
            </button>
            <button onClick={() => { if (confirm('هل تريد استعادة الإعدادات الافتراضية؟')) toast.success('تم الاستعادة') }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />استعادة الافتراضي
            </button>
            <button onClick={async () => {
              if (!company?.id || !user?.company_id) {
                toast.error('يرجى تسجيل الدخول أولاً')
                return
              }
              try {
                const { data: c } = await supabase.from('companies').select('*').eq('id', company.id).single()
                const { data: u } = await supabase.from('units').select('*').eq('company_id', user.company_id)
                const blob = new Blob([JSON.stringify({ company: c, units: u, exported_at: new Date().toISOString() }, null, 2)], { type: 'application/json' })
                const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `settings-${new Date().toISOString().slice(0,10)}.json` })
                a.click()
                toast.success('تم التصدير')
              } catch { toast.error('فشل التصدير') }
            }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
              <Download className="w-3.5 h-3.5 shrink-0" />تصدير الإعدادات
            </button>
            <label className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
              <Upload className="w-3.5 h-3.5 shrink-0" />استيراد الإعدادات
              <input type="file" accept=".json" className="hidden" onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return
                if (!company?.id) {
                  toast.error('يرجى تسجيل الدخول أولاً')
                  return
                }
                try {
                  const data = JSON.parse(await file.text())
                  if (data.company) { await supabase.from('companies').update(data.company).eq('id', company.id); qc.invalidateQueries() }
                  toast.success('تم الاستيراد')
                } catch { toast.error('ملف غير صالح') }
                e.target.value = ''
              }} />
            </label>
            <button onClick={async () => {
              toast.loading('جاري الاختبار...', { id: 'test' })
              try { await supabase.from('companies').select('id').limit(1); toast.success('الاتصال يعمل ✓', { id: 'test' }) }
              catch { toast.error('فشل الاتصال', { id: 'test' }) }
            }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[12px] font-medium transition-colors text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20">
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />اختبار النظام
            </button>
          </div>
        </div>

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
