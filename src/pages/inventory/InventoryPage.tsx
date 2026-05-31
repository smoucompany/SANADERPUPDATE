import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useWarehouses } from '@/hooks/useWarehouses'
import PageHeader from '@/components/shared/PageHeader'
import { formatNumber } from '@/lib/utils'
import { Package, AlertTriangle, TrendingDown, ArrowLeftRight, Search, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const qc        = useQueryClient()
  const { data: warehouses = [] } = useWarehouses()

  const [warehouseId, setWarehouseId] = useState('')
  const [search, setSearch]           = useState('')

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ['inventory', user?.company_id, warehouseId],
    queryFn: async () => {
      if (!user?.company_id) return []

      // Always scope to this company's warehouses — prevent data leak
      const companyWarehouseIds = warehouses.map(w => w.id)
      if (companyWarehouseIds.length === 0) return []

      const ids = warehouseId ? [warehouseId] : companyWarehouseIds

      const { data, error } = await supabase
        .from('inventory')
        .select('id, product_id, warehouse_id, quantity, batch_number, expiry_date, updated_at, product:products(name_ar, barcode, min_stock_alert, unit:units(abbreviation)), warehouse:warehouses(name_ar)')
        .in('warehouse_id', ids)
        .gt('quantity', 0)          // فقط الأصناف الموجودة
        .order('updated_at', { ascending: false })
        .limit(1000)                // حد أقصى لمنع التحميل الزائد

      if (error) throw error
      return data || []
    },
    enabled: !!user?.company_id && warehouses.length > 0,
    staleTime: 1000 * 60 * 2,     // 2 دقائق
  })

  const filtered = useMemo(() => {
    if (!search) return inventory
    const q = search.toLowerCase()
    return (inventory as any[]).filter(i =>
      i.product?.name_ar?.toLowerCase().includes(q) ||
      i.product?.barcode?.includes(q)
    )
  }, [inventory, search])

  const stats = useMemo(() => ({
    total:    filtered.length,
    lowStock: (filtered as any[]).filter(i => i.quantity <= (i.product?.min_stock_alert || 0) && i.quantity > 0).length,
    outStock: (inventory as any[]).filter(i => i.quantity <= 0).length,
  }), [filtered, inventory])

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="حركة المخزون"
        subtitle={`${filtered.length} صنف`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/inventory/warehouse-transfer')}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowLeftRight size={15} /> تحويل 1→2
            </button>
            <button onClick={() => navigate('/inventory/warehouse1')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Package size={15} /> مخزن الوارد
            </button>
          </div>
        }
      />

      {/* إحصائيات */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-xs text-gray-500">إجمالي الأصناف</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center cursor-pointer"
          onClick={() => {}}>
          <div className="text-2xl font-bold text-amber-700">{stats.lowStock}</div>
          <div className="text-xs text-gray-500">مخزون منخفض</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.outStock}</div>
          <div className="text-xs text-gray-500">نفذ المخزون</div>
        </div>
      </div>

      {/* فلاتر */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="بحث باسم الصنف أو الباركود..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 pr-9 text-sm w-64" />
          </div>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع المخازن</option>
            {(warehouses as any[]).map(w => (
              <option key={w.id} value={w.id}>{w.name_ar}</option>
            ))}
          </select>
          <button onClick={() => refetch()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
            <RefreshCw size={13} /> تحديث
          </button>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد بيانات مخزون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الصنف</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المخزن</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الدفعة</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الصلاحية</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">الكمية</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(filtered as any[]).map((item: any) => {
                  const isLow  = item.quantity > 0 && item.quantity <= (item.product?.min_stock_alert || 0)
                  const isExp  = item.expiry_date && new Date(item.expiry_date) < new Date()
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${isExp ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.product?.name_ar}</div>
                        {item.product?.barcode && (
                          <div className="text-xs text-gray-400 font-mono">{item.product.barcode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{item.warehouse?.name_ar}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.batch_number || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {item.expiry_date ? (
                          <span className={isExp ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {isExp && <AlertTriangle size={12} className="inline ml-1" />}
                            {new Date(item.expiry_date).toLocaleDateString('ar-SA')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-lg ${
                          item.quantity <= 0 ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          {formatNumber(item.quantity)}
                        </span>
                        {item.product?.unit?.abbreviation && (
                          <span className="text-xs text-gray-400 mr-1">{item.product.unit.abbreviation}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isExp ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">منتهي الصلاحية</span>
                        ) : item.quantity <= 0 ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">نفذ</span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">منخفض</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">متاح</span>
                        )}
                      </td>
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
