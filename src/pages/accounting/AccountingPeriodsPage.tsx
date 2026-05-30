import { useState } from 'react'
import { Calendar, Lock, Unlock, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Period {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed' | 'locked'
  entries_count: number
  closing_balance: number
  closed_by?: string
  closed_at?: string
}

const MOCK_PERIODS: Period[] = [
  { id: '1', name: 'يناير 2026',  start_date: '2026-01-01', end_date: '2026-01-31', status: 'locked', entries_count: 142, closing_balance: 850000,  closed_by: 'أحمد العمري',  closed_at: '2026-02-05' },
  { id: '2', name: 'فبراير 2026', start_date: '2026-02-01', end_date: '2026-02-28', status: 'locked', entries_count: 118, closing_balance: 920000,  closed_by: 'أحمد العمري',  closed_at: '2026-03-03' },
  { id: '3', name: 'مارس 2026',   start_date: '2026-03-01', end_date: '2026-03-31', status: 'closed', entries_count: 156, closing_balance: 1050000, closed_by: 'سارة المالكي', closed_at: '2026-04-02' },
  { id: '4', name: 'أبريل 2026',  start_date: '2026-04-01', end_date: '2026-04-30', status: 'closed', entries_count: 133, closing_balance: 980000,  closed_by: 'سارة المالكي', closed_at: '2026-05-04' },
  { id: '5', name: 'مايو 2026',   start_date: '2026-05-01', end_date: '2026-05-31', status: 'open',   entries_count: 87,  closing_balance: 0 },
  { id: '6', name: 'يونيو 2026',  start_date: '2026-06-01', end_date: '2026-06-30', status: 'open',   entries_count: 0,   closing_balance: 0 },
]

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:   { label: 'مفتوح',   color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: Unlock },
  closed: { label: 'مغلق',    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',       icon: Lock },
  locked: { label: 'مقفل',    color: 'text-muted-foreground bg-muted',                         icon: Lock },
}

export default function AccountingPeriodsPage() {
  const [periods, setPeriods] = useState(MOCK_PERIODS)
  const [confirmClose, setConfirmClose] = useState<string | null>(null)

  const handleClose = (id: string) => {
    setPeriods(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'closed', closed_by: 'المستخدم الحالي', closed_at: new Date().toISOString().slice(0, 10) } : p
    ))
    toast.success('تم إغلاق الفترة المحاسبية')
    setConfirmClose(null)
  }

  const handleReopen = (id: string) => {
    setPeriods(prev => prev.map(p => p.id === id ? { ...p, status: 'open', closed_by: undefined, closed_at: undefined } : p))
    toast.success('تم إعادة فتح الفترة المحاسبية')
  }

  const open   = periods.filter(p => p.status === 'open').length
  const closed = periods.filter(p => p.status === 'closed').length
  const locked = periods.filter(p => p.status === 'locked').length
  const entries= periods.reduce((s, p) => s + p.entries_count, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="الفترات المحاسبية"
        subtitle="إدارة فترات وأعوام السنة المالية"
        actions={
          <button onClick={() => toast.success('إنشاء فترة محاسبية جديدة')} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />فترة جديدة
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'فترات مفتوحة',  value: String(open),    color: 'apple-green',  icon: Unlock },
          { label: 'فترات مغلقة',   value: String(closed),  color: 'apple-orange', icon: Lock },
          { label: 'فترات مقفلة',   value: String(locked),  color: 'apple-gray',   icon: Lock },
          { label: 'إجمالي القيود', value: String(entries), color: 'apple-blue',   icon: Calendar },
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

      {/* Periods timeline */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50">
          <h3 className="font-semibold">السنة المالية 2026</h3>
        </div>

        <div className="divide-y divide-border/40">
          {periods.map(period => {
            const s = STATUS_MAP[period.status]
            const StatusIcon = s.icon
            return (
              <div key={period.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
                {/* Status indicator */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  period.status === 'open' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                  period.status === 'closed' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <StatusIcon className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{period.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(period.start_date)} — {formatDate(period.end_date)}
                    {period.entries_count > 0 && ` · ${period.entries_count} قيد محاسبي`}
                  </p>
                  {period.closed_at && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      أُغلق في {formatDate(period.closed_at)} بواسطة {period.closed_by}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {period.status === 'open' && period.entries_count > 0 && (
                    confirmClose === period.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-600">تأكيد الإغلاق؟</span>
                        <button onClick={() => handleClose(period.id)} className="text-xs font-medium text-red-500 hover:underline">نعم</button>
                        <button onClick={() => setConfirmClose(null)} className="text-xs text-muted-foreground hover:underline">إلغاء</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClose(period.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg">
                        <Lock className="w-3 h-3" />إغلاق الفترة
                      </button>
                    )
                  )}
                  {period.status === 'closed' && (
                    <button onClick={() => handleReopen(period.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                      <Unlock className="w-3 h-3" />إعادة الفتح
                    </button>
                  )}
                  {period.status === 'locked' && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" />مقفل نهائياً
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-400">تنبيه مهم</p>
          <p className="text-amber-600 dark:text-amber-500 mt-1">
            إغلاق الفترة المحاسبية يمنع إضافة أو تعديل أي قيود خلالها. الفترات المقفلة لا يمكن إعادة فتحها إلا بصلاحية المدير العام.
          </p>
        </div>
      </div>
    </div>
  )
}
