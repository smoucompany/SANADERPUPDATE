import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan'
  trend?: { value: number; label: string }
  isCurrency?: boolean
  onClick?: () => void
  index?: number
}

const colorMap = {
  blue:   { gradient: 'apple-blue',   text: 'text-blue-600 dark:text-blue-400',     bar: 'bg-blue-500',   light: 'bg-blue-500/5' },
  green:  { gradient: 'apple-green',  text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', light: 'bg-emerald-500/5' },
  orange: { gradient: 'apple-orange', text: 'text-orange-600 dark:text-orange-400',  bar: 'bg-orange-500',  light: 'bg-orange-500/5' },
  red:    { gradient: 'apple-red',    text: 'text-red-600 dark:text-red-400',       bar: 'bg-red-500',    light: 'bg-red-500/5' },
  purple: { gradient: 'apple-purple', text: 'text-purple-600 dark:text-purple-400',  bar: 'bg-purple-500',  light: 'bg-purple-500/5' },
  cyan:   { gradient: 'apple-cyan',   text: 'text-cyan-600 dark:text-cyan-400',     bar: 'bg-cyan-500',   light: 'bg-cyan-500/5' }
}

export default function StatCard({ title, value, subtitle, icon: Icon, color, trend, isCurrency = true, onClick, index = 0 }: StatCardProps) {
  const colors = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      onClick={onClick}
      className={cn(
        'stat-card group',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Top accent bar */}
      <div className={cn('absolute top-0 right-0 h-1 w-full rounded-t-2xl', colors.bar)} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black text-foreground mt-2 tabular-nums tracking-tight">
            {isCurrency && typeof value === 'number' ? formatCurrency(value) : value}
          </p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-1 font-medium">{subtitle}</p>}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2.5 text-xs font-bold',
              trend.value > 0 ? 'text-emerald-600 dark:text-emerald-400' :
              trend.value < 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {trend.value > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
               trend.value < 0 ? <TrendingDown className="w-3.5 h-3.5" /> :
               <Minus className="w-3.5 h-3.5" />}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-medium">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md',
          'group-hover:scale-110 transition-transform duration-300',
          colors.gradient
        )}>
          <Icon className="w-5.5 h-5.5 text-white" />
        </div>
      </div>
    </motion.div>
  )
}
