import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Customer } from '@/types'
import toast from 'react-hot-toast'

export function useCustomers(search?: string) {
  const { user } = useAuthStore()
  return useQuery<Customer[]>({
    queryKey: ['customers', user?.company_id, search],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('name_ar')
      if (search) query = query.ilike('name_ar', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return data as Customer[]
    },
    enabled: !!user
  })
}

export function useCustomer(id?: string) {
  return useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Customer
    },
    enabled: !!id
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const { data: result, error } = await supabase
        .from('customers')
        .insert({ ...data, company_id: user!.company_id })
        .select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('تم إضافة العميل بنجاح') },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase.from('customers').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('تم تحديث العميل بنجاح') },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('تم حذف العميل') },
    onError: (err: Error) => toast.error(err.message)
  })
}
