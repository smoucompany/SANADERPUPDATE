import { useState } from 'react'
import { Plus, Phone, Mail, MessageSquare, Users, Calendar, CheckCircle2, Clock, Search, Loader2, Save, Trash2 } from 'lucide-react'
import { useActivities, useCreateActivity } from '@/hooks/useCRM'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from 'react-hot-toast'

type ActivityType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'task'
type ActivityOutcome = 'pending' | 'positive' | 'negative' | 'waiting' | 'done'

type Activity = {
  id: string
  type: ActivityType
  customer: string
  contact: string
  note: string
  outcome: ActivityOutcome
  date: string
  time: string
  assigned_to: string
  duration?: string
}

const TYPE_CFG: Record<ActivityType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  call:     { label: 'مكالمة',   icon: Phone,        color: 'text-blue-700',    bg: 'bg-blue-500' },
  whatsapp: { label: 'واتساب',   icon: MessageSquare, color: 'text-emerald-700', bg: 'bg-emerald-500' },
  email:    { label: 'بريد',     icon: Mail,          color: 'text-indigo-700',  bg: 'bg-indigo-500' },
  meeting:  { label: 'اجتماع',   icon: Users,         color: 'text-purple-700',  bg: 'bg-purple-500' },
  task:     { label: 'مهمة',     icon: CheckCircle2,  color: 'text-amber-700',   bg: 'bg-amber-500' },
}

const OUTCOME_CFG: Record<ActivityOutcome, { label: string; color: string }> = {
  pending:  { label: 'معلق',     color: 'bg-gray-100 text-gray-600 dark:bg-gray-800' },
  positive: { label: 'إيجابي',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
  negative: { label: 'سلبي',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30' },
  waiting:  { label: 'انتظار',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
  done:     { label: 'مكتمل',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
}


const EMPTY_FORM = {
  type: 'call' as ActivityType, customer: '', contact: '', note: '',
  outcome: 'pending' as ActivityOutcome, date: '', time: '', assigned_to: '', duration: ''
}

export default function CRMActivitiesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<ActivityType | ''>('')
  const [filterOutcome, setFilterOutcome] = useState<ActivityOutcome | ''>('')
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: rawActivities = [], isLoading } = useActivities({
    type: filterType || undefined,
  })
  const createActivity = useCreateActivity()

  const activities: Activity[] = rawActivities.map((a: any) => ({
    id: a.id, type: a.type as ActivityType, customer: a.customer_name || a.lead?.name || '',
    contact: a.contact_name || '', note: a.notes || a.description || '',
    outcome: (a.outcome || 'pending') as ActivityOutcome,
    date: a.activity_date || a.created_at?.slice(0,10) || '',
    time: a.activity_time || '', assigned_to: a.assigned_to || '',
    duration: a.duration || '',
  }))

  const filtered = activities.filter(a =>
    (!search || a.customer.toLowerCase().includes(search.toLowerCase()) || a.note.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || a.type === filterType) &&
    (!filterOutcome || a.outcome === filterOutcome)
  )

  const typeCounts = Object.keys(TYPE_CFG).reduce((acc, t) => {
    acc[t] = activities.filter(a => a.type === t).length
    return acc
  }, {} as Record<string, number>)

  const handleSubmit = async () => {
    if (!form.customer || !form.note || !form.date) { toast.error('العميل والملاحظة والتاريخ مطلوبة'); return }
    await createActivity.mutateAsync({
      type: form.type, customer_name: form.customer, contact_name: form.contact,
      notes: form.note, outcome: form.outcome,
      activity_date: form.date, activity_time: form.time,
      assigned_to: form.assigned_to, duration: form.duration,
    })
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('crm_activities').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ['activities'] })
    toast.success('تم حذف النشاط')
    setDeleteId(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="سجل الأنشطة"
        subtitle={`${activities.length} نشاط مسجّل`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />تسجيل نشاط
          </button>
        }
      />

      {/* Type Stats */}
      {isLoading && <div className="flex justify-center py-6"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>}

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {Object.entries(TYPE_CFG).map(([type, cfg]) => {
          const Icon = cfg.icon
          return (
            <button key={type}
              onClick={() => setFilterType(filterType === type as ActivityType ? '' : type as ActivityType)}
              className={`bg-card border rounded-2xl p-4 flex flex-col items-center gap-2 transition-all cursor-pointer
                ${filterType === type ? 'border-primary shadow-md scale-[1.02]' : 'border-border/60 hover:shadow-sm'}`}>
              <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <p className="font-black text-xl">{typeCounts[type] || 0}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الأنشطة..."
            className="form-input pr-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(OUTCOME_CFG).map(([outcome, cfg]) => (
            <button key={outcome}
              onClick={() => setFilterOutcome(filterOutcome === outcome as ActivityOutcome ? '' : outcome as ActivityOutcome)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer
                ${filterOutcome === outcome ? 'bg-primary text-primary-foreground' : cfg.color}`}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="space-y-3">
        {filtered.map((activity, i) => {
          const typeCfg = TYPE_CFG[activity.type]
          const outcomeCfg = OUTCOME_CFG[activity.outcome]
          const Icon = typeCfg.icon
          const isFirst = i === 0 || filtered[i-1].date !== activity.date

          return (
            <div key={activity.id}>
              {isFirst && (
                <div className="flex items-center gap-3 mb-3 mt-2">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-xs font-semibold text-muted-foreground bg-card px-3 py-1 rounded-full border border-border/60">
                    {formatDate(activity.date)}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              )}
              <div className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 ${typeCfg.bg} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{activity.customer}</p>
                          {activity.contact && <span className="text-xs text-muted-foreground">• {activity.contact}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{activity.note}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${outcomeCfg.color}`}>
                          {outcomeCfg.label}
                        </span>
                        <button onClick={() => setDeleteId(activity.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{activity.time}</span>
                      {activity.duration && <span>• {activity.duration}</span>}
                      <span>• {activity.assigned_to}</span>
                      <span className={`font-semibold ${typeCfg.color}`}>• {typeCfg.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border/60 rounded-2xl">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد أنشطة مطابقة</p>
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="تسجيل نشاط جديد">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label">نوع النشاط</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={type} onClick={() => setForm(p => ({...p, type: type as ActivityType}))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border
                      ${form.type === type ? `${cfg.bg} text-white border-transparent` : 'border-border/60 text-muted-foreground hover:text-foreground'}`}>
                    <Icon className="w-3.5 h-3.5" />{cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">اسم العميل *</label>
              <input value={form.customer} onChange={e => setForm(p => ({...p, customer: e.target.value}))} className="form-input" />
            </div>
            <div>
              <label className="form-label">جهة الاتصال</label>
              <input value={form.contact} onChange={e => setForm(p => ({...p, contact: e.target.value}))} className="form-input" />
            </div>
            <div>
              <label className="form-label">التاريخ *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">الوقت</label>
              <input type="time" value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">النتيجة</label>
              <select value={form.outcome} onChange={e => setForm(p => ({...p, outcome: e.target.value as ActivityOutcome}))} className="form-select">
                {Object.entries(OUTCOME_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">المسؤول</label>
              <input value={form.assigned_to} onChange={e => setForm(p => ({...p, assigned_to: e.target.value}))} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">الملاحظات *</label>
            <textarea value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} className="form-input resize-none h-20" placeholder="وصف النشاط..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSubmit} disabled={createActivity.isPending} className="btn-primary gap-2">
              {createActivity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              تسجيل النشاط
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف النشاط"
        message="هل أنت متأكد من حذف هذا النشاط؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
