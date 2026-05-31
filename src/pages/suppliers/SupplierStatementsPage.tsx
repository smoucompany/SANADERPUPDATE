import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Printer, FileText, ArrowRight } from 'lucide-react'
import { useSupplierAccount } from '@/hooks/useSupplierModule'
import { useSuppliers } from '@/hooks/useSuppliers'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import { formatCurrency, formatDate, exportToExcel, printElement } from '@/lib/utils'
import type { SupplierStatementRow } from '@/hooks/useSupplierModule'
import type { Purchase, Payment } from '@/types'

export default function SupplierStatementsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlSupplierId = searchParams.get('supplierId') || ''
  const { data: suppliers = [] } = useSuppliers()
  const [supplierId, setSupplierId] = useState(urlSupplierId)
  const { data, isLoading } = useSupplierAccount(supplierId)
  const statementRows = useMemo(() => data?.statementRows || [], [data])

  return (
    <div className="space-y-5">
      <PageHeader
        title="كشف حساب الموردين"
        subtitle="بيانات كشف حساب تفصيلية مع تصدير وطباعة جاهزة"
        actions={
          <>
            <button onClick={() => navigate('/suppliers')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => exportToExcel(statementRows.map(row => ({
              التاريخ: formatDate(row.date),
              المرجع: row.reference,
              البيان: row.description,
              مدين: row.debit,
              دائن: row.credit,
              الرصيد: row.balance
            })), `كشف-حساب-${data?.supplier?.name_ar || 'supplier'}`)} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button type="button" onClick={() => printElement('supplier-statement')} className="btn-primary gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
          <div>
            <label className="form-label">اختر المورد</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="form-select">
              <option value="">-- اختر المورد --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
            </select>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-3">
            <div className="flex items-center justify-between"><span>الرصيد الحالي</span><strong>{formatCurrency(Number(data?.supplier?.balance || 0))}</strong></div>
            <div className="flex items-center justify-between"><span>عدد الفواتير</span><strong>{data?.purchases?.length || 0}</strong></div>
            <div className="flex items-center justify-between"><span>عدد السندات</span><strong>{data?.payments?.length || 0}</strong></div>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl overflow-hidden" id="supplier-statement">
          <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">كشف حساب المورد</h3>
              <p className="text-xs text-muted-foreground">تاريخ الحركات المالية لكل مورد.</p>
            </div>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right px-2 py-2">التاريخ</th>
                  <th className="text-right px-2 py-2">المرجع</th>
                  <th className="text-right px-2 py-2">البيان</th>
                  <th className="text-right px-2 py-2">مدين</th>
                  <th className="text-right px-2 py-2">دائن</th>
                  <th className="text-right px-2 py-2">الرصيد</th>
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
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">اختر موردًا لعرض كشف الحساب</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
