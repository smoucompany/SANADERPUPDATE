import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Supplier, Purchase, Payment } from '@/types'
import toast from 'react-hot-toast'
import { formatDate, today } from '@/lib/utils'

export interface SupplierStatementRow {
  id: string
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  type: 'purchase' | 'payment'
  status?: string
}

export interface SupplierDashboardStats {
  totalSupplierBalance: number
  totalPayables: number
  totalReceivables: number
  overduePayables: number
  currentMonthDue: number
  totalActiveSuppliers: number
  recentTransactions: Array<{ id: string; supplier_id: string; supplier_name: string; supplier_code?: string; date: string; type: 'purchase' | 'payment'; description: string; amount: number; status: string }>
}

export function useSupplierDashboardStats(search?: string) {
  const { user } = useAuthStore()

  return useQuery<SupplierDashboardStats>({
    queryKey: ['supplier-dashboard', user?.company_id, search],
    queryFn: async () => {
      const supplierQuery = supabase
        .from('suppliers')
        .select('id,code,name_ar,phone,tax_number,balance,is_active,updated_at')
        .eq('company_id', user!.company_id)
        .is('deleted_at', null)
        .order('name_ar')

      if (search) supplierQuery.ilike('name_ar', `%${search}%`)

      const [{ data: suppliers = [], error: supplierError }, { data: purchases = [], error: purchaseError }, { data: payments = [], error: paymentError }] = await Promise.all([
        supplierQuery,
        supabase
          .from('purchases')
          .select('id, purchase_date, due_date, remaining_amount, total, supplier_id, supplier: suppliers(name_ar, code)')
          .eq('company_id', user!.company_id)
          .not('status', 'in', '(cancelled,draft)')
          .is('deleted_at', null),
        supabase
          .from('payments')
          .select('id, payment_date, amount, reference, method, supplier_id, supplier: suppliers(name_ar, code)')
          .eq('company_id', user!.company_id)
          .eq('type', 'payment')
          .is('deleted_at', null)
      ])

      if (supplierError) throw supplierError
      if (purchaseError) throw purchaseError
      if (paymentError) throw paymentError

      const suppliersList = suppliers || []
      const purchasesList = purchases || []
      const paymentsList = payments || []

      const totalSupplierBalance = suppliersList.reduce((sum, s) => sum + Number(s.balance || 0), 0)
      const totalPayables = suppliersList.reduce((sum, s) => sum + Math.max(Number(s.balance || 0), 0), 0)
      const totalReceivables = suppliersList.reduce((sum, s) => sum + Math.max(-Number(s.balance || 0), 0), 0)
      const overduePayables = purchasesList.reduce((sum, p) => {
        if (p.due_date && p.remaining_amount > 0 && new Date(p.due_date) < new Date(today())) {
          return sum + Number(p.remaining_amount || 0)
        }
        return sum
      }, 0)

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      const currentMonthDue = purchasesList.reduce((sum, p) => {
        const dueDate = p.due_date ? new Date(p.due_date) : null
        if (dueDate && p.remaining_amount > 0 && dueDate >= monthStart && dueDate <= monthEnd) {
          return sum + Number(p.remaining_amount || 0)
        }
        return sum
      }, 0)

      const totalActiveSuppliers = suppliersList.filter(s => s.is_active).length
      const recentTransactions = [...purchasesList.map(p => ({
        id: p.id,
        supplier_id: p.supplier_id || '',
        supplier_name: (p.supplier as any)?.name_ar || '—',
        supplier_code: (p.supplier as any)?.code,
        date: p.purchase_date,
        type: 'purchase' as const,
        description: 'فاتورة مشتريات',
        amount: Number(p.total || 0),
        status: 'purchase'
      })), ...paymentsList.map(p => ({
        id: p.id,
        supplier_id: p.supplier_id || '',
        supplier_name: (p.supplier as any)?.name_ar || '—',
        supplier_code: (p.supplier as any)?.code,
        date: p.payment_date,
        type: 'payment' as const,
        description: 'سند سداد',
        amount: Number(p.amount || 0),
        status: 'payment'
      }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)

      return {
        totalSupplierBalance,
        totalPayables,
        totalReceivables,
        overduePayables,
        currentMonthDue,
        totalActiveSuppliers,
        recentTransactions
      }
    },
    enabled: !!user
  })
}

export function useSupplierAccount(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-account', supplierId],
    queryFn: async () => {
      const [{ data: supplier, error: supplierError }, { data: purchases, error: purchaseError }, { data: payments, error: paymentError }] = await Promise.all([
        supabase.from('suppliers').select('*').eq('id', supplierId!).single(),
        supabase
          .from('purchases')
          .select('*, supplier: suppliers(name_ar, code), purchase_number')
          .eq('supplier_id', supplierId)
          .not('status', 'in', '(cancelled,draft)')
          .is('deleted_at', null)
          .order('purchase_date', { ascending: false }),
        supabase
          .from('payments')
          .select('*, purchase: purchases(purchase_number), supplier: suppliers(name_ar, code)')
          .eq('supplier_id', supplierId)
          .eq('type', 'payment')
          .is('deleted_at', null)
          .order('payment_date', { ascending: false })
      ])
      if (supplierError) throw supplierError
      if (purchaseError) throw purchaseError
      if (paymentError) throw paymentError

      const totalPurchases = purchases.reduce((sum, item) => sum + Number(item.total || 0), 0)
      const totalPayments = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      const outstandingPayable = purchases.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0)
      const supplierCredits = Math.max(0, -(Number(supplier.balance) || 0))
      const dueInvoices = purchases.filter(item => item.remaining_amount > 0 && item.due_date && new Date(item.due_date) >= new Date()).length
      const overdueInvoices = purchases.filter(item => item.remaining_amount > 0 && item.due_date && new Date(item.due_date) < new Date(today())).length

      let runningBalance = 0
      const statement: SupplierStatementRow[] = [...purchases.map(p => ({
        id: p.id,
        date: p.purchase_date,
        reference: p.purchase_number || '',
        description: 'فاتورة مشتريات',
        debit: Number(p.total || 0),
        credit: 0,
        balance: 0,
        type: 'purchase' as const,
        status: p.status
      })), ...payments.map(p => ({
        id: p.id,
        date: p.payment_date,
        reference: p.payment_number,
        description: 'سداد مورد',
        debit: 0,
        credit: Number(p.amount || 0),
        balance: 0,
        type: 'payment' as const,
        status: 'paid'
      }))].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const statementRows = statement.map(row => {
        runningBalance += row.debit - row.credit
        return { ...row, balance: runningBalance }
      })

      return {
        supplier: supplier as Supplier,
        purchases: purchases as Purchase[],
        payments: payments as Payment[],
        totalPurchases,
        totalPayments,
        outstandingPayable,
        supplierCredits,
        dueInvoices,
        overdueInvoices,
        statementRows
      }
    },
    enabled: !!supplierId
  })
}

export function useSupplierPayments(params: { page?: number, limit?: number, search?: string, supplierId?: string }) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['supplier-payments', user?.company_id, params.page, params.search, params.supplierId],
    queryFn: async () => {
      const query = supabase
        .from('payments')
        .select('*, supplier: suppliers(name_ar, code)', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .eq('type', 'payment')
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })
        .range(((params.page || 1) - 1) * (params.limit || 20), (params.page || 1) * (params.limit || 20) - 1)

      if (params.supplierId) query.eq('supplier_id', params.supplierId)
      if (params.search) query.ilike('reference', `%${params.search}%`)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Payment[], total: count || 0 }
    },
    enabled: !!user
  })
}

export function useCreateSupplierPayment() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (payload: {
      supplier_id: string
      payment_date: string
      method: string
      amount: number
      reference?: string
      notes?: string
      purchase_id?: string
    }) => {
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('balance')
        .eq('id', payload.supplier_id)
        .single()
      if (supplierError) throw supplierError

      const paymentData = {
        company_id: user!.company_id,
        user_id: user!.id,
        payment_number: `SP-${Date.now()}`,
        type: 'payment',
        supplier_id: payload.supplier_id,
        payment_date: payload.payment_date,
        method: payload.method,
        amount: payload.amount,
        reference: payload.reference,
        notes: payload.notes,
        is_posted: true,
        purchase_id: payload.purchase_id || null
      }

      const { error: paymentError } = await supabase.from('payments').insert(paymentData)
      if (paymentError) throw paymentError

      await supabase.from('suppliers').update({ balance: Number(supplier.balance || 0) - payload.amount }).eq('id', payload.supplier_id)

      if (payload.purchase_id) {
        const { data: purchase, error: purchaseError } = await supabase
          .from('purchases')
          .select('paid_amount, remaining_amount')
          .eq('id', payload.purchase_id)
          .single()
        if (!purchaseError && purchase) {
          const paid = Number(purchase.paid_amount || 0) + payload.amount
          const remaining = Math.max(0, Number(purchase.remaining_amount || 0) - payload.amount)
          await supabase.from('purchases').update({ paid_amount: paid, remaining_amount: remaining }).eq('id', payload.purchase_id)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-payments'] })
      qc.invalidateQueries({ queryKey: ['supplier-account'] })
      qc.invalidateQueries({ queryKey: ['supplier-dashboard'] })
      toast.success('تم تسجيل سداد المورد بنجاح')
    },
    onError: (err: Error) => {
      toast.error(err.message)
      throw err
    }
  })
}
