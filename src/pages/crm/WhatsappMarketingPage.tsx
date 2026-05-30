import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  MessageCircle, Users, Send, CheckCircle2, XCircle,
  Clock, Wifi, WifiOff, QrCode, RefreshCw,
  Eye, RotateCcw, Download, Trash2, Calendar, Smile,
  BarChart3, Megaphone, Plus, Shield, AlertTriangle,
  Loader2, X, Check, TrendingUp, UserCheck, Timer,
  Search, CheckCheck, Percent, Target
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'
type CampaignStatus = 'pending' | 'running' | 'completed' | 'failed' | 'scheduled'
type AudienceType = 'all' | 'active' | 'new' | 'overdue' | 'credit' | 'custom'

interface Campaign {
  id: string
  campaign_name: string
  audience_type: AudienceType
  message: string
  scheduled_at: string | null
  status: CampaignStatus
  success_rate: number
  total_recipients: number
  delivered_count: number
  failed_count: number
  created_at: string
  company_id: string
}

// ─── Animated Number ─────────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start = 0
    let id: number
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setValue(Math.floor(e * target))
      if (p < 1) { id = requestAnimationFrame(step) }
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [target, duration])
  return value
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ label, value, suffix = '', icon: Icon, gradient, trend, delay = 0 }: {
  label: string; value: number; suffix?: string; icon: React.ElementType
  gradient: string; trend?: number; delay?: number
}) {
  const animated = useAnimatedNumber(Math.round(value))
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{animated.toLocaleString('ar-SA')}</span>
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          </div>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-1.5 text-[11px] font-medium', trend >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              <TrendingUp className={cn('w-3 h-3', trend < 0 && 'rotate-180')} />
              {Math.abs(trend)}% من الشهر الماضي
            </div>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', gradient)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Connection Card ──────────────────────────────────────────────────────────

function ConnectionCard({ status, onConnect, onDisconnect, onRefresh }: {
  status: ConnectionStatus; onConnect: () => void; onDisconnect: () => void; onRefresh: () => void
}) {
  const [showQR, setShowQR] = useState(false)
  const cfg = {
    connected:    { color: 'text-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', label: 'متصل',           icon: Wifi },
    disconnected: { color: 'text-red-500',     bg: 'bg-red-500/10',     dot: 'bg-red-500',     label: 'غير متصل',       icon: WifiOff },
    connecting:   { color: 'text-amber-500',   bg: 'bg-amber-500/10',   dot: 'bg-amber-500',   label: 'جارٍ الاتصال...', icon: RefreshCw },
  }[status]
  const StatusIcon = cfg.icon

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-[14px]">حالة الاتصال</h3>
        <button onClick={onRefresh} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
          <RefreshCw className={cn('w-3.5 h-3.5', status === 'connecting' && 'animate-spin')} />
        </button>
      </div>
      <div className="p-5">
        <div className={cn('flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl mb-4', cfg.bg)}>
          <div className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot, status !== 'disconnected' && 'animate-pulse')} />
          <StatusIcon className={cn('w-4 h-4 shrink-0', cfg.color, status === 'connecting' && 'animate-spin')} />
          <span className={cn('text-[13px] font-semibold', cfg.color)}>{cfg.label}</span>
          {status === 'connected' && <span className="mr-auto text-[10px] text-emerald-500/70 font-medium">WhatsApp Business</span>}
        </div>

        {status === 'disconnected' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-[22px] bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <MessageCircle className="w-9 h-9 text-white" />
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">وصّل رقم واتساب نشاطك التجاري لبدء إرسال الحملات</p>
            <AnimatePresence>
              {showQR && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                  <div className="w-36 h-36 mx-auto bg-white dark:bg-white rounded-xl flex items-center justify-center border border-border p-2 shadow-inner">
                    <QrCode className="w-28 h-28 text-gray-800" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">افتح واتساب ← الأجهزة المرتبطة ← ربط جهاز</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-2">
              <button
                onClick={() => { setShowQR(!showQR); onConnect() }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                <QrCode className="w-4 h-4" />
                {showQR ? 'إخفاء رمز QR' : 'بدء الاتصال بـ QR'}
              </button>
              <button onClick={onConnect} className="w-full py-2 rounded-xl bg-muted text-muted-foreground text-[12px] hover:bg-muted/80 transition-colors">
                ربط بـ API مباشر
              </button>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="space-y-3">
            {[
              { label: 'الرقم المرتبط', value: '+966 5x xxx xxxx', mono: true },
              { label: 'اسم الحساب',    value: 'Business Account',  mono: false },
              { label: 'الجلسة',        value: 'نشطة • منذ ٣ أيام', mono: false, green: true },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={cn('font-semibold', r.mono && 'font-mono', r.green && 'text-emerald-500')}>{r.value}</span>
              </div>
            ))}
            <div className="h-px bg-border" />
            <button onClick={onDisconnect} className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-500 text-[12px] font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              قطع الاتصال
            </button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">جارٍ التحقق من الاتصال...</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Safety Card ─────────────────────────────────────────────────────────────

function SafetyCard() {
  const tips = [
    { icon: Shield,        color: 'text-emerald-500', bg: 'bg-emerald-500/10', text: 'استخدم رقماً تجارياً حقيقياً موثقاً' },
    { icon: Timer,         color: 'text-blue-500',    bg: 'bg-blue-500/10',    text: 'لا ترسل أكثر من ١٠٠٠ رسالة يومياً' },
    { icon: UserCheck,     color: 'text-violet-500',  bg: 'bg-violet-500/10',  text: 'خصص الرسائل بالاسم والبيانات' },
    { icon: AlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-500/10',   text: 'تجنب التكرار للعميل الواحد' },
    { icon: Calendar,      color: 'text-pink-500',    bg: 'bg-pink-500/10',    text: 'جدول حملاتك في أوقات مناسبة' },
  ]
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h3 className="font-semibold text-[14px]">نصائح الأمان</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5', tip.bg)}>
              <tip.icon className={cn('w-3 h-3', tip.color)} />
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<CampaignStatus, { label: string; className: string }> = {
    pending:   { label: 'معلق',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    running:   { label: 'جارٍ',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    completed: { label: 'مكتمل', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    failed:    { label: 'فاشل',  className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    scheduled: { label: 'مجدول', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  }
  const { label, className } = config[status]
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', className)}>{label}</span>
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsappMarketingPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [campaignName, setCampaignName]     = useState('')
  const [audienceType, setAudienceType]     = useState<AudienceType>('all')
  const [message, setMessage]               = useState('')
  const [scheduledAt, setScheduledAt]       = useState('')
  const [showSchedule, setShowSchedule]     = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isSending, setIsSending]           = useState(false)
  const [sendProgress, setSendProgress]     = useState(0)
  const [showEmoji, setShowEmoji]           = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [searchQuery, setSearchQuery]       = useState('')

  // Fetch campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['whatsapp_campaigns', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data as Campaign[]) || []
    },
    enabled: !!user,
  })

  // Fetch customer counts
  const { data: counts = { all: 0, active: 0, new: 0, overdue: 0, credit: 0 } } = useQuery({
    queryKey: ['wa_customer_counts', user?.company_id],
    queryFn: async () => {
      if (!user) return { all: 0, active: 0, new: 0, overdue: 0, credit: 0 }
      const { count: all } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.company_id)
      const n = all || 0
      return { all: n, active: Math.floor(n * 0.7), new: Math.floor(n * 0.15), overdue: Math.floor(n * 0.1), credit: Math.floor(n * 0.3) }
    },
    enabled: !!user,
  })

  // KPIs
  const totalCampaigns     = campaigns.length
  const successfulMessages = campaigns.reduce((s, c) => s + (c.delivered_count || 0), 0)
  const totalSent          = campaigns.reduce((s, c) => s + (c.total_recipients || 0), 0)
  const successRate        = totalSent > 0 ? Math.round((successfulMessages / totalSent) * 100) : 0

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async (payload: Partial<Campaign>) => {
      if (!user) throw new Error('غير مصرح')
      const { error } = await supabase
        .from('whatsapp_campaigns')
        .insert([{ ...payload, company_id: user.company_id, created_at: new Date().toISOString() }])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp_campaigns'] })
      toast.success('تم إنشاء الحملة بنجاح')
      setCampaignName(''); setMessage(''); setScheduledAt(''); setShowSchedule(false)
    },
    onError: () => toast.error('حدث خطأ أثناء إنشاء الحملة'),
  })

  // Delete campaign
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => { await supabase.from('whatsapp_campaigns').delete().eq('id', id) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsapp_campaigns'] }); toast.success('تم حذف الحملة') },
  })

  const audienceOptions: { value: AudienceType; label: string; count: number; color: string }[] = [
    { value: 'all',     label: 'جميع العملاء',     count: counts.all,     color: 'text-blue-500' },
    { value: 'active',  label: 'العملاء النشطين',   count: counts.active,  color: 'text-emerald-500' },
    { value: 'new',     label: 'العملاء الجدد',     count: counts.new,     color: 'text-violet-500' },
    { value: 'overdue', label: 'العملاء المتأخرين', count: counts.overdue, color: 'text-red-500' },
    { value: 'credit',  label: 'عملاء الآجل',       count: counts.credit,  color: 'text-amber-500' },
    { value: 'custom',  label: 'تخصيص يدوي',        count: 0,              color: 'text-pink-500' },
  ]

  const selectedAudience = audienceOptions.find(a => a.value === audienceType)!

  const recipientCount = audienceType === 'all' ? counts.all
    : audienceType === 'active'  ? counts.active
    : audienceType === 'new'     ? counts.new
    : audienceType === 'overdue' ? counts.overdue
    : audienceType === 'credit'  ? counts.credit : 0

  const handleSend = async (sendNow: boolean) => {
    if (!campaignName.trim()) { toast.error('أدخل اسم الحملة'); return }
    if (!message.trim())      { toast.error('أدخل نص الرسالة'); return }
    if (!sendNow && !scheduledAt) { toast.error('حدد وقت الجدولة'); return }
    if (sendNow && connectionStatus !== 'connected') { toast.error('قم بتوصيل واتساب أولاً'); return }

    if (sendNow) {
      setIsSending(true); setSendProgress(0)
      const iv = setInterval(() => setSendProgress(p => p >= 92 ? p : p + Math.random() * 7), 150)
      await createCampaign.mutateAsync({ campaign_name: campaignName, audience_type: audienceType, message, scheduled_at: null, status: 'running', total_recipients: recipientCount, delivered_count: 0, failed_count: 0, success_rate: 0 })
      clearInterval(iv); setSendProgress(100)
      setTimeout(() => { setIsSending(false); setSendProgress(0) }, 1200)
    } else {
      await createCampaign.mutateAsync({ campaign_name: campaignName, audience_type: audienceType, message, scheduled_at: scheduledAt, status: 'scheduled', total_recipients: recipientCount, delivered_count: 0, failed_count: 0, success_rate: 0 })
    }
  }

  const insertVar = (v: string) => {
    const el = textareaRef.current; if (!el) return
    const s = el.selectionStart, e = el.selectionEnd
    setMessage(message.slice(0, s) + v + message.slice(e))
    setTimeout(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length) }, 0)
  }

  const filtered = campaigns.filter(c => c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()))
  const emojis   = ['😊','🎉','💯','🔥','✅','💰','🛍️','📦','🌟','👋','⚡','🎁','🎯','💎','🚀']
  const fmtDate  = (d: string) => new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">واتساب ماركتينج</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
              WhatsApp Marketing
            </span>
          </div>
          <p className="text-sm text-muted-foreground mr-12">إدارة الحملات التسويقية وإرسال الرسائل الجماعية للعملاء</p>
        </div>
        <button
          onClick={() => setConnectionStatus(s => s === 'connected' ? 'disconnected' : 'connected')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            connectionStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/20 hover:opacity-90'
          )}
        >
          {connectionStatus === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {connectionStatus === 'connected' ? 'واتساب متصل' : 'ربط واتساب'}
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="إجمالي الحملات"   value={totalCampaigns}     icon={Megaphone}  gradient="bg-gradient-to-br from-violet-500 to-indigo-600"  trend={12}  delay={0} />
        <KPICard label="الرسائل الناجحة"  value={successfulMessages}  icon={CheckCheck} gradient="bg-gradient-to-br from-emerald-400 to-teal-600"    trend={8}   delay={0.05} />
        <KPICard label="نسبة النجاح"       value={successRate}         icon={Target}     gradient="bg-gradient-to-br from-blue-500 to-cyan-600"        trend={-2}  delay={0.1}  suffix="%" />
        <KPICard label="العملاء المتاحين"  value={counts.all}          icon={Users}      gradient="bg-gradient-to-br from-pink-500 to-rose-600"         trend={5}   delay={0.15} />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Campaign Form ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-border bg-gradient-to-l from-violet-500/5 to-indigo-500/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-[15px]">حملة جديدة</h2>
                  <p className="text-[11px] text-muted-foreground">إنشاء وإرسال حملة تسويقية عبر واتساب</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">

              {/* Campaign Name */}
              <div>
                <label className="block text-[13px] font-semibold text-foreground mb-2">اسم الحملة</label>
                <input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="مثال: عروض عيد الفطر ٢٠٢٦"
                  className="form-input w-full"
                />
              </div>

              {/* Audience Selector */}
              <div>
                <label className="block text-[13px] font-semibold text-foreground mb-2">الجمهور المستهدف</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {audienceOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAudienceType(opt.value)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-right transition-all',
                        audienceType === opt.value
                          ? 'border-violet-500/50 bg-violet-500/5 shadow-sm'
                          : 'border-border hover:border-violet-300 dark:hover:border-violet-700'
                      )}
                    >
                      <div>
                        <p className="text-[12px] font-semibold text-foreground">{opt.label}</p>
                        {opt.count > 0 && (
                          <p className={cn('text-[10px] font-medium', opt.color)}>{opt.count.toLocaleString('ar-SA')} عميل</p>
                        )}
                      </div>
                      {audienceType === opt.value && (
                        <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedAudience.count > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-violet-500/5 border border-violet-500/20 rounded-xl"
                  >
                    <Users className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[12px] text-violet-600 dark:text-violet-400 font-medium">
                      سيتم الإرسال لـ <strong>{selectedAudience.count.toLocaleString('ar-SA')}</strong> عميل
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Message Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold text-foreground">نص الرسالة</label>
                  <span className={cn('text-[11px] font-mono', message.length > 900 ? 'text-red-500' : 'text-muted-foreground')}>
                    {message.length} / 1024
                  </span>
                </div>

                {/* Variable Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[11px] text-muted-foreground">متغيرات:</span>
                  {['{اسم_العميل}', '{الرصيد}', '{تاريخ_الاستحقاق}'].map(v => (
                    <button
                      key={v}
                      onClick={() => insertVar(v)}
                      className="px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-mono rounded-lg transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="px-2 py-0.5 bg-muted hover:bg-muted/80 text-muted-foreground text-[11px] rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Smile className="w-3 h-3" /> إيموجي
                  </button>
                </div>

                <AnimatePresence>
                  {showEmoji && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-wrap gap-1.5 p-2.5 bg-muted rounded-xl mb-2"
                    >
                      {emojis.map(e => (
                        <button key={e} onClick={() => { insertVar(e); setShowEmoji(false) }}
                          className="text-xl hover:scale-125 transition-transform leading-none">{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={1024}
                  rows={5}
                  placeholder="اكتب نص رسالتك هنا... استخدم المتغيرات لتخصيص كل رسالة"
                  className="form-input w-full resize-none font-medium leading-relaxed"
                />

                {/* Message Preview */}
                <AnimatePresence>
                  {message && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl overflow-hidden border border-border">
                      <div className="bg-muted px-3 py-1.5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[11px] text-muted-foreground font-medium">معاينة الرسالة</span>
                      </div>
                      <div className="bg-[#DCF8C6] dark:bg-[#005c4b] p-4">
                        <p className="text-[13px] text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap font-medium">
                          {message
                            .replace('{اسم_العميل}', 'أحمد محمد')
                            .replace('{الرصيد}', '١٥٠٠ ر.س')
                            .replace('{تاريخ_الاستحقاق}', '٢٠٢٦/٦/١')}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Schedule Toggle */}
              <div>
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="flex items-center gap-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className={cn('w-9 h-5 rounded-full transition-all duration-200 relative', showSchedule ? 'bg-violet-500' : 'bg-muted-foreground/30')}>
                    <motion.div
                      animate={{ x: showSchedule ? 16 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </div>
                  جدولة لوقت لاحق
                </button>
                <AnimatePresence>
                  {showSchedule && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3">
                        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="form-input w-full" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Send Progress */}
              <AnimatePresence>
                {isSending && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />جارٍ الإرسال...</span>
                      <span className="font-bold text-violet-500">{Math.round(sendProgress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                        animate={{ width: `${sendProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={() => handleSend(true)}
                  disabled={isSending || !campaignName || !message}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all min-w-[120px]',
                    !isSending && campaignName && message
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:opacity-90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSending ? 'جارٍ الإرسال...' : 'إرسال الآن'}
                </button>
                {showSchedule && (
                  <button
                    onClick={() => handleSend(false)}
                    disabled={!campaignName || !message || !scheduledAt}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all min-w-[100px]',
                      campaignName && message && scheduledAt
                        ? 'border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/5'
                        : 'border-border text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                    جدولة
                  </button>
                )}
                <button
                  onClick={() => { setCampaignName(''); setMessage(''); setAudienceType('all'); setScheduledAt(''); setShowSchedule(false) }}
                  className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Sidebar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <ConnectionCard
            status={connectionStatus}
            onConnect={() => { setConnectionStatus('connecting'); setTimeout(() => setConnectionStatus('connected'), 2200) }}
            onDisconnect={() => setConnectionStatus('disconnected')}
            onRefresh={() => { setConnectionStatus('connecting'); setTimeout(() => setConnectionStatus('connected'), 2000) }}
          />
          <SafetyCard />
        </motion.div>
      </div>

      {/* ── Campaign Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[15px]">سجل الحملات</h2>
              <p className="text-[11px] text-muted-foreground">{campaigns.length} حملة مسجلة</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث في الحملات..."
              className="form-input pr-9 h-8 text-sm w-52"
            />
          </div>
        </div>

        {/* Loading Skeleton */}
        {loadingCampaigns ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center border border-violet-500/10">
              <Megaphone className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد حملات بعد'}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'جرب كلمة بحث مختلفة' : 'أنشئ حملتك الأولى من النموذج أعلاه'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['الحملة', 'الجمهور', 'الحالة', 'الإرسال', 'التاريخ', 'إجراء'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(c => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                          <Megaphone className="w-3.5 h-3.5 text-violet-500" />
                        </div>
                        <span className="text-[13px] font-semibold text-foreground truncate max-w-[140px]">{c.campaign_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                        {audienceOptions.find(a => a.value === c.audience_type)?.label || c.audience_type}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      {c.total_recipients > 0 ? (
                        <div>
                          <div className="flex items-center gap-1 mb-1 text-[12px]">
                            <span className="text-emerald-500 font-semibold">{c.delivered_count}</span>
                            <span className="text-muted-foreground">/ {c.total_recipients}</span>
                          </div>
                          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((c.delivered_count / c.total_recipients) * 100)}%` }} />
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-[12px]">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[12px] text-muted-foreground">{fmtDate(c.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedCampaign(c)} title="عرض" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button title="إعادة إرسال" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-500 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button title="تصدير" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (window.confirm('هل أنت متأكد من حذف هذه الحملة؟')) deleteCampaign.mutate(c.id) }}
                          title="حذف"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Campaign Detail Modal ── */}
      <AnimatePresence>
        {selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCampaign(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-[15px]">{selectedCampaign.campaign_name}</h3>
                <button onClick={() => setSelectedCampaign(null)} className="btn-ghost p-1.5 rounded-lg text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'الحالة',           value: <StatusBadge status={selectedCampaign.status} /> },
                    { label: 'الجمهور',          value: audienceOptions.find(a => a.value === selectedCampaign.audience_type)?.label },
                    { label: 'إجمالي المستلمين', value: selectedCampaign.total_recipients.toLocaleString('ar-SA') },
                    { label: 'تم الإرسال',       value: <span className="text-emerald-500 font-semibold">{selectedCampaign.delivered_count.toLocaleString('ar-SA')}</span> },
                    { label: 'فشل الإرسال',      value: <span className="text-red-500 font-semibold">{selectedCampaign.failed_count.toLocaleString('ar-SA')}</span> },
                    { label: 'التاريخ',          value: fmtDate(selectedCampaign.created_at) },
                  ].map(row => (
                    <div key={row.label} className="bg-muted/50 rounded-xl px-4 py-3">
                      <p className="text-[11px] text-muted-foreground mb-1">{row.label}</p>
                      <div className="text-[13px] font-semibold">{row.value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">نص الرسالة</p>
                  <div className="bg-[#DCF8C6] dark:bg-[#005c4b] rounded-xl p-4">
                    <p className="text-[13px] text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">{selectedCampaign.message}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
