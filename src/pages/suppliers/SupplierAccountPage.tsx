import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Printer, Download, ArrowRight } from 'lucide-react'
import { useSupplierAccount } from '@/hooks/useSupplierModule'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate, exportToExcel, printElement } from '@/lib/utils'
import type { SupplierStatementRow } from '@/hooks/useSupplierModule'
import type { Purchase, Payment } from '@/types'

export default function SupplierAccountPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { data, isLoading } = useSupplierAccount(id)

  const statementRows = useMemo(() => data?.statementRows || [], [data])

  const handleExportExcel = () => {
    if (!data?.supplier) return
    exportToExcel(statementRows.map(row => ({
      التاريخ: formatDate(row.date),
      المرجع: row.reference,
      البيان: row.description,
      مدين: row.debit,
      دائن: row.credit,
      الرصيد: row.balance
    })), `كشف-حساب-${data.supplier.name_ar}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={data?.supplier?.name_ar || 'حساب المورد'}
        subtitle={data?.supplier?.tax_number ? `الرقم الضريبي ${data.supplier.tax_number}` : 'تفاصيل المورد وبيان الحساب'}
        actions={
          <>
            <button onClick={() => navigate('/suppliers')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={handleExportExcel} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button type="button" onClick={() => printElement('supplier-statement')} className="btn-primary gap-1.5">
              <Printer className="w-4 h-4" />طباعة الكشف
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        <div className="space-y-5">
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <h3 className="font-semibold mb-4">بيانات المورد</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div><span className="font-medium text-foreground">الكود:</span> {data?.supplier?.code || '—'}</div>
              <div><span className="font-medium text-foreground">الهاتف:</span> {data?.supplier?.phone || '—'}</div>
              <div><span className="font-medium text-foreground">البريد:</span> {data?.supplier?.email || '—'}</div>
              <div><span className="font-medium text-foreground">المدينة:</span> {data?.supplier?.city || '—'}</div>
              <div><span className="font-medium text-foreground">العنوان:</span> {data?.supplier?.address || '—'}</div>
              <div><span className="font-medium text-foreground">الحالة:</span> <StatusBadge status={data?.supplier?.is_active ? 'active' : 'suspended'} /></div>
              <div><span className="font-medium text-foreground">حد الائتمان:</span> {formatCurrency(Number(data?.supplier?.credit_limit || 0))}</div>
              <div><span className="font-medium text-foreground">أيام الدفع:</span> {data?.supplier?.payment_days || 0} يوم</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{formatCurrency(data?.totalPurchases || 0)}</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <p className="text-xs text-muted-foreground">إجمالي المدفوع</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(data?.totalPayments || 0)}</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <p className="text-xs text-muted-foreground">الرصيد المستحق</p>
              <p className="text-2xl font-bold text-orange-500 mt-2">{formatCurrency(data?.outstandingPayable || 0)}</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <p className="text-xs text-muted-foreground">رصيد المورد</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(Number(data?.supplier?.balance || 0))}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden" id="supplier-statement">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold">كشف حساب المورد</h3>
                <p className="text-xs text-muted-foreground">عرض تاريخي لحركات المورد والمدين والدائن.</p>
              </div>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-2">التاريخ</th>
                    <th className="text-right p-2">المرجع</th>
                    <th className="text-right p-2">البيان</th>
                    <th className="text-right p-2">مدين</th>
                    <th className="text-right p-2">دائن</th>
                    <th className="text-right p-2">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {statementRows.map(row => (
                    <tr key={row.id} className="border-b border-border/50 last:border-0">
                      <td className="text-right p-2 text-xs text-muted-foreground">{formatDate(row.date)}</td>
                      <td className="text-right p-2 text-xs">{row.reference}</td>
                      <td className="text-right p-2 text-xs">{row.description}</td>
                      <td className="text-right p-2 font-medium text-emerald-600">{row.debit ? formatCurrency(row.debit) : '-'}</td>
                      <td className="text-right p-2 font-medium text-red-500">{row.credit ? formatCurrency(row.credit) : '-'}</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(row.balance)}</td>
                    </tr>
                  ))}
                  {statementRows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد حركات</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <h3 className="font-semibold mb-4">سجل الفواتير</h3>
              <DataTable
                data={data?.purchases || []}
                columns={[
                  { key: 'purchase_number', label: 'الفاتورة' },
                  { key: 'purchase_date', label: 'التاريخ', render: v => formatDate(String(v)) },
                  { key: 'total', label: 'الإجمالي', render: v => formatCurrency(Number(v || 0)) },
                  { key: 'remaining_amount', label: 'المتبقي', render: v => formatCurrency(Number(v || 0)) },
                  { key: 'status', label: 'الحالة', render: v => <StatusBadge status={String(v || 'draft')} /> }
                ] as Column<Purchase>[]}
                loading={isLoading}
                searchable={false}
                emptyMessage="لا توجد فواتير"
              />
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <h3 className="font-semibold mb-4">سجل السندات</h3>
              <DataTable
                data={data?.payments || []}
                columns={[
                  { key: 'payment_number', label: 'السند' },
                  { key: 'payment_date', label: 'التاريخ', render: v => formatDate(String(v)) },
                  { key: 'amount', label: 'المبلغ', render: v => formatCurrency(Number(v || 0)) },
                  { key: 'method', label: 'الطريقة' },
                  { key: 'reference', label: 'المرجع' }
                ] as Column<Payment>[]}
                loading={isLoading}
                searchable={false}
                emptyMessage="لا توجد سندات"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
