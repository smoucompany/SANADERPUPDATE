import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronRight, ChevronLeft, Search, Filter, Inbox
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  pagination?: {
    page: number
    limit: number
    total: number
    onPageChange: (page: number) => void
    onLimitChange?: (limit: number) => void
  }
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  emptyMessage?: string
  rowClassName?: (row: T) => string
  onRowClick?: (row: T) => void
}

export default function DataTable<T extends { id?: string }>({
  data, columns, loading = false, searchable, searchPlaceholder = 'بحث...',
  onSearch, pagination, onSort, emptyMessage = 'لا توجد بيانات',
  rowClassName, onRowClick
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    onSearch?.(q)
  }

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDir(newDir)
    onSort?.(key, newDir)
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary" />
  }

  return (
    <div className="premium-card">
      {/* Toolbar */}
      {searchable && (
        <div className="px-5 py-3.5 border-b border-border/40 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="form-input pr-9 h-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(col.headerClassName, col.sortable && 'cursor-pointer hover:bg-muted/50 select-none')}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    {col.label}
                    <SortIcon col={col} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col, j) => (
                      <td key={j}>
                        <div className="skeleton h-4 w-full max-w-[120px] mx-auto rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="empty-state py-14">
                      <div className="empty-state-icon">
                        <Inbox className="w-7 h-7 text-muted-foreground/30" />
                      </div>
                      <p className="empty-state-text">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : data.map((row, i) => (
                <motion.tr
                  key={(row as Record<string, unknown>).id as string || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12, delay: i < 20 ? i * 0.005 : 0 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row)
                  )}
                >
                  {columns.map(col => (
                    <td key={col.key} className={col.className}>
                      {col.render
                        ? col.render((row as Record<string, unknown>)[col.key], row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-border/40 flex items-center justify-between bg-muted/5">
          <p className="text-xs text-muted-foreground font-medium">
            عرض {((pagination.page - 1) * pagination.limit) + 1} إلى{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} من{' '}
            <span className="font-bold text-foreground">{pagination.total}</span> سجل
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn-ghost p-1.5 rounded-lg disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1
              if (totalPages > 5) {
                const start = Math.max(1, pagination.page - 2)
                page = start + i
                if (page > totalPages) return null
              }
              return (
                <button
                  key={page}
                  onClick={() => pagination.onPageChange(page)}
                  className={cn(
                    'w-8 h-8 text-xs rounded-xl transition-all duration-200 font-bold',
                    pagination.page === page
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  {page}
                </button>
              )
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="btn-ghost p-1.5 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
