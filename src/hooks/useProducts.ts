import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export function useProducts(params?: { search?: string; category_id?: string; is_active?: boolean }) {
  const { user } = useAuthStore()
  return useQuery<Product[]>({
    queryKey: ['products', user?.company_id, params],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, category:categories(name_ar), unit:units(name_ar, abbreviation), inventory(quantity)`)
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('name_ar')

      if (params?.search) {
        query = query.or(`name_ar.ilike.%${params.search}%,barcode.ilike.%${params.search}%`)
      }
      if (params?.category_id) query = query.eq('category_id', params.category_id)
      if (params?.is_active !== undefined) query = query.eq('is_active', params.is_active)

      const { data, error } = await query
      if (error) throw error
      return (data as any[]).map(p => ({
        ...p,
        current_stock: Array.isArray(p.inventory)
          ? p.inventory.reduce((s: number, inv: any) => s + (inv.quantity || 0), 0)
          : 0
      })) as Product[]
    },
    enabled: !!user
  })
}

export function useProduct(id?: string) {
  const { user } = useAuthStore()
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, category:categories(name_ar), unit:units(name_ar, abbreviation)`)
        .eq('id', id!)
        .eq('company_id', user!.company_id)
        .single()
      if (error) throw error
      return data as Product
    },
    enabled: !!id && !!user
  })
}

export function useProductStock(productId?: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['product-stock', productId, warehouseId],
    queryFn: async () => {
      let q = supabase.from('inventory').select('*').eq('product_id', productId!)
      if (warehouseId) q = q.eq('warehouse_id', warehouseId)
      const { data } = await q
      return data?.reduce((sum, inv) => sum + inv.quantity, 0) || 0
    },
    enabled: !!productId
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const { data: result, error } = await supabase
        .from('products')
        .insert({ ...data, company_id: user!.company_id })
        .select()
        .single()
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('تم إضافة المنتج بنجاح')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from('products').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('تم تحديث المنتج بنجاح')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('تم حذف المنتج بنجاح')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}
