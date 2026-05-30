import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, DollarSign, Calendar, FileText, Check, AlertCircle } from 'lucide-react'
import { useCreateVoucher, useVoucher, useUpdateVoucher } from '@/hooks/useVouchers'
import { useCustomers } from '@/hooks/useCustomers'
import { useSuppliers } from '@/hooks/useSuppliers'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { today, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function VoucherFormPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { id } = useParams()
  const isEdit = !!id

  const [type, setType] = useState<'receipt' | 'payment'>('receipt')
  const [cashboxId, setCashboxId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [paymentDate, setPaymentDate] = useState(today())
  const [method, setMethod] = useState('cash')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [employeeCategory, setEmployeeCategory] = useState('salary_advance')

  // Fetch lookups
  const { data: customers = [] } = useCustomers()
  const { data: suppliers = [] } = useSuppliers()

  const { data: cashboxes = [] } = useQuery({
    queryKey: ['cashboxes-list', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('cashboxes').select('*').eq('company_id', user!.company_id).eq('is_active', true)
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('id, full_name, role').eq('company_id', user!.company_id).eq('is_active', true)
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  // Load single voucher if editing
  const { data: voucher, isLoading: isLoadingVoucher } = useVoucher(id)

  useEffect(() => {
    if (voucher) {
      setType(voucher.type)
      setCashboxId(voucher.cashbox_id || '')
      setCustomerId(voucher.customer_id || '')
      setSupplierId(voucher.supplier_id || '')
      setInvoiceId(voucher.invoice_id || '')
      setPurchaseId(voucher.purchase_id || '')
      setPaymentDate(voucher.payment_date)
      setMethod(voucher.method)
      setAmount(String(voucher.amount))
      setReference(voucher.reference || '')
      setNotes(voucher.notes || '')
    }
  }, [voucher])

  // Fetch unpaid invoices for selected customer
  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ['unpaid-invoices', customerId],
    queryFn: async () => {
      if (!customerId) return []
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .neq('status', 'paid')
        .is('deleted_at', null)
        .order('invoice_date', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!customerId && type === 'receipt'
  })

  // Fetch unpaid purchases for selected supplier
  const { data: unpaidPurchases = [] } = useQuery({
    queryKey: ['unpaid-purchases', supplierId],
    queryFn: async () => {
      if (!supplierId) return []
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('supplier_id', supplierId)
        .neq('status', 'paid')
        .order('purchase_date', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!supplierId && type === 'payment'
  })

  // Mutations
  const createVoucher = useCreateVoucher()
  const updateVoucher = useUpdateVoucher()

  // Set default cashbox when loaded
  useEffect(() => {
    if (cashboxes.length > 0 && !cashboxId) {
      const def = cashboxes.find((c: any) => c.is_default) || cashboxes[0]
      setCashboxId(def.id)
    }
  }, [cashboxes])

  const handleInvoiceChange = (invId: string) => {
    setInvoiceId(invId)
    if (invId) {
      const selected = unpaidInvoices.find(i => i.id === invId)
      if (selected) {
        setAmount(String(selected.remaining_amount))
        setNotes(`سداد فاتورة مبيعات رقم ${selected.invoice_number}`)
      }
    }
  };

  const handlePurchaseChange = (purId: string) => {
    setPurchaseId(purId)
    if (purId) {
      const selected = unpaidPurchases.find(p => p.id === purId)
      if (selected) {
        setAmount(String(selected.remaining_amount))
        setNotes(`سداد فاتورة مشتريات رقم ${selected.purchase_number}`)
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cashboxId) {
      toast.error('الرجاء اختيار الخزينة / الحساب المالي')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح للسند')
      return
    }

    const payload = {
      type,
      customer_id: type === 'receipt' && customerId ? customerId : null,
      supplier_id: type === 'payment' && supplierId ? supplierId : null,
      invoice_id: type === 'receipt' && invoiceId ? invoiceId : null,
      purchase_id: type === 'payment' && purchaseId ? purchaseId : null,
      cashbox_id: cashboxId,
      payment_date: paymentDate,
      method,
      amount: parseFloat(amount),
      reference,
      notes: notes || `${type === 'receipt' ? 'سند قبض' : 'سند صرف'} مالي`,
      employee_id: employeeId || null,
      employee_category: employeeId ? employeeCategory : null
    }

    if (isEdit) {
      updateVoucher.mutate(
        { id: id!, ...payload } as any,
        {
          onSuccess: () => navigate('/vouchers')
        }
      )
    } else {
      createVoucher.mutate(payload, {
        onSuccess: () => navigate('/vouchers')
      })
    }
  }

  if (isEdit && isLoadingVoucher) {
    return <div className="p-8 text-center text-muted-foreground">جاري تحميل بيانات السند...</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full"
    >
      <PageHeader
        title={isEdit ? 'تعديل السند المالي' : 'إصدار سند مالي جديد'}
        subtitle="شاشة تحرير وإنشاء الحركات النقدية المتكاملة مع الخزينة والمحاسبة"
        actions={
          <button onClick={() => navigate('/vouchers')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm active:scale-[0.97] transition-all">
            <ArrowRight className="w-4 h-4 ml-1" />رجوع للوحة السندات
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm space-y-5">
            {/* Voucher Type selector */}
            {!isEdit && (
              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-2">نوع السند المالي *</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { setType('receipt'); setCustomerId(''); setInvoiceId('') }}
                    className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] ${
                      type === 'receipt'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />سند قبض (استلام أموال)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setType('payment'); setSupplierId(''); setPurchaseId('') }}
                    className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] ${
                      type === 'payment'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-sm'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />سند صرف (دفع أموال)
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Cashbox / Treasury Selector */}
              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">الخزينة المودع بها / المصروف منها *</label>
                <select
                  value={cashboxId}
                  onChange={e => setCashboxId(e.target.value)}
                  className="form-select bg-muted/20 focus:bg-card border-border/50 focus:ring-primary/20 rounded-xl"
                  required
                >
                  <option value="">اختر الخزينة</option>
                  {cashboxes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} (الرصيد: {formatCurrency(c.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">تاريخ الحركة *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="form-input pr-9 bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                    required
                  />
                  <Calendar className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Entity/Recipient Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border/20 pt-4">
              {type === 'receipt' ? (
                <>
                  <div>
                    <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">العميل المستفيد (اختياري)</label>
                    <select
                      value={customerId}
                      onChange={e => { setCustomerId(e.target.value); setInvoiceId(''); setEmployeeId('') }}
                      className="form-select bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                    >
                      <option value="">سند نقدي عام / بدون عميل</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name_ar} (الحساب: {formatCurrency(c.balance)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">ربط بفاتورة مبيعات آجل</label>
                    <select
                      value={invoiceId}
                      onChange={e => handleInvoiceChange(e.target.value)}
                      className="form-select bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                      disabled={!customerId}
                    >
                      <option value="">بدون ربط بفاتورة (دفعة على الحساب)</option>
                      {unpaidInvoices.map(i => (
                        <option key={i.id} value={i.id}>
                          فاتورة رقم {i.invoice_number} (المتبقي: {formatCurrency(i.remaining_amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">المورد المستفيد (اختياري)</label>
                    <select
                      value={supplierId}
                      onChange={e => { setSupplierId(e.target.value); setPurchaseId(''); setEmployeeId('') }}
                      className="form-select bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                    >
                      <option value="">سند نقدي عام / بدون مورد</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name_ar} (الحساب: {formatCurrency(s.balance)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">ربط بطلب شراء آجل</label>
                    <select
                      value={purchaseId}
                      onChange={e => handlePurchaseChange(e.target.value)}
                      className="form-select bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                      disabled={!supplierId}
                    >
                      <option value="">بدون ربط بطلب شراء (دفعة على الحساب)</option>
                      {unpaidPurchases.map(p => (
                        <option key={p.id} value={p.id}>
                          طلب شراء رقم {p.purchase_number} (المتبقي: {formatCurrency(p.remaining_amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Employee Accounts Integration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border/20 pt-4">
              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">أو ربط بمستحقات موظف</label>
                <select
                  value={employeeId}
                  onChange={e => { setEmployeeId(e.target.value); setCustomerId(''); setSupplierId('') }}
                  className="form-select bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                >
                  <option value="">غير مرتبط بموظف</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">نوع الاستحقاق الوظيفي</label>
                <select
                  value={employeeCategory}
                  onChange={e => setEmployeeCategory(e.target.value)}
                  className="form-select bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                  disabled={!employeeId}
                >
                  <option value="salary_advance">سلفة على الراتب</option>
                  <option value="reimbursement">مستردات مصاريف عهدة</option>
                  <option value="bonus">مكافآت وحوافز</option>
                  <option value="deduction">خصومات واستقطاعات</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar inputs: Amount & Method */}
        <div className="space-y-6">
          <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full"></span>المبلغ وطريقة التحصيل
            </h3>

            {/* Amount */}
            <div>
              <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">مبلغ السند الإجمالي *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="form-input text-2xl font-black text-center text-primary bg-muted/20 focus:bg-card border-border/50 focus:ring-primary/20 rounded-xl h-14"
                  dir="ltr"
                  placeholder="0.00"
                  required
                />
                <span className="absolute left-4 top-4.5 font-bold text-xs text-muted-foreground">ر.س</span>
              </div>
            </div>

            {/* Method */}
            <div>
              <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">طريقة السداد / الدفع</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="form-select bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
              >
                <option value="cash">نقدي (كاش)</option>
                <option value="mada">مدى (شبكة)</option>
                <option value="transfer">تحويل بنكي</option>
                <option value="credit">بطاقة ائتمان</option>
              </select>
            </div>

            {/* Reference */}
            <div>
              <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">رقم التحويل / مرجع العملية</label>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="form-input bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs"
                placeholder="رقم التحويل البنكي..."
                dir="ltr"
              />
            </div>

            {/* Description/Notes */}
            <div>
              <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">البيان / تفاصيل إضافية</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="form-input bg-muted/20 focus:bg-card border-border/50 rounded-xl text-xs resize-none h-20"
                placeholder="اكتب بياناً تفصيلياً لحفظه في القيد المالي اليومي..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={createVoucher.isPending || updateVoucher.isPending}
              className="btn-primary w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.98] transition-all"
            >
              <Check className="w-5 h-5" />
              {isEdit ? 'حفظ التعديلات الجارية' : 'اعتماد وإصدار السند المالي'}
            </button>
          </div>

          {/* Real-time automated ledger notification preview */}
          <div className="bg-muted/30 border border-border/30 p-4 rounded-2xl space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-primary" />قواعد النظام المؤتمتة للسند:
            </p>
            <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-1 pr-1 leading-relaxed">
              <li>سيتم تحديث رصيد الخزينة تلقائياً فور الاعتماد.</li>
              <li>إذا كان السند مرتبطاً بفاتورة، فسيتم خفض المتبقي منها تلقائياً.</li>
              <li>سيتم استدعاء الدالة المدمجة لحساب رصيد العميل/المورد.</li>
              <li>سيتم تسجيل تفاصيل التعديل أو الحذف في سجلات الأمان.</li>
            </ul>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
