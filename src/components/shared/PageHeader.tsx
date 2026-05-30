import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
  icon?: React.ElementType
  iconColor?: string
}

export default function PageHeader({ title, subtitle, actions, className, icon: Icon, iconColor }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm', iconColor || 'apple-blue')}>
            <Icon className="w-5.5 h-5.5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5 font-medium">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </motion.div>
  )
}
