import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, FileText, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

const DOC_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: 'فاتورة مشتريات', color: 'bg-blue-100 text-blue-700' },
  return:   { label: 'مردود مشتريات', color: 'bg-orange-100 text-orange-700' },
  payment:  { label: 'إيصال سداد',    color: 'bg-green-100 text-green-700' },
}

export default function SupplierStatementPage() {
  const { id: supplierId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { company } = useAuthStore()

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(today())

  const { data: supplier } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: async () => {
      if (!supplierId) return null
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single()
      return data
    },
    enabled: !!supplierId
  })

  const { data: statement = [], isLoading, refetch } = useQuery({
    queryKey: ['supplier-statement', supplierId, fromDate, toDate],
    queryFn: async () => {
      if (!company?.id || !supplierId) return []
      const { data, error } = await supabase.rpc('get_supplier_statement_full', {
        p_company_id:  company.id,
        p_supplier_id: supplierId,
        p_from_date:   fromDate,
        p_to_date:     toDate
      })
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id && !!supplierId
  })

  const totalDebit   = useMemo(() => (statement as any[]).reduce((s, r) => s + (r.debit || 0), 0), [statement])
  const totalCredit  = useMemo(() => (statement as any[]).reduce((s, r) => s + (r.credit || 0), 0), [statement])
  const finalBalance = totalDebit - totalCredit

  const exportExcel = () => {
    const rows = (statement as any[]).map((r, i) => ({
      '#':           i + 1,
      'التاريخ':    formatDate(r.doc_date),
      'رقم المستند': r.doc_number,
      'نوع المستند': DOC_TYPE_LABELS[r.doc_type]?.label || r.doc_type_ar || r.doc_type,
      'البيان':      r.description,
      'مدين':        r.debit,
      'دائن':        r.credit,
      'الرصيد':      r.balance,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'كشف حساب مورد')
    XLSX.writeFile(wb, `supplier_statement_${supplier?.name_ar || 'supplier'}_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={`كشف حساب: ${supplier?.name_ar || '...'}`}
        subtitle="جميع المعاملات مع المورد في الفترة المحددة"
        actions={
          <div className="flex gap-2">
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => navigate('/suppliers')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowRight size={14} /> رجوع
            </button>
          </div>
        }
      />

      {/* بيانات المورد */}
      {supplier && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs mb-1">اسم المورد</div>
              <div className="font-bold text-lg">{supplier.name_ar}</div>
            </div>
            {supplier.phone && (
              <div>
                <div className="text-gray-500 text-xs mb-1">الهاتف</div>
                <div className="font-medium">{supplier.phone}</div>
              </div>
            )}
            {supplier.tax_number && (
              <div>
                <div className="text-gray-500 text-xs mb-1">الرقم الضريبي</div>
                <div className="font-medium">{supplier.tax_number}</div>
              </div>
            )}
            <div>
              <div className="text-gray-500 text-xs mb-1">الرصيد الحالي</div>
              <div className={`font-bold text-xl ${(supplier.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(supplier.balance || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ملخص الفترة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">إجمالي المديونيات</span>
          </div>
          <div className="text-2xl font-bold text-red-700">{formatCurrency(totalDebit)}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingDown size={16} />
            <span className="text-sm font-medium">إجمالي المدفوعات</span>
          </div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(totalCredit)}</div>
        </div>
        <div className={`${finalBalance > 0 ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'} border rounded-xl p-4`}>
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FileText size={16} />
            <span className="text-sm font-medium">صافي الرصيد</span>
          </div>
          <div className={`text-2xl font-bold ${finalBalance > 0 ? 'text-orange-700' : 'text-blue-700'}`}>
            {formatCurrency(Math.abs(finalBalance))}
            <span className="text-sm font-normal mr-1">{finalBalance > 0 ? '(مدين)' : finalBalance < 0 ? '(دائن)' : ''}</span>
          </div>
        </div>
      </div>

      {/* فلتر الفترة */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">من:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">إلى:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <RefreshCw size={14} /> تحديث
          </button>
        </div>
      </div>

      {/* جدول الكشف */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
        ) : (statement as any[]).length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد معاملات في هذه الفترة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم المستند</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">نوع المستند</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">البيان</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">مدين</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">دائن</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">الرصيد</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(statement as any[]).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{formatDate(row.doc_date)}</td>
                    <td className="px-4 py-3 font-mono text-blue-700 text-xs">{row.doc_number}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        DOC_TYPE_LABELS[row.doc_type]?.color || 'bg-gray-100 text-gray-600'
                      }`}>
                        {DOC_TYPE_LABELS[row.doc_type]?.label || row.doc_type_ar || row.doc_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.description}</td>
                    <td className="px-4 py-3 text-left">
                      {row.debit > 0 ? (
                        <span className="text-red-600 font-medium">{formatCurrency(row.debit)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {row.credit > 0 ? (
                        <span className="text-green-600 font-medium">{formatCurrency(row.credit)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className={`font-medium ${row.balance > 0 ? 'text-red-600' : row.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatCurrency(Math.abs(row.balance))}
                        {row.balance > 0 ? ' م' : row.balance < 0 ? ' د' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2">
                <tr className="font-bold">
                  <td colSpan={4} className="px-4 py-3 text-gray-700">الإجمالي</td>
                  <td className="px-4 py-3 text-left text-red-600">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-3 text-left text-green-600">{formatCurrency(totalCredit)}</td>
                  <td className={`px-4 py-3 text-left text-xl ${finalBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatCurrency(Math.abs(finalBalance))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
