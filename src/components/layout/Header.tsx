import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, Bell, Search, Sun, Moon, Monitor,
  LogOut, User, Settings, ChevronDown,
  CheckCircle2, AlertTriangle, Info, XCircle, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDateTime } from '@/lib/utils'
import type { Notification } from '@/types'
import toast from 'react-hot-toast'

const ROLE_LABEL: Record<string, string> = {
  admin: 'مدير النظام',
  accountant: 'محاسب',
  cashier: 'كاشير',
  manager: 'مدير',
  employee: 'موظف'
}

export default function Header() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { theme, setTheme, toggleSidebar, toggleMobileSidebar } = useSettingsStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', user.company_id)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20)
      return (data as Notification[]) || []
    },
    enabled: !!user,
    refetchInterval: 30000
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return
      await supabase.from('notifications')
        .update({ is_read: true })
        .eq('company_id', user.company_id)
        .eq('is_read', false)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const notifConfig = {
    success: { icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600' },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600' },
    error:   { icon: <XCircle className="w-4 h-4" />,       bg: 'bg-red-100 dark:bg-red-900/30',    color: 'text-red-600' },
    info:    { icon: <Info className="w-4 h-4" />,           bg: 'bg-blue-100 dark:bg-blue-900/30',  color: 'text-blue-600' },
  }

  const themeOptions = [
    { value: 'light', label: 'فاتح',   icon: Sun },
    { value: 'dark',  label: 'داكن',   icon: Moon },
    { value: 'system',label: 'تلقائي', icon: Monitor },
  ]

  const initials = user?.full_name
    ? user.full_name.trim().split(' ').slice(0, 2).map(w => w[0]).join('')
    : 'م'

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center px-4 gap-3
                       border-b border-border/30
                       bg-white/70 dark:bg-[hsl(222,47%,7%)]/80
                       backdrop-blur-2xl backdrop-saturate-150
                       shadow-[0_1px_2px_rgba(0,0,0,0.03)]">

      {/* Sidebar toggle — mobile: opens drawer, desktop: collapses sidebar */}
      <button
        onClick={() => window.innerWidth < 1024 ? toggleMobileSidebar() : toggleSidebar()}
        className="btn-ghost p-2 rounded-xl text-muted-foreground hover:text-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <AnimatePresence>
          {searchOpen ? (
            <motion.div
              key="search-open"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setSearchOpen(false) }}
                  placeholder="بحث سريع..."
                  className="form-input pr-9 h-9 text-sm bg-muted/40 border-transparent focus:border-primary/40 rounded-xl"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="search-closed"
              onClick={() => setSearchOpen(true)}
              className="btn-ghost p-2 rounded-xl text-muted-foreground hover:text-foreground hidden md:flex"
            >
              <Search className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mr-auto">

        {/* Theme switcher */}
        <div className="hidden md:flex items-center bg-muted/50 rounded-xl p-0.5 gap-0.5">
          {themeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value as 'light' | 'dark' | 'system')}
              title={opt.label}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                theme === opt.value
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <opt.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-ghost p-2 rounded-xl text-muted-foreground hover:text-foreground relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-4 h-4 gradient-red text-white
                           text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-12 w-80 bg-card/95 backdrop-blur-xl border border-border/50
                           rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <h3 className="font-bold text-[13px]">الإشعارات</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={() => markAllRead.mutate()}
                        className="text-[11px] text-primary font-bold hover:underline">
                        تحديد الكل مقروء
                      </button>
                    )}
                    <button onClick={() => { navigate('/notifications'); setShowNotifications(false) }}
                      className="text-[11px] text-muted-foreground hover:text-primary font-bold hover:underline">
                      عرض الكل
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      <div className="w-10 h-10 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-5 h-5 opacity-30" />
                      </div>
                      لا توجد إشعارات
                    </div>
                  ) : notifications.map(notif => {
                    const cfg = notifConfig[notif.type as keyof typeof notifConfig] || notifConfig.info
                    return (
                      <div key={notif.id}
                        className={`px-4 py-3 border-b border-border/30 last:border-0
                                    hover:bg-muted/30 transition-colors ${!notif.is_read ? 'bg-primary/[0.03]' : ''}`}>
                        <div className="flex gap-3">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold truncate">{notif.title}</p>
                            {notif.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>}
                            <p className="text-[10px] text-muted-foreground/50 mt-1 font-medium">{formatDateTime(notif.created_at)}</p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-all duration-200"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full gradient-blue flex items-center justify-center
                            text-white text-xs font-bold shrink-0 shadow-md shadow-blue-500/20">
              {initials}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-[12px] font-bold text-foreground leading-tight">
                {user?.full_name?.split(' ')[0]}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight font-medium">
                {ROLE_LABEL[user?.role || ''] || 'موظف'}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-12 w-56 bg-card/95 backdrop-blur-xl border border-border/50
                           rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden z-50"
              >
                {/* User info */}
                <div className="px-4 py-3.5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-blue flex items-center justify-center
                                    text-white text-sm font-bold shrink-0 shadow-md shadow-blue-500/20">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold truncate">{user?.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  {[
                    { icon: User, label: 'الملف الشخصي', color: 'apple-blue', path: '/profile' },
                    { icon: Settings, label: 'الإعدادات',      color: 'apple-gray', path: '/settings' },
                  ].map(item => (
                    <button key={item.path}
                      onClick={() => { navigate(item.path); setShowUserMenu(false) }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium
                                 hover:bg-muted/60 transition-colors text-right">
                      <span className={`icon-badge-sm ${item.color}`}>
                        <item.icon className="w-3 h-3 text-white" />
                      </span>
                      {item.label}
                    </button>
                  ))}

                  <div className="border-t border-border/50 my-1 mx-1" />

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium
                               hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600
                               transition-colors text-right text-muted-foreground"
                  >
                    <span className="icon-badge-sm apple-red">
                      <LogOut className="w-3 h-3 text-white" />
                    </span>
                    تسجيل الخروج
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
