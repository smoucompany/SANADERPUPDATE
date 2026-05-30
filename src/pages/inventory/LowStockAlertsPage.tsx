import { useState } from 'react'
import { AlertTriangle, Package, ShoppingBag, Search, RefreshCw, TrendingDown } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AlertItem {
  id: string
  name: string
  sku: string
  category: string
  current_stock: number
  min_stock: number
  reorder_qty: number
  unit: string
  cost: number
  supplier: string
  level: 'critical' | 'low' | 'warning'
}

const MOCK_ALERTS: AlertItem[] = [
  { id: '1', name: 'شاشة Samsung 27"',           sku: 'MON-SAM-27',  category: 'شاشات',       current_stock: 0,  min_stock: 5,  reorder_qty: 10, unit: 'قطعة', cost: 850,  supplier: 'مؤسسة التقنية', level: 'critical' },
  { id: '2', name: 'كابل HDMI 2.0',              sku: 'CBL-HDMI-20', category: 'كابلات',       current_stock: 2,  min_stock: 20, reorder_qty: 50, unit: 'قطعة', cost: 15,   supplier: 'شركة الكابلات',  level: 'critical' },
  { id: '3', name: 'ذاكرة RAM 16GB DDR5',        sku: 'RAM-16-DDR5',  category: 'ذاكرة',        current_stock: 3,  min_stock: 10, reorder_qty: 20, unit: 'قطعة', cost: 380,  supplier: 'مؤسسة التقنية', level: 'critical' },
  { id: '4', name: 'قرص SSD 1TB NVMe',           sku: 'SSD-1T-NVM',  category: 'تخزين',        current_stock: 4,  min_stock: 8,  reorder_qty: 15, unit: 'قطعة', cost: 420,  supplier: 'شركة النجم',     level: 'low' },
  { id: '5', name: 'لوحة مفاتيح ميكانيكية',       sku: 'KBD-MEC-01',  category: 'ملحقات',       current_stock: 6,  min_stock: 10, reorder_qty: 20, unit: 'قطعة', cost: 280,  supplier: 'شركة الخليج',    level: 'low' },
  { id: '6', name: 'ماوس لاسلكي Logitech',        sku: 'MOU-LOG-WL',  category: 'ملحقات',       current_stock: 8,  min_stock: 15, reorder_qty: 25, unit: 'قطعة', cost: 120,  supplier: 'شركة الخليج',    level: 'low' },
  { id: '7', name: 'طابعة HP LaserJet',           sku: 'PRT-HP-LJ',   category: 'طابعات',       current_stock: 2,  min_stock: 3,  reorder_qty: 5,  unit: 'قطعة', cost: 1200, supplier: 'مؤسسة HP',       level: 'warning' },
  { id: '8', name: 'حبر طابعة أسود',              sku: 'INK-BLK-001', category: 'مستلزمات',     current_stock: 5,  min_stock: 10, reorder_qty: 30, unit: 'علبة', cost: 65,   supplier: 'مؤسسة HP',       level: 'warning' },
  { id: '9', name: 'ورق A4 500 ورقة',             sku: 'PAP-A4-500',  category: 'قرطاسية',      current_stock: 3,  min_stock: 5,  reorder_qty: 20, unit: 'رزمة', cost: 25,   supplier: 'شركة الورق',     level: 'warning' },
]

const LEVEL_CONFIG = {
  critical: { label: 'حرج',    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',       bar: 'bg-red-500',     dot: 'bg-red-500' },
  low:      { label: 'منخفض',  color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', bar: 'bg-amber-500',   dot: 'bg-amber-500' },
  warning:  { label: 'تحذير',  color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',    bar: 'bg-blue-500',    dot: 'bg-blue-500' },
}

export default function LowStockAlertsPage() {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'critical' | 'low' | 'warning'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = MOCK_ALERTS.filter(a => {
    const matchSearch = a.name.includes(search) || a.sku.includes(search) || a.category.includes(search)
    const matchLevel  = levelFilter === 'all' || a.level === levelFilter
    return matchSearch && matchLevel
  })

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleOrder = (ids: string[]) => {
    toast.success(`تم إنشاء طلب شراء لـ ${ids.length} منتج`)
    setSelected(new Set())
  }

  const critical = MOCK_ALERTS.filter(a => a.level === 'critical').length
  const low      = MOCK_ALERTS.filter(a => a.level === 'low').length
  const warning  = MOCK_ALERTS.filter(a => a.level === 'warning').length
  const reorderValue = MOCK_ALERTS.reduce((s, a) => s + a.cost * a.reorder_qty, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="تنبيهات المخزون المنخفض"
        subtitle={`${MOCK_ALERTS.length} منتج يحتاج إعادة طلب`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => toast.success('جاري تحديث بيانات المخزون...')} className="btn-outline gap-1.5">
              <RefreshCw className="w-4 h-4" />تحديث
            </button>
            {selected.size > 0 && (
              <button onClick={() => handleOrder(Array.from(selected))} className="btn-primary gap-1.5">
                <ShoppingBag className="w-4 h-4" />طلب شراء ({selected.size})
              </button>
            )}
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'مخزون حرج (صفر أو أقل)', value: critical,                    color: 'apple-red',    icon: AlertTriangle },
          { label: 'مخزون منخفض',             value: low,                         color: 'apple-orange', icon: TrendingDown },
          { label: 'تحذير مخزون',              value: warning,                     color: 'apple-blue',   icon: Package },
          { label: 'تكلفة إعادة الطلب',        value: formatCurrency(reorderValue), color: 'apple-purple', icon: ShoppingBag },
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

      {/* Filters */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث..." className="form-input pr-9 h-8 text-sm" />
          </div>
          <div className="flex gap-1.5">
            {([['all','الكل'],['critical','حرج'],['low','منخفض'],['warning','تحذير']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setLevelFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  levelFilter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}>{label}</button>
            ))}
          </div>
          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground mr-auto">تم تحديد {selected.size} منتج</span>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-5 py-3 w-10">
                <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(a => a.id)) : new Set())}
                  checked={selected.size === filtered.length && filtered.length > 0} className="rounded" />
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المنتج</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">SKU</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">المخزون الحالي</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الحد الأدنى</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">كمية الطلب</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">تكلفة الطلب</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المورد</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">المستوى</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const lvl = LEVEL_CONFIG[item.level]
              const pct = item.min_stock > 0 ? Math.min(Math.round((item.current_stock / item.min_stock) * 100), 100) : 0
              return (
                <tr key={item.id} className={`border-t border-border/40 hover:bg-muted/20 ${selected.has(item.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-5 py-3">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" />
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </td>
                  <td className="px-5 py-3 text-center font-mono text-xs text-muted-foreground">{item.sku}</td>
                  <td className="px-5 py-3 text-center">
                    <div>
                      <p className={`font-bold ${item.current_stock === 0 ? 'text-red-500' : ''}`}>
                        {item.current_stock} {item.unit}
                      </p>
                      <div className="w-16 h-1 bg-muted rounded-full mx-auto mt-1">
                        <div className={`h-full rounded-full ${lvl.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{item.min_stock}</td>
                  <td className="px-5 py-3 text-center font-medium">{item.reorder_qty}</td>
                  <td className="px-5 py-3 text-center font-medium">{formatCurrency(item.cost * item.reorder_qty)}</td>
                  <td className="px-5 py-3 text-sm">{item.supplier}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${lvl.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${lvl.dot}`} />
                      {lvl.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد تنبيهات مخزون</p>
          </div>
        )}
      </div>
    </div>
  )
}
