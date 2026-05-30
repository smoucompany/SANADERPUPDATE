import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ShoppingCart, Package, ShoppingBag,
  Warehouse, Users, Truck, BookOpen, Receipt,
  CreditCard, BarChart3, Settings, UserCog,
  ChevronLeft, Building2, Sparkles, Briefcase, MessageCircle,
  FileText, Boxes, Tags, DollarSign, Layers, Scale, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { useState, useEffect } from 'react'

interface NavItem {
  label: string
  icon: React.ElementType
  iconColor: string     // apple-* class
  href?: string
  children?: NavItem[]
  badge?: string | number
}

const navItems: NavItem[] = [
  {
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
    iconColor: 'apple-blue',
    href: '/'
  },
  {
    label: 'نقطة البيع',
    icon: ShoppingCart,
    iconColor: 'apple-orange',
    href: '/pos'
  },
  {
    label: 'المبيعات',
    icon: Receipt,
    iconColor: 'apple-green',
    children: [
      { label: 'فواتير البيع',   icon: FileText,      iconColor: 'apple-green',  href: '/sales' },
      { label: 'عروض الأسعار',  icon: FileText,      iconColor: 'apple-teal',   href: '/quotations' },
      { label: 'مرتجعات البيع', icon: TrendingUp,    iconColor: 'apple-red',    href: '/sales/returns' },
    ]
  },
  {
    label: 'المشتريات',
    icon: ShoppingBag,
    iconColor: 'apple-purple',
    children: [
      { label: 'فواتير الشراء',    icon: FileText,   iconColor: 'apple-purple', href: '/purchases' },
      { label: 'أوامر الشراء',     icon: ShoppingBag,iconColor: 'apple-indigo', href: '/purchases/orders' },
      { label: 'مرتجعات الشراء',  icon: TrendingUp, iconColor: 'apple-red',    href: '/purchases/returns' },
    ]
  },
  {
    label: 'المخزون',
    icon: Boxes,
    iconColor: 'apple-teal',
    children: [
      { label: 'المنتجات',           icon: Package,   iconColor: 'apple-teal',   href: '/products' },
      { label: 'حركة المخزون',      icon: Warehouse, iconColor: 'apple-cyan',   href: '/inventory' },
      { label: 'تحويل مخزون',       icon: Warehouse, iconColor: 'apple-mint',   href: '/inventory/transfer' },
      { label: 'جرد وتسوية',        icon: Boxes,     iconColor: 'apple-orange', href: '/inventory/adjustment' },
      { label: 'تنبيهات المخزون',   icon: Boxes,     iconColor: 'apple-red',    href: '/inventory/alerts' },
      { label: 'قوائم الأسعار',     icon: Tags,      iconColor: 'apple-yellow', href: '/price-lists' },
      { label: 'التصنيفات',          icon: Tags,      iconColor: 'apple-indigo', href: '/categories' },
      { label: 'طباعة باركود',      icon: Tags,      iconColor: 'apple-brown',  href: '/products/barcodes' },
    ]
  },
  {
    label: 'العملاء والموردون',
    icon: Users,
    iconColor: 'apple-pink',
    children: [
      { label: 'العملاء',  icon: Users, iconColor: 'apple-pink',  href: '/customers' },
      { label: 'الموردون', icon: Truck, iconColor: 'apple-brown', href: '/suppliers' },
    ]
  },
  {
    label: 'المحاسبة',
    icon: BookOpen,
    iconColor: 'apple-indigo',
    children: [
      { label: 'شجرة الحسابات',       icon: Layers,     iconColor: 'apple-indigo', href: '/accounts' },
      { label: 'القيود اليومية',       icon: FileText,   iconColor: 'apple-blue',   href: '/journal' },
      { label: 'دفتر الأستاذ العام',   icon: BookOpen,   iconColor: 'apple-teal',   href: '/general-ledger' },
      { label: 'ميزان المراجعة',       icon: Scale,      iconColor: 'apple-yellow', href: '/trial-balance' },
      { label: 'القوائم المالية',       icon: TrendingUp, iconColor: 'apple-green',  href: '/financial-statements' },
      { label: 'الحسابات البنكية',     icon: CreditCard, iconColor: 'apple-cyan',   href: '/bank-accounts' },
      { label: 'مراكز التكلفة',        icon: Layers,     iconColor: 'apple-purple', href: '/cost-centers' },
      { label: 'الأصول الثابتة',       icon: Building2,  iconColor: 'apple-brown',  href: '/assets' },
      { label: 'سندات القبض والصرف',  icon: CreditCard, iconColor: 'apple-green',  href: '/vouchers' },
      { label: 'المصروفات',            icon: DollarSign, iconColor: 'apple-red',    href: '/expenses' },
      { label: 'تصنيفات المصروفات',   icon: Tags,       iconColor: 'apple-pink',   href: '/expense-categories' },
      { label: 'الإقرارات الضريبية',  icon: FileText,   iconColor: 'apple-orange', href: '/tax-returns' },
      { label: 'الميزانيات',           icon: DollarSign, iconColor: 'apple-teal',   href: '/budgets' },
      { label: 'الفترات المحاسبية',   icon: Layers,     iconColor: 'apple-gray',   href: '/accounting-periods' },
    ]
  },
  {
    label: 'التقارير',
    icon: BarChart3,
    iconColor: 'apple-yellow',
    href: '/reports'
  },
  {
    label: 'الموارد البشرية',
    icon: Briefcase,
    iconColor: 'apple-purple',
    children: [
      { label: 'لوحة التحكم',        icon: Briefcase,    iconColor: 'apple-purple', href: '/hr' },
      { label: 'الموظفون',           icon: Users,        iconColor: 'apple-blue',   href: '/hr/employees' },
      { label: 'الحضور والانصراف',  icon: Briefcase,    iconColor: 'apple-teal',   href: '/hr/attendance' },
      { label: 'مسير الرواتب',       icon: DollarSign,   iconColor: 'apple-green',  href: '/hr/payroll' },
      { label: 'الإجازات',           icon: Briefcase,    iconColor: 'apple-orange', href: '/hr/leaves' },
      { label: 'تقييم الأداء',       icon: TrendingUp,   iconColor: 'apple-pink',   href: '/hr/performance' },
    ]
  },
  {
    label: 'إدارة العملاء CRM',
    icon: MessageCircle,
    iconColor: 'apple-green',
    children: [
      { label: 'لوحة CRM',             icon: MessageCircle, iconColor: 'apple-green',  href: '/crm' },
      { label: 'العملاء المحتملون',    icon: Users,         iconColor: 'apple-blue',   href: '/crm/leads' },
      { label: 'سجل الأنشطة',         icon: TrendingUp,    iconColor: 'apple-orange', href: '/crm/activities' },
      { label: 'واتساب ماركتينج',      icon: MessageCircle, iconColor: 'apple-teal',   href: '/crm/whatsapp-marketing' },
    ]
  },
  {
    label: 'الإدارة',
    icon: Building2,
    iconColor: 'apple-gray',
    children: [
      { label: 'المستخدمون', icon: UserCog,  iconColor: 'apple-gray',  href: '/users' },
      { label: 'الإعدادات',  icon: Settings, iconColor: 'apple-brown', href: '/settings' },
    ]
  },
]

interface NavItemProps { 
  item: NavItem
  collapsed: boolean
  depth?: number
  openSection?: string | null
  onToggleSection?: (label: string | null) => void
}

function NavItemComponent({ item, collapsed, depth = 0, openSection, onToggleSection }: NavItemProps) {
  const location = useLocation()
  
  const isChildActive = item.children?.some(c =>
    c.href && (c.href === '/' ? location.pathname === '/' : location.pathname.startsWith(c.href))
  )

  const isOpen = openSection === item.label

  if (item.children) {
    return (
      <div className="w-full">
        <button
          onClick={() => onToggleSection?.(isOpen ? null : item.label)}
          className={cn(
            'sidebar-item w-full transition-all duration-200 py-2',
            isChildActive && 'text-sidebar-foreground font-semibold bg-sidebar-accent/40'
          )}
        >
          {/* Colored Icon Badge */}
          <span className={cn(
            'flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 hover:scale-105',
            depth > 0 
              ? 'w-8 h-8 rounded-[8px]' 
              : 'w-10 h-10 rounded-[12px]',
            item.iconColor
          )}>
            <item.icon className={cn('text-white', depth > 0 ? 'w-4 h-4' : 'w-5 h-5')} />
          </span>

          {!collapsed && (
            <>
              <span className="flex-1 text-right text-[13px] pr-2.5 font-medium">{item.label}</span>
              <motion.div animate={{ rotate: isOpen ? -90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronLeft className="w-3.5 h-3.5 opacity-55" />
              </motion.div>
            </>
          )}
        </button>

        <AnimatePresence initial={false}>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1 mr-5 pr-3 border-r-2 border-primary/15 space-y-0.5 pb-1">
                {item.children.map(child => (
                  <NavItemComponent 
                    key={child.href} 
                    item={child} 
                    collapsed={false} 
                    depth={1} 
                    openSection={openSection}
                    onToggleSection={onToggleSection}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <NavLink
      to={item.href!}
      end={item.href === '/'}
      onClick={() => {
        if (depth === 0) {
          onToggleSection?.(null)
        }
      }}
      className={({ isActive }) => cn(
        'sidebar-item py-2 transition-all duration-200', 
        isActive && 'active bg-primary/[0.06] text-primary font-bold border-r-2 border-primary mr-[-1px]'
      )}
      title={collapsed ? item.label : undefined}
    >
      {/* Colored Icon Badge */}
      <span className={cn(
        'flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 hover:scale-105',
        depth > 0 
          ? 'w-8 h-8 rounded-[8px]' 
          : 'w-10 h-10 rounded-[12px]',
        item.iconColor
      )}>
        <item.icon className={cn('text-white', depth > 0 ? 'w-4 h-4' : 'w-5 h-5')} />
      </span>

      {!collapsed && (
        <>
          <span className={cn(
            'flex-1 text-[13px] pr-2.5 transition-colors duration-150',
            depth > 0 ? 'text-muted-foreground hover:text-foreground font-normal' : 'font-medium'
          )}>{item.label}</span>
          {item.badge && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ─── Shared sidebar content ───────────────────────────────────────────────────
function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { company } = useAuthStore()
  const location    = useLocation()

  const activeParent = navItems.find(item =>
    item.children?.some(c => c.href && (c.href === '/' ? location.pathname === '/' : location.pathname.startsWith(c.href)))
  )?.label || null

  const [openSection, setOpenSection] = useState<string | null>(activeParent)

  // عند تغيير الصفحة: افتح القسم الجديد النشط وأغلق ما عداه
  useEffect(() => {
    setOpenSection(activeParent)
  }, [activeParent])

  // دالة الأكورديون: فتح قسم واحد فقط في كل وقت
  const handleToggle = (label: string | null) => {
    setOpenSection(prev => prev === label ? null : label)
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border/30 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[13px] font-extrabold text-sidebar-foreground leading-tight truncate max-w-[170px]">
              {company?.name_ar || 'نظام الإدارة'}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-semibold tracking-widest uppercase">ERP SYSTEM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 scrollbar-none">
        {navItems.map((item, i) => (
          <NavItemComponent
            key={i}
            item={item}
            collapsed={collapsed}
            openSection={openSection}
            onToggleSection={handleToggle}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border/30 shrink-0">
          <p className="text-[9px] text-muted-foreground/30 text-center font-bold tracking-[0.2em] uppercase">
            v1.0.0 · SANAD ERP
          </p>
        </div>
      )}
    </>
  )
}

// ─── Main Sidebar export ──────────────────────────────────────────────────────
export default function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen, closeMobileSidebar } = useSettingsStore()

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── always visible, collapsible width ── */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 68 : 256 }}
        initial={false}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col fixed top-0 right-0 h-screen z-40 overflow-hidden
                   bg-white/80 dark:bg-[hsl(222,47%,7%)]/90
                   backdrop-blur-2xl backdrop-saturate-150
                   border-l border-border/25
                   shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_1px_12px_rgba(0,0,0,0.04)]"
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* ── Mobile / Tablet drawer (below lg) ── slide from right ── */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobileSidebar}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-0 right-0 h-screen w-[256px] z-50 flex flex-col overflow-hidden
                         bg-white/90 dark:bg-[hsl(222,47%,7%)]/95
                         backdrop-blur-2xl border-l border-border/25
                         shadow-[-4px_0_24px_rgba(0,0,0,0.1)] lg:hidden"
            >
              <SidebarContent collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
