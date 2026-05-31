import { useState } from 'react'
import { ChevronRight, ChevronLeft, DollarSign, Printer, Download, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { usePayroll, useProcessPayroll } from '@/hooks/useHR'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency, exportToExcel } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

type PayrollRow = {
  id: string
  employee_number: string
  name: string
  department: string
  basic_salary: number
  housing: number
  transport: number
  overtime: number
  bonus: number
  deductions: number
  gosi: number
  net_salary: number
  status: 'pending' | 'processed' | 'paid'
  avatar: string
}


const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500']

const STATUS_CFG = {
  pending:   { label:'قيد المعالجة', color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
  processed: { label:'تمت المعالجة', color:'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
  paid:      { label:'مُحول',        color:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
}

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export default function PayrollPage() {
  const qc = useQueryClient()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState<string[]>([])

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const { data: rawPayroll = [], isLoading } = usePayroll({ month: monthStr })
  const processPayroll = useProcessPayroll()

  const payroll: PayrollRow[] = rawPayroll.map((p: any) => ({
    id:              p.id,
    employee_number: p.employee?.employee_number || '',
    name:            p.employee?.full_name || '',
    department:      p.employee?.department || '',
    basic_salary:    p.basic_salary || 0,
    housing:         p.housing_allowance || 0,
    transport:       p.transportation_allowance || 0,
    overtime:        p.overtime_pay || 0,
    bonus:           p.bonuses || 0,
    deductions:      p.deductions || 0,
    gosi:            p.gosi_deduction || 0,
    net_salary:      p.net_salary || 0,
    status:          p.status as 'pending' | 'processed' | 'paid',
    avatar:          p.employee?.full_name?.split(' ').slice(0,2).map((w: string) => w[0]).join('') || '—',
  }))

  const totalNet  = payroll.reduce((s,e) => s + e.net_salary, 0)
  const totalGosi = payroll.reduce((s,e) => s + e.gosi, 0)
  const paidCount = payroll.filter(e => e.status === 'paid').length

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y=>y+1) } else setMonth(m=>m+1) }

  const handleProcessAll = async () => {
    await processPayroll.mutateAsync(monthStr)
  }

  const handleExport = () => {
    exportToExcel(payroll.map(e => ({
      الموظف: e.name, القسم: e.department,
      'الراتب الأساسي': e.basic_salary, البدلات: e.housing + e.transport,
      التأمينات: e.gosi, الاستقطاعات: e.deductions, الصافي: e.net_salary,
      الحالة: STATUS_CFG[e.status]?.label || e.status,
    })), `مسير_رواتب_${monthStr}`)
  }

  const markAsPaid = async (id: string) => {
    const { error } = await supabase.from('payroll').update({ status: 'paid' }).eq('id', id)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ['payroll'] })
    toast.success('تم تحويل الراتب')
  }

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])
  const toggleAll = () => setSelected(p => p.length === payroll.length ? [] : payroll.map(e => e.id))

  return (
    <div className="space-y-5">
      <PageHeader
        title="مسير الرواتب"
        subtitle={`${MONTHS[month-1]} ${year} • ${payroll.length} موظف`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="btn-outline p-2"><ChevronRight className="w-4 h-4" /></button>
            <span className="font-semibold px-1 text-sm">{MONTHS[month-1]} {year}</span>
            <button onClick={nextMonth} className="btn-outline p-2"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={handleExport} disabled={payroll.length === 0} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button onClick={handleProcessAll} disabled={processPayroll.isPending} className="btn-primary gap-1.5">
              {processPayroll.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {processPayroll.isPending ? 'جاري المعالجة...' : 'تحضير مسير الرواتب'}
            </button>
          </div>
        }
      />

      {/* Summary */}
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'إجمالي صافي الرواتب', value:formatCurrency(totalNet),              color:'text-primary',    bg:'bg-primary',     icon:DollarSign },
          { label:'التأمينات الاجتماعية', value:formatCurrency(totalGosi),             color:'text-purple-600', bg:'bg-purple-500',  icon:DollarSign },
          { label:'تم التحويل',           value:`${paidCount} من ${payroll.length}`,   color:'text-emerald-600',bg:'bg-emerald-500', icon:CheckCircle2 },
          { label:'قيد الانتظار',         value:`${payroll.length - paidCount} موظف`, color:'text-amber-600',  bg:'bg-amber-500',   icon:Clock },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payroll Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.length === payroll.length} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">الموظف</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">القسم</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">الأساسي</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">البدلات</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">إضافي</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">الاستقطاعات</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">التأمينات</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground font-bold">الصافي</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">الحالة</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {payroll.map((emp, i) => {
                const cfg = STATUS_CFG[emp.status]
                const totalAllowances = emp.housing + emp.transport + emp.bonus
                return (
                  <tr key={emp.id} className={`border-t border-border/40 hover:bg-muted/20 transition-colors ${selected.includes(emp.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {emp.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{emp.name.split(' ').slice(0,3).join(' ')}</p>
                          <p className="text-xs text-muted-foreground font-mono">{emp.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{emp.department}</td>
                    <td className="px-4 py-3 text-center">{formatCurrency(emp.basic_salary)}</td>
                    <td className="px-4 py-3 text-center text-emerald-600">{formatCurrency(totalAllowances)}</td>
                    <td className="px-4 py-3 text-center text-blue-600">{emp.overtime ? formatCurrency(emp.overtime) : '—'}</td>
                    <td className="px-4 py-3 text-center text-red-500">{emp.deductions ? formatCurrency(emp.deductions) : '—'}</td>
                    <td className="px-4 py-3 text-center text-purple-600">{formatCurrency(emp.gosi)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-black text-primary">{formatCurrency(emp.net_salary)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {emp.status !== 'paid' && (
                          <button onClick={() => markAsPaid(emp.id)} className="btn-ghost p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="تحويل الراتب">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => window.print()} className="btn-ghost p-1.5 rounded-lg" title="طباعة القسيمة">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-muted/30 border-t-2 border-border">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-sm">الإجمالي</td>
                <td className="px-4 py-3 text-center font-bold">{formatCurrency(payroll.reduce((s,e)=>s+e.basic_salary,0))}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-600">{formatCurrency(payroll.reduce((s,e)=>s+e.housing+e.transport+e.bonus,0))}</td>
                <td className="px-4 py-3 text-center font-bold">{formatCurrency(payroll.reduce((s,e)=>s+e.overtime,0))}</td>
                <td className="px-4 py-3 text-center font-bold text-red-500">{formatCurrency(payroll.reduce((s,e)=>s+e.deductions,0))}</td>
                <td className="px-4 py-3 text-center font-bold text-purple-600">{formatCurrency(totalGosi)}</td>
                <td className="px-4 py-3 text-center font-black text-primary text-base">{formatCurrency(totalNet)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
