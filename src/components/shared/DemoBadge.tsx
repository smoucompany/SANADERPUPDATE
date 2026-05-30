import { FlaskConical } from 'lucide-react'

export default function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold
                     bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400
                     border border-amber-200 dark:border-amber-800">
      <FlaskConical className="w-3 h-3" />
      بيانات تجريبية
    </span>
  )
}
