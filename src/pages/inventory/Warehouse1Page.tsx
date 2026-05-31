import { useState, useMemo } from 'react'
import { Package, Search, Download, AlertTriangle, RefreshCw, Warehouse } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import { useQuery } from '@tanstack/react-query'

export default function Warehouse1Page() {
  const { company } = useAuthStore()
  const [search, setSearch]             = useState('')
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [filterLow, setFilterLow]       = useState(false)

  const { data: batches = [], isLoading, refetch } = useQuery({
    queryKey: ['warehouse1-report', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase.rpc('get_warehouse1_report', {
        p_company_id: company.id,
        p_product_id: null
      })
      if (error) {
        // Fallback: query directly
        const { data: w } = await supabase
          .from('warehouses')
          .select('id')
          .eq('company_id', company.id)
          .eq('warehouse_role', 'incoming')
          .is('deleted_at', null)
          .limit(1)
          .single()

        if (!w?.id) return []

        const { data: batches2 } = await supabase
          .from('inventory_batches')
          .select('*, product:products(name_ar, code), supplier:suppliers(name_ar)')
          .eq('company_id', company.id)
          .eq('warehouse_id', w.id)
          .order('receipt_date', { ascending: false })
        return (batches2 || []).map(b => ({
          ...b,
          product_name: b.product?.name_ar,
          product_code: b.product?.code,
          supplier_name: b.supplier?.name_ar
        }))
      }
      return data || []
    },
    enabled: !!company?.id
  })

  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const filtered = useMemo(() => {
    let result = batches as any[]
    if (search) {
      result = result.filter(b =>
        b.product_name?.includes(search) || b.product_code?.includes(search) ||
        b.batch_number?.includes(search) || b.purchase_number?.includes(search)
      )
    }
    if (filterExpiring) {
      result = result.filter(b =>
        b.expiry_date && new Date(b.expiry_date) <= thirtyDaysLater
      )
    }
    if (filterLow) {
      result = result.filter(b => b.quantity_remaining <= 0)
    }
    return result
  }, [batches, search, filterExpiring, filterLow])

  const summary = useMemo(() => ({
    totalBatches: filtered.length,
    totalQuantity: filtered.reduce((s, b) => s + (b.quantity_remaining || 0), 0),
    totalCost:    filtered.reduce((s, b) => s + (b.total_cost || b.quantity_remaining * b.cost_price || 0), 0),
    expiringSoon: (batches as any[]).filter(b => b.expiry_date && new Date(b.expiry_date) <= thirtyDaysLater && b.quantity_remaining > 0).length,
    expired:      (batches as any[]).filter(b => b.expiry_date && new Date(b.expiry_date) < now && b.quantity_remaining > 0).length,
  }), [filtered, batches])

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = filtered.map(b => ({
      'المنتج':          b.product_name || '',
      'الكود':           b.product_code || '',
      'رقم الدفعة':     b.batch_number || '',
      'رقم الفاتورة':   b.purchase_number || '',
      'المورد':          b.supplier_name || '',
      'الكمية الواردة':  b.quantity_in,
      'الكمية الصادرة':  b.quantity_out,
      'الكمية المتبقية': b.quantity_remaining,
      'سعر التكلفة':    b.cost_price,
      'إجمالي التكلفة':  b.total_cost || b.quantity_remaining * b.cost_price,
      'تاريخ الصلاحية': b.expiry_date ? formatDate(b.expiry_date) : '',
      'تاريخ الاستلام':  formatDate(b.receipt_date),
      'نشطة':            b.is_active ? 'نعم' : 'لا',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'مخزن الوارد')
    XLSX.writeFile(wb, `warehouse1_report_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تقرير مخزن الوارد (المخزن 1)"
        subtitle="جميع الدفعات الواردة مع تواريخ الصلاحية"
        actions={
          <div className="flex gap-2">
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <RefreshCw size={14} /> تحديث
            </button>
          </div>
        }
      />

      {/* ملخص */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{summary.totalBatches}</div>
          <div className="text-xs text-gray-500 mt-1">إجمالي الدفعات</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{summary.totalQuantity.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">الكمية المتبقية</div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-purple-700">{formatCurrency(summary.totalCost)}</div>
          <div className="text-xs text-gray-500 mt-1">إجمالي التكلفة</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center cursor-pointer"
          onClick={() => setFilterExpiring(!filterExpiring)}>
          <div className="text-2xl font-bold text-amber-700">{summary.expiringSoon}</div>
          <div className="text-xs text-gray-500 mt-1">تنتهي خلال 30 يوم</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{summary.expired}</div>
          <div className="text-xs text-gray-500 mt-1">منتهية الصلاحية</div>
        </div>
      </div>

      {/* فلاتر */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="بحث بالمنتج أو الدفعة..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 pr-9 text-sm w-56" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={filterExpiring}
              onChange={e => setFilterExpiring(e.target.checked)} />
            <span className="text-amber-600">منتهية الصلاحية قريباً</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={filterLow}
              onChange={e => setFilterLow(e.target.checked)} />
            <span className="text-red-600">نفذت الكمية</span>
          </label>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Warehouse size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد دفعات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المنتج</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الدفعة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">فاتورة الشراء</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المورد</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">الوارد</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">الصادر</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">المتبقي</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">التكلفة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الصلاحية</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((b, i) => {
                  const isExpired  = b.expiry_date && new Date(b.expiry_date) < now
                  const isExpiring = b.expiry_date && new Date(b.expiry_date) <= thirtyDaysLater && !isExpired
                  return (
                    <tr key={b.id || i} className={`hover:bg-gray-50 ${!b.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.product_name}</div>
                        <div className="text-xs text-gray-400">{b.product_code}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.batch_number || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-700">{b.purchase_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{b.supplier_name || '—'}</td>
                      <td className="px-4 py-3 text-center text-blue-600">{b.quantity_in}</td>
                      <td className="px-4 py-3 text-center text-red-500">{b.quantity_out}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${b.quantity_remaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {b.quantity_remaining}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left">{formatCurrency(b.cost_price)}</td>
                      <td className="px-4 py-3 text-right">
                        {b.expiry_date ? (
                          <span className={`flex items-center gap-1 justify-end text-xs ${
                            isExpired ? 'text-red-600 font-bold' : isExpiring ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {(isExpired || isExpiring) && <AlertTriangle size={12} />}
                            {formatDate(b.expiry_date)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">{formatDate(b.receipt_date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
