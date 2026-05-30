import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save, ArrowRight, Search, Printer, Loader2 } from 'lucide-react'
import { useCreateInvoice, useInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers'
import { useWarehouses } from '@/hooks/useWarehouses'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, calculateDiscount, calculateVat, today } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import type { InvoiceItem, Customer } from '@/types'
import toast from 'react-hot-toast'

interface LineItem extends Partial<InvoiceItem> {
  _id: string
}

export default function SaleFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: existingInvoice } = useInvoice(id)
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const { data: products = [] } = useProducts({ is_active: true })
  const { data: customers = [] } = useCustomers()
  const { data: warehouses = [] } = useWarehouses()
  const createCustomer = useCreateCustomer()
  const { company } = useAuthStore()

  const [customerId, setCustomerId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(today())
  const [dueDate, setDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(0)
  const [items, setItems] = useState<LineItem[]>([{ _id: '1', product_name: '', quantity: 1, unit_price: 0, discount_type: 'percentage', discount_value: 0, discount_amount: 0, vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0 }])
  const [productSearch, setProductSearch] = useState('')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  // Load existing invoice
  useEffect(() => {
    if (existingInvoice) {
      setCustomerId(existingInvoice.customer_id || '')
      setWarehouseId(existingInvoice.warehouse_id || '')
      setInvoiceDate(existingInvoice.invoice_date)
      setDueDate(existingInvoice.due_date || '')
      setPaymentMethod(existingInvoice.payment_method)
      setNotes(existingInvoice.notes || '')
      setDiscountType(existingInvoice.discount_type)
      setDiscountValue(existingInvoice.discount_value)
      if (existingInvoice.items) {
        setItems(existingInvoice.items.map(item => ({ ...item, _id: item.id })))
      }
    }
  }, [existingInvoice])

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses.find(w => w.is_default)?.id || warehouses[0]?.id || '')
    }
  }, [warehouses])

  const updateItem = (id: string, field: string, value: unknown) => {
    setItems(prev => prev.map(item => {
      if (item._id !== id) return item
      const updated = { ...item, [field]: value }

      // Recalculate if price/qty/discount changes
      if (['quantity', 'unit_price', 'discount_type', 'discount_value', 'vat_rate'].includes(field)) {
        const qty = Number(field === 'quantity' ? value : updated.quantity) || 0
        const price = Number(field === 'unit_price' ? value : updated.unit_price) || 0
        const dType = field === 'discount_type' ? value as 'percentage' | 'fixed' : updated.discount_type || 'percentage'
        const dVal = Number(field === 'discount_value' ? value : updated.discount_value) || 0
        const vatRate = Number(field === 'vat_rate' ? value : updated.vat_rate) || 0

        const lineTotal = qty * price
        const discountAmt = calculateDiscount(lineTotal, dType, dVal)
        const afterDiscount = lineTotal - discountAmt
        const { vatAmount } = calculateVat(afterDiscount, vatRate)
        const total = afterDiscount + vatAmount

        return {
          ...updated,
          discount_amount: discountAmt,
          vat_amount: vatAmount,
          total
        }
      }
      return updated
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      _id: crypto.randomUUID(),
      product_name: '', quantity: 1, unit_price: 0,
      discount_type: 'percentage', discount_value: 0, discount_amount: 0,
      vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0
    }])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) { toast.error('يجب أن تحتوي الفاتورة على بند واحد على الأقل'); return }
    setItems(prev => prev.filter(i => i._id !== id))
  }

  const selectProduct = (itemId: string, product: (typeof products)[0]) => {
    updateItem(itemId, 'product_id', product.id)
    updateItem(itemId, 'product_name', product.name_ar)
    updateItem(itemId, 'barcode', product.barcode)
    updateItem(itemId, 'unit_name', product.unit?.abbreviation)
    updateItem(itemId, 'unit_price', product.selling_price)
    updateItem(itemId, 'vat_rate', product.vat_rate || 0)
    setActiveItemId(null)
    setProductSearch('')
  }

  // Totals
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
  const itemsDiscount = items.reduce((s, i) => s + (Number(i.discount_amount) || 0), 0)
  const invoiceDiscount = calculateDiscount(subtotal - itemsDiscount, discountType, discountValue)
  const taxAmount = items.reduce((s, i) => s + (Number(i.vat_amount) || 0), 0)
  const total = subtotal - itemsDiscount - invoiceDiscount + taxAmount

  const handleSave = async (status: 'draft' | 'confirmed' = 'confirmed') => {
    if (!items.some(i => i.product_name)) { toast.error('أضف منتجاً واحداً على الأقل'); return }

    const invoiceData = {
      customer_id: customerId || undefined,
      warehouse_id: warehouseId || undefined,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      payment_method: paymentMethod as 'cash' | 'mada' | 'transfer' | 'deferred',
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: invoiceDiscount,
      tax_amount: taxAmount,
      total,
      paid_amount: paymentMethod === 'deferred' ? 0 : total,
      status,
      notes
    }

    const lineItems = items.filter(i => i.product_name).map(({ _id, ...item }) => item)

    try {
      if (isEdit && id) await updateInvoice.mutateAsync({ id, ...invoiceData })
      else await createInvoice.mutateAsync({ invoice: invoiceData, items: lineItems })
      navigate('/sales')
    } catch { /* error toast shown by hook */ }
  }

  const loading = createInvoice.isPending || updateInvoice.isPending

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'تعديل الفاتورة' : 'فاتورة بيع جديدة'}
        actions={
          <>
            <button onClick={() => navigate('/sales')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => handleSave('draft')} disabled={loading} className="btn-outline gap-1.5">
              حفظ كمسودة
            </button>
            <button onClick={() => handleSave('confirmed')} disabled={loading} className="btn-primary gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ وتأكيد
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header Info */}
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4">معلومات الفاتورة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">العميل</label>
                <div className="flex gap-2">
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="form-select flex-1">
                    <option value="">عميل نقدي</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                  <button onClick={() => setShowNewCustomer(true)} className="btn-outline px-2.5" title="إضافة عميل جديد">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">المستودع</label>
                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="form-select">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">تاريخ الفاتورة</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">طريقة الدفع</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="form-select">
                  <option value="cash">نقدي</option>
                  <option value="mada">مدى</option>
                  <option value="transfer">تحويل بنكي</option>
                  <option value="credit">بطاقة ائتمان</option>
                  <option value="deferred">آجل</option>
                  <option value="mixed">مختلط</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="form-label">ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="form-input resize-none h-16 text-sm" placeholder="ملاحظات اختيارية..." />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">بنود الفاتورة</h3>
              <button onClick={addItem} className="btn-primary text-xs py-1.5 px-3 gap-1">
                <Plus className="w-3.5 h-3.5" />إضافة بند
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-48">المنتج</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-20">الكمية</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-28">السعر</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">الخصم %</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-20">ض.ق.م %</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-28">الإجمالي</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item._id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="relative">
                          <input
                            value={item.product_name || ''}
                            onChange={e => { updateItem(item._id, 'product_name', e.target.value); setActiveItemId(item._id); setProductSearch(e.target.value) }}
                            onFocus={() => setActiveItemId(item._id)}
                            className="form-input text-xs h-8"
                            placeholder="اسم المنتج..."
                          />
                          {activeItemId === item._id && productSearch && (
                            <div className="absolute top-full right-0 z-30 w-64 bg-popover border border-border rounded-xl shadow-xl overflow-hidden mt-1">
                              {products.filter(p => p.name_ar.includes(productSearch) || p.barcode?.includes(productSearch)).slice(0, 8).map(p => (
                                <button
                                  key={p.id}
                                  onMouseDown={() => selectProduct(item._id, p)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-right text-xs"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">{p.name_ar}</p>
                                    <p className="text-muted-foreground">{formatCurrency(p.selling_price)}</p>
                                  </div>
                                </button>
                              ))}
                              {products.filter(p => p.name_ar.includes(productSearch)).length === 0 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground text-center">لا توجد نتائج</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.quantity || ''} onChange={e => updateItem(item._id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="form-input text-xs h-8 w-20" dir="ltr" min="0.001" step="0.001" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.unit_price || ''} onChange={e => updateItem(item._id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="form-input text-xs h-8 w-28" dir="ltr" min="0" step="0.01" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.discount_value || ''} onChange={e => updateItem(item._id, 'discount_value', parseFloat(e.target.value) || 0)}
                          className="form-input text-xs h-8 w-20" dir="ltr" min="0" max="100" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.vat_rate ?? ''} onChange={e => updateItem(item._id, 'vat_rate', parseFloat(e.target.value) || 0)}
                          className="form-input text-xs h-8 w-20" dir="ltr" min="0" max="100" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-bold text-sm">{formatCurrency(item.total || 0)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(item._id)} className="text-destructive hover:bg-destructive/10 p-1 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4 sticky top-20">
            <h3 className="font-semibold">ملخص الفاتورة</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{formatCurrency(subtotal)}</span><span>المجموع الفرعي</span>
              </div>
              {itemsDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>-{formatCurrency(itemsDiscount)}</span><span>خصم البنود</span>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <div className="flex gap-1.5 flex-1">
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="form-select text-xs h-8 w-20">
                    <option value="percentage">%</option>
                    <option value="fixed">مبلغ</option>
                  </select>
                  <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="form-input text-xs h-8 flex-1" dir="ltr" placeholder="0" />
                </div>
                <span className="text-muted-foreground text-xs whitespace-nowrap">خصم الفاتورة</span>
              </div>
              {invoiceDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>-{formatCurrency(invoiceDiscount)}</span><span>خصم الفاتورة</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatCurrency(taxAmount)}</span><span>ضريبة القيمة المضافة</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-foreground pt-2 border-t border-border">
                <span>{formatCurrency(total)}</span><span>الإجمالي</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => handleSave('draft')} disabled={loading} className="btn-outline text-sm justify-center py-2.5">
                مسودة
              </button>
              <button onClick={() => handleSave('confirmed')} disabled={loading} className="btn-primary text-sm justify-center py-2.5 gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      <Modal open={showNewCustomer} onClose={() => setShowNewCustomer(false)} title="إضافة عميل جديد" size="sm"
        footer={
          <>
            <button onClick={() => setShowNewCustomer(false)} className="btn-outline">إلغاء</button>
            <button onClick={async () => {
              if (!newCustomerName) { toast.error('اسم العميل مطلوب'); return }
              const result = await createCustomer.mutateAsync({ name_ar: newCustomerName, phone: newCustomerPhone })
              setCustomerId((result as Customer).id)
              setShowNewCustomer(false)
              setNewCustomerName('')
              setNewCustomerPhone('')
            }} className="btn-primary">
              <Plus className="w-4 h-4" />إضافة
            </button>
          </>
        }>
        <div className="space-y-3">
          <div>
            <label className="form-label">اسم العميل *</label>
            <input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="form-input" placeholder="اسم العميل" autoFocus />
          </div>
          <div>
            <label className="form-label">رقم الجوال</label>
            <input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="form-input" dir="ltr" placeholder="05xxxxxxxx" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
