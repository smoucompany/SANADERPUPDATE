import { useState } from 'react'
import { Plus, Star, TrendingUp, Award, Users, Target, BarChart3, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'

type AppraisalStatus = 'draft' | 'submitted' | 'reviewed' | 'final'

type Appraisal = {
  id: string
  employee_id: string
  employee_name: string
  avatar: string
  department: string
  period: string
  score: number
  kpis: { label: string; score: number; weight: number }[]
  reviewer: string
  status: AppraisalStatus
  date: string
  notes: string
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500']

const STATUS_CFG: Record<AppraisalStatus, { label: string; color: string }> = {
  draft:     { label: 'مسودة',      color: 'bg-gray-100 text-gray-600 dark:bg-gray-800' },
  submitted: { label: 'مُقدَّم',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
  reviewed:  { label: 'قيد المراجعة',color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
  final:     { label: 'نهائي',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
}

const MONTHLY_TREND: { month: string; avg: number }[] = []

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{score}%</span>
    </div>
  )
}

function getScoreColor(score: number) {
  if (score >= 90) return 'bg-emerald-500'
  if (score >= 75) return 'bg-blue-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function getScoreLabel(score: number) {
  if (score >= 90) return { label: 'ممتاز', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' }
  if (score >= 75) return { label: 'جيد جداً', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' }
  if (score >= 60) return { label: 'جيد', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' }
  return { label: 'يحتاج تحسين', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' }
}

export default function HRPerformancePage() {
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<AppraisalStatus | ''>('')
  const [saving, setSaving] = useState(false)

  const [appraisals] = useState<Appraisal[]>([])
  const avgScore = appraisals.length > 0 ? Math.round(appraisals.reduce((s, a) => s + a.score, 0) / appraisals.length) : 0
  const filtered = appraisals.filter(a => !filterStatus || a.status === filterStatus)
  const topPerformer = appraisals.length > 0 ? [...appraisals].sort((a, b) => b.score - a.score)[0] : null

  const radarData = selectedAppraisal?.kpis.map(k => ({ subject: k.label, A: k.score, fullMark: 100 })) || []

  return (
    <div className="space-y-5">
      <PageHeader
        title="تقييم الأداء"
        subtitle="الربع الأول 2026"
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />تقييم جديد
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'متوسط الأداء', value:`${avgScore}%`, sub:'كل الموظفين', bg:'bg-primary', icon:TrendingUp },
          { label:'تقييمات مكتملة', value:`${appraisals.filter(a => a.status === 'final').length}/${appraisals.length}`, sub:'هذا الربع', bg:'bg-emerald-500', icon:CheckCircle },
          { label:'أعلى أداء', value:topPerformer?.score + '%', sub:topPerformer?.employee_name.split(' ')[0], bg:'bg-amber-500', icon:Award },
          { label:'بحاجة للمتابعة', value:appraisals.filter(a => a.score < 75).length, sub:'موظف', bg:'bg-red-500', icon:Target },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-xl text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-5">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[{v:'', l:'الكل'}, ...Object.entries(STATUS_CFG).map(([v,{label:l}]) => ({v,l}))].map(opt => (
              <button key={opt.v} onClick={() => setFilterStatus(opt.v as AppraisalStatus | '')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filterStatus === opt.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {opt.l}
              </button>
            ))}
          </div>

          {/* Appraisals list */}
          <div className="space-y-3">
            {filtered.map((appraisal, i) => {
              const scoreInfo = getScoreLabel(appraisal.score)
              const statusCfg = STATUS_CFG[appraisal.status]
              return (
                <div key={appraisal.id}
                  onClick={() => setSelectedAppraisal(appraisal === selectedAppraisal ? null : appraisal)}
                  className={`bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${selectedAppraisal?.id === appraisal.id ? 'border-primary shadow-md' : 'border-border/60'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-xl flex items-center justify-center text-white font-black text-base shrink-0`}>
                      {appraisal.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-bold">{appraisal.employee_name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${scoreInfo.color}`}>{scoreInfo.label}</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{appraisal.department} • {appraisal.period}</p>
                      <div className="mt-2">
                        <ScoreBar score={appraisal.score} color={getScoreColor(appraisal.score)} />
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-3xl font-black text-primary">{appraisal.score}</p>
                      <p className="text-xs text-muted-foreground">/ 100</p>
                    </div>
                  </div>

                  {selectedAppraisal?.id === appraisal.id && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                      {appraisal.kpis.map(kpi => (
                        <div key={kpi.label} className="flex items-center gap-3">
                          <span className="w-28 text-xs text-muted-foreground text-right shrink-0">{kpi.label}</span>
                          <ScoreBar score={kpi.score} color={getScoreColor(kpi.score)} />
                          <span className="text-xs text-muted-foreground shrink-0">وزن {kpi.weight}%</span>
                        </div>
                      ))}
                      {appraisal.notes && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">{appraisal.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Charts sidebar */}
        <div className="space-y-5">
          {/* Trend chart */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />متوسط الأداء الشهري
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={MONTHLY_TREND} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[6,6,0,0]} name="المتوسط" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart for selected */}
          {selectedAppraisal && radarData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-bold mb-4">مؤشرات {selectedAppraisal.employee_name.split(' ')[0]}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rating distribution */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4">توزيع التقييمات</h3>
            <div className="space-y-3">
              {[
                { label: 'ممتاز (90-100)', count: appraisals.filter(a => a.score >= 90).length, color: 'bg-emerald-500' },
                { label: 'جيد جداً (75-89)', count: appraisals.filter(a => a.score >= 75 && a.score < 90).length, color: 'bg-blue-500' },
                { label: 'جيد (60-74)', count: appraisals.filter(a => a.score >= 60 && a.score < 75).length, color: 'bg-amber-500' },
                { label: 'يحتاج تحسين (<60)', count: appraisals.filter(a => a.score < 60).length, color: 'bg-red-500' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 text-right shrink-0">{r.label}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full`}
                      style={{ width: `${(r.count / appraisals.length) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold w-4 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Appraisal Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إضافة تقييم أداء جديد">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">الموظف</label>
              <select className="form-select">
                <option value="">اختر الموظف</option>
                {appraisals.map(a => <option key={a.id} value={a.employee_id}>{a.employee_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الفترة</label>
              <select className="form-select">
                {['Q1 2026','Q2 2026','Q3 2026','Q4 2026'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">المقيِّم</label>
            <input className="form-input" placeholder="اسم المقيِّم" />
          </div>
          <div>
            <label className="form-label">ملاحظات التقييم</label>
            <textarea className="form-input resize-none h-20" placeholder="ملاحظات عامة حول أداء الموظف..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={async () => {
              setSaving(true)
              await new Promise(r => setTimeout(r, 600))
              setSaving(false)
              toast.success('تم إنشاء نموذج التقييم')
              setShowForm(false)
            }} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إنشاء التقييم
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return <TrendingUp className={className} />
}
