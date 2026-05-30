import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useWarehouses } from '@/hooks/useWarehouses'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import ImportExportModal from '@/components/shared/ImportExportModal'
import { formatNumber, formatDate } from '@/lib/utils'
import { exportInventory, type ImportRow } from '@/lib/importExport'
import { Package, AlertTriangle, TrendingDown, TrendingUp, ArrowLeftRight, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface InventoryItem {
  id: string
  product_id: string
  warehouse_id: string
  quantity: number
  available_quantity: number
  batch_number: string
  expiry_date: string
  updated_at: string
  product: { name_ar: string; barcode: string; min_stock_alert: number; unit: { abbreviation: string } }
  warehouse: { name_ar: string }
}

export default function InventoryPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const { data: warehouses = [] } = useWarehouses()
  const [warehouseId, setWarehouseId] = useState('')
  const [search, setSearch]           = useState('')
  const [showImport, setShowImport]   = useState(false)

  const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', user?.company_id, warehouseId, search],
    queryFn: async () => {
      // Filter by company's warehouses to scope inventory to this company
      const warehouseIds = warehouseId
        ? [warehouseId]
        : (warehouses.map(w => w.id))

      let query = supabase
        .from('inventory')
        .select('*, product:products(name_ar, barcode, min_stock_alert, unit:units(abbreviation)), warehouse:warehouses(name_ar)')
        .order('updated_at', { ascending: false })

      if (warehouseIds.length > 0) {
        query = query.in('warehouse_id', warehouseIds)
      }
      const { data, error } = await query
      if (error) throw error
      let result = data as InventoryItem[]
      if (search) result = result.filter(i => i.product?.name_ar?.includes(search) || i.product?.barcode?.includes(search))
      return result
    },
    enabled: !!user
  })

  // ── Import inventory ──────────────────────────────────────────────────────
  const handleImportInventory = async (rows: ImportRow[]) => {
    if (!user) return
    const defaultWarehouse = warehouses.find(w => w.is_default) || warehouses[0]
    let success = 0

    for (const row of rows) {
      const d = row.data
      // Find product by barcode or name
      let productId: string | undefined
      if (d.barcode) {
        const { data: p } = await supabase.from('products').select('id')
          .eq('company_id', user.company_id).eq('barcode', d.barcode).maybeSingle()
        productId = p?.id
      }
      if (!productId && d.product_name) {
        const { data: p } = await supabase.from('products').select('id')
          .eq('company_id', user.company_id).ilike('name_ar', d.product_name).maybeSingle()
        productId = p?.id
      }
      if (!productId) continue

      // Find warehouse
      let whId = defaultWarehouse?.id
      if (d.warehouse) {
        const wh = warehouses.find(w => w.name_ar === d.warehouse)
        if (wh) whId = wh.id
      }
      if (!whId) continue

      // Upsert inventory
      await supabase.from('inventory').upsert({
        product_id:   productId,
        warehouse_id: whId,
        quantity:     +d.quantity || 0,
        batch_number: d.batch_number || null,
        expiry_date:  d.expiry_date  || null,
      }, { onConflict: 'product_id,warehouse_id,batch_number' })

      // Log movement
      await supabase.from('inventory_movements').insert({
        company_id:     user.company_id,
        product_id:     productId,
        warehouse_id:   whId,
        movement_type:  'adjustment',
        quantity:       +d.quantity || 0,
        cost_price:     +d.cost_price || null,
        user_id:        user.id,
        notes:          'استيراد مخزون من Excel',
      })
      success++
    }

    qc.invalidateQueries({ queryKey: ['inventory'] })
    toast.success(`تم استيراد ${success} سجل مخزون بنجاح`)
  }

  const handleExportInventory = () => {
    if (inventory.length === 0) { toast.error('لا توجد بيانات مخزون للتصدير'); return }
    exportInventory(inventory as unknown as Record<string, unknown>[])
    toast.success(`تم تصدير ${inventory.length} سجل مخزون`)
  }

  const lowStock = inventory.filter(i => i.quantity <= (i.product?.min_stock_alert || 0))
  const totalItems = inventory.length
  const totalValue = inventory.reduce((s, i) => s + i.quantity, 0)

  const columns: Column<InventoryItem>[] = [
    { key: 'product', label: 'المنتج', render: (_, row) => (
      <div className="flex items-center gap-2">
        {row.quantity <= (row.product?.min_stock_alert || 0) && (
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        )}
        <div>
          <p className="font-medium text-sm">{row.product?.name_ar}</p>
          {row.product?.barcode && <p className="text-xs text-muted-foreground font-mono">{row.product.barcode}</p>}
        </div>
      </div>
    )},
    { key: 'warehouse', label: 'المستودع', render: (_, row) => <span className="text-sm text-muted-foreground">{row.warehouse?.name_ar}</span> },
    { key: 'quantity', label: 'الكمية المتاحة', sortable: true, render: (v, row) => (
      <span className={`font-bold text-sm ${Number(v) <= (row.product?.min_stock_alert || 0) ? 'text-orange-500' : 'text-foreground'}`}>
        {formatNumber(Number(v), 3)} {row.product?.unit?.abbreviation || ''}
      </span>
    )},
    { key: 'available_quantity', label: 'الكمية القابلة للبيع', render: v => <span className="text-sm text-emerald-600">{formatNumber(Number(v), 3)}</span> },
    { key: 'batch_number', label: 'رقم الدفعة', render: v => <span className="text-xs font-mono text-muted-foreground">{String(v || '—')}</span> },
    { key: 'expiry_date', label: 'تاريخ الانتهاء', render: v => v ? (
      <span className={`text-xs ${new Date(String(v)) < new Date() ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        {formatDate(String(v))}
      </span>
    ) : <span className="text-muted-foreground">—</span> },
    { key: 'updated_at', label: 'آخر تحديث', render: v => <span className="text-xs text-muted-foreground">{formatDate(String(v))}</span> }
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="حركة المخزون"
        subtitle="متابعة الكميات والمستودعات"
        actions={
          <>
            <button onClick={() => setShowImport(true)} className="btn-outline gap-1.5 text-sm">
              <Upload className="w-4 h-4" />استيراد Excel
            </button>
            <button onClick={handleExportInventory} className="btn-outline gap-1.5 text-sm">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button className="btn-outline gap-1.5 text-sm">
              <ArrowLeftRight className="w-4 h-4" />تحويل مخزون
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">إجمالي الأصناف</p>
          </div>
          <p className="text-xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">منتجات نفد مخزونها</p>
          </div>
          <p className={`text-xl font-bold ${lowStock.length > 0 ? 'text-orange-500' : 'text-foreground'}`}>{lowStock.length}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-muted-foreground">عدد المستودعات</p>
          </div>
          <p className="text-xl font-bold">{warehouses.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="form-select h-9 text-sm w-48">
          <option value="">كل المستودعات</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
        </select>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <h3 className="font-semibold text-orange-700 dark:text-orange-400 text-sm">تنبيه: منتجات نفد مخزونها</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.slice(0, 8).map(item => (
              <span key={item.id} className="px-2.5 py-1 bg-orange-100 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300 rounded-lg text-xs">
                {item.product?.name_ar}: {formatNumber(item.quantity, 2)}
              </span>
            ))}
          </div>
        </div>
      )}

      <DataTable
        data={inventory}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="بحث بالاسم أو الباركود..."
        onSearch={setSearch}
        emptyMessage="لا توجد بيانات مخزون"
      />

      {showImport && (
        <ImportExportModal
          type="inventory"
          onImport={handleImportInventory}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
