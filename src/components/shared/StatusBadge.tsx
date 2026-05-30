import { cn, getStatusLabel, getStatusColor } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', getStatusColor(status), className)}>
      {getStatusLabel(status)}
    </span>
  )
}
