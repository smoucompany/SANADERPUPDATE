import { useState, useMemo } from 'react'
import { Search, Download, RefreshCw, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create:  { label: 'إضافة',       color: 'text-green-700 bg-green-100' },
  update:  { label: 'تعديل',       color: 'text-blue-700 bg-blue-100' },
  delete:  { label: 'حذف',         color: 'text-red-700 bg-red-100' },
  approve: { label: 'اعتماد',      color: 'text-purple-700 bg-purple-100' },
  reject:  { label: 'رفض',         color: 'text-orange-700 bg-orange-100' },
  lock:    { label: 'قفل',         color: 'text-amber-700 bg-amber-100' },
  unlock:  { label: 'فك القفل',    color: 'text-teal-700 bg-teal-100' },
  post:    { label: 'ترحيل',       color: 'text-indigo-700 bg-indigo-100' },
  reverse: { label: 'عكس',         color: 'text-gray-700 bg-gray-100' },
}

const today = () => new Date().toISOString().slice(0, 10)

export default function AuditLogPage() {
  const { company } = useAuthStore()
  const [search, setSearch]       = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [tableFilter, setTableFilter]   = useState('')
  const [userFilter, setUserFilter]     = useState('')
  const [dateFrom, setDateFrom]   = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo]       = useState(today())

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', company?.id, dateFrom, dateTo, actionFilter, tableFilter],
    queryFn: async () => {
      if (!company?.id) return []
      let q = supabase
        .from('audit_logs')
        .select('*, user:users(full_name)')
        .eq('company_id', company.id)
        .gte('created_at', dateFrom + 'T00:00:00')
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false })
        .limit(500)

      if (actionFilter) q = q.eq('action', actionFilter)
      if (tableFilter)  q = q.eq('table_name', tableFilter)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-list', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase
        .from('users').select('id, full_name').eq('company_id', company.id)
      return data || []
    },
    enabled: !!company?.id
  })

  const tables = useMemo(() => [...new Set(logs.map(l => l.table_name))].sort(), [logs])

  const filtered = useMemo(() =>
    logs.filter(l =>
      (!search || l.record_number?.includes(search) || (l.user as any)?.full_name?.includes(search)) &&
      (!userFilter || l.user_id === userFilter)
    ), [logs, search, userFilter])

  const exportExcel = () => {
    const rows = filtered.map(l => ({
      'التاريخ والوقت': new Date(l.created_at).toLocaleString('ar'),
      'المستخدم':       (l.user as any)?.full_name || l.user_name || '—',
      'الدور':          l.user_role || '—',
      'الإجراء':        ACTION_LABELS[l.action]?.label || l.action,
      'الجدول':         l.table_name,
      'رقم المستند':    l.record_number || '—',
      'IP':             l.ip_address || '—',
      'ملاحظات':        l.notes || '—',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'سجل التدقيق')
    XLSX.writeFile(wb, `audit_log_${today()}.xlsx`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سجل التدقيق (Audit Log)"
        subtitle={`${filtered.length} سجل`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <RefreshCw size={14} /> تحديث
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Download size={14} /> Excel
            </button>
          </div>
        }
      />

      {/* فلاتر */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="بحث..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 pr-8 text-sm" />
          </div>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع الإجراءات</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع الجداول</option>
            {tables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">جميع المستخدمين</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ والوقت</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المستخدم</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الدور</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">الإ��راء</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الجدول</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم المستند</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الجهاز / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(l => {
                  const act = ACTION_LABELS[l.action]
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(l.created_at).toLocaleString('ar')}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {(l.user as any)?.full_name || l.user_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.user_role || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {act ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${act.color}`}>
                            {act.label}
                          </span>
                        ) : l.action}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{l.table_name}</td>
                      <td className="px-4 py-3 font-mono text-blue-700 text-xs">{l.record_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{l.ip_address || '—'}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 opacity-30" />
                    لا توجد سجلات في الفترة المحددة
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
