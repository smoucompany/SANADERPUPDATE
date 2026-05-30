import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, CheckCircle2, FileText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import DataTable, { Column } from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import type { JournalEntry } from '@/types'
import toast from 'react-hot-toast'

export default function JournalEntriesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: result, isLoading } = useQuery({
    queryKey: ['journal-entries', user?.company_id, search, dateFrom, dateTo, page],
    queryFn: async () => {
      let query = supabase.from('journal_entries')
        .select('*', { count: 'exact' })
        .eq('company_id', user!.company_id)
        .order('entry_date', { ascending: false })
        .range((page-1)*20, page*20-1)
      if (search) query = query.ilike('entry_number', `%${search}%`)
      if (dateFrom) query = query.gte('entry_date', dateFrom)
      if (dateTo) query = query.lte('entry_date', dateTo)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data as JournalEntry[], total: count || 0 }
    },
    enabled: !!user
  })

  const postEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('journal_entries').update({ status: 'posted' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal-entries'] }); toast.success('تم نشر القيد بنجاح') },
    onError: (err: Error) => toast.error(err.message)
  })

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('journal_entries').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal-entries'] }); toast.success('تم إلغاء القيد') }
  })

  const entries = result?.data || []
  const total = result?.total || 0

  const columns: Column<JournalEntry>[] = [
    { key: 'entry_number', label: 'رقم القيد', render: v => <span className="font-mono text-primary font-medium text-sm">{String(v)}</span> },
    { key: 'entry_date', label: 'التاريخ', render: v => <span className="text-muted-foreground text-sm">{formatDate(String(v))}</span> },
    { key: 'description', label: 'البيان', render: v => <span className="text-sm truncate max-w-xs block">{String(v)}</span> },
    { key: 'total_debit', label: 'إجمالي المدين', render: v => <span className="font-bold text-blue-600">{formatCurrency(Number(v))}</span> },
    { key: 'total_credit', label: 'إجمالي الدائن', render: v => <span className="font-bold text-emerald-600">{formatCurrency(Number(v))}</span> },
    { key: 'status', label: 'الحالة', render: v => <StatusBadge status={String(v)} /> },
    { key: 'is_auto', label: 'النوع', render: v => <span className={`text-xs ${v ? 'text-muted-foreground' : 'text-blue-600'}`}>{v ? 'تلقائي' : 'يدوي'}</span> },
    { key: 'id', label: 'إجراءات', render: (_, row) => (
      <div className="flex gap-1 justify-end">
        {row.status === 'draft' && (
          <>
            <button onClick={() => postEntry.mutate(row.id)} className="btn-ghost p-1.5 rounded-lg text-emerald-600" title="نشر القيد"><CheckCircle2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => navigate(`/journal/${row.id}/edit`)} className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
        {row.status === 'posted' && <span className="text-xs text-muted-foreground px-2">منشور</span>}
      </div>
    )}
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="القيود اليومية" subtitle={`${total} قيد`}
        actions={<button onClick={() => navigate('/journal/new')} className="btn-primary gap-1.5"><Plus className="w-4 h-4" />قيد جديد</button>} />

      <div className="flex gap-3">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input h-9 text-sm w-40" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input h-9 text-sm w-40" />
      </div>

      <DataTable data={entries} columns={columns} loading={isLoading} searchable
        searchPlaceholder="بحث برقم القيد..." onSearch={setSearch}
        pagination={{ page, limit: 20, total, onPageChange: setPage }}
        emptyMessage="لا توجد قيود يومية" />

      <ConfirmDialog open={!!deleteId} title="إلغاء القيد" message="هل تريد إلغاء هذا القيد؟"
        onConfirm={() => { if (deleteId) { deleteEntry.mutate(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)} loading={deleteEntry.isPending} />
    </div>
  )
}
