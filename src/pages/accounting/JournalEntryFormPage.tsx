import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Save, ArrowRight, Loader2, BookOpen, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency, today } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Account } from '@/types'

interface Line { _id: string; account_id: string; description: string; debit: number; credit: number }

interface TemplateLineDef { description: string; side: 'debit' | 'credit' }
interface JournalTemplate {
  id: string
  title: string
  category: string
  description: string
  lines: TemplateLineDef[]
}

const TEMPLATES: JournalTemplate[] = [
  // ── المبيعات ──
  {
    id: 'cash_sale', title: 'بيع نقدي', category: 'المبيعات', description: 'قيد بيع نقدي',
    lines: [
      { description: 'الصندوق / البنك', side: 'debit' },
      { description: 'إيراد المبيعات', side: 'credit' },
      { description: 'ضريبة القيمة المضافة المحصلة', side: 'credit' },
    ]
  },
  {
    id: 'credit_sale', title: 'بيع آجل', category: 'المبيعات', description: 'قيد بيع بالأجل',
    lines: [
      { description: 'ذمم مدينة - عملاء', side: 'debit' },
      { description: 'إيراد المبيعات', side: 'credit' },
      { description: 'ضريبة القيمة المضافة المحصلة', side: 'credit' },
    ]
  },
  {
    id: 'sales_return', title: 'مردود مبيعات', category: 'المبيعات', description: 'قيد مردود مبيعات',
    lines: [
      { description: 'مردودات المبيعات', side: 'debit' },
      { description: 'ضريبة القيمة المضافة المحصلة', side: 'debit' },
      { description: 'الصندوق / ذمم مدينة', side: 'credit' },
    ]
  },
  // ── المشتريات ──
  {
    id: 'cash_purchase', title: 'شراء نقدي', category: 'المشتريات', description: 'قيد شراء بضاعة نقداً',
    lines: [
      { description: 'المشتريات / بضاعة', side: 'debit' },
      { description: 'ضريبة القيمة المضافة المدفوعة', side: 'debit' },
      { description: 'الصندوق / البنك', side: 'credit' },
    ]
  },
  {
    id: 'credit_purchase', title: 'شراء آجل', category: 'المشتريات', description: 'قيد شراء بضاعة بالأجل',
    lines: [
      { description: 'المشتريات / بضاعة', side: 'debit' },
      { description: 'ضريبة القيمة المضافة المدفوعة', side: 'debit' },
      { description: 'ذمم دائنة - موردون', side: 'credit' },
    ]
  },
  {
    id: 'purchase_return', title: 'مردود مشتريات', category: 'المشتريات', description: 'قيد مردود مشتريات',
    lines: [
      { description: 'الصندوق / ذمم دائنة', side: 'debit' },
      { description: 'مردودات المشتريات', side: 'credit' },
      { description: 'ضريبة القيمة المضافة المدفوعة', side: 'credit' },
    ]
  },
  // ── المدفوعات ──
  {
    id: 'customer_collection', title: 'تحصيل من عميل', category: 'المدفوعات', description: 'قيد تحصيل دفعة من عميل',
    lines: [
      { description: 'الصندوق / البنك', side: 'debit' },
      { description: 'ذمم مدينة - عملاء', side: 'credit' },
    ]
  },
  {
    id: 'supplier_payment', title: 'سداد لمورد', category: 'المدفوعات', description: 'قيد سداد دفعة لمورد',
    lines: [
      { description: 'ذمم دائنة - موردون', side: 'debit' },
      { description: 'الصندوق / البنك', side: 'credit' },
    ]
  },
  {
    id: 'cash_expense', title: 'مصروف نقدي', category: 'المدفوعات', description: 'قيد مصروف مدفوع نقداً',
    lines: [
      { description: 'المصاريف', side: 'debit' },
      { description: 'الصندوق / البنك', side: 'credit' },
    ]
  },
  {
    id: 'accrued_expense', title: 'مصروف مستحق', category: 'المدفوعات', description: 'قيد مصروف مستحق غير مدفوع',
    lines: [
      { description: 'مصروف مستحق', side: 'debit' },
      { description: 'مصاريف مستحقة الدفع', side: 'credit' },
    ]
  },
  // ── الرواتب ──
  {
    id: 'payroll', title: 'قيد الرواتب', category: 'الرواتب', description: 'قيد استحقاق رواتب الموظفين',
    lines: [
      { description: 'مصروف الرواتب والأجور', side: 'debit' },
      { description: 'رواتب مستحقة الدفع', side: 'credit' },
      { description: 'اشتراكات التأمينات الاجتماعية', side: 'credit' },
    ]
  },
  {
    id: 'payroll_payment', title: 'صرف الرواتب', category: 'الرواتب', description: 'قيد صرف الرواتب للموظفين',
    lines: [
      { description: 'رواتب مستحقة الدفع', side: 'debit' },
      { description: 'البنك / الصندوق', side: 'credit' },
    ]
  },
  // ── الأصول الثابتة ──
  {
    id: 'asset_purchase', title: 'شراء أصل ثابت', category: 'الأصول', description: 'قيد شراء أصل ثابت',
    lines: [
      { description: 'الأصل الثابت (معدات / أثاث / سيارات)', side: 'debit' },
      { description: 'ضريبة القيمة المضافة المدفوعة', side: 'debit' },
      { description: 'الصندوق / البنك / ذمم دائنة', side: 'credit' },
    ]
  },
  {
    id: 'depreciation', title: 'إهلاك الأصول', category: 'الأصول', description: 'قيد مصروف إهلاك الأصول الثابتة',
    lines: [
      { description: 'مصروف الإهلاك', side: 'debit' },
      { description: 'مجمع الإهلاك', side: 'credit' },
    ]
  },
  {
    id: 'asset_sale', title: 'بيع أصل ثابت', category: 'الأصول', description: 'قيد بيع أصل ثابت',
    lines: [
      { description: 'الصندوق / البنك', side: 'debit' },
      { description: 'مجمع الإهلاك', side: 'debit' },
      { description: 'الأصل الثابت', side: 'credit' },
      { description: 'أرباح / خسائر بيع الأصول', side: 'credit' },
    ]
  },
  // ── رأس المال ──
  {
    id: 'capital_investment', title: 'إيداع رأس مال', category: 'رأس المال', description: 'قيد إيداع رأس مال المنشأة',
    lines: [
      { description: 'الصندوق / البنك', side: 'debit' },
      { description: 'رأس المال', side: 'credit' },
    ]
  },
  {
    id: 'owner_withdrawal', title: 'سحب صاحب المنشأة', category: 'رأس المال', description: 'قيد سحب المالك من رأس المال',
    lines: [
      { description: 'حساب السحوبات الشخصية', side: 'debit' },
      { description: 'الصندوق / البنك', side: 'credit' },
    ]
  },
  // ── الضرائب ──
  {
    id: 'vat_settlement', title: 'تسوية ضريبة القيمة المضافة', category: 'الضرائب', description: 'قيد تسوية ضريبة القيمة المضافة',
    lines: [
      { description: 'ضريبة القيمة المضافة المحصلة', side: 'debit' },
      { description: 'ضريبة القيمة المضافة المدفوعة', side: 'credit' },
      { description: 'ضريبة القيمة المضافة مستحقة للدفع', side: 'credit' },
    ]
  },
  {
    id: 'zakat', title: 'الزكاة والضريبة', category: 'الضرائب', description: 'قيد استحقاق الزكاة والضريبة',
    lines: [
      { description: 'مصروف الزكاة والضريبة', side: 'debit' },
      { description: 'زكاة وضريبة مستحقة', side: 'credit' },
    ]
  },
  // ── الإقفال ──
  {
    id: 'close_revenues', title: 'إقفال الإيرادات', category: 'الإقفال', description: 'قيد إقفال حسابات الإيرادات',
    lines: [
      { description: 'إيرادات المبيعات', side: 'debit' },
      { description: 'ملخص الدخل / الأرباح والخسائر', side: 'credit' },
    ]
  },
  {
    id: 'close_expenses', title: 'إقفال المصاريف', category: 'الإقفال', description: 'قيد إقفال حسابات المصاريف',
    lines: [
      { description: 'ملخص الدخل / الأرباح والخسائر', side: 'debit' },
      { description: 'مصاريف التشغيل', side: 'credit' },
    ]
  },
  {
    id: 'close_net_income', title: 'إقفال صافي الربح', category: 'الإقفال', description: 'قيد ترحيل صافي الربح إلى حقوق الملكية',
    lines: [
      { description: 'ملخص الدخل / الأرباح والخسائر', side: 'debit' },
      { description: 'الأرباح المحتجزة / رأس المال', side: 'credit' },
    ]
  },
  // ── أخرى ──
  {
    id: 'bank_deposit', title: 'إيداع بنكي', category: 'أخرى', description: 'قيد إيداع نقدي في البنك',
    lines: [
      { description: 'البنك', side: 'debit' },
      { description: 'الصندوق', side: 'credit' },
    ]
  },
  {
    id: 'bank_withdrawal', title: 'سحب بنكي', category: 'أخرى', description: 'قيد سحب نقدي من البنك',
    lines: [
      { description: 'الصندوق', side: 'debit' },
      { description: 'البنك', side: 'credit' },
    ]
  },
  {
    id: 'prepaid_expense', title: 'مصروف مدفوع مقدماً', category: 'أخرى', description: 'قيد مصروف مدفوع مسبقاً',
    lines: [
      { description: 'مصروف مدفوع مقدماً', side: 'debit' },
      { description: 'الصندوق / البنك', side: 'credit' },
    ]
  },
  {
    id: 'deferred_revenue', title: 'إيراد مقدم', category: 'أخرى', description: 'قيد إيراد مستلم مقدماً',
    lines: [
      { description: 'الصندوق / البنك', side: 'debit' },
      { description: 'إيراد مقدم (التزام)', side: 'credit' },
    ]
  },
  {
    id: 'bank_charges', title: 'عمولات ومصاريف بنكية', category: 'أخرى', description: 'قيد عمولات ومصاريف البنك',
    lines: [
      { description: 'مصروف العمولات البنكية', side: 'debit' },
      { description: 'البنك', side: 'credit' },
    ]
  },
]

const CATEGORIES = [...new Set(TEMPLATES.map(t => t.category))]

const CATEGORY_COLORS: Record<string, string> = {
  'المبيعات': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  'المشتريات': 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  'المدفوعات': 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  'الرواتب': 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  'الأصول': 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  'رأس المال': 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
  'الضرائب': 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  'الإقفال': 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
  'أخرى': 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
}

const CATEGORY_BADGE: Record<string, string> = {
  'المبيعات': 'bg-blue-100 text-blue-700',
  'المشتريات': 'bg-amber-100 text-amber-700',
  'المدفوعات': 'bg-emerald-100 text-emerald-700',
  'الرواتب': 'bg-purple-100 text-purple-700',
  'الأصول': 'bg-orange-100 text-orange-700',
  'رأس المال': 'bg-rose-100 text-rose-700',
  'الضرائب': 'bg-red-100 text-red-700',
  'الإقفال': 'bg-slate-100 text-slate-700',
  'أخرى': 'bg-teal-100 text-teal-700',
}

function TemplatesModal({ onSelect, onClose }: { onSelect: (t: JournalTemplate) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState<string>('الكل')
  const allCategories = ['الكل', ...CATEGORIES]
  const filtered = activeCategory === 'الكل' ? TEMPLATES : TEMPLATES.filter(t => t.category === activeCategory)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">قوالب القيود المحاسبية</h2>
            <p className="text-xs text-muted-foreground mt-0.5">اختر نوع القيد لتعبئة النموذج تلقائياً</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 px-5 py-3 border-b border-border overflow-x-auto scrollbar-none">
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 hover:text-primary'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(tmpl => (
              <button key={tmpl.id} onClick={() => { onSelect(tmpl); onClose() }}
                className={`text-right p-4 rounded-xl border-2 transition-all hover:scale-[1.01] hover:shadow-md ${CATEGORY_COLORS[tmpl.category]}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_BADGE[tmpl.category]}`}>
                    {tmpl.category}
                  </span>
                </div>
                <div className="font-semibold text-sm mb-1">{tmpl.title}</div>
                <div className="text-xs opacity-70 mb-3">{tmpl.description}</div>
                <div className="space-y-1">
                  {tmpl.lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${l.side === 'debit' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                      <span className="opacity-80">{l.description}</span>
                      <span className={`mr-auto font-medium ${l.side === 'debit' ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {l.side === 'debit' ? 'مدين' : 'دائن'}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JournalEntryFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [entryDate, setEntryDate] = useState(today())
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { _id: '1', account_id: '', description: '', debit: 0, credit: 0 },
    { _id: '2', account_id: '', description: '', debit: 0, credit: 0 }
  ])
  const [showTemplates, setShowTemplates] = useState(false)

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('id, code, name_ar, type').eq('company_id', user!.company_id).eq('is_detail', true).eq('is_active', true).order('code')
      return data as Account[] || []
    },
    enabled: !!user
  })

  const { data: existing } = useQuery({
    queryKey: ['journal-entry', id],
    queryFn: async () => {
      const { data } = await supabase.from('journal_entries').select('*, lines:journal_entry_lines(*)').eq('id', id!).single()
      return data
    },
    enabled: !!id
  })

  useEffect(() => {
    if (existing) {
      setEntryDate(existing.entry_date)
      setDescription(existing.description)
      if (existing.lines) setLines(existing.lines.map((l: Record<string,unknown>) => ({ ...l, _id: String(l.id) })))
    }
  }, [existing])

  const applyTemplate = (tmpl: JournalTemplate) => {
    setDescription(tmpl.description)
    setLines(tmpl.lines.map((l, i) => ({
      _id: crypto.randomUUID(),
      account_id: '',
      description: l.description,
      debit: l.side === 'debit' ? 0 : 0,
      credit: l.side === 'credit' ? 0 : 0,
      _side: l.side,
      sort_order: i,
    } as Line & { _side: string })))
  }

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'posted') => {
      if (!description) throw new Error('البيان مطلوب')
      if (!isBalanced) throw new Error('القيد غير متوازن - المدين يجب أن يساوي الدائن')
      if (lines.some(l => !l.account_id)) throw new Error('يجب اختيار حساب لكل سطر')

      const entryData = {
        company_id: user!.company_id,
        user_id: user!.id,
        entry_date: entryDate,
        description,
        status,
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_auto: false
      }

      let entryId = id
      if (id) {
        const { error: updateErr } = await supabase.from('journal_entries').update(entryData).eq('id', id)
        if (updateErr) throw updateErr
        const { error: delErr } = await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', id)
        if (delErr) throw delErr
      } else {
        const { data: seqData } = await supabase.rpc('get_next_sequence', { p_company_id: user!.company_id, p_type: 'journal' })
        const { data: entry, error } = await supabase.from('journal_entries').insert({ ...entryData, entry_number: seqData }).select().single()
        if (error) throw error
        entryId = entry.id
      }

      // Only insert lines with an account AND at least one non-zero amount
      const lineInserts = lines
        .filter(l => l.account_id && (l.debit > 0 || l.credit > 0))
        .map((l, i) => ({
          journal_entry_id: entryId,
          account_id: l.account_id,
          description: l.description,
          debit: l.debit || 0,
          credit: l.credit || 0,
          sort_order: i
        }))
      if (lineInserts.length > 0) {
        const { error: linesErr } = await supabase.from('journal_entry_lines').insert(lineInserts)
        if (linesErr) throw linesErr
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
      toast.success('تم حفظ القيد بنجاح')
      navigate('/journal')
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const updateLine = (lid: string, field: string, value: unknown) => {
    setLines(p => p.map(l => l._id === lid ? { ...l, [field]: value } : l))
  }

  return (
    <div className="space-y-6 w-full max-w-none">
      {showTemplates && <TemplatesModal onSelect={applyTemplate} onClose={() => setShowTemplates(false)} />}

      <PageHeader title={id ? 'تعديل قيد يومي' : 'قيد يومي جديد'}
        subtitle="محطة إعداد ونشر القيود اليومية المزدوجة المتكاملة مع دليل الحسابات"
        actions={<>
          <button onClick={() => navigate('/journal')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm active:scale-[0.97] transition-all">
            <ArrowRight className="w-4 h-4 ml-1" />رجوع للوحة القيود
          </button>
          {!id && (
            <button onClick={() => setShowTemplates(true)} className="btn-outline gap-1.5 text-primary border-primary/40 hover:bg-primary/5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm">
              <BookOpen className="w-4 h-4" />قوالب القيود الجاهزة
            </button>
          )}
          <button onClick={() => saveMutation.mutate('draft')} disabled={saveMutation.isPending} className="btn-outline px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm">مسودة</button>
          <button onClick={() => saveMutation.mutate('posted')} disabled={saveMutation.isPending} className="btn-primary gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm active:scale-[0.97] transition-all">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            نشر القيد المحاسبي
          </button>
        </>}
      />

      {/* General Entry Details */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
          <BookOpen className="w-4.5 h-4.5 text-primary" />تفاصيل الحركة المالية
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">تاريخ القيد اليومي *</label>
            <input type="date" value={entryDate} onChange={e=>setEntryDate(e.target.value)} className="form-input rounded-xl border-border/50 focus:ring-primary/20 text-xs h-10" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">البيان والشرح العام للقيد *</label>
            <input value={description} onChange={e=>setDescription(e.target.value)} className="form-input rounded-xl border-border/50 focus:ring-primary/20 text-xs h-10" placeholder="اكتب بياناً عاماً واضحاً يعبر عن طبيعة الحركة المالية لهذا القيد..." />
          </div>
        </div>
      </div>

      {/* Transaction lines table */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 bg-muted/15 flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">جدول سطور القيد المزدوج</h3>
          <span className="text-xs text-muted-foreground font-medium">مجموع الحركات المدينة (+) يجب أن يطابق مجموع الحركات الدائنة (-) بدقة</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60 text-[11px] font-bold text-muted-foreground">
                <th className="px-4 py-3 text-right w-80">الحساب المحاسبي الفرعي *</th>
                <th className="px-4 py-3 text-right">البيان والشرح التفصيلي للسطر</th>
                <th className="px-4 py-3 text-center w-40">مدين (+)</th>
                <th className="px-4 py-3 text-center w-40">دائن (-)</th>
                <th className="px-4 py-3 w-14 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {lines.map((line) => (
                <tr key={line._id} className="hover:bg-accent/5 transition-colors">
                  <td className="px-4 py-2.5">
                    <select 
                      value={line.account_id} 
                      onChange={e=>updateLine(line._id, 'account_id', e.target.value)} 
                      className="form-select text-xs h-9 rounded-xl border border-input focus:ring-primary/20 w-full"
                      dir="rtl"
                    >
                      <option value="">اختر الحساب من شجرة الحسابات</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name_ar}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input 
                      value={line.description} 
                      onChange={e=>updateLine(line._id, 'description', e.target.value)} 
                      className="form-input text-xs h-9 rounded-xl border border-input focus:ring-primary/20" 
                      placeholder="الشرح الخاص بهذا السطر..." 
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input 
                      type="number" 
                      value={line.debit || ''} 
                      onChange={e=>updateLine(line._id, 'debit', parseFloat(e.target.value)||0)} 
                      className="form-input text-xs h-9 rounded-xl border border-input focus:ring-primary/20 font-bold text-center text-blue-600" 
                      dir="ltr" 
                      placeholder="0.00" 
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input 
                      type="number" 
                      value={line.credit || ''} 
                      onChange={e=>updateLine(line._id, 'credit', parseFloat(e.target.value)||0)} 
                      className="form-input text-xs h-9 rounded-xl border border-input focus:ring-primary/20 font-bold text-center text-emerald-600" 
                      dir="ltr" 
                      placeholder="0.00" 
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button 
                      onClick={()=>lines.length>2&&setLines(p=>p.filter(l=>l._id!==line._id))} 
                      className="text-destructive p-1.5 rounded-xl hover:bg-destructive/10 disabled:opacity-30 transition-colors" 
                      disabled={lines.length<=2}
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/20 font-bold text-xs">
              <tr className="font-extrabold text-foreground">
                <td className="px-4 py-3 text-right" colSpan={2}>
                  <button 
                    onClick={()=>setLines(p=>[...p,{_id:crypto.randomUUID(),account_id:'',description:'',debit:0,credit:0}])} 
                    className="btn-ghost text-xs gap-1 text-primary hover:bg-primary/5 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4"/> إضافة سطر محاسبي جديد
                  </button>
                </td>
                <td className="px-4 py-3 text-center font-mono tabular-nums text-blue-600 text-sm">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-4 py-3 text-center font-mono tabular-nums text-emerald-600 text-sm">
                  {formatCurrency(totalCredit)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Balancing Status Messages */}
      {!isBalanced && totalDebit > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3 text-destructive">
          <div>
            <p className="text-sm font-bold">القيد غير متوازن!</p>
            <p className="text-xs opacity-90 mt-0.5">
              مجموع حركات المدين لا يساوي مجموع حركات الدائن. الفارق الحالي: {formatCurrency(Math.abs(totalDebit - totalCredit))}
            </p>
          </div>
        </div>
      )}
      {isBalanced && totalDebit > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
          <div>
            <p className="text-sm font-bold">معادلة القيد متوازنة تماماً</p>
            <p className="text-xs opacity-90 mt-0.5">مجموع المدين يساوي الدائن ({formatCurrency(totalDebit)}). القيد جاهز للنشر.</p>
          </div>
        </div>
      )}
    </div>
  )
}
