import { useState } from 'react'
import { ChevronRight, ChevronLeft, DollarSign, Printer, Download, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
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

const MOCK: PayrollRow[] = [
  { id:'1', employee_number:'EMP-001', name:'أحمد محمد العمري', department:'الإدارة العامة', basic_salary:25000, housing:8000, transport:1500, overtime:0, bonus:0, deductions:0, gosi:2437.5, net_salary:32062.5, status:'processed', avatar:'أح' },
  { id:'2', employee_number:'EMP-002', name:'سارة عبدالله الأحمدي', department:'المحاسبة', basic_salary:12000, housing:4000, transport:800, overtime:500, bonus:1000, deductions:200, gosi:1170, net_salary:16930, status:'processed', avatar:'سا' },
  { id:'3', employee_number:'EMP-003', name:'محمد خالد الغامدي', department:'المبيعات', basic_salary:15000, housing:5000, transport:1000, overtime:750, bonus:2500, deductions:0, gosi:1462.5, net_salary:22787.5, status:'pending', avatar:'مح' },
  { id:'4', employee_number:'EMP-004', name:'فاطمة علي الزهراني', department:'الموارد البشرية', basic_salary:10000, housing:3500, transport:700, overtime:0, bonus:0, deductions:500, gosi:975, net_salary:12725, status:'pending', avatar:'فا' },
  { id:'5', employee_number:'EMP-005', name:'عمر عبدالرحمن القحطاني', department:'تقنية المعلومات', basic_salary:18000, housing:6000, transport:1200, overtime:1000, bonus:0, deductions:0, gosi:1755, net_salary:24445, status:'paid', avatar:'عم' },
]

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500']

const STATUS_CFG = {
  pending:   { label:'قيد المعالجة', color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
  processed: { label:'تمت المعالجة', color:'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
  paid:      { label:'مُحول',        color:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
}

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export default function PayrollPage() {
  const [month, setMonth] = useState(5)
  const [year, setYear] = useState(2026)
  const [processing, setProcessing] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const totalNet = MOCK.reduce((s,e) => s + e.net_salary, 0)
  const totalGosi = MOCK.reduce((s,e) => s + e.gosi, 0)
  const paidCount = MOCK.filter(e => e.status === 'paid').length

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y=>y+1) } else setMonth(m=>m+1) }

  const handleProcessAll = async () => {
    setProcessing(true)
    await new Promise(r => setTimeout(r, 1500))
    setProcessing(false)
    toast.success(`تم معالجة رواتب ${MOCK.length} موظف بنجاح`)
  }

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])
  const toggleAll = () => setSelected(p => p.length === MOCK.length ? [] : MOCK.map(e => e.id))

  return (
    <div className="space-y-5">
      <PageHeader
        title="مسير الرواتب"
        subtitle={`${MONTHS[month-1]} ${year} • ${MOCK.length} موظف`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="btn-outline p-2"><ChevronRight className="w-4 h-4" /></button>
            <span className="font-semibold px-1 text-sm">{MONTHS[month-1]} {year}</span>
            <button onClick={nextMonth} className="btn-outline p-2"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => toast.success('تم تصدير مسير الرواتب')} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير
            </button>
            <button onClick={handleProcessAll} disabled={processing} className="btn-primary gap-1.5">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {processing ? 'جاري المعالجة...' : 'معالجة الرواتب'}
            </button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'إجمالي صافي الرواتب', value:formatCurrency(totalNet), color:'text-primary', bg:'bg-primary', icon:DollarSign },
          { label:'التأمينات الاجتماعية', value:formatCurrency(totalGosi), color:'text-purple-600', bg:'bg-purple-500', icon:DollarSign },
          { label:'تم التحويل', value:`${paidCount} من ${MOCK.length}`, color:'text-emerald-600', bg:'bg-emerald-500', icon:CheckCircle2 },
          { label:'قيد الانتظار', value:`${MOCK.length - paidCount} موظف`, color:'text-amber-600', bg:'bg-amber-500', icon:Clock },
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
                  <input type="checkbox" checked={selected.length === MOCK.length} onChange={toggleAll} className="rounded" />
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
              {MOCK.map((emp, i) => {
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
                      <button onClick={() => toast.success(`تم طباعة قسيمة راتب ${emp.name.split(' ')[0]}`)} className="btn-ghost p-1.5 rounded-lg" title="طباعة القسيمة">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-muted/30 border-t-2 border-border">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-sm">الإجمالي</td>
                <td className="px-4 py-3 text-center font-bold">{formatCurrency(MOCK.reduce((s,e)=>s+e.basic_salary,0))}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-600">{formatCurrency(MOCK.reduce((s,e)=>s+e.housing+e.transport+e.bonus,0))}</td>
                <td className="px-4 py-3 text-center font-bold">{formatCurrency(MOCK.reduce((s,e)=>s+e.overtime,0))}</td>
                <td className="px-4 py-3 text-center font-bold text-red-500">{formatCurrency(MOCK.reduce((s,e)=>s+e.deductions,0))}</td>
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
