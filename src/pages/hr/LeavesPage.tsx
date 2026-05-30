import { useState } from 'react'
import { Plus, Calendar, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'

type LeaveRequest = {
  id: string
  employee_name: string
  department: string
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  applied_on: string
}

const LEAVE_TYPES = ['إجازة سنوية','إجازة مرضية','إجازة أمومة','إجازة أبوة','إجازة بدون راتب','إجازة طارئة','إجازة زواج']

const MOCK: LeaveRequest[] = [
  { id:'1', employee_name:'محمد خالد الغامدي', department:'المبيعات', leave_type:'إجازة سنوية', start_date:'2026-06-01', end_date:'2026-06-14', days:14, reason:'إجازة سنوية مستحقة', status:'pending', applied_on:'2026-05-20' },
  { id:'2', employee_name:'سارة عبدالله الأحمدي', department:'المحاسبة', leave_type:'إجازة مرضية', start_date:'2026-05-26', end_date:'2026-05-28', days:3, reason:'مراجعة طبية', status:'approved', applied_on:'2026-05-25' },
  { id:'3', employee_name:'فاطمة علي الزهراني', department:'الموارد البشرية', leave_type:'إجازة أمومة', start_date:'2026-05-15', end_date:'2026-07-24', days:70, reason:'إجازة أمومة', status:'approved', applied_on:'2026-05-10' },
  { id:'4', employee_name:'نورة سالم الشمري', department:'التسويق', leave_type:'إجازة طارئة', start_date:'2026-05-27', end_date:'2026-05-27', days:1, reason:'ظرف طارئ', status:'rejected', applied_on:'2026-05-27' },
  { id:'5', employee_name:'عمر عبدالرحمن القحطاني', department:'تقنية المعلومات', leave_type:'إجازة سنوية', start_date:'2026-07-01', end_date:'2026-07-10', days:10, reason:'رحلة عائلية', status:'pending', applied_on:'2026-05-28' },
]

const STATUS_CFG = {
  pending:  { label:'قيد المراجعة', color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
  approved: { label:'موافق عليها',  color:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
  rejected: { label:'مرفوضة',       color:'bg-red-100 text-red-700 dark:bg-red-900/30' },
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  'إجازة سنوية':     'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  'إجازة مرضية':     'bg-red-100 text-red-700 dark:bg-red-900/30',
  'إجازة أمومة':     'bg-pink-100 text-pink-700 dark:bg-pink-900/30',
  'إجازة أبوة':      'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
  'إجازة بدون راتب': 'bg-gray-100 text-gray-600 dark:bg-gray-800',
  'إجازة طارئة':     'bg-orange-100 text-orange-700 dark:bg-orange-900/30',
  'إجازة زواج':      'bg-rose-100 text-rose-700 dark:bg-rose-900/30',
}

export default function LeavesPage() {
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ employee_id:'', leave_type:'', start_date:'', end_date:'', reason:'' })

  const filtered = MOCK.filter(l => !statusFilter || l.status === statusFilter)
  const pending = MOCK.filter(l => l.status === 'pending').length
  const approved = MOCK.filter(l => l.status === 'approved').length
  const totalDays = MOCK.filter(l => l.status === 'approved').reduce((s,l) => s + l.days, 0)

  const handleApprove = (id: string, action: 'approve' | 'reject') => {
    toast.success(action === 'approve' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب')
  }

  const handleSubmit = async () => {
    if (!form.leave_type || !form.start_date || !form.end_date) { toast.error('أدخل جميع البيانات المطلوبة'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    setSaving(false)
    toast.success('تم تقديم طلب الإجازة')
    setShowForm(false)
    setForm({ employee_id:'', leave_type:'', start_date:'', end_date:'', reason:'' })
  }

  const columns: Column<LeaveRequest>[] = [
    { key: 'employee_name', label: 'الموظف', render: (v, row) => (
      <div>
        <p className="font-medium text-sm">{String(v)}</p>
        <p className="text-xs text-muted-foreground">{row.department}</p>
      </div>
    )},
    { key: 'leave_type', label: 'نوع الإجازة', render: v => (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEAVE_TYPE_COLORS[String(v)] || 'bg-muted text-muted-foreground'}`}>{String(v)}</span>
    )},
    { key: 'start_date', label: 'من', render: v => <span className="text-sm">{formatDate(String(v))}</span> },
    { key: 'end_date', label: 'إلى', render: v => <span className="text-sm">{formatDate(String(v))}</span> },
    { key: 'days', label: 'الأيام', render: v => <span className="font-bold text-primary">{String(v)} يوم</span> },
    { key: 'status', label: 'الحالة', render: v => {
      const cfg = STATUS_CFG[v as keyof typeof STATUS_CFG]
      return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg?.color}`}>{cfg?.label}</span>
    }},
    { key: 'id', label: 'إجراءات', render: (_, row) => (
      row.status === 'pending' ? (
        <div className="flex items-center gap-1">
          <button onClick={() => handleApprove(row.id, 'approve')} className="flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2 py-1 rounded-lg transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" />موافقة
          </button>
          <button onClick={() => handleApprove(row.id, 'reject')} className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
            <XCircle className="w-3.5 h-3.5" />رفض
          </button>
        </div>
      ) : <span className="text-xs text-muted-foreground">{formatDate(row.applied_on)}</span>
    )}
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإجازات والغيابات"
        subtitle={`${MOCK.length} طلب إجازة`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />طلب إجازة
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'إجمالي الطلبات', value:MOCK.length, color:'text-foreground', bg:'bg-blue-500', icon:Calendar },
          { label:'قيد المراجعة',   value:pending,      color:'text-amber-600',  bg:'bg-amber-500', icon:Clock },
          { label:'موافق عليها',    value:approved,     color:'text-emerald-600',bg:'bg-emerald-500', icon:CheckCircle2 },
          { label:'إجمالي أيام الإجازات المعتمدة', value:`${totalDays} يوم`, color:'text-primary', bg:'bg-primary', icon:Calendar },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{v:'',l:'الكل'}, ...Object.entries(STATUS_CFG).map(([v,{label:l}]) => ({v,l}))].map(opt => (
          <button key={opt.v} onClick={() => setStatusFilter(opt.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === opt.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {opt.l}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={false} emptyMessage="لا توجد طلبات إجازة" />

      {/* Submit Leave Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="تقديم طلب إجازة">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label">نوع الإجازة *</label>
            <select value={form.leave_type} onChange={e => setForm(p=>({...p,leave_type:e.target.value}))} className="form-select">
              <option value="">اختر نوع الإجازة</option>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">من تاريخ *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p=>({...p,start_date:e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">إلى تاريخ *</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p=>({...p,end_date:e.target.value}))} className="form-input" dir="ltr" />
            </div>
          </div>
          {form.start_date && form.end_date && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm">
              عدد الأيام: <span className="font-bold text-primary">
                {Math.max(0, Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1)} يوم
              </span>
            </div>
          )}
          <div>
            <label className="form-label">سبب الإجازة</label>
            <textarea value={form.reason} onChange={e => setForm(p=>({...p,reason:e.target.value}))} className="form-input resize-none h-20" placeholder="أسباب طلب الإجازة..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              تقديم الطلب
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
