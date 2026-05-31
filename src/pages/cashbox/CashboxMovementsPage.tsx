import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Download, RefreshCw, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

const REF_TYPE_LABELS: Record<string, string> = {
  invoice:          'فاتورة مبيعات',
  purchase:         'فاتورة مشتريات',
  cashbox_transfer: 'تحويل خزينة',
  expense:          'مصروف',
  voucher:          'سند صرف/قبض',
  payment:          'دفعة',
}

export default function CashboxMovementsPage() {
  const navigate = useNavigate()
  const { company } = useAuthStore()

  const [selectedCashbox, setSelectedCashbox] = useState('')
  const [dateFrom, setDateFrom]               = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(today())

  const { data: cashboxes = [] } = useQuery({
    queryKey: ['cashboxes', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('cashboxes')
        .select('id, name_ar, is_main, balance')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('is_main', { ascending: false })
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: movements = [], isLoading, refetch } = useQuery({
    queryKey: ['cashbox-movements', selectedCashbox, dateFrom, dateTo],
    queryFn: async () => {
      if (!selectedCashbox) return []
      const { data, error } = await supabase
        .from('cashbox_movements')
        .select('*')
        .eq('cashbox_id', selectedCashbox)
        .gte('movement_date', dateFrom)
        .lte('movement_date', dateTo)
        .order('movement_date', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!selectedCashbox
  })

  const selectedBox = (cashboxes as any[]).find(c => c.id === selectedCashbox)

  const totalDebit  = useMemo(() => (movements as any[]).reduce((s, m) => s + (m.debit || 0), 0), [movements])
  const totalCredit = useMemo(() => (movements as any[]).reduce((s, m) => s + (m.credit || 0), 0), [movements])

  const exportExcel = () => {
    if (movements.length === 0) return
    const rows = (movements as any[]).map((m, i) => ({
      '#':           i + 1,
      'التاريخ':     formatDate(m.movement_date),
      'رقم المستند': m.reference_number || '',
      'نوع المستند': REF_TYPE_LABELS[m.reference_type] || m.reference_type || '',
      'البيان':      m.description || '',
      'إيراد':       m.debit || 0,
      'مصروف':       m.credit || 0,
      'الرصيد':      m.balance || 0,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'حركة الخزينة')
    XLSX.writeFile(wb, `cashbox_movements_${selectedBox?.name_ar || ''}_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="حركة الخزائن"
        subtitle="كشف حركة مفصّل لكل خزينة"
        actions={
          <div className="flex gap-2">
            <button onClick={exportExcel} disabled={movements.length === 0}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => navigate('/cashbox')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowRight size={14} /> رجوع
            </button>
          </div>
        }
      />

      {/* اختيار الخزينة والفترة */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة <span className="text-red-500">*</span></label>
            <select value={selectedCashbox} onChange={e => setSelectedCashbox(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">-- اختر الخزينة --</option>
              {(cashboxes as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar} {c.is_main ? '(رئيسية)' : ''} — الرصيد: {formatCurrency(c.balance)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={() => refetch()}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <RefreshCw size={14} /> عرض الحركة
        </button>
      </div>

      {/* بطاقات الملخص */}
      {selectedBox && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp size={16} />
              <span className="text-sm">إجمالي الإيرادات</span>
            </div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalDebit)}</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown size={16} />
              <span className="text-sm">إجمالي المصروفات</span>
            </div>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalCredit)}</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Wallet size={16} />
              <span className="text-sm">الرصيد الحالي</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(selectedBox.balance)}</div>
          </div>
        </div>
      )}

      {/* جدول الحركة */}
      {selectedCashbox ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
          ) : (movements as any[]).length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Wallet size={40} className="mx-auto mb-3 opacity-30" />
              <p>لا توجد حركات في هذه الفترة</p>
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
                    <th className="text-left px-4 py-3 font-medium text-gray-600">إيراد</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">مصروف</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(movements as any[]).map((m, i) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{formatDate(m.movement_date)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-700">{m.reference_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {REF_TYPE_LABELS[m.reference_type] || m.reference_type || 'غير محدد'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{m.description || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        {m.debit > 0 ? <span className="text-green-600 font-medium">{formatCurrency(m.debit)}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-left">
                        {m.credit > 0 ? <span className="text-red-600 font-medium">{formatCurrency(m.credit)}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-left font-medium">
                        <span className={m.balance >= 0 ? 'text-blue-700' : 'text-red-600'}>
                          {formatCurrency(m.balance || 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2">
                  <tr className="font-bold">
                    <td colSpan={4} className="px-4 py-3">الإجمالي</td>
                    <td className="px-4 py-3 text-left text-green-600">{formatCurrency(totalDebit)}</td>
                    <td className="px-4 py-3 text-left text-red-600">{formatCurrency(totalCredit)}</td>
                    <td className="px-4 py-3 text-left text-blue-700">{formatCurrency(selectedBox?.balance || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p>اختر خزينة لعرض حركتها</p>
        </div>
      )}
    </div>
  )
}
