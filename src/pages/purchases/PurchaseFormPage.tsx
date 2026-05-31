import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Trash2, Save, ArrowRight, Loader2,
  Lock, AlertCircle, Calendar, Package, ChevronDown, Search
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'

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
  expiry_date?: string
  batch_number?: string
  unit_name?: string
}

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'نقدي (خزينة رئيسية)', icon: '💵' },
  { value: 'mada',     label: 'بطاقة / فيزا',         icon: '💳' },
  { value: 'transfer', label: 'تحويل بنكي',           icon: '🏦' },
  { value: 'deferred', label: 'آجل (ذمة مورد)',       icon: '📋' },
]

function calcLine(item: LineItem): LineItem {
  const base   = item.quantity * item.unit_price - item.discount_amount
  const vatAmt = base * (item.vat_rate / 100)
  return { ...item, vat_amount: vatAmt, total: base + vatAmt }
}

export default function PurchaseFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = !!id

  const { company, user } = useAuthStore()

  const [supplierId, setSupplierId]         = useState('')
  const [supplierName, setSupplierName]     = useState('')
  const [purchaseDate, setPurchaseDate]     = useState(today())
  const [dueDate, setDueDate]               = useState('')
  const [paymentMethod, setPaymentMethod]   = useState('cash')
  const [bankAccountId, setBankAccountId]   = useState('')
  const [notes, setNotes]                   = useState('')
  const [purchaseNumber, setPurchaseNumber] = useState('')
  const [isLocked, setIsLocked]             = useState(false)
  const [saving, setSaving]                 = useState(false)

  const [items, setItems] = useState<LineItem[]>([{
    _id: Date.now().toString(), product_name: '', quantity: 1, unit_price: 0,
    discount_amount: 0, vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0
  }])

  // Supplier autocomplete
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierOpen, setSupplierOpen]     = useState(false)
  const supplierRef = useRef<HTMLDivElement>(null)

  // Product search per line
  const [activeItemId, setActiveItemId]   = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-active', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('suppliers')
        .select('id, name_ar, balance, phone')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name_ar')
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-purchase', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('products')
        .select('id, name_ar, code, barcode, cost_price, vat_rate, unit:units(name_ar)')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name_ar')
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('bank_accounts')
        .select('id, bank_name, account_number')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!company?.id
  })

  // Generate auto invoice number
  useEffect(() => {
    if (!company?.id || isEdit) return
    supabase.rpc('get_next_document_number', {
      p_company_id: company.id,
      p_type: 'purchase',
      p_prefix: 'PUR'
    }).then(({ data }) => {
      if (data) setPurchaseNumber(data)
    })
  }, [company?.id, isEdit])

  // Load existing purchase for edit
  useEffect(() => {
    if (!id || !company?.id) return
    ;(async () => {
      const { data: p } = await supabase
        .from('purchases')
        .select('*, items:purchase_items(*), supplier:suppliers(name_ar)')
        .eq('id', id)
        .single()
      if (!p) return

      if (p.is_locked) {
        toast.error('هذه الفاتورة مقفلة ولا يمكن تعديلها')
        navigate(`/purchases/${id}`)
        return
      }

      setSupplierId(p.supplier_id || '')
      setSupplierName(p.supplier?.name_ar || '')
      setSupplierSearch(p.supplier?.name_ar || '')
      setPurchaseDate(p.purchase_date)
      setDueDate(p.due_date || '')
      setPaymentMethod(p.payment_method || 'cash')
      setBankAccountId(p.bank_account_id || '')
      setNotes(p.notes || '')
      setPurchaseNumber(p.purchase_number)
      setIsLocked(p.is_locked || false)

      if (p.items?.length > 0) {
        setItems(p.items.map((it: any) => calcLine({
          _id: it.id, product_id: it.product_id, product_name: it.product_name,
          quantity: it.quantity, unit_price: it.unit_price,
          discount_amount: it.discount_amount || 0, vat_rate: it.vat_rate || 0,
          vat_amount: it.vat_amount || 0, total: it.total || 0,
          expiry_date: it.expiry_date || '', batch_number: it.batch_number || '',
          unit_name: it.unit_name || ''
        })))
      }
    })()
  }, [id, company?.id])

  // Close supplier dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setSupplierOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredSuppliers = suppliers.filter((s: any) =>
    s.name_ar.includes(supplierSearch) || supplierSearch === ''
  )

  const selectSupplier = (s: any) => {
    setSupplierId(s.id)
    setSupplierName(s.name_ar)
    setSupplierSearch(s.name_ar)
    setSupplierOpen(false)
  }

  const filteredProducts = (products as any[]).filter((p: any) =>
    p.name_ar.includes(productSearch) || p.code?.includes(productSearch) ||
    p.barcode?.includes(productSearch) || productSearch === ''
  )

  const selectProduct = (itemId: string, product: any) => {
    setItems(prev => prev.map(it => {
      if (it._id !== itemId) return it
      return calcLine({
        ...it,
        product_id: product.id,
        product_name: product.name_ar,
        unit_price: product.cost_price || 0,
        vat_rate: product.vat_rate || 15,
        unit_name: product.unit?.name_ar || ''
      })
    }))
    setActiveItemId(null)
    setProductSearch('')
  }

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(it => {
      if (it._id !== id) return it
      return calcLine({ ...it, [field]: value })
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      _id: Date.now().toString(), product_name: '', quantity: 1, unit_price: 0,
      discount_amount: 0, vat_rate: company?.vat_rate || 15, vat_amount: 0, total: 0
    }])
  }

  const addSameProduct = (item: LineItem) => {
    setItems(prev => [...prev, {
      _id: Date.now().toString(),
      product_id: item.product_id,
      product_name: item.product_name,
      unit_name: item.unit_name,
      quantity: 1, unit_price: item.unit_price,
      discount_amount: 0, vat_rate: item.vat_rate,
      vat_amount: 0, total: 0, expiry_date: '', batch_number: ''
    }])
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return toast.error('يجب أن يكون هناك سطر واحد على الأقل')
    setItems(prev => prev.filter(it => it._id !== id))
  }

  const subtotal   = items.reduce((s, it) => s + (it.quantity * it.unit_price - it.discount_amount), 0)
  const totalVat   = items.reduce((s, it) => s + it.vat_amount, 0)
  const grandTotal = subtotal + totalVat

  const handleSave = async (draft = true) => {
    // Validation
    if (!supplierId) return toast.error('يجب اختيار مورد')
    if (items.some(it => !it.product_name)) return toast.error('يجب إدخال اسم المنتج في جميع الأسطر')
    if (items.some(it => it.quantity <= 0)) return toast.error('الكمية يجب أن تكون أكبر من صفر')

    setSaving(true)
    try {
      const purchaseData = {
        company_id:     company!.id,
        supplier_id:    supplierId,
        purchase_date:  purchaseDate,
        due_date:       dueDate || null,
        payment_method: paymentMethod,
        bank_account_id: paymentMethod === 'transfer' || paymentMethod === 'mada' ? bankAccountId || null : null,
        notes,
        subtotal,
        discount_amount: 0,
        tax_amount: totalVat,
        total: grandTotal,
        paid_amount:     draft ? 0 : grandTotal,
        remaining_amount: draft ? grandTotal : 0,
        status: draft ? 'draft' : 'confirmed',
        user_id: user?.id,
        updated_at: new Date().toISOString()
      }

      const itemsData = items.map(it => ({
        product_id: it.product_id || null,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_amount: it.discount_amount,
        vat_rate: it.vat_rate,
        vat_amount: it.vat_amount,
        total: it.total,
        expiry_date: it.expiry_date || null,
        batch_number: it.batch_number || null,
        unit_name: it.unit_name || null
      }))

      let purchaseId = id

      if (isEdit) {
        await supabase.from('purchases').update(purchaseData).eq('id', id!)
        await supabase.from('purchase_items').delete().eq('purchase_id', id!)
        await supabase.from('purchase_items').insert(itemsData.map(it => ({ ...it, purchase_id: id! })))
      } else {
        const { data: newP, error } = await supabase.from('purchases').insert({
          ...purchaseData,
          purchase_number: purchaseNumber
        }).select('id').single()

        if (error) throw error
        purchaseId = newP.id
        await supabase.from('purchase_items').insert(itemsData.map(it => ({ ...it, purchase_id: newP.id })))
      }

      toast.success(draft ? 'تم الحفظ كمسودة' : 'تم الحفظ')
      navigate(`/purchases/${purchaseId}`)
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  if (isLocked) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="text-center">
          <Lock size={48} className="mx-auto text-amber-400 mb-3" />
          <p className="text-gray-600">هذه الفاتورة مقفلة ولا يمكن تعديلها</p>
          <button onClick={() => navigate(`/purchases/${id}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            عرض الفاتورة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      <PageHeader
        title={isEdit ? `تعديل فاتورة ${purchaseNumber}` : 'فاتورة مشتريات جديدة'}
        subtitle="إدخال بيانات الفاتورة والأصناف"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/purchases')}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowRight size={15} /> رجوع
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              حفظ كمسودة
            </button>
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              حفظ
            </button>
          </div>
        }
      />

      {/* بيانات الفاتورة الرئيسية */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* رقم الفاتورة (للقراءة فقط) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رقم الفاتورة
              <span className="mr-1 text-xs text-gray-400">(تلقائي - لا يمكن تعديله)</span>
            </label>
            <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2">
              <Lock size={14} className="text-gray-400" />
              <span className="font-mono font-bold text-blue-700">{purchaseNumber || '...'}</span>
            </div>
          </div>

          {/* المورد */}
          <div className="lg:col-span-2" ref={supplierRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المورد <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className={`flex items-center border rounded-lg px-3 py-2 gap-2 cursor-pointer ${
                !supplierId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`} onClick={() => setSupplierOpen(true)}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={supplierSearch}
                  onChange={e => { setSupplierSearch(e.target.value); setSupplierOpen(true); if (!e.target.value) { setSupplierId(''); setSupplierName('') } }}
                  className="flex-1 outline-none bg-transparent text-sm"
                  placeholder="ابحث باسم المورد..."
                />
                <ChevronDown size={14} className="text-gray-400" />
              </div>

              {supplierOpen && filteredSuppliers.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {filteredSuppliers.map((s: any) => (
                    <button key={s.id} onClick={() => selectSupplier(s)}
                      className="w-full text-right px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 flex items-center justify-between">
                      <span className="font-medium text-sm">{s.name_ar}</span>
                      {s.balance > 0 && (
                        <span className="text-xs text-red-500">مديونية: {formatCurrency(s.balance)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!supplierId && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> اختيار المورد إلزامي
              </p>
            )}
          </div>

          {/* التاريخ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تاريخ الفاتورة <span className="text-red-500">*</span>
            </label>
            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* تاريخ الاستحقاق */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* طريقة الدفع */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              طريقة الدفع <span className="text-red-500">*</span>
            </label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          {/* الحساب البنكي */}
          {(paymentMethod === 'transfer' || paymentMethod === 'mada') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الحساب البنكي <span className="text-red-500">*</span>
              </label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">-- اختر الحساب البنكي --</option>
                {(bankAccounts as any[]).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name} {b.account_number ? `(${b.account_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ملاحظات */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
        </div>

        {/* معلومة طريقة الدفع */}
        {paymentMethod === 'cash' && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
            <Lock size={14} />
            السداد النقدي يخصم من الخزينة الرئيسية فقط عند الاعتماد
          </div>
        )}
        {paymentMethod === 'deferred' && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 flex items-center gap-2">
            <AlertCircle size={14} />
            الدفع الآجل يُضاف لذمة المورد ويتطلب إيصال سداد لاحقاً
          </div>
        )}
      </div>

      {/* جدول الأصناف */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            الأصناف ({items.length})
          </h3>
          <button onClick={addItem}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> إضافة صنف
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-8">#</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 min-w-[200px]">الصنف</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">تاريخ الصلاحية</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">رقم الدفعة</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">الكمية</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">سعر الوحدة</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">الخصم</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-20">%ض.ق.م</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600 w-24">الإجمالي</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600 w-20">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 text-center">{idx + 1}</td>

                  {/* الصنف مع بحث */}
                  <td className="px-3 py-2 relative">
                    <div className="relative">
                      <input
                        value={activeItemId === item._id ? productSearch : item.product_name}
                        onChange={e => {
                          if (activeItemId !== item._id) setActiveItemId(item._id)
                          setProductSearch(e.target.value)
                          updateItem(item._id, 'product_name', e.target.value)
                        }}
                        onFocus={() => { setActiveItemId(item._id); setProductSearch('') }}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        placeholder="اسم الصنف أو الباركود..."
                      />
                      {activeItemId === item._id && filteredProducts.length > 0 && (
                        <div className="absolute top-full right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto min-w-[280px]">
                          {filteredProducts.slice(0, 20).map((p: any) => (
                            <button key={p.id} onMouseDown={() => selectProduct(item._id, p)}
                              className="w-full text-right px-3 py-2 hover:bg-blue-50 border-b last:border-0 flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{p.name_ar}</div>
                                <div className="text-xs text-gray-400">{p.code}</div>
                              </div>
                              <div className="text-xs text-blue-600">{formatCurrency(p.cost_price)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.unit_name && (
                      <span className="text-xs text-gray-400 mt-0.5 block">{item.unit_name}</span>
                    )}
                  </td>

                  {/* تاريخ الصلاحية */}
                  <td className="px-3 py-2">
                    <input type="date" value={item.expiry_date || ''}
                      onChange={e => updateItem(item._id, 'expiry_date', e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm" />
                  </td>

                  {/* رقم الدفعة */}
                  <td className="px-3 py-2">
                    <input value={item.batch_number || ''}
                      onChange={e => updateItem(item._id, 'batch_number', e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                      placeholder="اختياري" />
                  </td>

                  {/* الكمية */}
                  <td className="px-3 py-2">
                    <input type="number" value={item.quantity} min="0.001" step="0.001"
                      onChange={e => updateItem(item._id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>

                  {/* السعر */}
                  <td className="px-3 py-2">
                    <input type="number" value={item.unit_price} min="0" step="0.01"
                      onChange={e => updateItem(item._id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>

                  {/* الخصم */}
                  <td className="px-3 py-2">
                    <input type="number" value={item.discount_amount} min="0" step="0.01"
                      onChange={e => updateItem(item._id, 'discount_amount', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>

                  {/* ض.ق.م */}
                  <td className="px-3 py-2">
                    <input type="number" value={item.vat_rate} min="0" max="100" step="0.5"
                      onChange={e => updateItem(item._id, 'vat_rate', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1.5 text-sm text-center" />
                  </td>

                  {/* الإجمالي */}
                  <td className="px-3 py-2 text-right font-medium text-blue-700">
                    {formatCurrency(item.total)}
                  </td>

                  {/* إجراءات */}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => addSameProduct(item)} title="إضافة نفس الصنف بدفعة مختلفة"
                        className="p-1 hover:bg-green-50 rounded text-green-600 text-xs">
                        <Plus size={13} />
                      </button>
                      <button onClick={() => removeItem(item._id)} title="حذف السطر"
                        className="p-1 hover:bg-red-50 rounded text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ملخص الإجماليات */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="max-w-sm mr-auto space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">الإجمالي قبل الضريبة:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">ضريبة القيمة المضافة:</span>
            <span className="font-medium text-orange-600">{formatCurrency(totalVat)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-3">
            <span>الإجمالي الكلي:</span>
            <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* أزرار الحفظ */}
      <div className="fixed bottom-0 right-0 left-0 bg-white border-t px-6 py-4 flex items-center justify-between z-40">
        <div className="text-sm text-gray-500">
          {items.length} صنف | إجمالي: <span className="font-bold text-blue-700">{formatCurrency(grandTotal)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/purchases')}
            className="px-5 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
            إلغاء
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="px-5 py-2.5 border border-gray-400 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            حفظ كمسودة
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <Save size={14} />
            حفظ الفاتورة
          </button>
        </div>
      </div>
    </div>
  )
}
