import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Download, Search, Filter, Calendar, DollarSign,
  TrendingUp, TrendingDown, Printer, FileText, Edit, Trash2,
  Settings, CheckCircle, Clock, Eye, X, ArrowLeftRight
} from 'lucide-react'
import { useVouchers, useDeleteVoucher } from '@/hooks/useVouchers'
import { useCustomers } from '@/hooks/useCustomers'
import { useSuppliers } from '@/hooks/useSuppliers'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import { formatCurrency, formatDate, getPaymentMethodLabel, today } from '@/lib/utils'
import type { Payment } from '@/types'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export default function VouchersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'receipt' | 'payment' | 'all'>('all')
  const [cashboxId, setCashboxId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch ancillary data
  const { data: customers = [] } = useCustomers()
  const { data: suppliers = [] } = useSuppliers()

  const { data: cashboxes = [] } = useQuery({
    queryKey: ['cashboxes-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cashboxes').select('*')
      if (error) throw error
      return data
    }
  })

  // Filters object
  const filters = useMemo(() => ({
    search: search || undefined,
    type: type !== 'all' ? type : undefined,
    customer_id: customerId || undefined,
    supplier_id: supplierId || undefined,
    cashbox_id: cashboxId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    payment_method: method || undefined,
    page,
    limit: 20
  }), [search, type, customerId, supplierId, cashboxId, dateFrom, dateTo, method, page])

  const { data: result, isLoading } = useVouchers(filters)
  const deleteVoucher = useDeleteVoucher()

  const vouchers = result?.data || []

  // Metrics Calculations
  const metrics = useMemo(() => {
    let receiptsSum = 0
    let paymentsSum = 0
    let receiptsCount = 0
    let paymentsCount = 0

    vouchers.forEach(v => {
      if (v.type === 'receipt') {
        receiptsSum += v.amount
        receiptsCount++
      } else {
        paymentsSum += v.amount
        paymentsCount++
      }
    })

    return {
      receiptsSum,
      paymentsSum,
      receiptsCount,
      paymentsCount,
      netFlow: receiptsSum - paymentsSum
    }
  }, [vouchers])

  // Exports
  const handleExportExcel = () => {
    const exportData = vouchers.map(v => ({
      'رقم السند': v.payment_number,
      'نوع السند': v.type === 'receipt' ? 'سند قبض' : 'سند صرف',
      'التاريخ': formatDate(v.payment_date),
      'المبلغ': v.amount,
      'طريقة الدفع': getPaymentMethodLabel(v.method),
      'العميل/المورد': v.customer?.name_ar || v.supplier?.name_ar || '—',
      'الخزينة': v.cashbox?.name_ar || '—',
      'المرجع': v.reference || '—',
      'ملاحظات': v.notes || '—'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vouchers')
    XLSX.writeFile(wb, `سندات_القبض_والصرف_${today()}.xlsx`)
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf', 'Roboto', 'normal')
    doc.setFont('Roboto')

    const tableRows = vouchers.map(v => [
      v.payment_number,
      v.type === 'receipt' ? 'Receipt' : 'Payment',
      formatDate(v.payment_date),
      v.customer?.name_ar || v.supplier?.name_ar || '—',
      getPaymentMethodLabel(v.method),
      formatCurrency(v.amount)
    ])

    // @ts-ignore
    doc.autoTable({
      head: [['Number', 'Type', 'Date', 'Entity', 'Method', 'Amount']],
      body: tableRows,
      theme: 'grid',
      styles: { halign: 'center' }
    })

    doc.save(`vouchers_list_${today()}.pdf`)
  }

  const columns: Column<any>[] = [
    {
      key: 'payment_number',
      label: 'رقم السند',
      render: (v, row) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-foreground text-sm">{String(v)}</span>
          <span className="text-[10px] text-muted-foreground">{row.user?.full_name || 'بواسطة النظام'}</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'النوع',
      render: v => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          v === 'receipt' 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        }`}>
          {v === 'receipt' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {v === 'receipt' ? 'سند قبض' : 'سند صرف'}
        </span>
      )
    },
    {
      key: 'payment_date',
      label: 'التاريخ',
      render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span>
    },
    {
      key: 'entity',
      label: 'المستفيد / العميل / المورد',
      render: (_, row) => (
        <span className="text-sm font-semibold text-foreground">
          {row.customer?.name_ar || row.supplier?.name_ar || 'حساب عام / موظف'}
        </span>
      )
    },
    {
      key: 'cashbox',
      label: 'الخزينة / الحساب',
      render: (_, row) => <span className="text-sm text-foreground">{row.cashbox?.name_ar || '—'}</span>
    },
    {
      key: 'method',
      label: 'طريقة الدفع',
      render: v => <span className="text-sm">{getPaymentMethodLabel(String(v))}</span>
    },
    {
      key: 'amount',
      label: 'المبلغ',
      render: (v, row) => (
        <span className={`font-mono font-black text-base ${
          row.type === 'receipt' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
        }`}>
          {formatCurrency(Number(v))}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'خيارات',
      render: (_, row) => (
        <div className="flex gap-1.5 justify-center">
          <button onClick={() => navigate(`/vouchers/${row.id}`)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all" title="عرض التفاصيل">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(`/vouchers/${row.id}/edit`)} className="p-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded-xl transition-all" title="تعديل">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => {
            if (confirm('هل أنت متأكد من حذف هذا السند؟ سيتم إلغاء تأثيره المالي بالكامل!')) {
              deleteVoucher.mutate(row.id)
            }
          }} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all" title="حذف">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="إدارة سندات القبض والصرف"
        subtitle="محرك العمليات المالية والتدفقات النقدية"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/vouchers/settings')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97]">
              <Settings className="w-4 h-4" />إعدادات السندات
            </button>
            <button onClick={() => navigate('/vouchers/reports')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97]">
              <FileText className="w-4 h-4" />تقارير وتحليلات
            </button>
            <button onClick={() => navigate('/vouchers/new')} className="btn-primary gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-[0.97] transition-all">
              <Plus className="w-4 h-4" />إنشاء سند مالي
            </button>
          </div>
        }
      />

      {/* KPI Metrics Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-card/70 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-all"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">إجمالي المقبوضات (سند قبض)</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.receiptsSum)}</h3>
            <p className="text-[10px] text-muted-foreground font-medium">{metrics.receiptsCount} عملية قبض ناجحة</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-card/70 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-all"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">إجمالي المدفوعات (سند صرف)</p>
            <h3 className="text-2xl font-black text-rose-500">{formatCurrency(metrics.paymentsSum)}</h3>
            <p className="text-[10px] text-muted-foreground font-medium">{metrics.paymentsCount} عملية صرف معتمدة</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <TrendingDown className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-card/70 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-all"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">صافي التدفق النقدي بالخزائن</p>
            <h3 className={`text-2xl font-black ${metrics.netFlow >= 0 ? 'text-primary' : 'text-amber-500'}`}>
              {formatCurrency(metrics.netFlow)}
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">النشاط المالي الجاري للفترة</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Modern Control Bar */}
      <div className="bg-card/75 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Quick Tabs */}
          <div className="flex gap-1.5 p-1 bg-muted/40 rounded-xl w-full md:w-auto">
            {(['all', 'receipt', 'payment'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setPage(1) }}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  type === t 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'all' && 'جميع السندات'}
                {t === 'receipt' && 'سندات قبض'}
                {t === 'payment' && 'سندات صرف'}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button onClick={() => setShowFilters(!showFilters)} className={`btn-outline gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${showFilters ? 'bg-primary/5 border-primary/50 text-primary' : ''}`}>
              <Filter className="w-4 h-4" />تصفية متقدمة
            </button>
            <button onClick={handleExportExcel} className="btn-outline gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all">
              <Download className="w-4 h-4" />تصدير Excel
            </button>
            <button onClick={handleExportPDF} className="btn-outline gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all">
              <Printer className="w-4 h-4" />تصدير PDF
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/30 pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">البحث برقم السند</label>
                  <div className="relative">
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="form-input pr-9 h-10 text-xs bg-muted/20 focus:bg-card border-border/40 rounded-xl" placeholder="رقم السند..." />
                    <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">الخزينة / الصندوق</label>
                  <select value={cashboxId} onChange={e => { setCashboxId(e.target.value); setPage(1) }} className="form-select h-10 text-xs bg-muted/20 focus:bg-card border-border/40 rounded-xl">
                    <option value="">جميع الصناديق</option>
                    {cashboxes.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">تصفية حسب العميل</label>
                  <select value={customerId} onChange={e => { setCustomerId(e.target.value); setPage(1); setSupplierId('') }} className="form-select h-10 text-xs bg-muted/20 focus:bg-card border-border/40 rounded-xl">
                    <option value="">جميع العملاء</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">تصفية حسب المورد</label>
                  <select value={supplierId} onChange={e => { setSupplierId(e.target.value); setPage(1); setCustomerId('') }} className="form-select h-10 text-xs bg-muted/20 focus:bg-card border-border/40 rounded-xl">
                    <option value="">جميع الموردين</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">من تاريخ</label>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="form-input h-10 text-xs bg-muted/20 focus:bg-card border-border/40 rounded-xl" />
                </div>

                <div>
                  <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">إلى تاريخ</label>
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="form-input h-10 text-xs bg-muted/20 focus:bg-card border-border/40 rounded-xl" />
                </div>

                <div>
                  <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">طريقة الدفع</label>
                  <select value={method} onChange={e => { setMethod(e.target.value); setPage(1) }} className="form-select h-10 text-xs bg-muted/20 focus:bg-card border-border/40 rounded-xl">
                    <option value="">جميع الطرق</option>
                    <option value="cash">نقدي</option>
                    <option value="mada">مدى</option>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="credit">بطاقة ائتمان</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button onClick={() => {
                    setSearch(''); setType('all'); setCashboxId(''); setCustomerId(''); setSupplierId(''); setDateFrom(''); setDateTo(''); setMethod('')
                  }} className="btn-outline w-full h-10 justify-center rounded-xl text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10">
                    <X className="w-4 h-4 ml-1" />إعادة تعيين الفلاتر
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Vouchers Data Table */}
      <div className="bg-card/75 backdrop-blur-md border border-border/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
        <DataTable
          data={vouchers}
          columns={columns}
          loading={isLoading}
          pagination={{
            page,
            limit: 20,
            total: result?.total || 0,
            onPageChange: setPage
          }}
          emptyMessage="لم يتم العثور على أي سندات تتطابق مع شروط البحث."
        />
      </div>
    </div>
  )
}
