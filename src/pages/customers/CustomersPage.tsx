import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Download, Phone, Mail } from 'lucide-react'
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatCurrency, exportToExcel } from '@/lib/utils'
import type { Customer } from '@/types'

export default function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { data: customers = [], isLoading } = useCustomers(search)
  const deleteCustomer = useDeleteCustomer()

  const columns: Column<Customer>[] = [
    { key: 'name_ar', label: 'اسم العميل', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
          {String(v).charAt(0)}
        </div>
        <div>
          <p className="font-medium text-sm">{String(v)}</p>
          {row.code && <p className="text-xs text-muted-foreground">{row.code}</p>}
        </div>
      </div>
    )},
    { key: 'phone', label: 'الجوال', render: v => v ? (
      <a href={`tel:${v}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
        <Phone className="w-3.5 h-3.5" />{String(v)}
      </a>
    ) : <span className="text-muted-foreground">—</span>},
    { key: 'email', label: 'البريد الإلكتروني', render: v => v ? (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{String(v)}</span>
    ) : <span className="text-muted-foreground">—</span>},
    { key: 'city', label: 'المدينة', render: v => <span className="text-sm text-muted-foreground">{String(v || '—')}</span> },
    { key: 'balance', label: 'الرصيد', sortable: true, render: v => (
      <span className={`font-bold text-sm ${Number(v) > 0 ? 'text-orange-500' : 'text-foreground'}`}>
        {formatCurrency(Number(v))}
      </span>
    )},
    { key: 'credit_limit', label: 'حد الائتمان', render: v => <span className="text-sm">{formatCurrency(Number(v))}</span> },
    { key: 'id', label: 'إجراءات', render: (_, row) => (
      <div className="flex gap-1 justify-end">
        <button onClick={() => navigate(`/customers/${row.id}/edit`)} className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    )}
  ]

  const totalBalance = customers.reduce((s, c) => s + c.balance, 0)

  return (
    <div className="space-y-5">
      <PageHeader title="العملاء" subtitle={`${customers.length} عميل`}
        actions={
          <>
            <button onClick={() => exportToExcel(customers.map(c => ({ الاسم: c.name_ar, الجوال: c.phone, البريد: c.email, الرصيد: c.balance })), 'قائمة-العملاء')}
              className="btn-outline gap-1.5 text-sm"><Download className="w-4 h-4" />تصدير</button>
            <button onClick={() => navigate('/customers/new')} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />إضافة عميل
            </button>
          </>
        }
      />
      {totalBalance > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-orange-700 dark:text-orange-400">إجمالي الديون المستحقة من العملاء</p>
          <p className="font-bold text-orange-600">{formatCurrency(totalBalance)}</p>
        </div>
      )}
      <DataTable data={customers} columns={columns} loading={isLoading} searchable
        searchPlaceholder="بحث بالاسم أو الجوال..." onSearch={setSearch} emptyMessage="لا يوجد عملاء" />
      <ConfirmDialog open={!!deleteId} title="حذف العميل" message="هل أنت متأكد من حذف هذا العميل؟"
        onConfirm={async () => { if (deleteId) { await deleteCustomer.mutateAsync(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)} loading={deleteCustomer.isPending} />
    </div>
  )
}
