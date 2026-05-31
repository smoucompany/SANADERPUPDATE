import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Lock, Unlock, Plus, CheckCircle2, Clock, AlertTriangle, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
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

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:   { label: 'مفتوح',   color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', icon: Unlock },
  closed: { label: 'مغلق',    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',       icon: Lock },
  locked: { label: 'مقفل',    color: 'text-muted-foreground bg-muted',                         icon: Lock },
}

const EMPTY_FORM = { name: '', start_date: '', end_date: '' }

export default function AccountingPeriodsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [confirmClose, setConfirmClose] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // ── Fetch periods ─────────────────────────────────────────────────────────
  const { data: periods = [], isLoading } = useQuery<Period[]>({
    queryKey: ['accounting_periods', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('company_id', user.company_id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return (data as Period[]) || []
    },
    enabled: !!user,
  })

  // ── Create period ─────────────────────────────────────────────────────────
  const createPeriod = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.start_date || !form.end_date) throw new Error('جميع الحقول مطلوبة')
      const { error } = await supabase.from('accounting_periods').insert({
        company_id:      user!.company_id,
        name:            form.name,
        start_date:      form.start_date,
        end_date:        form.end_date,
        status:          'open',
        entries_count:   0,
        closing_balance: 0,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting_periods'] })
      toast.success('تم إنشاء الفترة المحاسبية')
      setShowForm(false)
      setForm(EMPTY_FORM)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── Close period ──────────────────────────────────────────────────────────
  const closePeriod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounting_periods').update({
        status:    'closed',
        closed_by: user?.full_name || 'المستخدم',
        closed_at: new Date().toISOString().slice(0, 10),
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting_periods'] })
      toast.success('تم إغلاق الفترة المحاسبية')
      setConfirmClose(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── Reopen period ─────────────────────────────────────────────────────────
  const reopenPeriod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounting_periods').update({
        status:    'open',
        closed_by: null,
        closed_at: null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting_periods'] })
      toast.success('تم إعادة فتح الفترة المحاسبية')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const open    = periods.filter(p => p.status === 'open').length
  const closed  = periods.filter(p => p.status === 'closed').length
  const locked  = periods.filter(p => p.status === 'locked').length
  const entries = periods.reduce((s, p) => s + (p.entries_count || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="الفترات المحاسبية"
        subtitle="إدارة فترات وأعوام السنة المالية"
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
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
          <h3 className="font-semibold">الفترات المحاسبية ({periods.length})</h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : periods.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد فترات محاسبية — أنشئ فترة جديدة</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {periods.map(period => {
              const s = STATUS_MAP[period.status]
              const StatusIcon = s.icon
              return (
                <div key={period.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    period.status === 'open'   ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    period.status === 'closed' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{period.name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
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

                  <div className="flex items-center gap-2 shrink-0">
                    {period.status === 'open' && (
                      confirmClose === period.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-600">تأكيد الإغلاق؟</span>
                          <button onClick={() => closePeriod.mutate(period.id)} disabled={closePeriod.isPending}
                            className="text-xs font-medium text-red-500 hover:underline">نعم</button>
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
                      <button onClick={() => reopenPeriod.mutate(period.id)} disabled={reopenPeriod.isPending}
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
        )}
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

      {/* Create Period Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إنشاء فترة محاسبية جديدة">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label">اسم الفترة *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="form-input" placeholder="مثال: يناير 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">تاريخ البداية *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))}
                className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">تاريخ النهاية *</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))}
                className="form-input" dir="ltr" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={() => createPeriod.mutate()} disabled={createPeriod.isPending} className="btn-primary gap-2">
              {createPeriod.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              إنشاء الفترة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
