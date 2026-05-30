import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Save, ArrowRight, Loader2 } from 'lucide-react'
import { useCreatePurchase, useUpdatePurchase, usePurchase } from '@/hooks/usePurchases'
import { useProducts } from '@/hooks/useProducts'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useWarehouses } from '@/hooks/useWarehouses'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, calculateVat, today } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

interface LineItem {
  _id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total: number
}

export default function PurchaseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: existingPurchase } = usePurchase(id)
  const createPurchase = useCreatePurchase()
  const updatePurchase = useUpdatePurchase()
  const { data: products = [] } = useProducts({ is_active: true })
  const { data: suppliers = [] } = useSuppliers()
  const { data: warehouses = [] } = useWarehouses()
  const { company } = useAuthStore()

  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [dueDate, setDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{
    _id: '1', product_name: '', quantity: 1, unit_price: 0,
    discount_amount: 0, vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0
  }])
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses.find(w => w.is_default)?.id || warehouses[0]?.id || '')
    }
  }, [warehouses])

  // Populate form when editing existing purchase
  useEffect(() => {
    if (!existingPurchase) return
    setSupplierId(existingPurchase.supplier_id || '')
    setWarehouseId(existingPurchase.warehouse_id || '')
    setPurchaseDate(existingPurchase.purchase_date || today())
    setDueDate(existingPurchase.due_date || '')
    setPaymentMethod(existingPurchase.payment_method || 'cash')
    setNotes(existingPurchase.notes || '')
    if (existingPurchase.items && existingPurchase.items.length > 0) {
      setItems(existingPurchase.items.map((item: any, i: number) => ({
        _id: String(i + 1),
        product_id:      item.product_id,
        product_name:    item.product_name,
        quantity:        item.quantity,
        unit_price:      item.unit_price,
        discount_amount: item.discount_amount || 0,
        vat_rate:        item.vat_rate || 0,
        vat_amount:      item.vat_amount || 0,
        total:           item.total,
      })))
    }
  }, [existingPurchase])

  const updateItem = (itemId: string, field: string, value: unknown) => {
    setItems(prev => prev.map(item => {
      if (item._id !== itemId) return item
      const updated = { ...item, [field]: value }
      if (['quantity', 'unit_price', 'discount_amount', 'vat_rate'].includes(field)) {
        const qty = Number(field === 'quantity' ? value : updated.quantity) || 0
        const price = Number(field === 'unit_price' ? value : updated.unit_price) || 0
        const disc = Number(field === 'discount_amount' ? value : updated.discount_amount) || 0
        const vatRate = Number(field === 'vat_rate' ? value : updated.vat_rate) || 0
        const afterDiscount = qty * price - disc
        const { vatAmount } = calculateVat(afterDiscount, vatRate)
        return { ...updated, vat_amount: vatAmount, total: afterDiscount + vatAmount }
      }
      return updated
    }))
  }

  const selectProduct = (itemId: string, product: (typeof products)[0]) => {
    const item = items.find(i => i._id === itemId)
    if (!item) return
    updateItem(itemId, 'product_id', product.id)
    updateItem(itemId, 'product_name', product.name_ar)
    updateItem(itemId, 'unit_price', product.cost_price || 0)
    updateItem(itemId, 'vat_rate', product.vat_rate || 0)
    setActiveItemId(null)
    setProductSearch('')
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const totalDiscount = items.reduce((s, i) => s + i.discount_amount, 0)
  const taxAmount = items.reduce((s, i) => s + i.vat_amount, 0)
  const total = subtotal - totalDiscount + taxAmount

  const handleSave = async () => {
    if (!items.some(i => i.product_name)) { toast.error('أضف منتجاً واحداً على الأقل'); return }
    const purchaseData = {
      supplier_id: supplierId || undefined,
      warehouse_id: warehouseId || undefined,
      purchase_date: purchaseDate,
      due_date: dueDate || undefined,
      payment_method: paymentMethod as 'cash' | 'mada' | 'transfer' | 'deferred',
      subtotal, discount_amount: totalDiscount, tax_amount: taxAmount, total,
      paid_amount: paymentMethod === 'deferred' ? 0 : total,
      notes
    }
    const lineItems = items.filter(i => i.product_name).map(({ _id, ...item }) => item)
    try {
      if (isEdit && id) {
        await updatePurchase.mutateAsync({ id, purchase: purchaseData, items: lineItems })
      } else {
        await createPurchase.mutateAsync({ purchase: purchaseData, items: lineItems })
      }
      navigate('/purchases')
    } catch { /* error toast shown by hook */ }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'تعديل فاتورة الشراء' : 'فاتورة شراء جديدة'}
        actions={
          <>
            <button onClick={() => navigate('/purchases')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={handleSave} disabled={createPurchase.isPending} className="btn-primary gap-1.5">
              {createPurchase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الفاتورة
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4">معلومات الفاتورة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">المورد</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="form-select">
                  <option value="">اختر المورد</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المستودع</label>
                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="form-select">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">تاريخ الفاتورة</label>
                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">طريقة الدفع</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="form-select">
                  <option value="cash">نقدي</option>
                  <option value="transfer">تحويل بنكي</option>
                  <option value="deferred">آجل</option>
                </select>
              </div>
              <div>
                <label className="form-label">ملاحظات</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} className="form-input" placeholder="ملاحظات اختيارية" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">بنود الفاتورة</h3>
              <button onClick={() => setItems(p => [...p, { _id: crypto.randomUUID(), product_name: '', quantity: 1, unit_price: 0, discount_amount: 0, vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0 }])}
                className="btn-primary text-xs py-1.5 px-3 gap-1">
                <Plus className="w-3.5 h-3.5" />إضافة بند
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-48">المنتج</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-20">الكمية</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-28">سعر الشراء</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">خصم</th>
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
                          <input value={item.product_name} onChange={e => { updateItem(item._id, 'product_name', e.target.value); setActiveItemId(item._id); setProductSearch(e.target.value) }}
                            onFocus={() => setActiveItemId(item._id)} className="form-input text-xs h-8" placeholder="اسم المنتج..." />
                          {activeItemId === item._id && productSearch && (
                            <div className="absolute top-full right-0 z-30 w-64 bg-popover border border-border rounded-xl shadow-xl overflow-hidden mt-1">
                              {products.filter(p => p.name_ar.includes(productSearch)).slice(0, 8).map(p => (
                                <button key={p.id} onMouseDown={() => selectProduct(item._id, p)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-right text-xs">
                                  <div><p className="font-medium text-foreground">{p.name_ar}</p><p className="text-muted-foreground">{formatCurrency(p.cost_price || 0)}</p></div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2"><input type="number" value={item.quantity || ''} onChange={e => updateItem(item._id, 'quantity', parseFloat(e.target.value) || 0)} className="form-input text-xs h-8 w-20" dir="ltr" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.unit_price || ''} onChange={e => updateItem(item._id, 'unit_price', parseFloat(e.target.value) || 0)} className="form-input text-xs h-8 w-28" dir="ltr" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.discount_amount || ''} onChange={e => updateItem(item._id, 'discount_amount', parseFloat(e.target.value) || 0)} className="form-input text-xs h-8 w-20" dir="ltr" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.vat_rate ?? ''} onChange={e => updateItem(item._id, 'vat_rate', parseFloat(e.target.value) || 0)} className="form-input text-xs h-8 w-20" dir="ltr" /></td>
                      <td className="px-3 py-2"><span className="font-bold text-sm">{formatCurrency(item.total)}</span></td>
                      <td className="px-3 py-2"><button onClick={() => setItems(p => p.filter(i => i._id !== item._id))} className="text-destructive p-1 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-card border border-border/60 rounded-xl p-5 space-y-3 sticky top-20">
            <h3 className="font-semibold">ملخص الفاتورة</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>{formatCurrency(subtotal)}</span><span>المجموع الفرعي</span></div>
              {totalDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>-{formatCurrency(totalDiscount)}</span><span>الخصم</span></div>}
              {taxAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>{formatCurrency(taxAmount)}</span><span>ض.ق.م</span></div>}
              <div className="flex justify-between font-bold text-lg text-foreground pt-2 border-t border-border"><span>{formatCurrency(total)}</span><span>الإجمالي</span></div>
            </div>
            <button onClick={handleSave} disabled={createPurchase.isPending} className="btn-primary w-full justify-center py-2.5 gap-1.5">
              {createPurchase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الفاتورة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
