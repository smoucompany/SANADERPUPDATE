import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Save, ArrowRight, ArrowLeftRight,
  Package, RefreshCw, Search, Loader2, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface TransferLine {
  _id: string
  batch_id: string
  product_id: string
  product_name: string
  batch_number: string
  expiry_date: string
  available_qty: number
  cost_price: number
  quantity: number
}

export default function WarehouseTransferPage() {
  const navigate = useNavigate()
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [transferDate, setTransferDate] = useState(today())
  const [notes, setNotes]               = useState('')
  const [lines, setLines]               = useState<TransferLine[]>([])
  const [saving, setSaving]             = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)

  // تاريخ التحويلات السابقة
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [histSearch, setHistSearch] = useState('')

  const { data: wh1Batches = [], refetch: refetchBatches } = useQuery({
    queryKey: ['wh1-batches', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data: wh } = await supabase.from('warehouses')
        .select('id').eq('company_id', company.id).eq('warehouse_role', 'incoming')
        .is('deleted_at', null).limit(1).single()
      if (!wh?.id) return []

      const { data } = await supabase.from('inventory_batches')
        .select('*, product:products(id, name_ar, code)')
        .eq('company_id', company.id)
        .eq('warehouse_id', wh.id)
        .gt('quantity_remaining', 0)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true, nullsFirst: false })
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: transfers = [], isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['warehouse-transfers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase
        .from('warehouse_transfers')
        .select('*, items:warehouse_transfer_items(*, product:products(name_ar)), from_wh:warehouses!from_warehouse_id(name_ar), to_wh:warehouses!to_warehouse_id(name_ar)')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('transfer_date', { ascending: false })
      return data || []
    },
    enabled: !!company?.id
  })

  const uniqueProducts = useMemo(() => {
    const map = new Map<string, { id: string; name_ar: string; code: string; batches: any[] }>()
    for (const b of wh1Batches as any[]) {
      if (!map.has(b.product_id)) {
        map.set(b.product_id, {
          id: b.product_id, name_ar: b.product?.name_ar, code: b.product?.code, batches: []
        })
      }
      map.get(b.product_id)!.batches.push(b)
    }
    return Array.from(map.values()).filter(p =>
      !productSearch || p.name_ar?.includes(productSearch) || p.code?.includes(productSearch)
    )
  }, [wh1Batches, productSearch])

  const addProduct = (product: any) => {
    // إضافة أول دفعة متاحة FIFO
    const fifo = (wh1Batches as any[])
      .filter(b => b.product_id === product.id && b.quantity_remaining > 0)
      .sort((a, b) => {
        if (a.receipt_date && b.receipt_date) return a.receipt_date.localeCompare(b.receipt_date)
        return 0
      })

    if (fifo.length === 0) return toast.error('لا توجد كميات متاحة لهذا المنتج')

    const batch = fifo[0]
    setLines(prev => [...prev, {
      _id: Date.now().toString(),
      batch_id: batch.id,
      product_id: product.id,
      product_name: product.name_ar,
      batch_number: batch.batch_number || '',
      expiry_date: batch.expiry_date || '',
      available_qty: batch.quantity_remaining,
      cost_price: batch.cost_price || 0,
      quantity: 1
    }])
    setShowProductSearch(false)
    setProductSearch('')
  }

  const updateQty = (id: string, qty: number) => {
    setLines(prev => prev.map(l => {
      if (l._id !== id) return l
      if (qty > l.available_qty) {
        toast.error(`الكمية المتاحة: ${l.available_qty}`)
        return { ...l, quantity: l.available_qty }
      }
      return { ...l, quantity: qty }
    }))
  }

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l._id !== id))

  const handleSave = async () => {
    if (lines.length === 0) return toast.error('يجب إضافة صنف واحد على الأقل')
    if (lines.some(l => l.quantity <= 0)) return toast.error('جميع الكميات يجب أن تكون أكبر من صفر')

    setSaving(true)
    try {
      // جلب المخازن
      const { data: warehouses } = await supabase.from('warehouses')
        .select('id, warehouse_role')
        .eq('company_id', company!.id)
        .is('deleted_at', null)

      const wh1 = warehouses?.find(w => w.warehouse_role === 'incoming')
      const wh2 = warehouses?.find(w => w.warehouse_role === 'operations')

      if (!wh1 || !wh2) return toast.error('لم يتم العثور على المخازن المطلوبة')

      // رقم التحويل
      const { data: transferNum } = await supabase.rpc('get_next_document_number', {
        p_company_id: company!.id, p_type: 'wh_transfer', p_prefix: 'WHT'
      })

      // إنشاء مستند التحويل
      const { data: transfer, error } = await supabase.from('warehouse_transfers').insert({
        company_id:        company!.id,
        transfer_number:   transferNum || `WHT-${Date.now()}`,
        transfer_date:     transferDate,
        from_warehouse_id: wh1.id,
        to_warehouse_id:   wh2.id,
        user_id:           user?.id,
        status:            'confirmed',
        notes:             notes || null,
        total_cost:        lines.reduce((s, l) => s + l.quantity * l.cost_price, 0)
      }).select('id').single()

      if (error) throw error

      // إضافة أسطر التحويل
      await supabase.from('warehouse_transfer_items').insert(
        lines.map(l => ({
          transfer_id:  transfer.id,
          product_id:   l.product_id,
          product_name: l.product_name,
          batch_id:     l.batch_id,
          quantity:     l.quantity,
          unit_cost:    l.cost_price,
          total_cost:   l.quantity * l.cost_price,
          expiry_date:  l.expiry_date || null
        }))
      )

      // تنفيذ التحويل FIFO
      await supabase.rpc('transfer_warehouse_fifo', { p_transfer_id: transfer.id })

      toast.success('✅ تم تحويل الأصناف من المخزن 1 إلى المخزن 2 بنظام FIFO')
      setLines([])
      setNotes('')
      refetchBatches()
      refetchHistory()
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setTab('history')
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحويل')
    } finally {
      setSaving(false)
    }
  }

  const filteredHistory = useMemo(() =>
    (transfers as any[]).filter(t =>
      !histSearch || t.transfer_number?.includes(histSearch)
    ), [transfers, histSearch])

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تحويل المخزن: الوارد ← التشغيل"
        subtitle="تحويل الأصناف من مخزن الوارد (1) إلى مخزن التشغيل (2) بنظام FIFO"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/inventory')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowRight size={14} /> رجوع
            </button>
          </div>
        }
      />

      {/* تبويبات */}
      <div className="flex gap-1 border-b">
        <button onClick={() => setTab('new')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'new' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          تحويل جديد
        </button>
        <button onClick={() => setTab('history')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          سجل التحويلات ({transfers.length})
        </button>
      </div>

      {tab === 'new' ? (
        <div className="space-y-5">
          {/* بيانات التحويل */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ التحويل</label>
                <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>

            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
              <ArrowLeftRight size={14} />
              التحويل يطبق FIFO — يُخصم من أقدم الدفعات أولاً وأقربها للانتهاء
            </div>
          </div>

          {/* الأصناف */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                أصناف التحويل ({lines.length})
              </h3>
              <button onClick={() => setShowProductSearch(!showProductSearch)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus size={14} /> إضافة صنف
              </button>
            </div>

            {/* بحث المنتج */}
            {showProductSearch && (
              <div className="p-4 border-b bg-blue-50">
                <div className="relative mb-3">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input placeholder="بحث في مخزن الوارد..." value={productSearch}
                    onChange={e => setProductSearch(e.target.value)} autoFocus
                    className="w-full border rounded-lg px-3 py-2 pr-9 text-sm" />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {uniqueProducts.length === 0 ? (
                    <p className="text-center text-gray-400 py-4 text-sm">لا توجد أصناف متاحة</p>
                  ) : uniqueProducts.slice(0, 20).map(p => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className="w-full text-right px-3 py-2 bg-white rounded-lg border hover:border-blue-300 flex items-center justify-between text-sm">
                      <span className="font-medium">{p.name_ar}</span>
                      <span className="text-xs text-gray-400">{p.batches.length} دفعة — كمية: {p.batches.reduce((s, b) => s + b.quantity_remaining, 0)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                أضف أصناف من مخزن الوارد للتحويل إلى مخزن التشغيل
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">المنتج</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الدفعة</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">الصلاحية</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">المتاح</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">الكمية المحولة</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">التكلفة</th>
                    <th className="text-center px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map(l => (
                    <tr key={l._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{l.product_name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{l.batch_number || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {l.expiry_date ? (
                          <span className={new Date(l.expiry_date) < new Date() ? 'text-red-600' : 'text-green-600'}>
                            {formatDate(l.expiry_date)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{l.available_qty}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" value={l.quantity} min="0.001" max={l.available_qty} step="0.001"
                          onChange={e => updateQty(l._id, parseFloat(e.target.value) || 0)}
                          className="border rounded px-2 py-1 w-24 text-center text-sm" />
                      </td>
                      <td className="px-4 py-3 text-left text-blue-600">
                        {formatCurrency(l.quantity * l.cost_price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => removeLine(l._id)}
                          className="p-1 hover:bg-red-50 rounded text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {lines.length > 0 && (
              <div className="border-t p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  إجمالي التكلفة: <span className="font-bold text-blue-700">
                    {formatCurrency(lines.reduce((s, l) => s + l.quantity * l.cost_price, 0))}
                  </span>
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  تأكيد التحويل (FIFO)
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* سجل التحويلات */
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="بحث برقم التحويل..." value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pr-9 text-sm" />
            </div>
          </div>
          {loadingHistory ? (
            <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-400">لا توجد تحويلات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">رقم التحويل</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">من</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">إلى</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">الأصناف</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">إجمالي التكلفة</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredHistory.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-blue-700">{t.transfer_number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(t.transfer_date)}</td>
                      <td className="px-4 py-3">{t.from_wh?.name_ar}</td>
                      <td className="px-4 py-3 text-green-700">{t.to_wh?.name_ar}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {t.items?.length || 0} صنف
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left font-medium">{formatCurrency(t.total_cost)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
