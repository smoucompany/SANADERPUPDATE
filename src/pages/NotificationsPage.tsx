import { useState } from 'react'
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, Check, Trash2, Filter } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { formatDateTime } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import type { Notification } from '@/types'

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-green-100 dark:bg-green-900/30',  color: 'text-green-600',  label: 'نجاح' },
  warning: { icon: AlertTriangle,bg: 'bg-amber-100 dark:bg-amber-900/30',  color: 'text-amber-600',  label: 'تحذير' },
  error:   { icon: XCircle,      bg: 'bg-red-100 dark:bg-red-900/30',      color: 'text-red-600',    label: 'خطأ' },
  info:    { icon: Info,          bg: 'bg-blue-100 dark:bg-blue-900/30',    color: 'text-blue-600',   label: 'معلومات' },
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'طلب شراء جديد',              message: 'تم إنشاء طلب شراء PO-2026-006 بقيمة 12,400 ر.س', type: 'info',    is_read: false, created_at: new Date(Date.now() - 5*60000).toISOString(),   user_id: undefined, company_id: '', data: {} },
  { id: '2', title: 'مخزون منخفض',                message: 'منتج "شاشة Samsung 27" وصل إلى الحد الأدنى (5 قطع)',type: 'warning', is_read: false, created_at: new Date(Date.now() - 30*60000).toISOString(),  user_id: undefined, company_id: '', data: {} },
  { id: '3', title: 'فاتورة مستحقة',               message: 'الفاتورة INV-2026-041 من شركة الخليج مستحقة الدفع', type: 'error',   is_read: false, created_at: new Date(Date.now() - 2*3600000).toISOString(),  user_id: undefined, company_id: '', data: {} },
  { id: '4', title: 'موافقة مرتجع',                message: 'تم الموافقة على مرتجع البيع RET-2026-003',           type: 'success', is_read: true,  created_at: new Date(Date.now() - 5*3600000).toISOString(),  user_id: undefined, company_id: '', data: {} },
  { id: '5', title: 'دفعة راتب',                   message: 'تمت معالجة مسير رواتب شهر مايو 2026 بنجاح',          type: 'success', is_read: true,  created_at: new Date(Date.now() - 1*86400000).toISOString(), user_id: undefined, company_id: '', data: {} },
  { id: '6', title: 'تقرير ضريبي',                 message: 'موعد تقديم الإقرار الضريبي لشهر مايو خلال 5 أيام',   type: 'warning', is_read: true,  created_at: new Date(Date.now() - 2*86400000).toISOString(), user_id: undefined, company_id: '', data: {} },
  { id: '7', title: 'طلب إجازة',                   message: 'تم تقديم طلب إجازة من الموظف محمد السالم',           type: 'info',    is_read: true,  created_at: new Date(Date.now() - 3*86400000).toISOString(), user_id: undefined, company_id: '', data: {} },
  { id: '8', title: 'تسجيل دخول جديد',             message: 'تسجيل دخول من جهاز جديد — الرياض، المملكة العربية',  type: 'warning', is_read: true,  created_at: new Date(Date.now() - 4*86400000).toISOString(), user_id: undefined, company_id: '', data: {} },
  { id: '9', title: 'إغلاق فترة محاسبية',          message: 'تم إغلاق الفترة المحاسبية لشهر أبريل 2026',          type: 'success', is_read: true,  created_at: new Date(Date.now() - 5*86400000).toISOString(), user_id: undefined, company_id: '', data: {} },
]

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showUnread, setShowUnread] = useState(false)

  const { data: serverNotifs } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', user.company_id)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data as Notification[]) || []
    },
    enabled: !!user,
  })

  const notifications: Notification[] = (serverNotifs && serverNotifs.length > 0) ? serverNotifs : MOCK_NOTIFICATIONS

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return
      await supabase.from('notifications').update({ is_read: true })
        .eq('company_id', user.company_id).eq('is_read', false)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('تم تحديد جميع الإشعارات كمقروءة')
    }
  })

  const filtered = notifications.filter(n => {
    const matchType   = typeFilter === 'all' || n.type === typeFilter
    const matchUnread = !showUnread || !n.is_read
    return matchType && matchUnread
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="مركز الإشعارات"
        subtitle={`${unreadCount} إشعار غير مقروء`}
        actions={
          unreadCount > 0 ? (
            <button onClick={() => markAllRead.mutate()} className="btn-outline gap-1.5">
              <Check className="w-4 h-4" />تحديد الكل مقروء
            </button>
          ) : undefined
        }
      />

      {/* Type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {[
            { key: 'all',     label: `الكل (${notifications.length})` },
            { key: 'info',    label: 'معلومات' },
            { key: 'success', label: 'نجاح' },
            { key: 'warning', label: 'تحذير' },
            { key: 'error',   label: 'خطأ' },
          ].map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>{f.label}</button>
          ))}
        </div>
        <button onClick={() => setShowUnread(!showUnread)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mr-auto ${
            showUnread ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}>
          <Filter className="w-3.5 h-3.5" />غير مقروء فقط
        </button>
      </div>

      {/* Notifications list */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map(notif => {
              const cfg = TYPE_CONFIG[notif.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info
              const Icon = cfg.icon
              return (
                <div key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group ${!notif.is_read ? 'bg-primary/[0.02]' : ''}`}>
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-semibold ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/50 mt-1">{formatDateTime(notif.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.is_read && (
                          <button onClick={() => markRead.mutate(notif.id)}
                            className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600" title="تحديد كمقروء">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => toast.success('تم حذف الإشعار')}
                          className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-red-500" title="حذف">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
