import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, CheckCircle2, Clock, XCircle, Send, Eye, Edit2, Trash2, ArrowLeftRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from 'react-hot-toast'

type Quotation = {
  id: string
  quote_number: string
  customer_name: string
  quote_date: string
  valid_until: string
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  notes?: string
}

const STATUS_CFG = {
  draft:    { label: 'مسودة',   color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  sent:     { label: 'مُرسل',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  accepted: { label: 'مقبول',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'مرفوض',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  expired:  { label: 'منتهي',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

const MOCK_QUOTES: Quotation[] = [
  { id: '1', quote_number: 'QUO-00001', customer_name: 'شركة الأفق', quote_date: '2026-05-20', valid_until: '2026-06-20', total: 15800, status: 'sent' },
  { id: '2', quote_number: 'QUO-00002', customer_name: 'مؤسسة النور', quote_date: '2026-05-22', valid_until: '2026-06-22', total: 7500, status: 'accepted' },
  { id: '3', quote_number: 'QUO-00003', customer_name: 'محمد العمري', quote_date: '2026-05-25', valid_until: '2026-06-25', total: 3200, status: 'draft' },
  { id: '4', quote_number: 'QUO-00004', customer_name: 'مجموعة المستقبل', quote_date: '2026-04-10', valid_until: '2026-05-10', total: 22000, status: 'expired' },
]

export default function QuotationsPage() {
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = MOCK_QUOTES.filter(q => !statusFilter || q.status === statusFilter)
  const totalValue = filtered.reduce((s, q) => s + q.total, 0)
  const accepted = MOCK_QUOTES.filter(q => q.status === 'accepted').length
  const conversionRate = Math.round((accepted / MOCK_QUOTES.length) * 100)

  const columns: Column<Quotation>[] = [
    { key: 'quote_number', label: 'رقم العرض',
      render: v => <span className="font-mono text-primary font-semibold text-sm">{String(v)}</span> },
    { key: 'customer_name', label: 'العميل',
      render: v => <span className="font-medium">{String(v)}</span> },
    { key: 'quote_date', label: 'تاريخ العرض',
      render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span> },
    { key: 'valid_until', label: 'صالح حتى',
      render: v => <span className="text-sm">{formatDate(String(v))}</span> },
    { key: 'total', label: 'الإجمالي',
      render: v => <span className="font-bold">{formatCurrency(Number(v))}</span> },
    { key: 'status', label: 'الحالة',
      render: v => {
        const cfg = STATUS_CFG[v as keyof typeof STATUS_CFG]
        return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg?.color}`}>{cfg?.label}</span>
      }
    },
    { key: 'id', label: 'إجراءات',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          {row.status === 'accepted' && (
            <button onClick={() => { toast.success('تم تحويل العرض لفاتورة بيع'); }}
              className="btn-ghost p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" title="تحويل لفاتورة">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          )}
          {row.status === 'draft' && (
            <button onClick={() => toast.success('تم إرسال العرض للعميل')}
              className="btn-ghost p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="إرسال">
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => navigate(`/quotations/${row.id}/edit`)} className="btn-ghost p-1.5 rounded-lg">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="عروض الأسعار"
        subtitle={`${MOCK_QUOTES.length} عرض سعر`}
        actions={
          <button onClick={() => navigate('/quotations/new')} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />عرض سعر جديد
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي العروض', value: MOCK_QUOTES.length, color: 'text-foreground', icon: FileText, iconColor: 'bg-blue-500' },
          { label: 'إجمالي القيمة', value: formatCurrency(MOCK_QUOTES.reduce((s,q) => s+q.total,0)), color: 'text-blue-600', icon: FileText, iconColor: 'bg-indigo-500' },
          { label: 'نسبة التحويل', value: `${conversionRate}%`, color: 'text-emerald-600', icon: CheckCircle2, iconColor: 'bg-emerald-500' },
          { label: 'في الانتظار', value: MOCK_QUOTES.filter(q => q.status === 'sent').length, color: 'text-amber-600', icon: Clock, iconColor: 'bg-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.iconColor} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{v:'',l:'الكل'}, ...Object.entries(STATUS_CFG).map(([v,{label:l}]) => ({v,l}))].map(opt => (
          <button key={opt.v} onClick={() => setStatusFilter(opt.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === opt.v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {opt.l}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={false} emptyMessage="لا توجد عروض أسعار" />

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => { toast.success('تم الحذف'); setDeleteId(null) }}
        title="حذف عرض السعر" message="هل أنت متأكد من حذف عرض السعر؟" />
    </div>
  )
}
