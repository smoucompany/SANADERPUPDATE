import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

// ─── CRM Leads ───────────────────────────────────────────────────────────────
export function useLeads(filters?: { stage?: string; search?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['leads', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('crm_leads').select('*', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (filters?.stage)  q = q.eq('stage', filters.stage)
      if (filters?.search) q = q.ilike('name', `%${filters.search}%`)
      const { data, error, count } = await q
      if (error) throw error
      return { data: data ?? [], total: count ?? 0 }
    },
    enabled: !!user,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from('crm_leads').insert({ ...payload, company_id: user!.company_id })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('تم إضافة العميل المحتمل') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateLeadStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from('crm_leads').update({ stage }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── CRM Activities ───────────────────────────────────────────────────────────
export function useActivities(filters?: { type?: string; lead_id?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['activities', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('crm_activities')
        .select('*, lead:crm_leads(name, company)')
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (filters?.type)    q = q.eq('type', filters.type)
      if (filters?.lead_id) q = q.eq('lead_id', filters.lead_id)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useCreateActivity() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from('crm_activities').insert({ ...payload, company_id: user!.company_id })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); toast.success('تم إضافة النشاط') },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Sales Returns ────────────────────────────────────────────────────────────
export function useSalesReturns(filters?: { status?: string; search?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['sales-returns', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('sales_returns')
        .select('*, customer:customers(name_ar), invoice:invoices(invoice_number)', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (filters?.status) q = q.eq('status', filters.status)
      if (filters?.search) q = q.or(`return_number.ilike.%${filters.search}%`)
      const { data, error, count } = await q
      if (error) throw error
      return { data: data ?? [], total: count ?? 0 }
    },
    enabled: !!user,
  })
}

export function usePurchaseReturns(filters?: { status?: string; search?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['purchase-returns', user?.company_id, filters],
    queryFn: async () => {
      let q = supabase.from('purchase_returns')
        .select('*, supplier:suppliers(name_ar)', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
      if (filters?.status) q = q.eq('status', filters.status)
      if (filters?.search) q = q.ilike('return_number', `%${filters.search}%`)
      const { data, error, count } = await q
      if (error) throw error
      return { data: data ?? [], total: count ?? 0 }
    },
    enabled: !!user,
  })
}
