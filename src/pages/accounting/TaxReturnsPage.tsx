import { useState } from 'react'
import { Receipt, FileText, CheckCircle2, Clock, AlertTriangle, Download, Plus } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
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
  draft:     { label: 'مسودة',    color: 'text-muted-foreground bg-muted',                          icon: FileText },
  submitted: { label: 'مقدَّم',   color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',            icon: Clock },
  paid:      { label: 'مدفوع',   color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',   icon: CheckCircle2 },
  overdue:   { label: 'متأخر',   color: 'text-red-600 bg-red-100 dark:bg-red-900/30',               icon: AlertTriangle },
}

const MOCK_RETURNS: TaxReturn[] = [
  {
    id: '1', period: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31',
    due_date: '2026-04-30', status: 'paid',
    sales_vat: 45320, purchases_vat: 18750, net_vat: 26570,
    total_sales: 302133, total_purchases: 125000,
    submission_date: '2026-04-15', reference: 'ZATCA-2026-Q1-001'
  },
  {
    id: '2', period: 'Q2 2026 (أبريل)', start_date: '2026-04-01', end_date: '2026-04-30',
    due_date: '2026-05-31', status: 'submitted',
    sales_vat: 15800, purchases_vat: 6200, net_vat: 9600,
    total_sales: 105333, total_purchases: 41333,
    submission_date: '2026-05-20', reference: 'ZATCA-2026-APR-001'
  },
  {
    id: '3', period: 'Q2 2026 (مايو)', start_date: '2026-05-01', end_date: '2026-05-31',
    due_date: '2026-06-30', status: 'draft',
    sales_vat: 12400, purchases_vat: 4800, net_vat: 7600,
    total_sales: 82666, total_purchases: 32000,
  },
]

export default function TaxReturnsPage() {
  const [selected, setSelected] = useState<TaxReturn | null>(null)

  const totalNetVat = MOCK_RETURNS.filter(r => r.status === 'paid').reduce((s, r) => s + r.net_vat, 0)
  const pendingVat  = MOCK_RETURNS.filter(r => r.status !== 'paid').reduce((s, r) => s + r.net_vat, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإقرارات الضريبية"
        subtitle="إدارة إقرارات ضريبة القيمة المضافة — متوافق مع هيئة الزكاة والضريبة"
        actions={
          <button onClick={() => toast.success('إنشاء إقرار ضريبي جديد')} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />إقرار جديد
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الضريبة المسددة', value: formatCurrency(totalNetVat), color: 'apple-green',  icon: CheckCircle2 },
          { label: 'ضريبة معلقة',            value: formatCurrency(pendingVat),  color: 'apple-orange', icon: Clock },
          { label: 'إجمالي الإقرارات',        value: String(MOCK_RETURNS.length),color: 'apple-blue',   icon: FileText },
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
            <h3 className="font-semibold">الإقرارات الضريبية</h3>
          </div>
          <div className="divide-y divide-border/40">
            {MOCK_RETURNS.map(ret => {
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
                  <button onClick={() => toast.success('تم تقديم الإقرار الضريبي')} className="btn-primary gap-2 w-full">
                    <CheckCircle2 className="w-4 h-4" />تقديم الإقرار
                  </button>
                )}
                {selected.status === 'submitted' && (
                  <button onClick={() => toast.success('تم تسجيل الدفع')} className="btn-primary gap-2 w-full bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />تسجيل الدفع
                  </button>
                )}
                <button onClick={() => toast.success('جاري تنزيل الإقرار...')} className="btn-outline gap-2 w-full">
                  <Download className="w-4 h-4" />تنزيل PDF
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
    </div>
  )
}
