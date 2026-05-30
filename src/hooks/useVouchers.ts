import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Payment, Customer, Supplier, Invoice, Purchase, Cashbox } from '@/types'
import toast from 'react-hot-toast'

export interface VoucherFilters {
  search?: string
  type?: 'receipt' | 'payment'
  customer_id?: string
  supplier_id?: string
  cashbox_id?: string
  date_from?: string
  date_to?: string
  payment_method?: string
  page?: number
  limit?: number
}

// 1. Fetch Vouchers
export function useVouchers(filters?: VoucherFilters) {
  const { user } = useAuthStore()
  const page = filters?.page || 1
  const limit = filters?.limit || 20

  return useQuery({
    queryKey: ['vouchers', user?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*, customer:customers(name_ar, phone), supplier:suppliers(name_ar, phone), invoice:invoices(invoice_number), purchase:purchases(purchase_number), cashbox:cashboxes(name_ar), user:users(full_name)', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (filters?.search) {
        query = query.ilike('payment_number', `%${filters.search}%`)
      }
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
      }
      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id)
      }
      if (filters?.cashbox_id) {
        query = query.eq('cashbox_id', filters.cashbox_id)
      }
      if (filters?.date_from) {
        query = query.gte('payment_date', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('payment_date', filters.date_to)
      }
      if (filters?.payment_method) {
        query = query.eq('method', filters.payment_method)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as (Payment & { customer?: any, supplier?: any, invoice?: any, purchase?: any, cashbox?: any, user?: any })[], total: count || 0, page, limit }
    },
    enabled: !!user
  })
}

// 2. Fetch Single Voucher
export function useVoucher(id?: string) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['voucher', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers(*),
          supplier:suppliers(*),
          invoice:invoices(*),
          purchase:purchases(*),
          cashbox:cashboxes(*),
          user:users(*)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as (Payment & { customer?: Customer, supplier?: Supplier, invoice?: Invoice, purchase?: Purchase, cashbox?: Cashbox, user?: any })
    },
    enabled: !!id && !!user
  })
}

// 3. Create Voucher (with fully automated multi-module integration)
export function useCreateVoucher() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (form: {
      type: 'receipt' | 'payment'
      customer_id?: string | null
      supplier_id?: string | null
      invoice_id?: string | null
      purchase_id?: string | null
      cashbox_id?: string | null
      payment_date: string
      method: string
      amount: number
      reference?: string
      notes?: string
      employee_id?: string | null
      attachment_url?: string | null
    }) => {
      if (!form.amount || form.amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من الصفر')

      // A. Get dynamic voucher/payment sequence number
      const sequenceType = form.type === 'receipt' ? 'receipt' : 'payment'
      const { data: seqNumber } = await supabase.rpc('get_next_sequence', {
        p_company_id: user!.company_id,
        p_type: sequenceType
      })

      const finalVoucherNumber = seqNumber || `${form.type === 'receipt' ? 'RCT' : 'PAY'}-${Date.now()}`

      // B. Insert payment voucher into database
      const { data: voucher, error: insertError } = await supabase
        .from('payments')
        .insert({
          company_id: user!.company_id,
          user_id: user!.id,
          payment_number: finalVoucherNumber,
          type: form.type,
          customer_id: form.customer_id || null,
          supplier_id: form.supplier_id || null,
          invoice_id: form.invoice_id || null,
          purchase_id: form.purchase_id || null,
          cashbox_id: form.cashbox_id || null,
          payment_date: form.payment_date,
          method: form.method,
          amount: form.amount,
          reference: form.reference || null,
          notes: form.notes || null,
          is_posted: true
        })
        .select()
        .single()

      if (insertError) throw insertError

      // C. AUTOMATION 1: Treasury/Cashbox Balance Update
      if (form.cashbox_id) {
        // Fetch current cashbox balance
        const { data: cb } = await supabase
          .from('cashboxes')
          .select('balance')
          .eq('id', form.cashbox_id)
          .single()

        const currentBalance = cb?.balance || 0
        const newBalance = form.type === 'receipt' 
          ? currentBalance + form.amount 
          : currentBalance - form.amount

        const { error: cbError } = await supabase
          .from('cashboxes')
          .update({ balance: newBalance })
          .eq('id', form.cashbox_id)

        if (cbError) console.error('Treasury Balance Update Error:', cbError.message)
      }

      // D. AUTOMATION 2: Sales Invoice Integration
      if (form.type === 'receipt' && form.invoice_id) {
        const { data: inv } = await supabase
          .from('invoices')
          .select('total, paid_amount')
          .eq('id', form.invoice_id)
          .single()

        if (inv) {
          const newPaidAmount = (inv.paid_amount || 0) + form.amount
          const newRemainingAmount = Math.max(0, inv.total - newPaidAmount)
          const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partial'

          await supabase
            .from('invoices')
            .update({
              paid_amount: newPaidAmount,
              remaining_amount: newRemainingAmount,
              status: newStatus
            })
            .eq('id', form.invoice_id)

          // Recalculate customer balance via RPC
          if (form.customer_id) {
            await supabase.rpc('update_customer_balance', { p_customer_id: form.customer_id })
          }
        }
      }

      // E. AUTOMATION 3: Purchase Invoice Integration
      if (form.type === 'payment' && form.purchase_id) {
        const { data: pur } = await supabase
          .from('purchases')
          .select('total, paid_amount')
          .eq('id', form.purchase_id)
          .single()

        if (pur) {
          const newPaidAmount = (pur.paid_amount || 0) + form.amount
          const newRemainingAmount = Math.max(0, pur.total - newPaidAmount)
          const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partial'

          await supabase
            .from('purchases')
            .update({
              paid_amount: newPaidAmount,
              remaining_amount: newRemainingAmount,
              status: newStatus
            })
            .eq('id', form.purchase_id)

          // Recalculate supplier balance
          if (form.supplier_id) {
            const { data: sup } = await supabase
              .from('suppliers')
              .select('balance')
              .eq('id', form.supplier_id)
              .single()

            if (sup) {
              await supabase
                .from('suppliers')
                .update({ balance: sup.balance - form.amount })
                .eq('id', form.supplier_id)
            }
          }
        }
      }

      // F. AUTOMATION 4: Individual Customer/Supplier Balance Update (no invoice link, straight payment on account)
      if (form.customer_id && !form.invoice_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('balance')
          .eq('id', form.customer_id)
          .single()

        if (cust) {
          // Receipt decreases outstanding customer receivable, Payment increases it
          const balanceDiff = form.type === 'receipt' ? -form.amount : form.amount
          await supabase
            .from('customers')
            .update({ balance: cust.balance + balanceDiff })
            .eq('id', form.customer_id)
        }
      }

      if (form.supplier_id && !form.purchase_id) {
        const { data: sup } = await supabase
          .from('suppliers')
          .select('balance')
          .eq('id', form.supplier_id)
          .single()

        if (sup) {
          // Payment decreases supplier payable, Receipt increases it
          const balanceDiff = form.type === 'payment' ? -form.amount : form.amount
          await supabase
            .from('suppliers')
            .update({ balance: sup.balance + balanceDiff })
            .eq('id', form.supplier_id)
        }
      }

      // G. AUTOMATION 5: Log Activity
      await supabase.from('activity_logs').insert({
        company_id: user!.company_id,
        user_id: user!.id,
        action: `إنشاء سند ${form.type === 'receipt' ? 'قبض' : 'صرف'} رقم ${finalVoucherNumber}`,
        module: 'vouchers',
        record_id: voucher.id,
        record_type: 'payment'
      })

      // H. AUTOMATION 6: Create real-time notification
      await supabase.from('notifications').insert({
        company_id: user!.company_id,
        user_id: user!.id,
        type: 'success',
        title: form.type === 'receipt' ? 'سند قبض جديد' : 'سند صرف جديد',
        message: `تم إصدار السند بقيمة ${form.amount} ر.س برقم ${finalVoucherNumber} بنجاح.`,
        is_read: false,
        data: { payment_id: voucher.id }
      })

      return voucher
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['cashboxes'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('تم إصدار وحفظ السند بنجاح وجاري تحديث الأرصدة تلقائياً!')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}

// 4. Update/Edit Voucher (with audit trail)
export function useUpdateVoucher() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Payment> & { id: string }) => {
      const { data: original } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('payments')
        .update(data)
        .eq('id', id)

      if (error) throw error

      // Audit Trail Logging
      await supabase.from('activity_logs').insert({
        company_id: user!.company_id,
        user_id: user!.id,
        action: `تعديل السند رقم ${original?.payment_number || id}`,
        module: 'vouchers',
        record_id: id,
        record_type: 'payment',
        old_values: original as any,
        new_values: data as any
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['voucher'] })
      toast.success('تم تحديث السند بنجاح!')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}

// 5. Delete Voucher
export function useDeleteVoucher() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: original } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw error

      // Audit Trail Logging
      await supabase.from('activity_logs').insert({
        company_id: user!.company_id,
        user_id: user!.id,
        action: `حذف السند رقم ${original?.payment_number || id}`,
        module: 'vouchers',
        record_id: id,
        record_type: 'payment',
        old_values: original as any
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('تم حذف السند بنجاح!')
    },
    onError: (err: Error) => toast.error(err.message)
  })
}
