import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

// ─── Employees ────────────────────────────────────────────────────────────────
export function useEmployees(filters?: { search?: string; department?: string; status?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['employees', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('employees').select('*', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .neq('status', 'terminated')
        .order('full_name')
      if (filters?.search)     q = q.ilike('full_name', `%${filters.search}%`)
      if (filters?.department) q = q.eq('department', filters.department)
      if (filters?.status)     q = q.eq('status', filters.status)
      const { data, error, count } = await q
      if (error) throw error
      return { data: data ?? [], total: count ?? 0 }
    },
    enabled: !!user,
  })
}

export function useEmployee(id?: string) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*')
        .eq('id', id!).eq('company_id', user!.company_id).single()
      if (error) throw error
      return data
    },
    enabled: !!id && !!user,
  })
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export function useAttendance(filters?: { month?: string; employee_id?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['attendance', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('attendance').select('*, employee:employees(full_name, department)')
        .eq('company_id', user!.company_id)
        .order('date', { ascending: false })
      if (filters?.month) {
        const [year, month] = filters.month.split('-')
        q = q.gte('date', `${year}-${month}-01`).lte('date', `${year}-${month}-31`)
      }
      if (filters?.employee_id) q = q.eq('employee_id', filters.employee_id)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useRecordAttendance() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (payload: { employee_id: string; date: string; check_in?: string; check_out?: string; status: string; notes?: string }) => {
      const { error } = await supabase.from('attendance').upsert(
        { ...payload, company_id: user!.company_id },
        { onConflict: 'company_id,employee_id,date' }
      )
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('تم تسجيل الحضور') },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export function usePayroll(filters?: { month?: string; status?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['payroll', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('payroll').select('*, employee:employees(full_name, department, position)')
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (filters?.month)  q = q.eq('month', filters.month)
      if (filters?.status) q = q.eq('status', filters.status)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useProcessPayroll() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (month: string) => {
      // Get all active employees
      const { data: employees, error: empErr } = await supabase
        .from('employees').select('*').eq('company_id', user!.company_id).eq('status', 'active')
      if (empErr) throw empErr
      if (!employees?.length) throw new Error('لا يوجد موظفون نشطون')

      const rows = employees.map(emp => ({
        company_id:               user!.company_id,
        employee_id:              emp.id,
        month,
        basic_salary:             emp.basic_salary ?? 0,
        housing_allowance:        emp.housing_allowance ?? 0,
        transportation_allowance: emp.transportation_allowance ?? 0,
        other_allowances:         emp.other_allowances ?? 0,
        gross_salary:             (emp.basic_salary ?? 0) + (emp.housing_allowance ?? 0) +
                                  (emp.transportation_allowance ?? 0) + (emp.other_allowances ?? 0),
        deductions:               0,
        net_salary:               (emp.basic_salary ?? 0) + (emp.housing_allowance ?? 0) +
                                  (emp.transportation_allowance ?? 0) + (emp.other_allowances ?? 0),
        status:                   'pending',
      }))

      const { error } = await supabase.from('payroll').upsert(rows, { onConflict: 'company_id,employee_id,month' })
      if (error) throw error
      return rows.length
    },
    onSuccess: (count) => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success(`تم تحضير مسير ${count} موظف`) },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Leaves ───────────────────────────────────────────────────────────────────
export function useLeaves(filters?: { status?: string; employee_id?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['leaves', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('leaves').select('*, employee:employees(full_name, department)')
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (filters?.status)      q = q.eq('status', filters.status)
      if (filters?.employee_id) q = q.eq('employee_id', filters.employee_id)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (payload: { employee_id: string; type: string; start_date: string; end_date: string; days: number; reason?: string }) => {
      const { error } = await supabase.from('leaves').insert({ ...payload, company_id: user!.company_id, status: 'pending' })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('تم تقديم طلب الإجازة') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('leaves').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('تم تحديث حالة الطلب') },
    onError: (e: Error) => toast.error(e.message),
  })
}
