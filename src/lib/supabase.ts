import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      companies: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      users: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      products: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      invoices: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      purchases: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      customers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      suppliers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      inventory: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
    Functions: {
      get_dashboard_summary: { Args: { p_company_id: string; p_date?: string }; Returns: Record<string, unknown> }
      get_top_products: { Args: { p_company_id: string; p_limit?: number; p_days?: number }; Returns: Record<string, unknown>[] }
      get_monthly_sales: { Args: { p_company_id: string; p_year?: number }; Returns: Record<string, unknown>[] }
      setup_new_company: { Args: { p_company_id: string }; Returns: void }
    }
  }
}
