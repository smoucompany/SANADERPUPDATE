import { useState } from 'react'
import { Tags, Plus, Edit2, Trash2, Search, DollarSign } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ExpenseCategory {
  id: string
  name: string
  name_en: string
  color: string
  budget_monthly: number
  spent_monthly: number
  count: number
  is_active: boolean
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'
]

const MOCK_CATEGORIES: ExpenseCategory[] = [
  { id: '1', name: 'إيجارات',          name_en: 'Rent',           color: '#3B82F6', budget_monthly: 15000, spent_monthly: 15000, count: 3,  is_active: true },
  { id: '2', name: 'رواتب',            name_en: 'Salaries',       color: '#10B981', budget_monthly: 80000, spent_monthly: 75000, count: 12, is_active: true },
  { id: '3', name: 'مرافق',            name_en: 'Utilities',      color: '#F59E0B', budget_monthly: 5000,  spent_monthly: 3200,  count: 6,  is_active: true },
  { id: '4', name: 'تسويق وإعلان',     name_en: 'Marketing',      color: '#EF4444', budget_monthly: 10000, spent_monthly: 8500,  count: 8,  is_active: true },
  { id: '5', name: 'صيانة وإصلاح',     name_en: 'Maintenance',    color: '#8B5CF6', budget_monthly: 3000,  spent_monthly: 1200,  count: 4,  is_active: true },
  { id: '6', name: 'سفر وانتقالات',    name_en: 'Travel',         color: '#EC4899', budget_monthly: 2000,  spent_monthly: 950,   count: 5,  is_active: true },
  { id: '7', name: 'قرطاسية ومستلزمات',name_en: 'Stationery',     color: '#06B6D4', budget_monthly: 500,   spent_monthly: 320,   count: 7,  is_active: true },
  { id: '8', name: 'خدمات مهنية',      name_en: 'Professional',   color: '#F97316', budget_monthly: 5000,  spent_monthly: 4500,  count: 2,  is_active: true },
  { id: '9', name: 'بنك ورسوم',        name_en: 'Bank Fees',      color: '#6366F1', budget_monthly: 800,   spent_monthly: 640,   count: 9,  is_active: false },
]

function CategoryModal({ category, onSave, onClose }: {
  category: Partial<ExpenseCategory> | null
  onSave: (cat: Partial<ExpenseCategory>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<ExpenseCategory>>(category || { color: COLORS[0], is_active: true })
  const set = (k: keyof ExpenseCategory, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base">{category?.id ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl text-muted-foreground">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">اسم التصنيف (عربي) <span className="text-red-500">*</span></label>
            <input className="form-input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="مثال: إيجارات" />
          </div>
          <div>
            <label className="form-label">اسم التصنيف (إنجليزي)</label>
            <input className="form-input" value={form.name_en || ''} onChange={e => set('name_en', e.target.value)} placeholder="e.g. Rent" />
          </div>
          <div>
            <label className="form-label">الميزانية الشهرية</label>
            <input type="number" className="form-input" value={form.budget_monthly || ''} onChange={e => set('budget_monthly', +e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="form-label">اللون</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-border scale-110' : ''}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="form-label mb-0">نشط</label>
            <button onClick={() => set('is_active', !form.is_active)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_active ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button onClick={() => { if (form.name) { onSave(form); onClose() } }} className="btn-primary">حفظ</button>
        </div>
      </div>
    </div>
  )
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState(MOCK_CATEGORIES)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Partial<ExpenseCategory> | null | false>(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = categories.filter(c =>
    c.name.includes(search) || c.name_en.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (form: Partial<ExpenseCategory>) => {
    if (form.id) {
      setCategories(prev => prev.map(c => c.id === form.id ? { ...c, ...form } : c))
      toast.success('تم تعديل التصنيف')
    } else {
      setCategories(prev => [...prev, { ...form, id: String(Date.now()), count: 0, spent_monthly: 0 } as ExpenseCategory])
      toast.success('تم إضافة التصنيف')
    }
  }

  const handleDelete = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    toast.success('تم حذف التصنيف')
    setDeleteId(null)
  }

  const totalBudget = categories.reduce((s, c) => s + c.budget_monthly, 0)
  const totalSpent  = categories.reduce((s, c) => s + c.spent_monthly, 0)

  return (
    <div className="space-y-5">
      {modal !== false && (
        <CategoryModal
          category={modal}
          onSave={handleSave}
          onClose={() => setModal(false)}
        />
      )}

      <PageHeader
        title="تصنيفات المصروفات"
        subtitle={`${categories.length} تصنيف`}
        actions={
          <button onClick={() => setModal({})} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />إضافة تصنيف
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي التصنيفات', value: String(categories.length), icon: Tags, color: 'apple-blue' },
          { label: 'التصنيفات النشطة', value: String(categories.filter(c => c.is_active).length), icon: Tags, color: 'apple-green' },
          { label: 'الميزانية الشهرية', value: formatCurrency(totalBudget), icon: DollarSign, color: 'apple-purple' },
          { label: 'المنصرف هذا الشهر', value: formatCurrency(totalSpent), icon: DollarSign, color: 'apple-orange' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border/60 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className={`icon-badge-sm ${kpi.color}`}><kpi.icon className="w-4 h-4 text-white" /></span>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-xl font-black">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث في التصنيفات..." className="form-input pr-9 h-8 text-sm" />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">التصنيف</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">عدد المصروفات</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الميزانية الشهرية</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">المنصرف</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">نسبة الإنفاق</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الحالة</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(cat => {
              const pct = cat.budget_monthly > 0 ? Math.round((cat.spent_monthly / cat.budget_monthly) * 100) : 0
              const over = pct > 100
              return (
                <tr key={cat.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div>
                        <p className="font-semibold">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.name_en}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">{cat.count}</td>
                  <td className="px-5 py-3 text-center">{formatCurrency(cat.budget_monthly)}</td>
                  <td className="px-5 py-3 text-center font-medium">{formatCurrency(cat.spent_monthly)}</td>
                  <td className="px-5 py-3">
                    <div className="max-w-[120px] mx-auto">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={over ? 'text-red-500 font-bold' : 'text-muted-foreground'}>{pct}%</span>
                        {over && <span className="text-red-500 text-[10px]">تجاوز</span>}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: over ? '#EF4444' : cat.color }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      cat.is_active
                        ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30'
                        : 'text-muted-foreground bg-muted'
                    }`}>{cat.is_active ? 'نشط' : 'غير نشط'}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setModal(cat)} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-primary">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {deleteId === cat.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-500 hover:underline">تأكيد</button>
                          <button onClick={() => setDeleteId(null)} className="text-xs text-muted-foreground hover:underline">إلغاء</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(cat.id)} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Tags className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد تصنيفات</p>
          </div>
        )}
      </div>
    </div>
  )
}
