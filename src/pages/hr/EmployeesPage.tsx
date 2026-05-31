import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, UserCheck, UserX, Briefcase, Phone, Mail, Edit2, Trash2, Eye, Search, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, exportToExcel } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import StatusBadge from '@/components/shared/StatusBadge'
import toast from 'react-hot-toast'

type Employee = {
  id: string
  employee_number: string
  full_name: string
  phone?: string
  email?: string
  department: string
  position: string
  hire_date: string
  salary: number
  status: 'active' | 'inactive' | 'on_leave'
  avatar_initials: string
}

const DEPARTMENTS = ['الإدارة العامة','المبيعات','المشتريات','المحاسبة والمالية','المخزون والعمليات','الموارد البشرية','تقنية المعلومات','التسويق']


const STATUS_COLORS: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_leave: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}
const STATUS_LABELS: Record<string, string> = { active:'نشط', inactive:'غير نشط', on_leave:'إجازة' }

const DEPT_COLORS = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-orange-500','bg-teal-500','bg-pink-500','bg-indigo-500','bg-rose-500']

export default function EmployeesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string|null>(null)

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase.from('employees').select('*').eq('company_id', user.company_id).order('full_name')
      return (data as Employee[]) || []
    },
    enabled: !!user,
  })

  const filtered = employees.filter(e =>
    (!search || e.full_name.includes(search) || e.employee_number.includes(search) || e.department.includes(search)) &&
    (!deptFilter || e.department === deptFilter)
  )

  const active = employees.filter(e => e.status === 'active').length
  const onLeave = employees.filter(e => e.status === 'on_leave').length
  const totalSalary = employees.reduce((s,e) => s + e.salary, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="الموظفون"
        subtitle={`${employees.length} موظف`}
        actions={
          <>
            <button onClick={() => exportToExcel(employees.map(e => ({ الاسم:e.full_name, القسم:e.department, الراتب:e.salary })), 'الموظفون')} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير
            </button>
            <button onClick={() => navigate('/hr/employees/new')} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />إضافة موظف
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'إجمالي الموظفين', value:employees.length, color:'text-foreground', icon:Users, bg:'bg-blue-500' },
          { label:'نشط', value:active, color:'text-emerald-600', icon:UserCheck, bg:'bg-emerald-500' },
          { label:'في إجازة', value:onLeave, color:'text-amber-600', icon:Briefcase, bg:'bg-amber-500' },
          { label:'إجمالي الرواتب', value:formatCurrency(totalSalary), color:'text-primary', icon:Briefcase, bg:'bg-primary' },
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

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="form-input pr-9" placeholder="بحث بالاسم أو القسم..." />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="form-select w-48">
          <option value="">كل الأقسام</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((emp, i) => (
          <div key={emp.id} className="bg-card border border-border/60 rounded-2xl p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${DEPT_COLORS[i % DEPT_COLORS.length]} rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-sm`}>
                  {emp.avatar_initials}
                </div>
                <div>
                  <p className="font-bold text-sm">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground">{emp.employee_number}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[emp.status]}`}>
                {STATUS_LABELS[emp.status]}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">{emp.position} • {emp.department}</span>
              </div>
              {emp.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <a href={`tel:${emp.phone}`} className="text-xs hover:text-primary">{emp.phone}</a>
                </div>
              )}
              {emp.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs truncate">{emp.email}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">الراتب الشهري</p>
                <p className="font-bold text-primary">{formatCurrency(emp.salary)}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigate(`/hr/employees/${emp.id}/edit`)} className="btn-ghost p-1.5 rounded-lg" title="تعديل">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteId(emp.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="حذف">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا يوجد موظفون مطابقون للبحث</p>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          const { error } = await supabase
            .from('employees')
            .update({ status: 'terminated' })
            .eq('id', deleteId!)
          if (error) { toast.error(error.message); return }
          qc.invalidateQueries({ queryKey: ['employees'] })
          toast.success('تم حذف الموظف')
          setDeleteId(null)
        }}
        title="حذف الموظف"
        message="هل أنت متأكد؟ سيتم إنهاء خدمة الموظف من النظام."
      />
    </div>
  )
}
