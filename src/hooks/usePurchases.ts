import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Purchase, PurchaseItem } from '@/types'
import toast from 'react-hot-toast'

export function usePurchases(filters?: { search?: string; status?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) {
  const { user } = useAuthStore()
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  return useQuery({
    queryKey: ['purchases', user?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('purchases')
        .select('*, supplier:suppliers(name_ar)', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (filters?.search) query = query.ilike('purchase_number', `%${filters.search}%`)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.date_from) query = query.gte('purchase_date', filters.date_from)
      if (filters?.date_to) query = query.lte('purchase_date', filters.date_to)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Purchase[], total: count || 0, page, limit }
    },
    enabled: !!user
  })
}

export function usePurchase(id?: string) {
  return useQuery<Purchase>({
    queryKey: ['purchase', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(*), items:purchase_items(*, product:products(name_ar))')
        .eq('id', id!).single()
      if (error) throw error
      return data as Purchase
    },
    enabled: !!id
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async ({ purchase, items }: { purchase: Partial<Purchase>; items: Partial<PurchaseItem>[] }) => {
      const { data: seqData } = await supabase.rpc('get_next_sequence', { p_company_id: user!.company_id, p_type: 'purchase' })
      const { data: pur, error } = await supabase
        .from('purchases')
        .insert({ ...purchase, company_id: user!.company_id, user_id: user!.id, purchase_number: seqData || `PUR-${Date.now()}`, status: 'confirmed' })
        .select().single()
      if (error) throw error

      if (items.length > 0) {
        await supabase.from('purchase_items').insert(items.map(i => ({ ...i, purchase_id: pur.id })))
        const movements = items.filter(i => i.product_id).map(i => ({
          company_id: user!.company_id,
          product_id: i.product_id!,
          warehouse_id: purchase.warehouse_id,
          movement_type: 'in' as const,
          quantity: i.quantity!,
          cost_price: i.unit_price,
          reference_type: 'purchase',
          reference_id: pur.id,
          user_id: user!.id
        }))
        if (movements.length > 0) await supabase.from('inventory_movements').insert(movements)
      }
      return pur
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('تم إنشاء فاتورة الشراء بنجاح') },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useUpdatePurchase() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async ({ id, purchase, items }: { id: string; purchase: Partial<Purchase>; items: Partial<PurchaseItem>[] }) => {
      const { error: updErr } = await supabase
        .from('purchases')
        .update({ ...purchase, user_id: user!.id })
        .eq('id', id)
      if (updErr) throw updErr

      // Replace items: delete old then insert new
      const { error: delErr } = await supabase.from('purchase_items').delete().eq('purchase_id', id)
      if (delErr) throw delErr

      if (items.length > 0) {
        const { error: insErr } = await supabase
          .from('purchase_items')
          .insert(items.map(i => ({ ...i, purchase_id: id })))
        if (insErr) throw insErr
      }
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchase', id] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('تم تحديث فاتورة الشراء بنجاح')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('purchases').update({ deleted_at: new Date().toISOString(), status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); toast.success('تم حذف فاتورة الشراء') },
    onError: (err: Error) => toast.error(err.message)
  })
}
