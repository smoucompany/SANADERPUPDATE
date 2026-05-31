import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Printer, Download, FileText, Phone, Mail, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, exportToExcel } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'

type StatementRow = {
  id: string
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  type: 'invoice' | 'payment'
}

export default function CustomerAccountPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['customer-account', id],
    queryFn: async () => {
      const [{ data: customer }, { data: invoices }, { data: payments }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id!).single(),
        supabase.from('invoices').select('*').eq('customer_id', id!).eq('company_id', user!.company_id).order('invoice_date'),
        supabase.from('payments').select('*').eq('customer_id', id!).eq('company_id', user!.company_id).order('payment_date'),
      ])

      const rows: StatementRow[] = []
      let running = 0

      const events = [
        ...(invoices || []).map((inv: any) => ({ date: inv.invoice_date, ref: inv.invoice_number, desc: `فاتورة بيع`, debit: inv.total, credit: 0, type: 'invoice' as const, id: inv.id })),
        ...(payments || []).map((p: any) => ({ date: p.payment_date, ref: p.reference || `PMT-${p.id.slice(0,6)}`, desc: `دفعة`, debit: 0, credit: p.amount, type: 'payment' as const, id: p.id })),
      ].sort((a, b) => a.date.localeCompare(b.date))

      for (const e of events) {
        running += e.debit - e.credit
        rows.push({ id: e.id, date: e.date, reference: e.ref, description: e.desc, debit: e.debit, credit: e.credit, balance: running, type: e.type })
      }

      const totalInvoices = (invoices || []).reduce((s: number, i: any) => s + i.total, 0)
      const totalPayments = (payments || []).reduce((s: number, p: any) => s + p.amount, 0)

      return { customer, statementRows: rows, totalInvoices, totalPayments, outstanding: totalInvoices - totalPayments }
    },
    enabled: !!id && !!user
  })

  const columns: Column<StatementRow>[] = [
    { key: 'date', label: 'التاريخ', render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span> },
    { key: 'reference', label: 'المرجع', render: v => <span className="font-mono text-sm font-medium">{String(v)}</span> },
    { key: 'description', label: 'البيان', render: (v, row) => (
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${row.type === 'invoice' ? 'bg-orange-400' : 'bg-emerald-400'}`} />
        <span className="text-sm">{String(v)}</span>
      </div>
    )},
    { key: 'debit', label: 'مدين', render: v => Number(v) > 0 ? <span className="font-medium text-orange-500">{formatCurrency(Number(v))}</span> : <span className="text-muted-foreground">—</span> },
    { key: 'credit', label: 'دائن', render: v => Number(v) > 0 ? <span className="font-medium text-emerald-600">{formatCurrency(Number(v))}</span> : <span className="text-muted-foreground">—</span> },
    { key: 'balance', label: 'الرصيد', render: v => (
      <span className={`font-bold ${Number(v) > 0 ? 'text-orange-500' : Number(v) < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
        {formatCurrency(Math.abs(Number(v)))} {Number(v) > 0 ? 'مدين' : Number(v) < 0 ? 'دائن' : ''}
      </span>
    )},
  ]

  const customer = data?.customer

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer?.name_ar || 'حساب العميل'}
        subtitle={customer?.code ? `كود: ${customer.code}` : 'تفاصيل العميل وكشف الحساب'}
        actions={
          <>
            <button onClick={() => navigate('/customers')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => data?.statementRows && exportToExcel(data.statementRows.map(r => ({
              التاريخ: formatDate(r.date), المرجع: r.reference, البيان: r.description, مدين: r.debit, دائن: r.credit, الرصيد: r.balance
            })), `كشف-حساب-${customer?.name_ar}`)} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button type="button" onClick={() => window.print()} className="btn-primary gap-1.5">
              <Printer className="w-4 h-4" />طباعة الكشف
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">
        {/* Customer Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-black">
                {customer?.name_ar?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold">{customer?.name_ar}</h3>
                <StatusBadge status={customer?.is_active ? 'active' : 'suspended'} />
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {customer?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <a href={`tel:${customer.phone}`} className="hover:text-primary">{customer.phone}</a>
                </div>
              )}
              {customer?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer?.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{customer.address}</span>
                </div>
              )}
              <div><span className="font-medium text-foreground">حد الائتمان:</span> {formatCurrency(customer?.credit_limit || 0)}</div>
              <div><span className="font-medium text-foreground">الرقم الضريبي:</span> {customer?.tax_number || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'إجمالي المبيعات', value: data?.totalInvoices || 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'إجمالي المدفوع', value: data?.totalPayments || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'الرصيد المستحق', value: data?.outstanding || 0, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-border/40 rounded-xl p-4`}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-black mt-1 ${s.color}`}>{formatCurrency(s.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Statement */}
        <div>
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">كشف الحساب</h3>
            </div>
            <DataTable columns={columns} data={data?.statementRows || []} loading={isLoading} emptyMessage="لا توجد حركات" />
          </div>
        </div>
      </div>
    </div>
  )
}
