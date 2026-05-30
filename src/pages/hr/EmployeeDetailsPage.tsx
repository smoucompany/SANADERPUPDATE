import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight, Edit2, User, Briefcase, DollarSign, Phone, Mail,
  MapPin, Calendar, Award, TrendingUp, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'

const MOCK_EMPLOYEES: Record<string, any> = {
  '1': {
    id: '1', employee_number: 'EMP-001', full_name: 'أحمد محمد العمري',
    avatar: 'أح', color: 'bg-blue-500',
    position: 'مدير عام', department: 'الإدارة العامة', contract: 'دائم',
    hire_date: '2020-01-15', status: 'active', nationality: 'سعودي',
    national_id: '1082345678', birth_date: '1985-03-20', gender: 'ذكر', marital: 'متزوج',
    phone: '0500000001', email: 'ahmed@company.com', address: 'الرياض، حي النزهة',
    basic_salary: 25000, housing: 8000, transport: 1500, other: 0,
    bank: 'بنك الراجحي', iban: 'SA0380000000608010167519',
    emergency_name: 'محمد العمري', emergency_relation: 'والد', emergency_phone: '0500000010',
    attendance_rate: 97, leaves_used: 5, leaves_balance: 25,
    performance: 92,
  },
  '2': {
    id: '2', employee_number: 'EMP-002', full_name: 'سارة عبدالله الأحمدي',
    avatar: 'سا', color: 'bg-violet-500',
    position: 'محاسبة', department: 'المحاسبة', contract: 'دائم',
    hire_date: '2021-06-01', status: 'active', nationality: 'سعودية',
    national_id: '1082345679', birth_date: '1990-07-15', gender: 'أنثى', marital: 'عزباء',
    phone: '0500000002', email: 'sara@company.com', address: 'الرياض، حي الملز',
    basic_salary: 12000, housing: 4000, transport: 800, other: 500,
    bank: 'البنك الأهلي', iban: 'SA0380000000608010167520',
    emergency_name: 'عبدالله الأحمدي', emergency_relation: 'والد', emergency_phone: '0500000011',
    attendance_rate: 99, leaves_used: 3, leaves_balance: 27,
    performance: 88,
  },
}

const ATTENDANCE_MOCK = [
  { date: '2026-05-28', status: 'present', in: '08:05', out: '17:00' },
  { date: '2026-05-27', status: 'present', in: '07:58', out: '17:00' },
  { date: '2026-05-26', status: 'late', in: '08:42', out: '17:00' },
  { date: '2026-05-25', status: 'present', in: '08:00', out: '17:00' },
  { date: '2026-05-22', status: 'holiday', in: '—', out: '—' },
]

const PAYROLL_MOCK = [
  { month: 'مايو 2026', basic: 25000, allowances: 9500, deductions: 0, gosi: 2437.5, net: 32062.5 },
  { month: 'أبريل 2026', basic: 25000, allowances: 9500, deductions: 0, gosi: 2437.5, net: 32062.5 },
  { month: 'مارس 2026', basic: 25000, allowances: 9500, deductions: 500, gosi: 2437.5, net: 31562.5 },
]

const TABS = ['نظرة عامة', 'الحضور', 'الرواتب', 'الإجازات']

const STATUS_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  present: { icon: CheckCircle2, color: 'text-emerald-600', label: 'حاضر' },
  late:    { icon: Clock,         color: 'text-amber-600',  label: 'متأخر' },
  absent:  { icon: XCircle,       color: 'text-red-500',    label: 'غائب' },
  holiday: { icon: Calendar,      color: 'text-purple-600', label: 'إجازة رسمية' },
}

export default function EmployeeDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)

  const emp = MOCK_EMPLOYEES[id as string] || MOCK_EMPLOYEES['1']
  const totalSalary = emp.basic_salary + emp.housing + emp.transport + emp.other

  return (
    <div className="space-y-5">
      <PageHeader
        title={emp.full_name}
        subtitle={`${emp.position} • ${emp.department}`}
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
          {/* Profile card */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <div className={`w-20 h-20 ${emp.color} rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
              {emp.avatar}
            </div>
            <div>
              <p className="font-bold text-lg">{emp.full_name}</p>
              <p className="text-sm text-muted-foreground">{emp.position}</p>
              <p className="text-xs text-muted-foreground">{emp.department}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-700'}`}>
              {emp.status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
            <p className="text-xs text-muted-foreground font-mono">{emp.employee_number}</p>
          </div>

          {/* Contact info */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
            <p className="font-semibold text-sm">بيانات الاتصال</p>
            {[
              { icon: Phone, value: emp.phone },
              { icon: Mail, value: emp.email },
              { icon: MapPin, value: emp.address },
              { icon: Calendar, value: `تاريخ التعيين: ${formatDate(emp.hire_date)}` },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <item.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
            <p className="font-semibold text-sm">إحصائيات سريعة</p>
            {[
              { label: 'نسبة الحضور', value: `${emp.attendance_rate}%`, color: 'text-emerald-600' },
              { label: 'الإجازات المستخدمة', value: `${emp.leaves_used} يوم`, color: 'text-amber-600' },
              { label: 'رصيد الإجازات', value: `${emp.leaves_balance} يوم`, color: 'text-blue-600' },
              { label: 'تقييم الأداء', value: `${emp.performance}%`, color: 'text-primary' },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className={`font-bold text-sm ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-5">
          {/* Tabs */}
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
                {/* Personal info */}
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">البيانات الشخصية</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'الجنسية', value: emp.nationality },
                      { label: 'رقم الهوية', value: emp.national_id },
                      { label: 'تاريخ الميلاد', value: formatDate(emp.birth_date) },
                      { label: 'الجنس', value: emp.gender },
                      { label: 'الحالة الاجتماعية', value: emp.marital },
                    ].map(f => (
                      <div key={f.label} className="flex justify-between">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Job info */}
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
                      { label: 'نوع العقد', value: emp.contract },
                      { label: 'تاريخ التعيين', value: formatDate(emp.hire_date) },
                    ].map(f => (
                      <div key={f.label} className="flex justify-between">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Salary */}
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">الراتب والمزايا</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'الراتب الأساسي', value: formatCurrency(emp.basic_salary) },
                      { label: 'بدل السكن', value: formatCurrency(emp.housing) },
                      { label: 'بدل المواصلات', value: formatCurrency(emp.transport) },
                      { label: 'بدلات أخرى', value: formatCurrency(emp.other) },
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

                {/* Emergency */}
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">جهة الاتصال للطوارئ</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'الاسم', value: emp.emergency_name },
                      { label: 'صلة القرابة', value: emp.emergency_relation },
                      { label: 'رقم الجوال', value: emp.emergency_phone },
                    ].map(f => (
                      <div key={f.label} className="flex justify-between">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance bar */}
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">تقييم الأداء العام</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${emp.performance}%` }} />
                    </div>
                  </div>
                  <span className="font-black text-2xl text-primary w-14 text-right">{emp.performance}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>ضعيف</span><span>متوسط</span><span>ممتاز</span>
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
                  {ATTENDANCE_MOCK.map((rec, i) => {
                    const cfg = STATUS_CFG[rec.status]
                    return (
                      <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="px-5 py-3">{formatDate(rec.date)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
                            <cfg.icon className="w-3.5 h-3.5" />{cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center font-mono text-sm">{rec.in}</td>
                        <td className="px-5 py-3 text-center font-mono text-sm">{rec.out}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 2 && (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50">
                <h3 className="font-semibold">تاريخ الرواتب</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">الشهر</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الأساسي</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">البدلات</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الاستقطاعات</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">التأمينات</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground font-bold">الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {PAYROLL_MOCK.map((p, i) => (
                    <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-5 py-3 font-medium">{p.month}</td>
                      <td className="px-5 py-3 text-center">{formatCurrency(p.basic)}</td>
                      <td className="px-5 py-3 text-center text-emerald-600">{formatCurrency(p.allowances)}</td>
                      <td className="px-5 py-3 text-center text-red-500">{p.deductions ? formatCurrency(p.deductions) : '—'}</td>
                      <td className="px-5 py-3 text-center text-purple-600">{formatCurrency(p.gosi)}</td>
                      <td className="px-5 py-3 text-center font-black text-primary">{formatCurrency(p.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'إجمالي المستحق', value: '30 يوم', color: 'text-blue-600', bg: 'bg-blue-500' },
                  { label: 'المستخدم', value: `${emp.leaves_used} يوم`, color: 'text-amber-600', bg: 'bg-amber-500' },
                  { label: 'الرصيد المتبقي', value: `${emp.leaves_balance} يوم`, color: 'text-emerald-600', bg: 'bg-emerald-500' },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 text-center">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <p className="font-semibold mb-3">طلبات الإجازة</p>
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا توجد طلبات إجازة سابقة</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
