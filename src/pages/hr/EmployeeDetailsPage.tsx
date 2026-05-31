import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, Edit2, User, Briefcase, DollarSign, Phone, Mail,
  MapPin, Calendar, Award, CheckCircle2, XCircle, Clock, Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'

const TABS = ['نظرة عامة', 'الحضور', 'الرواتب', 'الإجازات']

const STATUS_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  present: { icon: CheckCircle2, color: 'text-emerald-600', label: 'حاضر' },
  late:    { icon: Clock,         color: 'text-amber-600',  label: 'متأخر' },
  absent:  { icon: XCircle,       color: 'text-red-500',    label: 'غائب' },
  holiday: { icon: Calendar,      color: 'text-purple-600', label: 'إجازة رسمية' },
}

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-indigo-500']

export default function EmployeeDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState(0)

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!user?.company_id || !id) return null
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('company_id', user.company_id)
        .single()
      if (error) return null
      return data
    },
    enabled: !!id && !!user?.company_id,
  })

  const { data: attendance = [] } = useQuery({
    queryKey: ['employee_attendance', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', id)
        .order('date', { ascending: false })
        .limit(30)
      return data || []
    },
    enabled: !!id && activeTab === 1,
  })

  const { data: payrollHistory = [] } = useQuery({
    queryKey: ['employee_payroll', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(12)
      return data || []
    },
    enabled: !!id && activeTab === 2,
  })

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['employee_leaves', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!id && activeTab === 3,
  })

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!emp) return (
    <div className="text-center py-20 text-muted-foreground">
      <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="mb-4">لم يتم العثور على بيانات الموظف</p>
      <button onClick={() => navigate('/hr/employees')} className="btn-outline gap-1.5">
        <ArrowRight className="w-4 h-4" />العودة للموظفين
      </button>
    </div>
  )

  const totalSalary = (emp.basic_salary || 0) + (emp.housing_allowance || 0) + (emp.transport_allowance || 0) + (emp.other_allowances || 0)
  const avatarColor = AVATAR_COLORS[(emp.full_name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  const initials = emp.full_name?.split(' ').slice(0, 2).map((w: string) => w[0]).join('') || '—'

  const statusLabel: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', on_leave: 'إجازة' }
  const statusColor: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30',
    on_leave: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={emp.full_name}
        subtitle={`${emp.position || ''} • ${emp.department || ''}`}
        actions={
          <>
            <button onClick={() => navigate('/hr/employees')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => navigate(`/hr/employees/${id}/edit`)} className="btn-primary gap-1.5">
              <Edit2 className="w-4 h-4" />تعديل
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
        {/* Left sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <div className={`w-20 h-20 ${avatarColor} rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
              {initials}
            </div>
            <div>
              <p className="font-bold text-lg">{emp.full_name}</p>
              <p className="text-sm text-muted-foreground">{emp.position}</p>
              <p className="text-xs text-muted-foreground">{emp.department}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[emp.status] || 'bg-muted text-muted-foreground'}`}>
              {statusLabel[emp.status] || emp.status}
            </span>
            <p className="text-xs text-muted-foreground font-mono">{emp.employee_number}</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
            <p className="font-semibold text-sm">بيانات الاتصال</p>
            {[
              { icon: Phone,    value: emp.phone },
              { icon: Mail,     value: emp.email },
              { icon: MapPin,   value: emp.address },
              { icon: Calendar, value: emp.hire_date ? `تاريخ التعيين: ${formatDate(emp.hire_date)}` : null },
            ].filter(x => x.value).map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <item.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
            <p className="font-semibold text-sm">الراتب الشهري</p>
            <p className="text-2xl font-black text-primary">{formatCurrency(emp.salary || emp.basic_salary || 0)}</p>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-5">
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {TABS.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === i ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">البيانات الشخصية</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'الجنسية', value: emp.nationality },
                      { label: 'رقم الهوية', value: emp.national_id },
                      { label: 'تاريخ الميلاد', value: emp.birth_date ? formatDate(emp.birth_date) : '—' },
                      { label: 'الجنس', value: emp.gender },
                      { label: 'الحالة الاجتماعية', value: emp.marital_status },
                    ].map(f => f.value ? (
                      <div key={f.label} className="flex justify-between">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>

                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">بيانات الوظيفة</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'الرقم الوظيفي', value: emp.employee_number },
                      { label: 'القسم', value: emp.department },
                      { label: 'المسمى الوظيفي', value: emp.position },
                      { label: 'نوع العقد', value: emp.contract_type },
                      { label: 'تاريخ التعيين', value: emp.hire_date ? formatDate(emp.hire_date) : '—' },
                    ].map(f => f.value ? (
                      <div key={f.label} className="flex justify-between">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>

                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">الراتب والمزايا</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'الراتب الأساسي', value: formatCurrency(emp.basic_salary || emp.salary || 0) },
                      { label: 'بدل السكن', value: formatCurrency(emp.housing_allowance || 0) },
                      { label: 'بدل المواصلات', value: formatCurrency(emp.transport_allowance || 0) },
                      { label: 'بدلات أخرى', value: formatCurrency(emp.other_allowances || 0) },
                    ].map(f => (
                      <div key={f.label} className="flex justify-between">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border/50 pt-2 font-bold">
                      <span>إجمالي الراتب</span>
                      <span className="text-primary">{formatCurrency(totalSalary)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">معلومات إضافية</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'البنك', value: emp.bank_name },
                      { label: 'رقم الآيبان', value: emp.iban },
                      { label: 'جهة الطوارئ', value: emp.emergency_contact_name },
                      { label: 'هاتف الطوارئ', value: emp.emergency_contact_phone },
                    ].map(f => f.value ? (
                      <div key={f.label} className="flex justify-between">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 1 && (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50">
                <h3 className="font-semibold">سجل الحضور الأخير</h3>
              </div>
              {attendance.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا توجد سجلات حضور</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">التاريخ</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الحالة</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الدخول</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الخروج</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendance as any[]).map((rec: any, i: number) => {
                      const cfg = STATUS_CFG[rec.status] || STATUS_CFG.present
                      return (
                        <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                          <td className="px-5 py-3">{formatDate(rec.date)}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
                              <cfg.icon className="w-3.5 h-3.5" />{cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center font-mono text-sm">{rec.check_in || '—'}</td>
                          <td className="px-5 py-3 text-center font-mono text-sm">{rec.check_out || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 2 && (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50">
                <h3 className="font-semibold">تاريخ الرواتب</h3>
              </div>
              {payrollHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا توجد سجلات رواتب</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">الفترة</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الأساسي</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">البدلات</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الاستقطاعات</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground font-bold">الصافي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrollHistory as any[]).map((p: any, i: number) => (
                      <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="px-5 py-3 font-medium">{p.period_month}/{p.period_year}</td>
                        <td className="px-5 py-3 text-center">{formatCurrency(p.basic_salary || 0)}</td>
                        <td className="px-5 py-3 text-center text-emerald-600">{formatCurrency((p.housing_allowance || 0) + (p.transport_allowance || 0))}</td>
                        <td className="px-5 py-3 text-center text-red-500">{formatCurrency(p.deductions || 0)}</td>
                        <td className="px-5 py-3 text-center font-black text-primary">{formatCurrency(p.net_salary || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <p className="font-semibold mb-3">طلبات الإجازة</p>
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا توجد طلبات إجازة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(leaveRequests as any[]).map((lr: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
                        <div>
                          <p className="font-medium">{lr.leave_type}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(lr.start_date)} — {formatDate(lr.end_date)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          lr.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          lr.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {lr.status === 'approved' ? 'موافق' : lr.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
