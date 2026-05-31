import { useState, useMemo } from 'react'
import { ChevronRight, ChevronLeft, UserCheck, UserX, Clock, Calendar, Plus, Save, Loader2 } from 'lucide-react'
import { useAttendance, useRecordAttendance, useEmployees } from '@/hooks/useHR'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday'

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present: { label: 'حاضر',        color: 'text-emerald-700', bg: 'bg-emerald-500' },
  absent:  { label: 'غائب',        color: 'text-red-700',     bg: 'bg-red-500' },
  late:    { label: 'متأخر',       color: 'text-amber-700',   bg: 'bg-amber-500' },
  leave:   { label: 'إجازة',       color: 'text-blue-700',    bg: 'bg-blue-500' },
  holiday: { label: 'إجازة رسمية', color: 'text-purple-700',  bg: 'bg-purple-400' },
}

const AVATAR_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-orange-500','bg-pink-500','bg-rose-500']

export default function AttendancePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [recordForm, setRecordForm] = useState({
    employee_id: '', date: new Date().toISOString().slice(0, 10),
    check_in: '08:00', check_out: '17:00', status: 'present' as AttendanceStatus, notes: '',
  })

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  const { data: attendanceRaw = [], isLoading } = useAttendance({ month: monthStr })
  const { data: empResult } = useEmployees()
  const employees = empResult?.data ?? []
  const recordAttendance = useRecordAttendance()

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build lookup: employee_id → date → record
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, any>> = {}
    attendanceRaw.forEach((r: any) => {
      if (!map[r.employee_id]) map[r.employee_id] = {}
      map[r.employee_id][r.date] = r
    })
    return map
  }, [attendanceRaw])

  const getRecord = (empId: string, day: number) => {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const dow = new Date(year, month-1, day).getDay()
    if (dow === 5 || dow === 6) return { status: 'holiday' as AttendanceStatus }
    return lookup[empId]?.[key] || null
  }

  const getSummary = (empId: string) => {
    let present = 0, absent = 0, late = 0, leave = 0
    days.forEach(d => {
      const r = getRecord(empId, d)
      if (!r) return
      if (r.status === 'present') present++
      else if (r.status === 'absent') absent++
      else if (r.status === 'late') late++
      else if (r.status === 'leave') leave++
    })
    return { present, absent, late, leave }
  }

  const workDays = days.filter(d => { const dow = new Date(year, month-1, d).getDay(); return dow !== 5 && dow !== 6 }).length
  const totalPresent = employees.reduce((s, e) => s + getSummary(e.id).present, 0)
  const totalAbsent  = employees.reduce((s, e) => s + getSummary(e.id).absent, 0)
  const totalLate    = employees.reduce((s, e) => s + getSummary(e.id).late, 0)
  const attendanceRate = employees.length > 0 && workDays > 0
    ? Math.round((totalPresent / (employees.length * workDays)) * 100) : 0

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }

  const handleRecord = async () => {
    if (!recordForm.employee_id) { return }
    await recordAttendance.mutateAsync({
      employee_id: recordForm.employee_id,
      date: recordForm.date,
      check_in: recordForm.check_in,
      check_out: recordForm.check_out,
      status: recordForm.status,
      notes: recordForm.notes,
    })
    setShowRecordForm(false)
  }

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
            <button onClick={() => setShowRecordForm(true)} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />تسجيل حضور
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'معدل الحضور',         value:`${attendanceRate}%`, icon:Calendar,  bg:'bg-blue-500',    color:'text-blue-600' },
          { label:'إجمالي أيام الحضور',  value:totalPresent,          icon:UserCheck, bg:'bg-emerald-500', color:'text-emerald-600' },
          { label:'إجمالي أيام الغياب',  value:totalAbsent,           icon:UserX,     bg:'bg-red-500',     color:'text-red-500' },
          { label:'إجمالي أيام التأخير', value:totalLate,             icon:Clock,     bg:'bg-amber-500',   color:'text-amber-600' },
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
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا يوجد موظفون مسجلون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[160px]">الموظف</th>
                  {days.map(d => {
                    const dow = new Date(year, month-1, d).getDay()
                    const isWeekend = dow === 5 || dow === 6
                    return (
                      <th key={d} className={`text-center px-1 py-3 font-semibold min-w-[32px] ${isWeekend ? 'text-muted-foreground/30' : 'text-muted-foreground'}`}>
                        {d}
                      </th>
                    )
                  })}
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground min-w-[160px]">الملخص</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any, ei: number) => {
                  const summary = getSummary(emp.id)
                  const initials = emp.full_name?.split(' ').slice(0,2).map((w: string) => w[0]).join('') || '—'
                  return (
                    <tr key={emp.id} className="border-t border-border/40 hover:bg-muted/10">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${AVATAR_COLORS[ei % AVATAR_COLORS.length]} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                            {initials}
                          </div>
                          <span className="font-medium whitespace-nowrap text-xs">{emp.full_name?.split(' ').slice(0,2).join(' ')}</span>
                        </div>
                      </td>
                      {days.map(d => {
                        const record = getRecord(emp.id, d)
                        const status = record?.status as AttendanceStatus || 'holiday'
                        const cfg = STATUS_CONFIG[status]
                        const dow = new Date(year, month-1, d).getDay()
                        const isWeekend = dow === 5 || dow === 6
                        return (
                          <td key={d} className="px-0.5 py-2.5 text-center">
                            <div
                              className={`w-6 h-6 mx-auto rounded-md ${isWeekend ? 'bg-muted/40' : record ? cfg.bg : 'bg-muted/20'} opacity-80 cursor-pointer hover:opacity-100 transition-opacity`}
                              title={record ? `${record.check_in || ''} — ${cfg.label}` : isWeekend ? 'إجازة' : 'لم يُسجَّل'}
                              onClick={() => {
                                setRecordForm(f => ({
                                  ...f,
                                  employee_id: emp.id,
                                  date: `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
                                }))
                                setShowRecordForm(true)
                              }}
                            />
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
        )}
      </div>

      {/* Record Attendance Modal */}
      <Modal open={showRecordForm} onClose={() => setShowRecordForm(false)} title="تسجيل حضور">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label">الموظف *</label>
            <select value={recordForm.employee_id} onChange={e => setRecordForm(f => ({...f, employee_id: e.target.value}))} className="form-select">
              <option value="">اختر الموظف</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">التاريخ *</label>
              <input type="date" value={recordForm.date} onChange={e => setRecordForm(f => ({...f, date: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">الحالة</label>
              <select value={recordForm.status} onChange={e => setRecordForm(f => ({...f, status: e.target.value as AttendanceStatus}))} className="form-select">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">وقت الدخول</label>
              <input type="time" value={recordForm.check_in} onChange={e => setRecordForm(f => ({...f, check_in: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">وقت الخروج</label>
              <input type="time" value={recordForm.check_out} onChange={e => setRecordForm(f => ({...f, check_out: e.target.value}))} className="form-input" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="form-label">ملاحظات</label>
            <input value={recordForm.notes} onChange={e => setRecordForm(f => ({...f, notes: e.target.value}))} className="form-input" placeholder="أي ملاحظات إضافية..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowRecordForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleRecord} disabled={recordAttendance.isPending || !recordForm.employee_id} className="btn-primary gap-2">
              {recordAttendance.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الحضور
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
