import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeftRight, Package, Loader2, Warehouse, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

type TransferItem = { product_name: string; qty: number; unit: string }

const emptyItem = (): TransferItem => ({ product_name: '', qty: 1, unit: 'قطعة' })

const WAREHOUSES = ['المخزن الرئيسي', 'مخزن الفرع الأول', 'مخزن الفرع الثاني', 'مخزن المرتجعات']

const transfers: { id: string; number: string; from: string; to: string; date: string; items: number; status: string }[] = []

export default function StockTransferPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ from: '', to: '', date: new Date().toISOString().slice(0,10), notes: '' })
  const [items, setItems] = useState<TransferItem[]>([emptyItem()])
  const [saving, setSaving] = useState(false)

  const setItem = (i: number, k: keyof TransferItem, v: string | number) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const { data: products = [] } = useQuery<{id:string;name_ar:string}[]>({
    queryKey: ['products-list', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id,name_ar').eq('company_id', user!.company_id).order('name_ar').limit(200)
      return data || []
    },
    enabled: !!user,
  })

  const { data: transfers = [] } = useQuery<any[]>({
    queryKey: ['stock_transfers', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_transfers')
        .select('*, items:stock_transfer_items(count)')
        .eq('company_id', user!.company_id)
        .order('created_at', { ascending: false })
        .limit(50)
      return data || []
    },
    enabled: !!user,
  })

  const handleSave = async () => {
    if (!form.from || !form.to) { toast.error('اختر المخزنين'); return }
    if (form.from === form.to) { toast.error('المخزن المصدر والوجهة مختلفان'); return }
    if (items.some(i => !i.product_name)) { toast.error('أدخل جميع المنتجات'); return }
    setSaving(true)
    try {
      const transferNumber = `TRF-${Date.now().toString().slice(-6)}`
      const { data: transfer, error } = await supabase
        .from('stock_transfers')
        .insert({
          company_id: user!.company_id,
          transfer_number: transferNumber,
          from_warehouse: form.from,
          to_warehouse: form.to,
          transfer_date: form.date,
          notes: form.notes,
          status: 'completed',
          items_count: items.length,
        })
        .select('id')
        .single()
      if (error) throw error

      if (transfer?.id) {
        const itemRows = items.map(it => ({
          transfer_id: transfer.id,
          product_name: it.product_name,
          quantity: it.qty,
          unit: it.unit,
        }))
        const { error: itemsErr } = await supabase.from('stock_transfer_items').insert(itemRows)
        if (itemsErr) throw itemsErr
      }

      toast.success('تم إنشاء أمر التحويل بنجاح')
      qc.invalidateQueries({ queryKey: ['stock_transfers'] })
      setShowForm(false)
      setForm({ from: '', to: '', date: new Date().toISOString().slice(0,10), notes: '' })
      setItems([emptyItem()])
    } catch (e: any) {
      toast.error(e.message || 'خطأ في حفظ أمر التحويل')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="تحويل المخزون"
        subtitle="نقل المخزون بين المستودعات"
        actions={
          <button onClick={() => setShowForm(s => !s)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />تحويل جديد
          </button>
        }
      />

      {/* New Transfer Form */}
      {showForm && (
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-lg">أمر تحويل مخزون جديد</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">من المخزن *</label>
              <select value={form.from} onChange={e => setForm(p=>({...p,from:e.target.value}))} className="form-select">
                <option value="">اختر المخزن المصدر</option>
                {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="flex items-end justify-center pb-1">
              <ArrowLeftRight className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <label className="form-label">إلى المخزن *</label>
              <select value={form.to} onChange={e => setForm(p=>({...p,to:e.target.value}))} className="form-select">
                <option value="">اختر المخزن الوجهة</option>
                {WAREHOUSES.filter(w => w !== form.from).map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">تاريخ التحويل</label>
              <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">ملاحظات</label>
              <input value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} className="form-input" placeholder="سبب التحويل..." />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">المنتجات المحوّلة</h4>
              <button onClick={() => setItems(p => [...p, emptyItem()])} className="btn-outline text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />إضافة منتج
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_80px_32px] gap-2 items-end">
                  <div>
                    {i === 0 && <label className="form-label">المنتج</label>}
                    <select value={item.product_name} onChange={e => setItem(i, 'product_name', e.target.value)} className="form-select">
                      <option value="">اختر المنتج</option>
                      {products.map(p => <option key={p.id} value={p.name_ar}>{p.name_ar}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label className="form-label">الكمية</label>}
                    <input type="number" value={item.qty} onChange={e => setItem(i, 'qty', +e.target.value)}
                      className="form-input" dir="ltr" min={1} />
                  </div>
                  <div>
                    {i === 0 && <label className="form-label">الوحدة</label>}
                    <input value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)} className="form-input" />
                  </div>
                  <button onClick={() => items.length > 1 && setItems(p => p.filter((_,idx) => idx !== i))}
                    className={`p-1.5 rounded-lg text-destructive hover:bg-destructive/10 ${items.length === 1 ? 'opacity-20 cursor-not-allowed' : ''} ${i === 0 ? 'mt-6' : ''}`}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t border-border/40 pt-4">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ أمر التحويل
            </button>
          </div>
        </div>
      )}

      {/* Transfer History */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50">
          <h3 className="font-semibold">سجل التحويلات</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['رقم الأمر','من','إلى','التاريخ','عدد الأصناف','الحالة'].map(h => (
                <th key={h} className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.map((t: any) => (
              <tr key={t.id} className="border-t border-border/40 hover:bg-muted/20">
                <td className="px-5 py-3 font-mono text-primary font-semibold">{t.transfer_number || t.id?.slice(0,8)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                    {t.from_warehouse}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-teal-500" />
                    {t.to_warehouse}
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(t.transfer_date || t.created_at)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    {t.items_count || t.items?.[0]?.count || 0} صنف
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}>
                    {t.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>لا توجد تحويلات بعد</p>
          </div>
        )}
      </div>
    </div>
  )
}
