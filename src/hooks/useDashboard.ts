import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { DashboardSummary } from '@/types'

export function useDashboardSummary() {
  const { user } = useAuthStore()
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_company_id: user!.company_id
      })
      if (error) throw error
      return data as DashboardSummary
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5
  })
}

export function useTopProducts(limit = 10, days = 30) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['dashboard', 'top-products', user?.company_id, limit, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_products', {
        p_company_id: user!.company_id,
        p_limit: limit,
        p_days: days
      })
      if (error) throw error
      return data as Array<{ product_id: string; product_name: string; total_quantity: number; total_revenue: number }>
    },
    enabled: !!user
  })
}

export function useMonthlySales(year?: number) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['dashboard', 'monthly-sales', user?.company_id, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_sales', {
        p_company_id: user!.company_id,
        p_year: year || new Date().getFullYear()
      })
      if (error) throw error
      return data as Array<{ month_num: number; month_name: string; sales_total: number; purchases_total: number; profit: number }>
    },
    enabled: !!user
  })
}

export function useRecentInvoices(limit = 10) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['dashboard', 'recent-invoices', user?.company_id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(name_ar)')
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
    enabled: !!user
  })
}

export function useLowStockProducts(limit = 10) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['dashboard', 'low-stock', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, min_stock_alert, barcode, code, inventory(quantity)')
        .eq('company_id', user!.company_id)
        .eq('track_inventory', true)
        .is('deleted_at', null)
        .eq('is_active', true)
      if (error) return []
      // Filter client-side: products whose total stock < min_stock_alert
      return (data || [])
        .map((p: any) => ({
          ...p,
          current_stock: Array.isArray(p.inventory)
            ? p.inventory.reduce((s: number, inv: any) => s + (inv.quantity || 0), 0)
            : 0
        }))
        .filter((p: any) => p.current_stock < (p.min_stock_alert || 0))
        .slice(0, limit)
    },
    enabled: !!user
  })
}
