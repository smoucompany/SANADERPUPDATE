import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users, Clock, DollarSign, UserPlus, AlertCircle, CheckCircle2,
  BarChart3, Search, RefreshCw, UserCheck, UserX, Edit2,
  Phone, Mail, MoreVertical, Eye, EyeOff, Award, Wallet,
  TrendingUp, Calendar, Building2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import Modal from '@/components/shared/Modal'

type Employee = {
  id: string
  full_name: string
  phone?: string
  email?: string
  role: string
  is_active: boolean
  created_at: string
  last_login?: string
}

type TabId = 'overview' | 'employees' | 'attendance' | 'payroll'

// ── Animated Counter ──────────────────────────────────────────
function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>()
  useEffect(() => {
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - start) / 900, 1)
      setDisplay(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) ref.current = requestAnimationFrame(step)
    }
    ref.current = requestAnimationFrame(step)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value])
  return <span>{Math.round(display)}{suffix}</span>
}

// ── Hooks ─────────────────────────────────────────────────────
function useEmployees() {
  const { user } = useAuthStore()
  return useQuery<Employee[]>({
    queryKey: ['employees', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users').select('*').eq('company_id', user!.company_id).order('full_name')
      if (error) throw error
      return data as Employee[]
    },
    enabled: !!user, retry: false
  })
}

function useAttendance() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['hr-attendance', user?.company_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const last14 = new Date(); last14.setDate(last14.getDate() - 13)
      const { data } = await supabase.from('shifts').select('user_id, opened_at, status, opening_balance')
        .eq('company_id', user!.company_id).gte('opened_at', last14.toISOString().split('T')[0]).order('opened_at', { ascending: false })
      return data || []
    },
    enabled: !!user, retry: false
  })
}

function useExpenses() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['hr-expenses', user?.company_id],
    queryFn: async () => {
      const monthStart = new Date().toISOString().slice(0, 7) + '-01'
      const { data } = await supabase.from('expenses').select('total_amount, expense_date, description')
        .eq('company_id', user!.company_id).gte('expense_date', monthStart).order('expense_date', { ascending: false })
      return data || []
    },
    enabled: !!user, retry: false
  })
}

// ── Role config ───────────────────────────────────────────────
const ROLES = [
  { value: 'admin',      label: 'مدير النظام',  bg: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',  dot: 'bg-violet-500' },
  { value: 'manager',    label: 'مدير',          bg: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',          dot: 'bg-blue-500' },
  { value: 'accountant', label: 'محاسب',         bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { value: 'cashier',    label: 'كاشير',         bg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',      dot: 'bg-amber-500' },
  { value: 'employee',   label: 'موظف',          bg: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',      dot: 'bg-slate-400' },
]
const roleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[4]
const roleLabel = (role: string) => roleInfo(role).label

const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('')
  const palettes = ['from-violet-500 to-indigo-600', 'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600', 'from-cyan-500 to-blue-600']
  const color = palettes[name.charCodeAt(0) % palettes.length]
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, loading }: {
  title: string; value: number; icon: React.ElementType; color: string; loading?: boolean
}) {
  const colors: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', iconBg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800/60' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', iconBg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/60' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', iconBg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/60' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/40', iconBg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800/60' },
  }
  const c = colors[color]
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 ${c.iconBg} rounded-2xl flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        {loading ? (
          <>
            <div className="h-7 w-16 bg-current/10 rounded-lg animate-pulse mb-1 opacity-20" />
            <div className="h-3 w-24 bg-current/10 rounded animate-pulse opacity-20" />
          </>
        ) : (
          <>
            <p className={`text-3xl font-black ${c.text}`}><Counter value={value} /></p>
            <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          <span>{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Employee Modal ────────────────────────────────────────────
function EmployeeModal({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isEdit = !!employee
  const [form, setForm] = useState({
    full_name: employee?.full_name || '',
    phone: employee?.phone || '',
    role: employee?.role || 'employee',
    email: employee?.email || '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('اسم الموظف مطلوب'); return }
    setLoading(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('users').update({
          full_name: form.full_name, phone: form.phone || null, role: form.role,
        }).eq('id', employee.id)
        if (error) throw error
        toast.success('تم تحديث بيانات الموظف')
      } else {
        if (!form.email.trim()) { toast.error('البريد الإلكتروني مطلوب'); setLoading(false); return }
        const tempPassword = crypto.randomUUID().slice(0, 16)
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: form.email.trim(), password: tempPassword,
          options: { data: { full_name: form.full_name, company_id: user!.company_id, role: form.role, phone: form.phone || null } }
        })
        if (signUpErr) throw signUpErr
        if (signUpData.user) {
          await supabase.from('users').upsert({
            id: signUpData.user.id, company_id: user!.company_id,
            full_name: form.full_name, phone: form.phone || null, role: form.role, is_active: true, permissions: {}
          }, { onConflict: 'id' })
        }
        toast.success('تم إنشاء حساب الموظف. سيتلقى بريداً إلكترونياً لتفعيل الحساب.')
      }
      qc.invalidateQueries({ queryKey: ['employees'] })
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="form-label">الاسم الكامل *</label>
        <input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="form-input" placeholder="محمد أحمد..." autoFocus />
      </div>
      {!isEdit && (
        <>
          <div>
            <label className="form-label">البريد الإلكتروني *</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} className="form-input" placeholder="employee@company.com" type="email" dir="ltr" />
          </div>
          <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-3 py-2.5">
            <span className="shrink-0">⚠️</span>
            <span>سيتم إرسال بريد إلكتروني للموظف لتفعيل الحساب وتعيين كلمة المرور.</span>
          </div>
        </>
      )}
      <div>
        <label className="form-label">رقم الجوال</label>
        <input value={form.phone} onChange={e => set('phone', e.target.value)} className="form-input" placeholder="05XXXXXXXX" dir="ltr" />
      </div>
      <div>
        <label className="form-label">الدور الوظيفي</label>
        <select value={form.role} onChange={e => set('role', e.target.value)} className="form-select">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="btn-outline flex-1 justify-center">إلغاء</button>
        <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التغييرات' : 'إضافة الموظف'}
        </button>
      </div>
    </div>
  )
}

// ── Employees Tab ─────────────────────────────────────────────
function EmployeesTab() {
  const qc = useQueryClient()
  const { data: employees = [], isLoading } = useEmployees()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Employee | undefined>()
  const [menuId, setMenuId] = useState<string | null>(null)

  const filtered = employees.filter(e => {
    const m = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone?.includes(search) || e.email?.toLowerCase().includes(search.toLowerCase())
    return m && (roleFilter === 'all' || e.role === roleFilter)
  })

  const toggleActive = async (emp: Employee) => {
    const { error } = await supabase.from('users').update({ is_active: !emp.is_active }).eq('id', emp.id)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ['employees'] })
    toast.success(emp.is_active ? 'تم تعطيل الموظف' : 'تم تفعيل الموظف')
    setMenuId(null)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الجوال..."
            className="form-input pr-9 w-full" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="form-select w-40">
          <option value="all">جميع الأدوار</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)} className="btn-primary gap-2 shrink-0">
          <UserPlus className="w-4 h-4" />إضافة موظف
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 text-xs flex-wrap">
        {[
          { label: 'الإجمالي', value: employees.length, cls: 'bg-muted text-foreground' },
          { label: 'نشط', value: employees.filter(e => e.is_active).length, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'موقوف', value: employees.filter(e => !e.is_active).length, cls: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
        ].map(s => (
          <span key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${s.cls}`}>
            <span className="font-black">{s.value}</span>
            <span className="opacity-70">{s.label}</span>
          </span>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/60 rounded-2xl">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد موظفون مطابقون</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((emp, i) => {
            const ri = roleInfo(emp.role)
            return (
              <motion.div key={emp.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className={`bg-card border border-border/60 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-border transition-colors ${!emp.is_active ? 'opacity-60' : ''}`}>
                  <div className="relative shrink-0">
                    <Avatar name={emp.full_name} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${emp.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{emp.full_name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ri.bg}`}>{ri.label}</span>
                      {!emp.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">موقوف</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      {emp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>}
                      {emp.email && <span className="flex items-center gap-1 truncate max-w-40"><Mail className="w-3 h-3" />{emp.email}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />انضم {formatDate(emp.created_at)}</span>
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <button onClick={() => setMenuId(menuId === emp.id ? null : emp.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {menuId === emp.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          className="absolute left-0 top-10 w-44 bg-popover border border-border rounded-2xl shadow-xl z-20 overflow-hidden">
                          <button onClick={() => { setEditing(emp); setMenuId(null) }}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                            <Edit2 className="w-4 h-4" />تعديل البيانات
                          </button>
                          <button onClick={() => toggleActive(emp)}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                            {emp.is_active ? <><EyeOff className="w-4 h-4" />تعطيل</> : <><Eye className="w-4 h-4" />تفعيل</>}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="إضافة موظف جديد" size="sm">
        <EmployeeModal onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="تعديل بيانات الموظف" size="sm">
        {editing && <EmployeeModal employee={editing} onClose={() => setEditing(undefined)} />}
      </Modal>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ employees, attendance }: { employees: Employee[]; attendance: any[] }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const active = employees.filter(e => e.is_active)
  const presentIds = new Set(attendance.filter(s => s.opened_at?.startsWith(todayStr)).map(s => s.user_id))
  const presentToday = active.filter(e => presentIds.has(e.id)).length
  const attendanceRate = active.length > 0 ? Math.round(presentToday / active.length * 100) : 0

  const roleMap: Record<string, number> = {}
  active.forEach(e => { const l = roleLabel(e.role); roleMap[l] = (roleMap[l] || 0) + 1 })
  const deptData = Object.entries(roleMap).map(([name, count]) => ({ name, count }))

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const chartData = last7.map(date => ({
    date: date.slice(5),
    حضور: new Set(attendance.filter(s => s.opened_at?.startsWith(date)).map(s => s.user_id)).size,
    غياب: Math.max(0, active.length - new Set(attendance.filter(s => s.opened_at?.startsWith(date)).map(s => s.user_id)).size)
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Attendance chart - 2/3 width */}
      <div className="lg:col-span-2 bg-card border border-border/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-base">الحضور - آخر 7 أيام</h3>
            <p className="text-xs text-muted-foreground mt-0.5">سجل حضور وغياب الموظفين</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />حضور</span>
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />غياب</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={4} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
            <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="حضور" fill="#6366f1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="غياب" fill="#f43f5e" radius={[6, 6, 0, 0]} opacity={0.6} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Today status - 1/3 */}
      <div className="space-y-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">حالة الحضور اليوم</h3>
          {/* Ring */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - attendanceRate / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{attendanceRate}%</p>
                <p className="text-[10px] text-muted-foreground">معدل الحضور</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400"><Counter value={presentToday} /></p>
              <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">حاضر</p>
            </div>
            <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800/40">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400"><Counter value={Math.max(0, active.length - presentToday)} /></p>
              <p className="text-[11px] text-rose-600/70 dark:text-rose-400/70 mt-0.5">غائب</p>
            </div>
          </div>
        </div>

        {/* Role pie */}
        {deptData.length > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">توزيع الأدوار</h3>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={deptData} dataKey="count" cx="50%" cy="50%" innerRadius={28} outerRadius={46} stroke="none" paddingAngle={3}>
                    {deptData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {deptData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{d.name}</span>
                    <span className="text-xs font-bold text-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Attendance Tab ────────────────────────────────────────────
function AttendanceTab({ employees, attendance }: { employees: Employee[]; attendance: any[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const dayShifts = attendance.filter(s => s.opened_at?.startsWith(selectedDate))
  const presentIds = new Set(dayShifts.map((s: any) => s.user_id))
  const active = employees.filter(e => e.is_active)
  const present = active.filter(e => presentIds.has(e.id))
  const absent = active.filter(e => !presentIds.has(e.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-muted-foreground font-medium">التاريخ:</label>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="form-input w-auto" dir="ltr" />
        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-semibold">
          حضر: {present.length}
        </span>
        <span className="px-3 py-1.5 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full text-xs font-semibold">
          غاب: {absent.length}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4" />حضروا ({present.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {present.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">لا يوجد حضور مسجّل</p>
            ) : present.map(emp => {
              const shift = dayShifts.find((s: any) => s.user_id === emp.id)
              return (
                <div key={emp.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                  <Avatar name={emp.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{roleLabel(emp.role)}</p>
                  </div>
                  {shift?.opened_at && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                      {new Date(shift.opened_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-card border border-rose-200 dark:border-rose-800/40 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
            <UserX className="w-4 h-4" />غابوا ({absent.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {absent.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">جميع الموظفين حضروا ✓</p>
            ) : absent.map(emp => (
              <div key={emp.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30">
                <Avatar name={emp.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{roleLabel(emp.role)}</p>
                </div>
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {dayShifts.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-3">سجل الورديات ({dayShifts.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-right py-2 px-3 font-medium">الموظف</th>
                  <th className="text-right py-2 px-3 font-medium">وقت الفتح</th>
                  <th className="text-right py-2 px-3 font-medium">رصيد الافتتاح</th>
                  <th className="text-right py-2 px-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {dayShifts.map((s: any) => {
                  const emp = employees.find(e => e.id === s.user_id)
                  return (
                    <tr key={s.user_id + s.opened_at} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {emp && <Avatar name={emp.full_name} size="sm" />}
                          <span className="text-sm font-medium">{emp?.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                        {new Date(s.opened_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 text-foreground">{formatCurrency(s.opening_balance || 0)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium
                          ${s.status === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {s.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Payroll Tab ───────────────────────────────────────────────
function PayrollTab({ employees }: { employees: Employee[] }) {
  const { data: expenses = [], isLoading } = useExpenses()
  const total = expenses.reduce((s, e: any) => s + (e.total_amount || 0), 0)
  const activeCount = employees.filter(e => e.is_active).length
  const avgPerEmp = activeCount > 0 ? total / activeCount : 0

  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  const currentMonth = new Date().getMonth()
  const expensesByMonth = (expenses as any[]).reduce((acc: Record<number, number>, e) => {
    const m = new Date(e.expense_date).getMonth()
    acc[m] = (acc[m] || 0) + (e.total_amount || 0)
    return acc
  }, {})
  const areaData = Array.from({ length: 6 }, (_, i) => {
    const m = (currentMonth - 5 + i + 12) % 12
    return { month: monthNames[m].slice(0, 3), مصاريف: expensesByMonth[m] || 0 }
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'إجمالي مصاريف الشهر', value: formatCurrency(total), icon: Wallet, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/40', text: 'text-violet-600 dark:text-violet-400' },
          { label: 'متوسط تكلفة الموظف', value: formatCurrency(avgPerEmp), icon: Users, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40', text: 'text-blue-600 dark:text-blue-400' },
          { label: 'الموظفون النشطون', value: String(activeCount), icon: UserCheck, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40', text: 'text-emerald-600 dark:text-emerald-400' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-5 ${s.bg}`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-lg`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-xl font-black ${s.text}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <h3 className="font-bold mb-5">مصاريف الأشهر الأخيرة</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={areaData}>
            <defs>
              <linearGradient id="payGrd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
            <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => formatCurrency(v).replace('SAR', '').trim()} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="مصاريف" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#payGrd)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <h3 className="font-bold mb-4">مصاريف الشهر الحالي</h3>
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-10">
            <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">لا توجد مصاريف مسجّلة هذا الشهر</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {expenses.map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.expense_date)}</p>
                </div>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{formatCurrency(e.total_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'نظرة عامة', icon: BarChart3 },
  { id: 'employees',  label: 'الموظفون',  icon: Users },
  { id: 'attendance', label: 'الحضور',    icon: Clock },
  { id: 'payroll',    label: 'المصاريف',  icon: DollarSign },
]

export default function HRDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { data: employees = [], isLoading: empLoading, refetch, isFetching } = useEmployees()
  const { data: attendance = [] } = useAttendance()

  const todayStr = new Date().toISOString().split('T')[0]
  const monthStart = todayStr.slice(0, 7) + '-01'
  const active = employees.filter(e => e.is_active)
  const presentIds = new Set(attendance.filter((s: any) => s.opened_at?.startsWith(todayStr)).map((s: any) => s.user_id))
  const presentToday = active.filter(e => presentIds.has(e.id)).length
  const newThisMonth = employees.filter(e => e.created_at >= monthStart).length
  const dateStr = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: 'Cairo, sans-serif' }}>
              إدارة الموارد البشرية
            </h1>
            <p className="text-sm text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="btn-outline p-2 aspect-square">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setActiveTab('employees')} className="btn-primary gap-2">
            <UserPlus className="w-4 h-4" />
            <span>إدارة الموظفين</span>
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الموظفين"    value={active.length}     icon={Users}     color="indigo"  loading={empLoading} />
        <StatCard title="حاضر اليوم"         value={presentToday}      icon={UserCheck} color="emerald" loading={empLoading} />
        <StatCard title="غائب اليوم"         value={Math.max(0, active.length - presentToday)} icon={UserX} color="rose" loading={empLoading} />
        <StatCard title="انضموا هذا الشهر"   value={newThisMonth}      icon={Award}     color="violet"  loading={empLoading} />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-muted/60 rounded-2xl p-1.5 flex gap-1 w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {activeTab === 'overview'   && <OverviewTab employees={employees} attendance={attendance} />}
          {activeTab === 'employees'  && <EmployeesTab />}
          {activeTab === 'attendance' && <AttendanceTab employees={employees} attendance={attendance} />}
          {activeTab === 'payroll'    && <PayrollTab employees={employees} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
