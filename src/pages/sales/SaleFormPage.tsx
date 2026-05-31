import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Trash2, Save, ArrowRight, Search, Loader2,
  ChevronDown, Lock, AlertCircle, CheckCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'

interface SaleLine {
  _id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total: number
  has_recipe: boolean
}

const COLLECTION_METHODS = [
  { value: 'sub_cashbox', label: 'خزينة فرعية (كاشير)', icon: '💵' },
  { value: 'bank',        label: 'حساب بنكي',           icon: '🏦' },
]

function calcLine(item: SaleLine): SaleLine {
  const base   = item.quantity * item.unit_price - item.discount_amount
  const vatAmt = base * (item.vat_rate / 100)
  return { ...item, vat_amount: vatAmt, total: base + vatAmt }
}

export default function SaleFormPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isEdit    = !!id
  const { company, user } = useAuthStore()

  const [customerId, setCustomerId]         = useState('')
  const [customerName, setCustomerName]     = useState('')
  const [invoiceDate, setInvoiceDate]       = useState(today())
  const [dueDate, setDueDate]               = useState('')
  const [collectionMethod, setCollectionMethod] = useState('sub_cashbox')
  const [cashboxId, setCashboxId]           = useState('')
  const [bankAccountId, setBankAccountId]   = useState('')
  const [notes, setNotes]                   = useState('')
  const [invoiceNumber, setInvoiceNumber]   = useState('')
  const [saving, setSaving]                 = useState(false)

  const [lines, setLines] = useState<SaleLine[]>([{
    _id: Date.now().toString(), product_name: '', quantity: 1, unit_price: 0,
    discount_amount: 0, vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0, has_recipe: true
  }])

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOpen, setCustomerOpen]     = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)
  const [activeLineId, setActiveLineId]     = useState<string | null>(null)
  const [productSearch, setProductSearch]   = useState('')

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-active', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('customers')
        .select('id, name_ar, balance, phone')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name_ar')
      return data || []
    },
    enabled: !!company?.id
  })

  // جلب المنتجات التي لها رسبي معتمد فقط
  const { data: productsWithRecipe = [] } = useQuery({
    queryKey: ['products-with-recipe', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data: recipes } = await supabase
        .from('recipes')
        .select('product_id, product:products(id, name_ar, code, selling_price, vat_rate, category:categories(name_ar), unit:units(name_ar))')
        .eq('company_id', company.id)
        .eq('is_approved', true)
        .eq('is_active', true)
      return (recipes || []).map(r => r.product).filter(Boolean)
    },
    enabled: !!company?.id
  })

  const { data: subCashboxes = [] } = useQuery({
    queryKey: ['sub-cashboxes', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('cashboxes')
        .select('id, name_ar, balance')
        .eq('company_id', company.id)
        .eq('is_main', false)
        .eq('is_active', true)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('bank_accounts')
        .select('id, bank_name, account_number, balance')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!company?.id
  })

  // توليد رقم فاتورة
  useEffect(() => {
    if (!company?.id || isEdit) return
    supabase.rpc('get_next_document_number', {
      p_company_id: company.id, p_type: 'sale', p_prefix: 'INV'
    }).then(({ data }) => { if (data) setInvoiceNumber(data) })
  }, [company?.id, isEdit])

  // إغلاق قائمة العملاء
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setCustomerOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredCustomers = (customers as any[]).filter(c =>
    !customerSearch || c.name_ar.includes(customerSearch)
  )

  const filteredProducts = (productsWithRecipe as any[]).filter(p =>
    !productSearch || p?.name_ar?.includes(productSearch) || p?.code?.includes(productSearch)
  )

  const selectCustomer = (c: any) => {
    setCustomerId(c.id); setCustomerName(c.name_ar)
    setCustomerSearch(c.name_ar); setCustomerOpen(false)
  }

  const selectProduct = (lineId: string, product: any) => {
    setLines(prev => prev.map(l => {
      if (l._id !== lineId) return l
      return calcLine({
        ...l,
        product_id:   product.id,
        product_name: product.name_ar,
        unit_price:   product.selling_price || 0,
        vat_rate:     product.vat_rate || 15,
        has_recipe:   true
      })
    }))
    setActiveLineId(null); setProductSearch('')
  }

  const updateLine = (id: string, field: keyof SaleLine, value: any) => {
    setLines(prev => prev.map(l => {
      if (l._id !== id) return l
      return calcLine({ ...l, [field]: value })
    }))
  }

  const addLine = () => {
    setLines(prev => [...prev, {
      _id: Date.now().toString(), product_name: '', quantity: 1, unit_price: 0,
      discount_amount: 0, vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0, has_recipe: true
    }])
  }

  const removeLine = (id: string) => {
    if (lines.length <= 1) return toast.error('يجب بقاء سطر واحد على الأقل')
    setLines(prev => prev.filter(l => l._id !== id))
  }

  const subtotal   = lines.reduce((s, l) => s + (l.quantity * l.unit_price - l.discount_amount), 0)
  const totalVat   = lines.reduce((s, l) => s + l.vat_amount, 0)
  const grandTotal = subtotal + totalVat

  const handleSave = async (draft = true) => {
    // فحص المنتجات
    if (lines.some(l => !l.product_name)) return toast.error('يجب تحديد المنتج في جميع الأسطر')
    if (lines.some(l => l.quantity <= 0)) return toast.error('الكميات يجب أن تكون أكبر من صفر')

    // فحص الرسبي
    const noRecipeLines = lines.filter(l => l.product_id && !l.has_recipe)
    if (noRecipeLines.length > 0) {
      return toast.error(`بعض المنتجات ليس لها رسبي معتمد`)
    }

    // فحص طريقة التحصيل
    if (!draft) {
      if (collectionMethod === 'sub_cashbox' && !cashboxId) {
        return toast.error('يجب اختيار الخزينة الفرعية للتحصيل')
      }
      if (collectionMethod === 'bank' && !bankAccountId) {
        return toast.error('يجب اختيار الحساب البنكي')
      }
    }

    setSaving(true)
    try {
      const invoiceData = {
        company_id:      company!.id,
        customer_id:     customerId || null,
        invoice_date:    invoiceDate,
        due_date:        dueDate || null,
        payment_method:  collectionMethod === 'sub_cashbox' ? 'cash' : 'transfer',
        cashbox_id:      collectionMethod === 'sub_cashbox' ? cashboxId || null : null,
        bank_account_id: collectionMethod === 'bank' ? bankAccountId || null : null,
        notes:           notes || null,
        subtotal,
        discount_amount: 0,
        tax_amount:      totalVat,
        total:           grandTotal,
        paid_amount:     draft ? 0 : grandTotal,
        remaining_amount: draft ? grandTotal : 0,
        status:          draft ? 'draft' : 'confirmed',
        user_id:         user?.id,
        updated_at:      new Date().toISOString()
      }

      const itemsData = lines.map(l => ({
        product_id:      l.product_id || null,
        product_name:    l.product_name,
        quantity:        l.quantity,
        unit_price:      l.unit_price,
        discount_amount: l.discount_amount,
        vat_rate:        l.vat_rate,
        vat_amount:      l.vat_amount,
        total:           l.total
      }))

      let invoiceId = id

      if (isEdit) {
        await supabase.from('invoices').update(invoiceData).eq('id', id!)
        await supabase.from('invoice_items').delete().eq('invoice_id', id!)
        await supabase.from('invoice_items').insert(itemsData.map(it => ({ ...it, invoice_id: id! })))
      } else {
        const { data: newInv, error } = await supabase.from('invoices').insert({
          ...invoiceData, invoice_number: invoiceNumber
        }).select('id').single()
        if (error) throw error
        invoiceId = newInv.id
        await supabase.from('invoice_items').insert(itemsData.map(it => ({ ...it, invoice_id: newInv.id })))

        // إذا لم تكن مسودة، اعتمد تلقائياً
        if (!draft) {
          await supabase.rpc('approve_sale', {
            p_invoice_id: newInv.id,
            p_user_id: user!.id
          })

          // تحديث رصيد الخزينة الفرعية
          if (collectionMethod === 'sub_cashbox' && cashboxId) {
            const { data: box } = await supabase.from('cashboxes').select('balance').eq('id', cashboxId).single()
            await supabase.from('cashboxes').update({ balance: (box?.balance || 0) + grandTotal }).eq('id', cashboxId)
          }
        }
      }

      toast.success(draft ? 'تم الحفظ كمسودة' : '✅ تم حفظ الفاتورة والاعتماد')
      navigate(`/sales/${invoiceId}`)
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      <PageHeader
        title={isEdit ? `تعديل فاتورة ${invoiceNumber}` : 'فاتورة مبيعات جديدة'}
        subtitle="إصدار فاتورة مبيعات — المنتجات المسموح ببيعها لديها رسبي معتمد فقط"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/sales')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <ArrowRight size={14} /> رجوع
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              حفظ مسودة
            </button>
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              اعتماد الفاتورة
            </button>
          </div>
        }
      />

      {/* بيانات الفاتورة */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* رقم الفاتورة */}
          <div>
            <label className="block text-sm font-medium mb-1">
              رقم الفاتورة <span className="text-xs text-gray-400">(تلقائي)</span>
            </label>
            <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2">
              <Lock size={14} className="text-gray-400" />
              <span className="font-mono font-bold text-blue-700">{invoiceNumber || '...'}</span>
            </div>
          </div>

          {/* العميل */}
          <div ref={customerRef}>
            <label className="block text-sm font-medium mb-1">العميل</label>
            <div className="relative">
              <div className="flex items-center border rounded-lg px-3 py-2 gap-2 cursor-pointer"
                onClick={() => setCustomerOpen(true)}>
                <Search size={14} className="text-gray-400" />
                <input value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setCustomerOpen(true); if (!e.target.value) { setCustomerId(''); setCustomerName('') } }}
                  className="flex-1 outline-none bg-transparent text-sm" placeholder="ابحث باسم العميل..." />
                <ChevronDown size={14} className="text-gray-400" />
              </div>
              {customerOpen && filteredCustomers.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                  {filteredCustomers.map((c: any) => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full text-right px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 flex justify-between text-sm">
                      <span>{c.name_ar}</span>
                      {c.balance > 0 && <span className="text-red-500 text-xs">{formatCurrency(c.balance)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* التاريخ */}
          <div>
            <label className="block text-sm font-medium mb-1">التاريخ <span className="text-red-500">*</span></label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* طريقة التحصيل */}
          <div>
            <label className="block text-sm font-medium mb-1">
              طريقة التحصيل <span className="text-red-500">*</span>
            </label>
            <select value={collectionMethod} onChange={e => setCollectionMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {COLLECTION_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          {/* الخزينة الفرعية */}
          {collectionMethod === 'sub_cashbox' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                الخزينة الفرعية <span className="text-red-500">*</span>
              </label>
              <select value={cashboxId} onChange={e => setCashboxId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- اختر الخزينة --</option>
                {(subCashboxes as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} ({formatCurrency(c.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* الحساب البنكي */}
          {collectionMethod === 'bank' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                الحساب البنكي <span className="text-red-500">*</span>
              </label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- اختر الحساب --</option>
                {(bankAccounts as any[]).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bank_name} ({b.account_number})</option>
                ))}
              </select>
            </div>
          )}

          <div className="lg:col-span-3">
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
        </div>

        {/* تنبيه: لا يُسمح بالتحصيل على الخزينة الرئيسية */}
        <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle size={14} />
          التحصيل يكون عبر الخزائن الفرعية أو البنك فقط. الخزينة الرئيسية محظورة للمبيعات.
        </div>
      </div>

      {/* جدول الأصناف */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              أصناف الفاتورة ({lines.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              يُعرض فقط المنتجات التي لها رسبي معتمد
            </p>
          </div>
          <button onClick={addLine}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
            <Plus size={14} /> إضافة صنف
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-8">#</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">المنتج</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">الكمية</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">سعر البيع</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">الخصم</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">%ض.ق.م</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">الإجمالي</th>
                <th className="text-center px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((line, idx) => (
                <tr key={line._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-3 py-2 relative">
                    <div className="relative">
                      <input
                        value={activeLineId === line._id ? productSearch : line.product_name}
                        onChange={e => {
                          if (activeLineId !== line._id) setActiveLineId(line._id)
                          setProductSearch(e.target.value)
                          updateLine(line._id, 'product_name', e.target.value)
                        }}
                        onFocus={() => { setActiveLineId(line._id); setProductSearch('') }}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        placeholder="اسم المنتج (برسبي معتمد فقط)..." />

                      {activeLineId === line._id && filteredProducts.length > 0 && (
                        <div className="absolute top-full right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto min-w-[260px]">
                          {filteredProducts.slice(0, 15).map((p: any) => (
                            <button key={p.id} onMouseDown={() => selectProduct(line._id, p)}
                              className="w-full text-right px-3 py-2 hover:bg-blue-50 border-b last:border-0 flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{p?.name_ar}</div>
                                <div className="text-xs text-gray-400">{p?.category?.name_ar}</div>
                              </div>
                              <span className="text-blue-600 text-xs">{formatCurrency(p?.selling_price)}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {activeLineId === line._id && productSearch && filteredProducts.length === 0 && (
                        <div className="absolute top-full right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 p-4 text-center text-sm text-gray-500 min-w-[200px]">
                          لا توجد منتجات بهذا الاسم أو ليس لها رسبي معتمد
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={line.quantity} min="0.001" step="0.001"
                      onChange={e => updateLine(line._id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={line.unit_price} min="0" step="0.01"
                      onChange={e => updateLine(line._id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={line.discount_amount} min="0" step="0.01"
                      onChange={e => updateLine(line._id, 'discount_amount', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={line.vat_rate} min="0" max="100"
                      onChange={e => updateLine(line._id, 'vat_rate', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-blue-700">
                    {formatCurrency(line.total)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => removeLine(line._id)}
                      className="p-1 hover:bg-red-50 rounded text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* الإجماليات */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="max-w-sm mr-auto space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">الإجمالي قبل الضريبة:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">ضريبة القيمة المضافة:</span>
            <span className="text-orange-600">{formatCurrency(totalVat)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-3">
            <span>الإجمالي الكلي:</span>
            <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* شريط الأزرار السفلي */}
      <div className="fixed bottom-0 right-0 left-0 bg-white border-t px-6 py-4 flex justify-between items-center z-40">
        <div className="text-sm text-gray-500">
          {lines.length} صنف | الإجمالي: <span className="font-bold text-blue-700">{formatCurrency(grandTotal)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/sales')} className="px-4 py-2 border rounded-lg text-sm">إلغاء</button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />} مسودة
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            <CheckCircle size={14} /> اعتماد الفاتورة
          </button>
        </div>
      </div>
    </div>
  )
}
