import { useState } from 'react'
import { Tags, Plus, Edit2, Trash2, Search, ChevronDown, ChevronRight, DollarSign } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PriceList {
  id: string
  name: string
  type: 'retail' | 'wholesale' | 'vip' | 'special'
  currency: string
  discount_pct: number
  customer_count: number
  product_count: number
  is_active: boolean
  is_default: boolean
}

interface PriceItem {
  id: string
  list_id: string
  product: string
  sku: string
  base_price: number
  list_price: number
  min_qty: number
}

const TYPE_LABEL: Record<string, string> = {
  retail: 'تجزئة', wholesale: 'جملة', vip: 'VIP', special: 'خاص'
}
const TYPE_COLOR: Record<string, string> = {
  retail: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  wholesale: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  vip: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  special: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
}


export default function PriceListsPage() {
  const [lists, setLists] = useState<PriceList[]>([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>('1')
  const [modal, setModal] = useState(false)

  const filtered = lists.filter(l => l.name.includes(search) || TYPE_LABEL[l.type].includes(search))

  const toggleDefault = (id: string) => {
    setLists(prev => prev.map(l => ({ ...l, is_default: l.id === id })))
    toast.success('تم تغيير القائمة الافتراضية')
  }

  const toggleActive = (id: string) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, is_active: !l.is_active } : l))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="قوائم الأسعار"
        subtitle={`${lists.length} قوائم أسعار`}
        actions={
          <button onClick={() => setModal(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />قائمة جديدة
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي القوائم',  value: String(lists.length),                                     color: 'apple-blue',   icon: Tags },
          { label: 'القوائم النشطة',  value: String(lists.filter(l => l.is_active).length),              color: 'apple-green',  icon: Tags },
          { label: 'إجمالي العملاء',  value: String(lists.reduce((s, l) => s + l.customer_count, 0)),    color: 'apple-purple', icon: DollarSign },
          { label: 'إجمالي المنتجات', value: String(Math.max(...lists.map(l => l.product_count))),       color: 'apple-orange', icon: DollarSign },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border/60 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className={`icon-badge-sm ${k.color}`}><k.icon className="w-4 h-4 text-white" /></span>
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-xl font-black">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في قوائم الأسعار..." className="form-input pr-9 h-9 text-sm" />
        </div>
      </div>

      {/* Accordion lists */}
      <div className="space-y-3">
        {filtered.map(list => {
          const items: PriceItem[] = []
          const isOpen = expandedId === list.id
          return (
            <div key={list.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              {/* List header */}
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20"
                onClick={() => setExpandedId(isOpen ? null : list.id)}>
                <button className="text-muted-foreground">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 flex items-center gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{list.name}</p>
                      {list.is_default && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full">افتراضي</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {list.customer_count} عميل · {list.product_count} منتج · خصم {list.discount_pct}%
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLOR[list.type]}`}>
                    {TYPE_LABEL[list.type]}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    list.is_active ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-muted-foreground bg-muted'
                  }`}>{list.is_active ? 'نشط' : 'غير نشط'}</span>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {!list.is_default && (
                    <button onClick={() => toggleDefault(list.id)}
                      className="text-xs text-primary hover:underline">
                      جعله افتراضي
                    </button>
                  )}
                  <button onClick={() => toggleActive(list.id)}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                    {list.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button onClick={() => toast.success('تعديل القائمة')} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-primary">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toast.success('حذف القائمة')} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Items */}
              {isOpen && (
                <div className="border-t border-border/50">
                  {items.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">لا توجد أسعار محددة - تُطبَّق نسبة الخصم على الأسعار الأساسية</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">المنتج</th>
                          <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">SKU</th>
                          <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">السعر الأساسي</th>
                          <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">سعر القائمة</th>
                          <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">الحد الأدنى</th>
                          <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">الخصم</th>
                          <th className="px-5 py-2.5 w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => {
                          const disc = Math.round(((item.base_price - item.list_price) / item.base_price) * 100)
                          return (
                            <tr key={item.id} className="border-t border-border/40 hover:bg-muted/20">
                              <td className="px-5 py-2.5 font-medium">{item.product}</td>
                              <td className="px-5 py-2.5 text-center font-mono text-xs text-muted-foreground">{item.sku}</td>
                              <td className="px-5 py-2.5 text-center text-muted-foreground">{formatCurrency(item.base_price)}</td>
                              <td className="px-5 py-2.5 text-center font-bold text-primary">{formatCurrency(item.list_price)}</td>
                              <td className="px-5 py-2.5 text-center">{item.min_qty} قطعة</td>
                              <td className="px-5 py-2.5 text-center">
                                {disc > 0 ? (
                                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                    -{disc}%
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-5 py-2.5 text-center">
                                <button onClick={() => toast.success('تعديل السعر')} className="btn-ghost p-1 rounded-lg text-muted-foreground hover:text-primary">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                  <div className="px-5 py-2 border-t border-border/30 flex justify-end">
                    <button onClick={() => toast.success('إضافة منتج للقائمة')} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" />إضافة منتج
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
