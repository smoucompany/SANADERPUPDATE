import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Save, Loader2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

type AdjItem = {
  id: string
  product_id: string
  name_ar: string
  barcode: string
  system_qty: number
  actual_qty: number | string
  variance: number
  unit: string
}

export default function StockAdjustmentPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [adjDate] = useState(new Date().toISOString().slice(0, 10))

  const { data: items = [], isLoading, refetch } = useQuery<AdjItem[]>({
    queryKey: ['inventory-adjustment', user?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, barcode, stock_quantity, unit:units(name_ar)')
        .eq('company_id', user!.company_id)
        .eq('is_active', true)
        .order('name_ar')
      if (error) throw error
      return (data || []).map((p: any) => ({
        id: p.id,
        product_id: p.id,
        name_ar: p.name_ar,
        barcode: p.barcode || '—',
        system_qty: p.stock_quantity || 0,
        actual_qty: p.stock_quantity || 0,
        variance: 0,
        unit: p.unit?.name_ar || 'قطعة',
      }))
    },
    enabled: !!user
  })

  const [actuals, setActuals] = useState<Record<string, number>>({})

  const setActual = (id: string, val: number) => {
    setActuals(p => ({ ...p, [id]: val }))
  }

  const getVariance = (item: AdjItem) => {
    const actual = actuals[item.id] ?? item.system_qty
    return actual - item.system_qty
  }

  const changedItems = items.filter(i => actuals[i.id] !== undefined && actuals[i.id] !== i.system_qty)
  const filtered = items.filter(i => !search || i.name_ar.includes(search) || i.barcode.includes(search))

  const handleSave = async () => {
    if (changedItems.length === 0) { toast.error('لم تقم بتعديل أي كمية'); return }
    setSaving(true)
    try {
      for (const item of changedItems) {
        await supabase.from('products').update({ stock_quantity: actuals[item.id] }).eq('id', item.id)
      }
      await qc.invalidateQueries({ queryKey: ['inventory-adjustment'] })
      toast.success(`تم تسوية ${changedItems.length} منتج بنجاح`)
      setActuals({})
      setNotes('')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const positiveVariance = changedItems.filter(i => getVariance(i) > 0).length
  const negativeVariance = changedItems.filter(i => getVariance(i) < 0).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="جرد وتسوية المخزون"
        subtitle={`${items.length} منتج • ${adjDate}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="btn-outline gap-1.5">
              <RefreshCw className="w-4 h-4" />تحديث
            </button>
            <button onClick={handleSave} disabled={saving || changedItems.length === 0} className="btn-primary gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التسوية ({changedItems.length})
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xl font-black">{changedItems.length}</p>
            <p className="text-xs text-muted-foreground">أصناف معدّلة</p>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-600">+{positiveVariance}</p>
            <p className="text-xs text-muted-foreground">فائض مخزون</p>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xl font-black text-red-500">-{negativeVariance}</p>
            <p className="text-xs text-muted-foreground">عجز مخزون</p>
          </div>
        </div>
      </div>

      {/* Search & Notes */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="form-input flex-1" placeholder="بحث بالاسم أو الباركود..." />
        <input value={notes} onChange={e => setNotes(e.target.value)}
          className="form-input flex-1" placeholder="ملاحظات التسوية..." />
      </div>

      {/* Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المنتج</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">الباركود</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">الوحدة</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">كمية النظام</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الكمية الفعلية</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الفرق</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-t border-border/40">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-6 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.map(item => {
              const actual = actuals[item.id] ?? item.system_qty
              const variance = actual - item.system_qty
              const changed = actuals[item.id] !== undefined && actuals[item.id] !== item.system_qty

              return (
                <tr key={item.id} className={`border-t border-border/40 hover:bg-muted/20 transition-colors ${changed ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                  <td className="px-5 py-3 font-medium">{item.name_ar}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{item.barcode}</td>
                  <td className="px-5 py-3 text-muted-foreground">{item.unit}</td>
                  <td className="px-5 py-3 text-center font-mono">{item.system_qty}</td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      value={actuals[item.id] ?? item.system_qty}
                      onChange={e => setActual(item.id, +e.target.value)}
                      className={`w-24 mx-auto block form-input text-center font-mono text-sm ${changed ? 'border-amber-400 focus:ring-amber-400/30' : ''}`}
                      dir="ltr" min={0}
                    />
                  </td>
                  <td className="px-5 py-3 text-center">
                    {variance === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={`font-bold ${variance > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {variance > 0 ? '+' : ''}{variance}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>لا توجد منتجات</p>
          </div>
        )}
      </div>
    </div>
  )
}
