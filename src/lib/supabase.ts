import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = (import.meta as any).env.VITE_SUPABASE_URL     as string
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: false,
    storageKey:        'erp-auth-token',
  },
  global: {
    headers: { 'x-application-name': 'ERP-System' },
  },
  realtime: {
    // Disable realtime subscriptions — we use polling via React Query
    params: { eventsPerSecond: 0 },
  },
  db: {
    schema: 'public',
  },
})

export type Database = {
  public: {
    Tables: {
      companies:    { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      users:        { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      products:     { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      invoices:     { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      purchases:    { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      customers:    { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      suppliers:    { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      inventory:    { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
    Functions: {
      get_dashboard_summary:    { Args: { p_company_id: string }; Returns: Record<string, unknown> }
      get_next_document_number: { Args: { p_company_id: string; p_type: string; p_prefix?: string }; Returns: string }
      approve_purchase:         { Args: { p_purchase_id: string; p_user_id: string }; Returns: Record<string, unknown> }
      reverse_purchase:         { Args: { p_purchase_id: string; p_user_id: string; p_reason?: string }; Returns: Record<string, unknown> }
      approve_sale:             { Args: { p_invoice_id: string; p_user_id: string }; Returns: Record<string, unknown> }
      post_expense:             { Args: { p_expense_id: string }; Returns: string }
      transfer_warehouse_fifo:  { Args: { p_transfer_id: string }; Returns: void }
      setup_new_company_full:   { Args: { p_company_id: string }; Returns: void }
    }
  }
}
