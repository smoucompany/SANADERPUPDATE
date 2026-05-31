import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt, FileText, CheckCircle2, Clock, AlertTriangle, Download, Plus, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TaxReturn {
  id: string
  period: string
  start_date: string
  end_date: string
  due_date: string
  status: 'draft' | 'submitted' | 'paid' | 'overdue'
  sales_vat: number
  purchases_vat: number
  net_vat: number
  total_sales: number
  total_purchases: number
  submission_date?: string
  reference?: string
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'مسودة',  color: 'text-muted-foreground bg-muted',                          icon: FileText },
  submitted: { label: 'مقدَّم', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',            icon: Clock },
  paid:      { label: 'مدفوع', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',   icon: CheckCircle2 },
  overdue:   { label: 'متأخر', color: 'text-red-600 bg-red-100 dark:bg-red-900/30',               icon: AlertTriangle },
}

const EMPTY_FORM = {
  period: '', start_date: '', end_date: '', due_date: '',
  total_sales: '', total_purchases: '',
}

export default function TaxReturnsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<TaxReturn | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const VAT_RATE = 0.15

  // ── Fetch tax returns ─────────────────────────────────────────────────────
  const { data: returns = [], isLoading } = useQuery<TaxReturn[]>({
    queryKey: ['tax_returns', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('tax_returns')
        .select('*')
        .eq('company_id', user.company_id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return (data as TaxReturn[]) || []
    },
    enabled: !!user,
  })

  // ── Create tax return ─────────────────────────────────────────────────────
  const createReturn = useMutation({
    mutationFn: async () => {
      if (!form.period || !form.start_date || !form.end_date) throw new Error('جميع الحقول المطلوبة يجب تعبئتها')
      const totalSales = parseFloat(form.total_sales) || 0
      const totalPurchases = parseFloat(form.total_purchases) || 0
      const salesVat     = totalSales * VAT_RATE
      const purchasesVat = totalPurchases * VAT_RATE
      const netVat       = salesVat - purchasesVat
      const { error } = await supabase.from('tax_returns').insert({
        company_id:       user!.company_id,
        period:           form.period,
        start_date:       form.start_date,
        end_date:         form.end_date,
        due_date:         form.due_date,
        status:           'draft',
        total_sales:      totalSales,
        total_purchases:  totalPurchases,
        sales_vat:        salesVat,
        purchases_vat:    purchasesVat,
        net_vat:          netVat,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax_returns'] })
      toast.success('تم إنشاء الإقرار الضريبي')
      setShowForm(false)
      setForm(EMPTY_FORM)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── Update status ─────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extra = {} }: { id: string; status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase.from('tax_returns').update({
        status,
        ...extra,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['tax_returns'] })
      const msgs: Record<string, string> = {
        submitted: 'تم تقديم الإقرار الضريبي',
        paid:      'تم تسجيل الدفع',
      }
      toast.success(msgs[status] || 'تم تحديث الإقرار')
      setSelected(prev => prev ? { ...prev, status: status as any } : null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const totalNetVat = returns.filter(r => r.status === 'paid').reduce((s, r) => s + r.net_vat, 0)
  const pendingVat  = returns.filter(r => r.status !== 'paid').reduce((s, r) => s + r.net_vat, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإقرارات الضريبية"
        subtitle="إدارة إقرارات ضريبة القيمة المضافة — متوافق مع هيئة الزكاة والضريبة"
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />إقرار جديد
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الضريبة المسددة', value: formatCurrency(totalNetVat), color: 'apple-green',  icon: CheckCircle2 },
          { label: 'ضريبة معلقة',            value: formatCurrency(pendingVat),  color: 'apple-orange', icon: Clock },
          { label: 'إجمالي الإقرارات',        value: String(returns.length),     color: 'apple-blue',   icon: FileText },
          { label: 'نسبة الضريبة',            value: '15%',                       color: 'apple-purple', icon: Receipt },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border/60 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className={`icon-badge-sm ${k.color}`}><k.icon className="w-4 h-4 text-white" /></span>
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-xl font-black">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {/* Returns list */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/50">
            <h3 className="font-semibold">الإقرارات الضريبية ({returns.length})</h3>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد إقرارات ضريبية — أنشئ إقراراً جديداً</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {returns.map(ret => {
                const s = STATUS_MAP[ret.status]
                const StatusIcon = s.icon
                return (
                  <div key={ret.id}
                    onClick={() => setSelected(ret)}
                    className={`p-5 cursor-pointer hover:bg-muted/20 transition-colors ${selected?.id === ret.id ? 'bg-primary/5 border-r-2 border-primary' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold">{ret.period}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(ret.start_date)} — {formatDate(ret.end_date)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
                        <StatusIcon className="w-3 h-3" />{s.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">ضريبة المبيعات</p>
                        <p className="font-semibold text-emerald-600">{formatCurrency(ret.sales_vat)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ضريبة المشتريات</p>
                        <p className="font-semibold text-amber-600">{formatCurrency(ret.purchases_vat)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">صافي الضريبة</p>
                        <p className="font-bold text-primary">{formatCurrency(ret.net_vat)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>موعد التقديم: {formatDate(ret.due_date)}</span>
                      {ret.reference && <span className="font-mono">{ret.reference}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <h3 className="font-semibold mb-4">تفاصيل الإقرار</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'الفترة', value: selected.period },
                    { label: 'من', value: formatDate(selected.start_date) },
                    { label: 'إلى', value: formatDate(selected.end_date) },
                    { label: 'تاريخ الاستحقاق', value: formatDate(selected.due_date) },
                    { label: 'إجمالي المبيعات', value: formatCurrency(selected.total_sales) },
                    { label: 'ضريبة المبيعات (15%)', value: formatCurrency(selected.sales_vat) },
                    { label: 'إجمالي المشتريات', value: formatCurrency(selected.total_purchases) },
                    { label: 'ضريبة المشتريات (15%)', value: formatCurrency(selected.purchases_vat) },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-border font-bold text-base">
                    <span>صافي الضريبة المستحقة</span>
                    <span className="text-primary">{formatCurrency(selected.net_vat)}</span>
                  </div>
                </div>
              </div>

              {selected.submission_date && (
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <h3 className="font-semibold mb-3">بيانات التقديم</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ التقديم</span>
                      <span className="font-medium">{formatDate(selected.submission_date)}</span>
                    </div>
                    {selected.reference && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم المرجع</span>
                        <span className="font-mono text-xs">{selected.reference}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {selected.status === 'draft' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: selected.id, status: 'submitted', extra: { submission_date: new Date().toISOString().slice(0,10) } })}
                    disabled={updateStatus.isPending}
                    className="btn-primary gap-2 w-full">
                    {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    تقديم الإقرار
                  </button>
                )}
                {selected.status === 'submitted' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: selected.id, status: 'paid' })}
                    disabled={updateStatus.isPending}
                    className="btn-primary gap-2 w-full bg-emerald-600 hover:bg-emerald-700">
                    {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    تسجيل الدفع
                  </button>
                )}
                <button onClick={() => window.print()} className="btn-outline gap-2 w-full">
                  <Download className="w-4 h-4" />طباعة الإقرار
                </button>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border/60 rounded-2xl p-8 text-center text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">اختر إقرارًا لعرض تفاصيله</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Tax Return Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إنشاء إقرار ضريبي جديد">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label">الفترة *</label>
            <input value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))}
              className="form-input" placeholder="مثال: Q1 2026 أو يناير 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">من تاريخ *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">إلى تاريخ *</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">تاريخ الاستحقاق</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} className="form-input" dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">إجمالي المبيعات (ر.س)</label>
              <input type="number" value={form.total_sales} onChange={e => setForm(f => ({...f, total_sales: e.target.value}))} className="form-input" min="0" step="0.01" />
            </div>
            <div>
              <label className="form-label">إجمالي المشتريات (ر.س)</label>
              <input type="number" value={form.total_purchases} onChange={e => setForm(f => ({...f, total_purchases: e.target.value}))} className="form-input" min="0" step="0.01" />
            </div>
          </div>
          {(form.total_sales || form.total_purchases) && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm">
              <p className="font-semibold text-primary">
                صافي الضريبة المحسوبة: {formatCurrency(((parseFloat(form.total_sales)||0) - (parseFloat(form.total_purchases)||0)) * VAT_RATE)}
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={() => createReturn.mutate()} disabled={createReturn.isPending} className="btn-primary gap-2">
              {createReturn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              إنشاء الإقرار
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
