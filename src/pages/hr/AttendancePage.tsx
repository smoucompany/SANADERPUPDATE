import { useState } from 'react'
import { ChevronRight, ChevronLeft, UserCheck, UserX, Clock, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday'

type DayRecord = {
  status: AttendanceStatus
  check_in?: string
  check_out?: string
}

type EmployeeAttendance = {
  id: string
  name: string
  avatar: string
  days: Record<string, DayRecord>
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present: { label: 'حاضر',    color: 'text-emerald-700', bg: 'bg-emerald-500' },
  absent:  { label: 'غائب',    color: 'text-red-700',     bg: 'bg-red-500' },
  late:    { label: 'متأخر',   color: 'text-amber-700',   bg: 'bg-amber-500' },
  leave:   { label: 'إجازة',   color: 'text-blue-700',    bg: 'bg-blue-500' },
  holiday: { label: 'إجازة رسمية', color: 'text-purple-700', bg: 'bg-purple-400' },
}

const generateMockData = (): EmployeeAttendance[] => {
  const employees = [
    { id:'1', name:'أحمد محمد العمري', avatar:'أح' },
    { id:'2', name:'سارة الأحمدي', avatar:'سا' },
    { id:'3', name:'محمد الغامدي', avatar:'مح' },
    { id:'4', name:'فاطمة الزهراني', avatar:'فا' },
    { id:'5', name:'عمر القحطاني', avatar:'عم' },
  ]
  const statuses: AttendanceStatus[] = ['present','present','present','present','late','present','absent','leave']
  return employees.map(e => {
    const days: Record<string, DayRecord> = {}
    for (let d = 1; d <= 28; d++) {
      const dateKey = `2026-05-${String(d).padStart(2,'0')}`
      const dayOfWeek = new Date(dateKey).getDay()
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        days[dateKey] = { status: 'holiday' }
      } else {
        const s = statuses[Math.floor(Math.random() * statuses.length)]
        days[dateKey] = { status: s, check_in: s !== 'absent' && s !== 'leave' ? `0${7+Math.floor(Math.random()*2)}:${Math.floor(Math.random()*59).toString().padStart(2,'0')}` : undefined, check_out: s === 'present' ? '17:00' : undefined }
      }
    }
    return { ...e, days }
  })
}

const MOCK_EMPLOYEES = generateMockData()

export default function AttendancePage() {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(5)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }

  const getStatus = (emp: EmployeeAttendance, day: number): DayRecord => {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return emp.days[key] || { status: 'holiday' }
  }

  const getSummary = (emp: EmployeeAttendance) => {
    let present = 0, absent = 0, late = 0, leave = 0
    days.forEach(d => {
      const r = getStatus(emp, d)
      if (r.status === 'present') present++
      else if (r.status === 'absent') absent++
      else if (r.status === 'late') late++
      else if (r.status === 'leave') leave++
    })
    return { present, absent, late, leave }
  }

  const workDays = days.filter(d => {
    const dow = new Date(year, month-1, d).getDay()
    return dow !== 5 && dow !== 6
  }).length

  const totalPresent = MOCK_EMPLOYEES.reduce((s, e) => s + getSummary(e).present, 0)
  const totalAbsent = MOCK_EMPLOYEES.reduce((s, e) => s + getSummary(e).absent, 0)
  const totalLate = MOCK_EMPLOYEES.reduce((s, e) => s + getSummary(e).late, 0)
  const attendanceRate = Math.round((totalPresent / (MOCK_EMPLOYEES.length * workDays)) * 100)

  return (
    <div className="space-y-5">
      <PageHeader
        title="الحضور والانصراف"
        subtitle={`${monthNames[month-1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="btn-outline p-2"><ChevronRight className="w-4 h-4" /></button>
            <span className="font-semibold px-2">{monthNames[month-1]} {year}</span>
            <button onClick={nextMonth} className="btn-outline p-2"><ChevronLeft className="w-4 h-4" /></button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'معدل الحضور', value:`${attendanceRate}%`, icon:Calendar, bg:'bg-blue-500', color:'text-blue-600' },
          { label:'إجمالي أيام الحضور', value:totalPresent, icon:UserCheck, bg:'bg-emerald-500', color:'text-emerald-600' },
          { label:'إجمالي أيام الغياب', value:totalAbsent, icon:UserX, bg:'bg-red-500', color:'text-red-500' },
          { label:'إجمالي أيام التأخير', value:totalLate, icon:Clock, bg:'bg-amber-500', color:'text-amber-600' },
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

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${cfg.bg}`} />
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[160px]">الموظف</th>
                {days.map(d => {
                  const dow = new Date(year, month-1, d).getDay()
                  const isWeekend = dow === 5 || dow === 6
                  return (
                    <th key={d} className={`text-center px-1 py-3 font-semibold min-w-[32px] ${isWeekend ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                      {d}
                    </th>
                  )
                })}
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground min-w-[200px]">الملخص</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_EMPLOYEES.map((emp, ei) => {
                const summary = getSummary(emp)
                const AVATAR_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-orange-500','bg-pink-500']
                return (
                  <tr key={emp.id} className="border-t border-border/40 hover:bg-muted/10">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${AVATAR_COLORS[ei % AVATAR_COLORS.length]} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                          {emp.avatar}
                        </div>
                        <span className="font-medium whitespace-nowrap text-xs">{emp.name.split(' ').slice(0,2).join(' ')}</span>
                      </div>
                    </td>
                    {days.map(d => {
                      const record = getStatus(emp, d)
                      const cfg = STATUS_CONFIG[record.status]
                      return (
                        <td key={d} className="px-0.5 py-2.5 text-center">
                          <div className="group relative">
                            <div className={`w-6 h-6 mx-auto rounded-md ${cfg.bg} opacity-80 cursor-pointer hover:opacity-100 transition-opacity`} title={`${record.check_in || ''} - ${cfg.label}`} />
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600 font-bold">{summary.present}✓</span>
                        <span className="text-red-500 font-bold">{summary.absent}✗</span>
                        <span className="text-amber-600 font-bold">{summary.late}⏰</span>
                        <span className="text-blue-600 font-bold">{summary.leave}🌙</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
