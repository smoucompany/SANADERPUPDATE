import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Eye, Printer, CheckCircle2, Clock, XCircle, FileText, Search, Filter } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'مسودة',        color: 'text-muted-foreground bg-muted',                          icon: FileText },
  sent:      { label: 'مُرسَل',        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',            icon: Clock },
  confirmed: { label: 'مُؤكَّد',        color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',         icon: Clock },
  received:  { label: 'مُستلَم',        color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',   icon: CheckCircle2 },
  cancelled: { label: 'ملغي',          color: 'text-red-600 bg-red-100 dark:bg-red-900/30',               icon: XCircle },
}

const MOCK_ORDERS = [
  { id: 'PO-2026-001', supplier: 'مؤسسة الأمل للتوريدات', date: '2026-05-10', expected: '2026-05-20', status: 'received',  total: 45000, items: 8  },
  { id: 'PO-2026-002', supplier: 'شركة النجم التجارية',    date: '2026-05-15', expected: '2026-05-25', status: 'confirmed', total: 28500, items: 5  },
  { id: 'PO-2026-003', supplier: 'مجموعة الخليج',          date: '2026-05-18', expected: '2026-05-28', status: 'sent',      total: 67200, items: 12 },
  { id: 'PO-2026-004', supplier: 'مؤسسة الأمل للتوريدات', date: '2026-05-20', expected: '2026-06-01', status: 'draft',     total: 19800, items: 3  },
  { id: 'PO-2026-005', supplier: 'شركة التقنية الحديثة',   date: '2026-05-22', expected: '2026-06-05', status: 'confirmed', total: 53000, items: 7  },
  { id: 'PO-2026-006', supplier: 'مجموعة الخليج',          date: '2026-05-23', expected: '2026-06-08', status: 'cancelled', total: 12400, items: 2  },
]

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = MOCK_ORDERS.filter(o => {
    const matchSearch = o.id.includes(search) || o.supplier.includes(search)
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total:     MOCK_ORDERS.length,
    confirmed: MOCK_ORDERS.filter(o => o.status === 'confirmed').length,
    received:  MOCK_ORDERS.filter(o => o.status === 'received').length,
    value:     MOCK_ORDERS.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
  }

  const handleConvertToInvoice = (id: string) => {
    toast.success(`تم تحويل ${id} إلى فاتورة شراء`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="أوامر الشراء"
        subtitle={`${MOCK_ORDERS.length} أمر شراء`}
        actions={
          <button onClick={() => toast.success('سيتم إضافة نموذج أمر شراء')} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />أمر شراء جديد
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأوامر',    value: String(stats.total),              color: 'apple-blue',   icon: ShoppingBag },
          { label: 'مؤكدة',             value: String(stats.confirmed),           color: 'apple-orange', icon: Clock },
          { label: 'مستلمة',            value: String(stats.received),            color: 'apple-green',  icon: CheckCircle2 },
          { label: 'إجمالي القيمة',     value: formatCurrency(stats.value),       color: 'apple-purple', icon: FileText },
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

      {/* Filters + Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث في أوامر الشراء..." className="form-input pr-9 h-8 text-sm" />
          </div>
          <div className="flex gap-1.5">
            {[
              { key: 'all',       label: 'الكل' },
              { key: 'draft',     label: 'مسودة' },
              { key: 'sent',      label: 'مُرسَل' },
              { key: 'confirmed', label: 'مُؤكَّد' },
              { key: 'received',  label: 'مُستلَم' },
              { key: 'cancelled', label: 'ملغي' },
            ].map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}>{f.label}</button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">رقم الأمر</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">المورد</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">تاريخ الطلب</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الاستلام المتوقع</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الأصناف</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الإجمالي</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">الحالة</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => {
              const s = STATUS_MAP[order.status]
              const StatusIcon = s.icon
              return (
                <tr key={order.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="px-5 py-3 font-mono font-bold text-primary">{order.id}</td>
                  <td className="px-5 py-3 font-medium">{order.supplier}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{formatDate(order.date)}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{formatDate(order.expected)}</td>
                  <td className="px-5 py-3 text-center">{order.items}</td>
                  <td className="px-5 py-3 text-center font-bold">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
                      <StatusIcon className="w-3 h-3" />{s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => toast.success('عرض أمر الشراء')} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-primary" title="عرض">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => window.print()} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-blue-500" title="طباعة">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {(order.status === 'confirmed' || order.status === 'received') && (
                        <button onClick={() => handleConvertToInvoice(order.id)}
                          className="text-xs text-emerald-600 hover:underline font-medium px-1.5 py-0.5">
                          تحويل لفاتورة
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
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد أوامر شراء</p>
          </div>
        )}
      </div>
    </div>
  )
}
