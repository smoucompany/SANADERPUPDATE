import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Download, Printer, Eye, Edit2, Trash2, Filter, RefreshCw } from 'lucide-react'
import { useInvoices } from '@/hooks/useInvoices'
import { useDeleteInvoice } from '@/hooks/useInvoices'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatDate, getPaymentMethodLabel, exportToExcel } from '@/lib/utils'
import { today } from '@/lib/utils'
import type { Invoice } from '@/types'

export default function SalesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useInvoices({ search, status, date_from: dateFrom || undefined, date_to: dateTo, page, limit: 20 })
  const deleteInvoice = useDeleteInvoice()

  const invoices = data?.data || []
  const total = data?.total || 0

  const columns: Column<Invoice>[] = [
    { key: 'invoice_number', label: 'رقم الفاتورة', sortable: true,
      render: (v) => <span className="font-mono text-primary font-medium text-sm">{String(v)}</span> },
    { key: 'customer', label: 'العميل',
      render: (_, row) => <span>{row.customer?.name_ar || 'عميل نقدي'}</span> },
    { key: 'invoice_date', label: 'التاريخ', sortable: true,
      render: (v) => <span className="text-muted-foreground">{formatDate(String(v))}</span> },
    { key: 'payment_method', label: 'طريقة الدفع',
      render: (v) => <span className="text-sm">{getPaymentMethodLabel(String(v))}</span> },
    { key: 'total', label: 'الإجمالي', sortable: true,
      render: (v) => <span className="font-bold">{formatCurrency(Number(v))}</span> },
    { key: 'paid_amount', label: 'المدفوع',
      render: (v) => <span className="text-emerald-600 font-medium">{formatCurrency(Number(v))}</span> },
    { key: 'remaining_amount', label: 'المتبقي',
      render: (v) => <span className={Number(v) > 0 ? 'text-orange-500 font-medium' : 'text-muted-foreground'}>{formatCurrency(Number(v))}</span> },
    { key: 'status', label: 'الحالة',
      render: (v) => <StatusBadge status={String(v)} /> },
    { key: 'id', label: 'إجراءات',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => navigate(`/sales/${row.id}/edit`)} className="btn-ghost p-1.5 rounded-lg">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button className="btn-ghost p-1.5 rounded-lg"><Printer className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ]

  const handleExport = () => {
    const exportData = invoices.map(inv => ({
      'رقم الفاتورة': inv.invoice_number,
      'العميل': inv.customer?.name_ar || 'عميل نقدي',
      'التاريخ': formatDate(inv.invoice_date),
      'الإجمالي': inv.total,
      'المدفوع': inv.paid_amount,
      'المتبقي': inv.remaining_amount,
      'الحالة': inv.status,
      'طريقة الدفع': getPaymentMethodLabel(inv.payment_method)
    }))
    exportToExcel(exportData, 'تقرير-المبيعات')
  }

  // Summary stats
  const totalSales = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0)
  const totalRemaining = invoices.reduce((s, i) => s + (i.remaining_amount || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="فواتير المبيعات"
        subtitle={`${total} فاتورة`}
        actions={
          <>
            <button onClick={() => setShowFilters(!showFilters)} className="btn-outline gap-1.5">
              <Filter className="w-4 h-4" />{showFilters ? 'إخفاء الفلاتر' : 'فلترة'}
            </button>
            <button onClick={handleExport} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button onClick={() => navigate('/sales/new')} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />فاتورة جديدة
            </button>
          </>
        }
      />

      {/* Filters */}
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
              <option value="cancelled">ملغاة</option>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'إجمالي المبيعات', value: totalSales, color: 'text-blue-600' },
          { label: 'إجمالي المحصّل', value: totalPaid, color: 'text-emerald-600' },
          { label: 'إجمالي الآجل', value: totalRemaining, color: 'text-orange-500' }
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border/60 rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      <DataTable
        data={invoices}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="بحث برقم الفاتورة أو العميل..."
        onSearch={setSearch}
        pagination={{ page, limit: 20, total, onPageChange: setPage }}
        emptyMessage="لا توجد فواتير مبيعات"
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف الفاتورة"
        message="هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={async () => { if (deleteId) { await deleteInvoice.mutateAsync(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)}
        loading={deleteInvoice.isPending}
      />
    </div>
  )
}
