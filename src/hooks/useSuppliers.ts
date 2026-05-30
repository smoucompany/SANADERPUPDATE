import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Supplier } from '@/types'
import toast from 'react-hot-toast'

export function useSuppliers(search?: string) {
  const { user } = useAuthStore()
  return useQuery<Supplier[]>({
    queryKey: ['suppliers', user?.company_id, search],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('name_ar')
      if (search) query = query.ilike('name_ar', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return data as Supplier[]
    },
    enabled: !!user
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const { data: result, error } = await supabase
        .from('suppliers')
        .insert({ ...data, company_id: user!.company_id })
        .select().single()
      if (error) throw error
      return result
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('تم إضافة المورد بنجاح') },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Supplier> & { id: string }) => {
      const { error } = await supabase.from('suppliers').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('تم تحديث المورد') },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('تم حذف المورد') },
    onError: (err: Error) => toast.error(err.message)
  })
}
