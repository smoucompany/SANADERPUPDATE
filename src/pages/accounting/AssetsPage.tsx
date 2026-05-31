import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, Car, Monitor, Package, Edit2, Trash2, Loader2, Save, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable, { Column } from '@/components/shared/DataTable'
import toast from 'react-hot-toast'

type Asset = {
  id: string
  name: string
  category: string
  purchase_date: string
  purchase_cost: number
  useful_life: number
  depreciation_method: string
  book_value: number
  accumulated_depreciation: number
  status: 'active' | 'disposed' | 'sold'
}

const CATEGORIES = ['عقارات ومباني','سيارات ومركبات','أجهزة وحواسيب','معدات وآلات','أثاث ومفروشات','أخرى']


const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'عقارات ومباني': Building2,
  'سيارات ومركبات': Car,
  'أجهزة وحواسيب': Monitor,
  default: Package,
}

export default function AssetsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [form, setForm] = useState({ name:'', category:'', purchase_date:'', purchase_cost:'', useful_life:'5', depreciation_method:'القسط الثابت' })

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase.from('assets').select('*').eq('company_id', user.company_id).eq('status', 'active').order('name')
      return (data as Asset[]) || []
    },
    enabled: !!user,
  })

  const filtered = assets.filter(a => !categoryFilter || a.category === categoryFilter)
  const totalCost = assets.reduce((s,a) => s + a.purchase_cost, 0)
  const totalBook = assets.reduce((s,a) => s + a.book_value, 0)
  const totalDepreciation = assets.reduce((s,a) => s + a.accumulated_depreciation, 0)

  const handleSave = async () => {
    if (!form.name || !form.category || !form.purchase_date || !form.purchase_cost) { toast.error('أدخل جميع البيانات المطلوبة'); return }
    setSaving(true)
    try {
      const cost = parseFloat(form.purchase_cost) || 0
      const life = parseInt(form.useful_life) || 5
      const annualDep = cost / life
      const { error } = await supabase.from('assets').insert({
        company_id:               user!.company_id,
        name:                     form.name,
        category:                 form.category,
        purchase_date:            form.purchase_date,
        purchase_cost:            cost,
        useful_life:              life,
        depreciation_method:      form.depreciation_method,
        book_value:               cost,
        accumulated_depreciation: 0,
        status:                   'active',
      })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['assets'] })
      toast.success('تم إضافة الأصل الثابت')
      setShowForm(false)
      setForm({ name:'', category:'', purchase_date:'', purchase_cost:'', useful_life:'5', depreciation_method:'القسط الثابت' })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('assets').update({ status: 'disposed' }).eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ['assets'] })
    toast.success('تم حذف الأصل')
    setDeleteId(null)
  }

  const columns: Column<Asset>[] = [
    { key: 'name', label: 'اسم الأصل', render: (v, row) => {
      const Icon = CATEGORY_ICONS[row.category] || CATEGORY_ICONS.default
      return (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{String(v)}</p>
            <p className="text-xs text-muted-foreground">{row.category}</p>
          </div>
        </div>
      )
    }},
    { key: 'purchase_date', label: 'تاريخ الشراء',
      render: v => <span className="text-sm text-muted-foreground">{formatDate(String(v))}</span> },
    { key: 'purchase_cost', label: 'تكلفة الشراء',
      render: v => <span className="font-medium">{formatCurrency(Number(v))}</span> },
    { key: 'useful_life', label: 'العمر الإنتاجي',
      render: v => <span className="text-sm">{String(v)} سنوات</span> },
    { key: 'accumulated_depreciation', label: 'مجمع الاستهلاك',
      render: v => <span className="text-red-500 font-medium">{formatCurrency(Number(v))}</span> },
    { key: 'book_value', label: 'القيمة الدفترية',
      render: (v, row) => {
        const pct = Math.round((row.book_value / row.purchase_cost) * 100)
        return (
          <div>
            <p className="font-bold">{formatCurrency(Number(v))}</p>
            <div className="w-20 h-1.5 bg-muted rounded-full mt-1">
              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      }
    },
    { key: 'status', label: 'الحالة',
      render: v => <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${v === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-muted text-muted-foreground'}`}>
        {v === 'active' ? 'نشط' : v === 'disposed' ? 'مستبعد' : 'مُباع'}
      </span>
    },
    { key: 'id', label: 'إجراءات', render: (_, row) => (
      <div className="flex gap-1 justify-end">
        <button className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    )}
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="الأصول الثابتة"
        subtitle={`${assets.length} أصل ثابت`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />إضافة أصل
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">إجمالي تكلفة الأصول</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">مجمع الاستهلاك</p>
          <p className="text-2xl font-black text-red-500 mt-1">{formatCurrency(totalDepreciation)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">إجمالي القيمة الدفترية</p>
          <p className="text-2xl font-black text-primary mt-1">{formatCurrency(totalBook)}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{v:'',l:'الكل'}, ...CATEGORIES.map(c => ({v:c,l:c}))].map(opt => (
          <button key={opt.v} onClick={() => setCategoryFilter(opt.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${categoryFilter === opt.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {opt.l}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={false} emptyMessage="لا توجد أصول ثابتة" />

      {/* Add Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إضافة أصل ثابت">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">اسم الأصل *</label>
              <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} className="form-input" placeholder="مثال: سيارة تويوتا 2024" />
            </div>
            <div>
              <label className="form-label">الفئة *</label>
              <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))} className="form-select">
                <option value="">اختر الفئة</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">تاريخ الشراء *</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(p=>({...p,purchase_date:e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">تكلفة الشراء *</label>
              <input type="number" value={form.purchase_cost} onChange={e => setForm(p=>({...p,purchase_cost:e.target.value}))} className="form-input" dir="ltr" min="0" step="0.01" />
            </div>
            <div>
              <label className="form-label">العمر الإنتاجي (سنوات)</label>
              <input type="number" value={form.useful_life} onChange={e => setForm(p=>({...p,useful_life:e.target.value}))} className="form-input" dir="ltr" min="1" />
            </div>
            <div className="col-span-2">
              <label className="form-label">طريقة الاستهلاك</label>
              <select value={form.depreciation_method} onChange={e => setForm(p=>({...p,depreciation_method:e.target.value}))} className="form-select">
                <option>القسط الثابت (Straight-Line)</option>
                <option>القسط المتناقص (Declining Balance)</option>
                <option>وحدات الإنتاج</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}إضافة الأصل
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete}
        title="حذف الأصل الثابت" message="هل أنت متأكد؟ سيتم حذف الأصل وجميع بياناته." />
    </div>
  )
}
