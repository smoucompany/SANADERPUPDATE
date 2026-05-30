import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MessageSquare, TrendingUp, Star, Phone, Mail, ArrowLeftRight, Plus, Send } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

const PIPELINE_STAGES = [
  { label: 'عملاء محتملون', count: 48, value: 0, color: 'bg-gray-400' },
  { label: 'تواصل أولي', count: 32, value: 285000, color: 'bg-blue-500' },
  { label: 'عرض سعر', count: 18, value: 420000, color: 'bg-amber-500' },
  { label: 'تفاوض', count: 12, value: 310000, color: 'bg-orange-500' },
  { label: 'إغلاق الصفقة', count: 7, value: 185000, color: 'bg-emerald-500' },
]

const RECENT_ACTIVITIES = [
  { id:'1', type:'call', customer:'شركة الأفق للتجارة', note:'اتصال لمتابعة عرض السعر', date:'2026-05-28 09:15', outcome:'إيجابي' },
  { id:'2', type:'whatsapp', customer:'محمد السعيد', note:'إرسال كتالوج المنتجات', date:'2026-05-28 10:30', outcome:'انتظار' },
  { id:'3', type:'email', customer:'مؤسسة النور التجارية', note:'بريد متابعة العرض', date:'2026-05-27 14:00', outcome:'قبول' },
  { id:'4', type:'meeting', customer:'مجموعة المستقبل', note:'اجتماع تقديم المنتج', date:'2026-05-27 11:00', outcome:'إيجابي' },
  { id:'5', type:'whatsapp', customer:'فيصل العتيبي', note:'رد على استفسار المنتج', date:'2026-05-26 16:45', outcome:'متابعة' },
]

const MONTHLY_DATA = [
  { month: 'يناير', leads: 22, converted: 8 },
  { month: 'فبراير', leads: 30, converted: 12 },
  { month: 'مارس', leads: 28, converted: 10 },
  { month: 'أبريل', leads: 35, converted: 14 },
  { month: 'مايو', leads: 42, converted: 18 },
]

const TOP_CUSTOMERS = [
  { name: 'شركة الأفق', purchases: 185000, invoices: 12, rating: 5 },
  { name: 'مجموعة المستقبل', purchases: 142000, invoices: 8, rating: 4 },
  { name: 'مؤسسة النور', purchases: 98500, invoices: 15, rating: 5 },
  { name: 'محمد السعيد', purchases: 67000, invoices: 22, rating: 4 },
]

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  meeting: Users,
}
const ACTIVITY_COLORS: Record<string, string> = {
  call: 'bg-blue-500',
  whatsapp: 'bg-emerald-500',
  email: 'bg-indigo-500',
  meeting: 'bg-purple-500',
}
const OUTCOME_COLORS: Record<string, string> = {
  إيجابي: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
  قبول: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  انتظار: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
  متابعة: 'bg-gray-100 text-gray-600 dark:bg-gray-800',
}

export default function CRMDashboardPage() {
  const navigate = useNavigate()
  const [showActivity, setShowActivity] = useState(false)

  const totalPipelineValue = PIPELINE_STAGES.reduce((s,p) => s + p.value, 0)
  const conversionRate = Math.round((7 / 48) * 100)

  return (
    <div className="space-y-5">
      <PageHeader
        title="إدارة علاقات العملاء"
        subtitle="CRM Dashboard"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/crm/whatsapp-marketing')} className="btn-outline gap-1.5">
              <MessageSquare className="w-4 h-4" />واتساب ماركتينج
            </button>
            <button onClick={() => toast.success('جاري إضافة عميل محتمل...')} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />عميل محتمل
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'إجمالي العملاء', value:'148', sub:'عميل نشط', color:'text-blue-600', bg:'bg-blue-500', icon:Users },
          { label:'قيمة خط الأعمال', value:formatCurrency(totalPipelineValue), sub:'فرص نشطة', color:'text-primary', bg:'bg-primary', icon:TrendingUp },
          { label:'نسبة التحويل', value:`${conversionRate}%`, sub:'من المحتمل للعميل', color:'text-emerald-600', bg:'bg-emerald-500', icon:ArrowLeftRight },
          { label:'رسائل واتساب', value:'324', sub:'هذا الشهر', color:'text-green-600', bg:'bg-green-500', icon:MessageSquare },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-5 flex items-center gap-3">
            <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <div className="space-y-5">
          {/* Pipeline */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4">خط الصفقات (Pipeline)</h3>
            <div className="space-y-3">
              {PIPELINE_STAGES.map((stage, i) => {
                const maxCount = Math.max(...PIPELINE_STAGES.map(p => p.count))
                return (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div className="w-28 text-sm text-muted-foreground text-right shrink-0">{stage.label}</div>
                    <div className="flex-1 relative h-8">
                      <div className="h-full bg-muted rounded-lg overflow-hidden">
                        <div className={`h-full ${stage.color} transition-all duration-500`} style={{ width: `${(stage.count/maxCount)*100}%` }} />
                      </div>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">{stage.count}</span>
                    </div>
                    <div className="w-24 text-sm font-semibold text-right shrink-0">{stage.value > 0 ? formatCurrency(stage.value) : '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4">العملاء المحتملون vs المحوّلون</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="leads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="converted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="url(#leads)" name="محتمل" />
                <Area type="monotone" dataKey="converted" stroke="#10b981" fill="url(#converted)" name="محوّل" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-5">
          {/* Recent Activities */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">آخر الأنشطة</h3>
              <button onClick={() => toast.success('جاري إضافة نشاط...')} className="btn-outline text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />إضافة
              </button>
            </div>
            <div className="space-y-3">
              {RECENT_ACTIVITIES.map(act => {
                const Icon = ACTIVITY_ICONS[act.type] || Phone
                return (
                  <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={`w-8 h-8 ${ACTIVITY_COLORS[act.type]} rounded-lg flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{act.customer}</p>
                      <p className="text-xs text-muted-foreground">{act.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{act.date}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${OUTCOME_COLORS[act.outcome] || 'bg-muted text-muted-foreground'}`}>
                      {act.outcome}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4">أفضل العملاء</h3>
            <div className="space-y-3">
              {TOP_CUSTOMERS.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className={`w-2.5 h-2.5 ${j < c.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground mr-1">{c.invoices} فاتورة</span>
                    </div>
                  </div>
                  <p className="font-bold text-sm shrink-0">{formatCurrency(c.purchases)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-3">إجراءات سريعة</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label:'إرسال واتساب', icon:MessageSquare, color:'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20', action:() => navigate('/crm/whatsapp-marketing') },
                { label:'عرض سعر',      icon:TrendingUp,    color:'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20', action:() => navigate('/quotations/new') },
                { label:'إرسال بريد',   icon:Send,          color:'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20', action:() => toast.success('فتح نافذة البريد...') },
                { label:'تقرير العملاء',icon:Users,         color:'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20', action:() => navigate('/customers') },
              ].map(a => (
                <button key={a.label} onClick={a.action} className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors ${a.color}`}>
                  <a.icon className="w-4 h-4" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
