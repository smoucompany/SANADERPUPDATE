import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Package, Download, Upload, ToggleLeft, ToggleRight } from 'lucide-react'
import { useProducts, useDeleteProduct, useUpdateProduct, useCreateProduct } from '@/hooks/useProducts'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImportExportModal from '@/components/shared/ImportExportModal'
import { formatCurrency } from '@/lib/utils'
import { exportProducts, type ImportRow } from '@/lib/importExport'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const { data: products = [], isLoading } = useProducts({ search })
  const deleteProduct  = useDeleteProduct()
  const updateProduct  = useUpdateProduct()
  const createProduct  = useCreateProduct()

  // ── Import handler ──────────────────────────────────────────────────────────
  const handleImport = async (rows: ImportRow[]) => {
    if (!user) return

    // Load categories and units for mapping
    const [{ data: cats }, { data: units }] = await Promise.all([
      supabase.from('categories').select('id,name_ar').eq('company_id', user.company_id),
      supabase.from('units').select('id,name_ar').eq('company_id', user.company_id),
    ])

    const catMap  = new Map((cats  || []).map(c => [c.name_ar, c.id]))
    const unitMap = new Map((units || []).map(u => [u.name_ar, u.id]))

    const toBool = (v: string) => ['نعم','yes','true','1'].includes(v?.toLowerCase?.() || '')

    let success = 0, failed = 0
    for (const row of rows) {
      const d = row.data
      try {
        await createProduct.mutateAsync({
          name_ar:           d.name_ar,
          name_en:           d.name_en     || undefined,
          code:              d.code        || undefined,
          barcode:           d.barcode     || undefined,
          category_id:       catMap.get(d.category) || undefined,
          unit_id:           unitMap.get(d.unit)    || undefined,
          cost_price:        +d.cost_price     || 0,
          selling_price:     +d.selling_price  || 0,
          min_selling_price: +d.min_selling_price || 0,
          vat_rate:          +d.vat_rate      || 15,
          track_inventory:   d.track_inventory ? toBool(d.track_inventory) : true,
          min_stock_alert:   +d.min_stock_alert || 0,
          is_service:        d.is_service ? toBool(d.is_service) : false,
          description:       d.description  || undefined,
          notes:             d.notes        || undefined,
          is_active:         true,
        })
        success++
      } catch { failed++ }
    }

    qc.invalidateQueries({ queryKey: ['products'] })
    if (failed > 0) toast.error(`تم استيراد ${success} منتج، فشل ${failed}`)
    else toast.success(`تم استيراد ${success} منتج بنجاح`)
  }

  // ── Export handler ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (products.length === 0) { toast.error('لا توجد منتجات للتصدير'); return }
    exportProducts(products as unknown as Record<string, unknown>[])
    toast.success(`تم تصدير ${products.length} منتج`)
  }

  const columns: Column<Product>[] = [
    { key: 'name_ar', label: 'المنتج', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {row.image_url
            ? <img src={row.image_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
            : <Package className="w-4 h-4 text-primary" />}
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">{String(v)}</p>
          {row.barcode && <p className="text-xs text-muted-foreground font-mono">{row.barcode}</p>}
        </div>
      </div>
    )},
    { key: 'category',      label: 'التصنيف',    render: (_, row) => <span className="text-sm text-muted-foreground">{row.category?.name_ar || '—'}</span> },
    { key: 'code',          label: 'الكود',       render: v => <span className="font-mono text-xs text-muted-foreground">{String(v || '—')}</span> },
    { key: 'cost_price',    label: 'سعر التكلفة', render: v => <span className="text-sm">{formatCurrency(Number(v))}</span> },
    { key: 'selling_price', label: 'سعر البيع',   sortable: true, render: v => <span className="font-bold text-primary">{formatCurrency(Number(v))}</span> },
    { key: 'vat_rate',      label: 'ض.ق.م',       render: v => <span className="text-sm text-muted-foreground">{Number(v)}%</span> },
    { key: 'is_active', label: 'الحالة', render: (v, row) => (
      <button onClick={() => updateProduct.mutate({ id: row.id, is_active: !v })}
        className={`flex items-center gap-1.5 text-xs font-medium ${v ? 'text-emerald-600' : 'text-muted-foreground'}`}>
        {v ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        {v ? 'نشط' : 'غير نشط'}
      </button>
    )},
    { key: 'id', label: 'إجراءات', render: (_, row) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => navigate(`/products/${row.id}/edit`)} className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    )}
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="المنتجات"
        subtitle={`${products.length} منتج`}
        actions={
          <>
            <button onClick={() => setShowImport(true)} className="btn-outline gap-1.5 text-sm">
              <Upload className="w-4 h-4" />استيراد Excel
            </button>
            <button onClick={handleExport} className="btn-outline gap-1.5 text-sm">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button onClick={() => navigate('/categories')} className="btn-outline gap-1.5 text-sm">التصنيفات</button>
            <button onClick={() => navigate('/products/new')} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />إضافة منتج
            </button>
          </>
        }
      />

      <DataTable
        data={products}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="بحث بالاسم أو الباركود أو الكود..."
        onSearch={setSearch}
        emptyMessage="لا توجد منتجات"
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المنتج"
        message="هل أنت متأكد من حذف هذا المنتج؟"
        onConfirm={async () => { if (deleteId) { await deleteProduct.mutateAsync(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)}
        loading={deleteProduct.isPending}
      />

      {showImport && (
        <ImportExportModal
          type="products"
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
