import { useEffect, useMemo, useState } from 'react'
import { Plus, Download, DollarSign, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useSupplierPayments, useCreateSupplierPayment } from '@/hooks/useSupplierModule'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import DataTable, { Column } from '@/components/shared/DataTable'
import { formatCurrency, formatDate, getPaymentMethodLabel, exportToExcel, today } from '@/lib/utils'
import type { Payment } from '@/types'

export default function SupplierPaymentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlSupplierId = searchParams.get('supplierId') || ''
  const { user } = useAuthStore()
  const { data: suppliers = [] } = useSuppliers()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState(urlSupplierId)
  const [showModal, setShowModal] = useState(!!urlSupplierId)
  const [form, setForm] = useState({ supplier_id: urlSupplierId, purchase_id: '', payment_date: today(), method: 'cash', amount: '', reference: '', notes: '' })
  const [duePurchases, setDuePurchases] = useState<Array<{ id: string; purchase_number: string; remaining_amount: number }>>([])

  const { data: result, isLoading } = useSupplierPayments({ page, search, supplierId })
  const createPayment = useCreateSupplierPayment()
  const payments = result?.data || []

  useEffect(() => {
    async function loadDueInvoices() {
      if (!form.supplier_id) {
        setDuePurchases([])
        return
      }
      const { data } = await supabase
        .from('purchases')
        .select('id, purchase_number, remaining_amount')
        .eq('supplier_id', form.supplier_id)
        .gt('remaining_amount', 0)
        .not('status', 'in', '(cancelled,draft)')
        .is('deleted_at', null)
        .order('due_date', { ascending: true })
      setDuePurchases(data || [])
    }
    loadDueInvoices()
  }, [form.supplier_id])

  const selectedSupplier = suppliers.find(s => s.id === supplierId)
  const totalAmount = useMemo(() => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0), [payments])

  const handleSave = async () => {
    if (!form.supplier_id) return
    if (!form.amount || Number(form.amount) <= 0) return
    await createPayment.mutateAsync({
      supplier_id: form.supplier_id,
      payment_date: form.payment_date,
      method: form.method,
      amount: Number(form.amount),
      reference: form.reference,
      notes: form.notes,
      purchase_id: form.purchase_id || undefined
    })
    setShowModal(false)
    setForm({ supplier_id: '', purchase_id: '', payment_date: today(), method: 'cash', amount: '', reference: '', notes: '' })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="سندات الموردين"
        subtitle="إدارة تسويات الموردين وسداد الالتزامات المالية"
        actions={
          <>
            <button onClick={() => navigate('/suppliers')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary gap-1.5">
              <DollarSign className="w-4 h-4" />سجل سداد جديد
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">تفاصيل المرشح</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>اختر موردًا لعرض سجلات السداد الخاصة به.</p>
            <div><span className="font-medium text-foreground">المورد:</span> {selectedSupplier?.name_ar || 'كل الموردين'}</div>
            <div><span className="font-medium text-foreground">الهاتف:</span> {selectedSupplier?.phone || '—'}</div>
            <div><span className="font-medium text-foreground">الرصيد:</span> {selectedSupplier ? formatCurrency(Number(selectedSupplier.balance || 0)) : '—'}</div>
          </div>
          <div>
            <label className="form-label">بحث المورد</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم السند أو المورد" className="form-input" />
          </div>
          <div>
            <label className="form-label">فلترة بمورد</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="form-select">
              <option value="">كل الموردين</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
            </select>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-sm">
            <div className="flex items-center justify-between"><span>عدد السندات</span><span>{result?.total || 0}</span></div>
            <div className="flex items-center justify-between mt-2"><span>إجمالي المبالغ</span><strong>{formatCurrency(totalAmount)}</strong></div>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">سجل سندات الموردين</h3>
              <p className="text-xs text-muted-foreground">يمكنك تسجيل سداد مورد وربطه بفاتورة شراء.</p>
            </div>
            <button onClick={() => exportToExcel(payments.map(p => ({
              'رقم السند': p.payment_number,
              'المورد': p.supplier?.name_ar,
              'التاريخ': formatDate(p.payment_date),
              'المبلغ': p.amount,
              'طريقة الدفع': getPaymentMethodLabel(p.method),
              'المرجع': p.reference
            })), 'سندات-الموردين')} className="btn-outline gap-1.5 text-xs">
              <Download className="w-4 h-4" />تصدير
            </button>
          </div>
          <div className="p-5">
            <DataTable
              data={payments}
              columns={[
                { key: 'payment_number', label: 'رقم السند' },
                { key: 'payment_date', label: 'التاريخ', render: v => formatDate(String(v)) },
                { key: 'supplier', label: 'المورد', render: (_, row) => row.supplier?.name_ar || '—' },
                { key: 'method', label: 'الطريقة', render: v => getPaymentMethodLabel(String(v)) },
                { key: 'amount', label: 'المبلغ', render: v => formatCurrency(Number(v || 0)) },
                { key: 'reference', label: 'المرجع' }
              ] as Column<Payment>[]}
              loading={isLoading}
              searchable={false}
              emptyMessage="لا توجد سندات"
              pagination={{ page, limit: 20, total: result?.total || 0, onPageChange: setPage }}
            />
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="سند صرف مورد"
        footer={<>
          <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
          <button onClick={handleSave} disabled={createPayment.isPending} className="btn-primary gap-1.5">
            <DollarSign className="w-4 h-4" />حفظ السند
          </button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">المورد *</label>
            <select value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value, purchase_id: '' }))} className="form-select">
              <option value="">اختر المورد</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">فاتورة الشراء المرتبطة (اختياري)</label>
            <select value={form.purchase_id} onChange={e => setForm(p => ({ ...p, purchase_id: e.target.value }))} className="form-select" disabled={!form.supplier_id}>
              <option value="">غير مرتبط</option>
              {duePurchases.map(p => <option key={p.id} value={p.id}>{p.purchase_number} - {formatCurrency(p.remaining_amount)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">التاريخ *</label>
              <input type="date" value={form.payment_date} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">طريقة الدفع *</label>
              <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} className="form-select">
                <option value="cash">نقدي</option>
                <option value="mada">مدى</option>
                <option value="transfer">تحويل بنكي</option>
                <option value="credit">بطاقة ائتمان</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">المبلغ *</label>
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="form-input" dir="ltr" />
          </div>
          <div>
            <label className="form-label">المرجع</label>
            <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className="form-input" dir="ltr" />
          </div>
          <div>
            <label className="form-label">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="form-input h-24 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
