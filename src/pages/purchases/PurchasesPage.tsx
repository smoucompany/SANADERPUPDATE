import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Edit2, Trash2, Filter, RefreshCw } from 'lucide-react'
import { usePurchases, useDeletePurchase } from '@/hooks/usePurchases'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatDate, getPaymentMethodLabel, exportToExcel, today } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { Purchase } from '@/types'

export default function PurchasesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = usePurchases({ search, status, date_from: dateFrom || undefined, date_to: dateTo, page, limit: 20 })
  const deletePurchase = useDeletePurchase()

  const purchases = data?.data || []
  const total = data?.total || 0

  const columns: Column<Purchase>[] = [
    { key: 'purchase_number', label: 'رقم الفاتورة',
      render: v => <span className="font-mono text-primary font-medium text-sm">{String(v)}</span> },
    { key: 'supplier', label: 'المورد', render: (_, row) => <span>{row.supplier?.name_ar || '—'}</span> },
    { key: 'purchase_date', label: 'التاريخ', render: v => <span className="text-muted-foreground">{formatDate(String(v))}</span> },
    { key: 'payment_method', label: 'طريقة الدفع', render: v => <span>{getPaymentMethodLabel(String(v))}</span> },
    { key: 'total', label: 'الإجمالي', render: v => <span className="font-bold">{formatCurrency(Number(v))}</span> },
    { key: 'paid_amount', label: 'المدفوع', render: v => <span className="text-emerald-600">{formatCurrency(Number(v))}</span> },
    { key: 'remaining_amount', label: 'المتبقي', render: v => <span className={Number(v) > 0 ? 'text-orange-500' : 'text-muted-foreground'}>{formatCurrency(Number(v))}</span> },
    { key: 'status', label: 'الحالة', render: v => <StatusBadge status={String(v)} /> },
    { key: 'id', label: 'إجراءات', render: (_, row) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => navigate(`/purchases/${row.id}/edit`)} className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    )}
  ]

  const totalAmount = purchases.reduce((s, p) => s + (p.total || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="فواتير المشتريات"
        subtitle={`${total} فاتورة`}
        actions={
          <>
            <button onClick={() => setShowFilters(!showFilters)} className="btn-outline gap-1.5">
              <Filter className="w-4 h-4" />فلترة
            </button>
            <button onClick={() => exportToExcel(purchases.map(p => ({
              'رقم الفاتورة': p.purchase_number, 'المورد': p.supplier?.name_ar, 'التاريخ': formatDate(p.purchase_date),
              'الإجمالي': p.total, 'الحالة': p.status
            })), 'تقرير-المشتريات')} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير
            </button>
            <button onClick={() => navigate('/purchases/new')} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />فاتورة شراء جديدة
            </button>
          </>
        }
      />

      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="form-label text-xs">من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input h-9 text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input h-9 text-sm" />
          </div>
          <div>
            <label className="form-label text-xs">الحالة</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="form-select h-9 text-sm">
              <option value="">الكل</option>
              <option value="draft">مسودة</option>
              <option value="confirmed">مؤكدة</option>
              <option value="paid">مدفوعة</option>
              <option value="partial">جزئية</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setStatus(''); setDateFrom(''); setDateTo(today()); setSearch('') }}
              className="btn-outline w-full h-9 text-sm gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />إعادة تعيين
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
          <p className="text-lg font-bold mt-1 text-purple-600">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">عدد الفواتير</p>
          <p className="text-lg font-bold mt-1">{total}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">الموردون المختلفون</p>
          <p className="text-lg font-bold mt-1">{new Set(purchases.map(p => p.supplier_id).filter(Boolean)).size}</p>
        </div>
      </div>

      <DataTable
        data={purchases}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="بحث برقم الفاتورة أو المورد..."
        onSearch={setSearch}
        pagination={{ page, limit: 20, total, onPageChange: setPage }}
        emptyMessage="لا توجد فواتير مشتريات"
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف فاتورة الشراء"
        message="هل أنت متأكد من حذف هذه الفاتورة؟"
        onConfirm={async () => { if (deleteId) { await deletePurchase.mutateAsync(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)}
        loading={deletePurchase.isPending}
      />
    </div>
  )
}
