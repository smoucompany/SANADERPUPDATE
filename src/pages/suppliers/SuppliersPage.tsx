import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Phone, Eye, DollarSign, ShoppingCart, Printer, Download } from 'lucide-react'
import { useSuppliers, useDeleteSupplier } from '@/hooks/useSuppliers'
import { useSupplierDashboardStats } from '@/hooks/useSupplierModule'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, exportToExcel } from '@/lib/utils'
import type { Supplier } from '@/types'

export default function SuppliersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { data: suppliers = [], isLoading } = useSuppliers(search)
  const { data: stats, isLoading: statsLoading } = useSupplierDashboardStats(search)
  const deleteSupplier = useDeleteSupplier()

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      if (statusFilter === 'active' && !supplier.is_active) return false
      if (statusFilter === 'suspended' && supplier.is_active) return false
      return true
    })
  }, [suppliers, statusFilter])

  const columns: Column<Supplier>[] = [
    { key: 'code', label: 'الكود', render: v => <span className="text-sm font-medium text-muted-foreground">{String(v || '—')}</span> },
    { key: 'name_ar', label: 'اسم المورد', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold shrink-0">
          {String(v).charAt(0)}
        </div>
        <div><p className="font-medium text-sm">{String(v)}</p>{row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}</div>
      </div>
    )},
    { key: 'phone', label: 'الجوال', render: v => v ? <a href={`tel:${v}`} className="flex items-center gap-1.5 text-sm text-primary"><Phone className="w-3.5 h-3.5" />{String(v)}</a> : <span className="text-muted-foreground">—</span> },
    { key: 'tax_number', label: 'الرقم الضريبي', render: v => <span className="text-xs font-mono text-muted-foreground">{String(v || '—')}</span> },
    { key: 'balance', label: 'الرصيد', render: v => <span className={`font-bold text-sm ${Number(v) > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>{formatCurrency(Number(v || 0))}</span> },
    { key: 'balance', label: 'المدفوعات', render: v => <span className="text-sm">{formatCurrency(Math.max(Number(v || 0), 0))}</span> },
    { key: 'balance', label: 'المستحقات', render: v => <span className="text-sm">{formatCurrency(Math.max(-(Number(v || 0)), 0))}</span> },
    { key: 'updated_at', label: 'آخر حركة', render: v => <span className="text-sm text-muted-foreground">{v ? formatDate(String(v)) : '—'}</span> },
    { key: 'is_active', label: 'الحالة', render: v => <StatusBadge status={v ? 'active' : 'suspended'} /> },
    { key: 'id', label: 'إجراءات', render: (_, row) => (
      <div className="flex flex-wrap gap-1 justify-end">
        <button onClick={() => navigate(`/suppliers/${row.id}`)} className="btn-ghost p-1.5 rounded-lg" title="عرض الحساب"><Eye className="w-3.5 h-3.5" /></button>
        <button onClick={() => navigate(`/suppliers/${row.id}/edit`)} className="btn-ghost p-1.5 rounded-lg" title="تعديل المورد"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={() => navigate(`/suppliers/payments`)} className="btn-ghost p-1.5 rounded-lg" title="إضافة سداد"><DollarSign className="w-3.5 h-3.5" /></button>
      </div>
    )}
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="الموردون"
        subtitle="لوحة تحكم الموردين الكاملة مع تتبع الرصيد، التحليلات، والحركات المالية"
        actions={
          <button onClick={() => navigate('/suppliers/new')} className="btn-primary gap-1.5"><Plus className="w-4 h-4" />إضافة مورد</button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">إجمالي أرصدة الموردين</p>
          <p className="text-2xl font-bold mt-3">{formatCurrency(stats?.totalSupplierBalance || 0)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">إجمالي المدفوعات</p>
          <p className="text-2xl font-bold mt-3">{formatCurrency(stats?.totalPayables || 0)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">الإلتزامات الحالية</p>
          <p className="text-2xl font-bold mt-3">{formatCurrency(stats?.currentMonthDue || 0)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">الرصيد المستحق</p>
          <p className="text-2xl font-bold mt-3">{formatCurrency(stats?.totalReceivables || 0)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">الموردون النشطون</p>
          <p className="text-2xl font-bold mt-3">{stats?.totalActiveSuppliers || 0}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-sm text-muted-foreground">المدفوعات المتأخرة</p>
          <p className="text-2xl font-bold mt-3">{formatCurrency(stats?.overduePayables || 0)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">قائمة الموردين</h2>
              <p className="text-xs text-muted-foreground">ابحث وفرز الموردين وإدارة حساباتهم بسرعة.</p>
            </div>
            <button onClick={() => exportToExcel(filteredSuppliers.map(s => ({
              'الكود': s.code,
              'المورد': s.name_ar,
              'الهاتف': s.phone,
              'الرقم الضريبي': s.tax_number,
              'الرصيد': s.balance,
              'الحالة': s.is_active ? 'نشط' : 'موقوف'
            })), 'قائمة-الموردين')} className="btn-outline gap-1.5 text-xs">
              <Download className="w-4 h-4" />تصدير القائمة
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div>
              <label className="form-label">حالة المورد</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="form-select">
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="suspended">موقوف</option>
              </select>
            </div>
          </div>
          <DataTable
            data={filteredSuppliers}
            columns={columns}
            loading={isLoading || statsLoading}
            searchable
            searchPlaceholder="بحث بالاسم أو الكود..."
            onSearch={setSearch}
            emptyMessage="لا يوجد موردون"
          />
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-5">
          <h3 className="font-semibold mb-4">آخر الحركات</h3>
          <div className="space-y-3">
            {stats?.recentTransactions.map(tx => (
              <div key={tx.id} className="rounded-2xl border border-border/50 p-4 text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-medium">{tx.supplier_name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span>{tx.description}</span>
                  <span className="font-semibold">{formatCurrency(tx.amount)}</span>
                </div>
              </div>
            ))}
            {stats?.recentTransactions.length === 0 && <p className="text-sm text-muted-foreground">لا توجد معاملات حديثة.</p>}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المورد"
        message="هل أنت متأكد من حذف هذا المورد؟"
        onConfirm={async () => { if (deleteId) { await deleteSupplier.mutateAsync(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)}
        loading={deleteSupplier.isPending}
      />
    </div>
  )
}
