import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Invoice, InvoiceItem } from '@/types'
import toast from 'react-hot-toast'

export interface InvoiceFilters {
  search?: string
  status?: string
  customer_id?: string
  date_from?: string
  date_to?: string
  payment_method?: string
  page?: number
  limit?: number
}

export function useInvoices(filters?: InvoiceFilters) {
  const { user } = useAuthStore()
  const page = filters?.page || 1
  const limit = filters?.limit || 20

  return useQuery({
    queryKey: ['invoices', user?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, customer:customers(name_ar, phone)', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (filters?.search) query = query.ilike('invoice_number', `%${filters.search}%`)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id)
      if (filters?.date_from) query = query.gte('invoice_date', filters.date_from)
      if (filters?.date_to) query = query.lte('invoice_date', filters.date_to)
      if (filters?.payment_method) query = query.eq('payment_method', filters.payment_method)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Invoice[], total: count || 0, page, limit }
    },
    enabled: !!user
  })
}

export function useInvoice(id?: string) {
  const { user } = useAuthStore()
  return useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`*, customer:customers(*), items:invoice_items(*, product:products(name_ar, barcode)), user:users(full_name)`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Invoice
    },
    enabled: !!id && !!user
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ invoice, items }: { invoice: Partial<Invoice>; items: Partial<InvoiceItem>[] }) => {
      // Get next invoice number
      const { data: seqData } = await supabase.rpc('get_next_sequence', {
        p_company_id: user!.company_id,
        p_type: 'invoice'
      })

      const { data: inv, error: invError } = await supabase
        .from('invoices')
        .insert({
          ...invoice,
          company_id: user!.company_id,
          user_id: user!.id,
          invoice_number: seqData || `INV-${Date.now()}`,
          status: invoice.status || 'confirmed'
        })
        .select()
        .single()

      if (invError) throw invError

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(items.map(item => ({ ...item, invoice_id: inv.id })))
        if (itemsError) throw itemsError

        // Create inventory movements
        const movements = items
          .filter(item => item.product_id)
          .map(item => ({
            company_id: user!.company_id,
            product_id: item.product_id!,
            warehouse_id: invoice.warehouse_id,
            movement_type: 'out' as const,
            quantity: item.quantity!,
            cost_price: item.unit_price,
            reference_type: 'invoice',
            reference_id: inv.id,
            user_id: user!.id
          }))

        if (movements.length > 0) {
          await supabase.from('inventory_movements').insert(movements)
        }
      }

      return inv as Invoice
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('تم إنشاء الفاتورة بنجاح')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Invoice> & { id: string }) => {
      const { error } = await supabase.from('invoices').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('تم تحديث الفاتورة بنجاح')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('تم حذف الفاتورة')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}
