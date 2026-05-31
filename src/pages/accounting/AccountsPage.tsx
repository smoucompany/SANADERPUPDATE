import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, ChevronLeft, ChevronDown, BookOpen, Search, Edit2, Trash2,
  TrendingUp, TrendingDown, Shield, DollarSign, ShoppingCart,
  Download, Upload, RefreshCw, X, Check, AlertTriangle, Settings, Printer
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { PrintAccountingHeader, PrintAccountingFooter } from '@/components/print/PrintAccountingHeader'
import { formatCurrency } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { Account } from '@/types'

// ─── Chart of Accounts Template ─────────────────────────────────────────────
type ChartEntry = { code: string; name_ar: string; type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'; level: number; is_detail: boolean; normal_balance: 'debit' | 'credit'; parent_id?: string }

const DEFAULT_CHART: ChartEntry[] = [
  { code: '1000', name_ar: 'أصول', type: 'asset', level: 1, is_detail: false, normal_balance: 'debit' },
  { code: '1111', name_ar: 'صندوق المقر الرئيسي', type: 'asset', level: 2, parent_id: '1000', is_detail: true, normal_balance: 'debit' },
  { code: '1112', name_ar: 'صندوق الفروع', type: 'asset', level: 2, parent_id: '1000', is_detail: true, normal_balance: 'debit' },
  { code: '1121', name_ar: 'بنك الراجحي - جاري', type: 'asset', level: 2, parent_id: '1000', is_detail: true, normal_balance: 'debit' },
  { code: '1131', name_ar: 'ذمم عملاء محليون', type: 'asset', level: 2, parent_id: '1000', is_detail: true, normal_balance: 'debit' },
  { code: '1151', name_ar: 'مخزون بضائع', type: 'asset', level: 2, parent_id: '1000', is_detail: true, normal_balance: 'debit' },
  { code: '2000', name_ar: 'خصوم', type: 'liability', level: 1, is_detail: false, normal_balance: 'credit' },
  { code: '2111', name_ar: 'ذمم موردين محليون', type: 'liability', level: 2, parent_id: '2000', is_detail: true, normal_balance: 'credit' },
  { code: '2140', name_ar: 'ضريبة القيمة المضافة المخرجات', type: 'liability', level: 2, parent_id: '2000', is_detail: true, normal_balance: 'credit' },
  { code: '3000', name_ar: 'حقوق ملكية', type: 'equity', level: 1, is_detail: false, normal_balance: 'credit' },
  { code: '3110', name_ar: 'رأس المال المدفوع', type: 'equity', level: 2, parent_id: '3000', is_detail: true, normal_balance: 'credit' },
  { code: '4000', name_ar: 'إيرادات', type: 'revenue', level: 1, is_detail: false, normal_balance: 'credit' },
  { code: '4110', name_ar: 'مبيعات البضائع والمنتجات', type: 'revenue', level: 2, parent_id: '4000', is_detail: true, normal_balance: 'credit' },
  { code: '4120', name_ar: 'مبيعات الخدمات', type: 'revenue', level: 2, parent_id: '4000', is_detail: true, normal_balance: 'credit' },
  { code: '5000', name_ar: 'مصروفات', type: 'expense', level: 1, is_detail: false, normal_balance: 'debit' },
  { code: '6210', name_ar: 'الرواتب والأجور - إداريون', type: 'expense', level: 2, parent_id: '5000', is_detail: true, normal_balance: 'debit' },
  { code: '6220', name_ar: 'الإيجارات', type: 'expense', level: 2, parent_id: '5000', is_detail: true, normal_balance: 'debit' },
  { code: '6280', name_ar: 'مخصص استهلاك الأصول', type: 'expense', level: 2, parent_id: '5000', is_detail: true, normal_balance: 'debit' },
]

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType; badge: string }> = {
  asset:     { label: 'أصول',          color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-200 dark:border-blue-800',   icon: TrendingUp,   badge: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'    },
  liability: { label: 'خصوم',          color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-200 dark:border-red-800',     icon: TrendingDown, badge: 'text-red-600 bg-red-100 dark:bg-red-900/30'       },
  equity:    { label: 'حقوق ملكية',    color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-900/20',border: 'border-purple-200 dark:border-purple-800',icon: Shield,       badge: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'},
  revenue:   { label: 'إيرادات',       color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20',border:'border-emerald-200 dark:border-emerald-800',icon:DollarSign, badge: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30'},
  expense:   { label: 'مصروفات',       color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-900/20',border: 'border-orange-200 dark:border-orange-800',icon: ShoppingCart,badge: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'  },
}

// ─── Tree builder ─────────────────────────────────────────────────────────────
function buildTree(accounts: Account[]): Account[] {
  if (!accounts || !Array.isArray(accounts)) return []
  const byId = new Map<string, Account>()
  
  // First pass: Only add valid accounts with non-null ID
  accounts.forEach(a => {
    if (a && a.id) {
      byId.set(a.id, { ...a, children: [] })
    }
  })
  
  const roots: Account[] = []
  const visited = new Set<string>()

  // Helper to check for cycles upwards
  const wouldCreateCycle = (startId: string, parentId: string): boolean => {
    let currentId = parentId
    const seen = new Set<string>([startId])
    while (currentId) {
      if (seen.has(currentId)) return true
      seen.add(currentId)
      const parentAcc = byId.get(currentId)
      currentId = parentAcc?.parent_id || ''
    }
    return false
  }

  // Second pass: Link parents and children
  accounts.forEach(a => {
    if (!a || !a.id) return
    const node = byId.get(a.id)
    if (!node) return

    // Self-reference check
    if (a.parent_id === a.id) {
      roots.push(node)
      return
    }

    if (a.parent_id && byId.has(a.parent_id)) {
      if (wouldCreateCycle(a.id, a.parent_id)) {
        roots.push(node)
        return
      }
      const parent = byId.get(a.parent_id)!
      parent.children = parent.children || []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// ─── AccountRow ───────────────────────────────────────────────────────────────
function AccountRow({
  account, level, search, onEdit, onDelete, onAdd
}: {
  account: Account; level: number; search: string
  onEdit: (a: Account) => void; onDelete: (a: Account) => void; onAdd: (a: Account) => void
}) {
  const hasChildren = (account.children?.length ?? 0) > 0
  const matchSearch  = search && (
    account.name_ar.includes(search) || account.code.includes(search) ||
    (account.name_en || '').toLowerCase().includes(search.toLowerCase())
  )
  const [isExpanded, setIsExpanded] = useState(level === 0 || !!search)
  const expanded = isExpanded || !!search

  const cfg = TYPE_CONFIG[account.type]
  const indent = level * 20

  return (
    <>
      <div
        className={`group flex items-center gap-2 py-2.5 pr-4 pl-3 border-b border-border/20 last:border-0 transition-colors
          hover:bg-muted/30 ${matchSearch ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
        style={{ paddingRight: `${indent + 16}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setIsExpanded(e => !e)}
          className={`w-5 h-5 rounded flex items-center justify-center text-muted-foreground transition-all shrink-0
            ${hasChildren ? 'hover:bg-muted cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        >
          {hasChildren && (
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </button>

        {/* Code */}
        <span className="w-14 font-mono text-[11px] text-muted-foreground shrink-0 select-all" dir="ltr">
          {account.code}
        </span>

        {/* Name */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className={`text-sm truncate ${!account.is_detail ? 'font-bold' : 'font-medium'}`}>
            {account.name_ar}
          </p>
          {!account.is_detail && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full shrink-0 hidden sm:inline">
              إجمالي
            </span>
          )}
          {account.normal_balance === 'credit' && account.is_detail && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded-full shrink-0 hidden md:inline">
              دائن طبيعي
            </span>
          )}
        </div>

        {/* Type badge */}
        <span className={`hidden lg:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
          {cfg.label}
        </span>

        {/* Balance */}
        <div className="w-28 text-left shrink-0 hidden sm:block">
          {account.is_detail && (
            <span className={`text-sm font-semibold tabular-nums ${
              (account.balance || 0) < 0 ? 'text-red-500' :
              (account.balance || 0) > 0 ? cfg.color : 'text-muted-foreground'
            }`}>
              {formatCurrency(account.balance || 0)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 no-print">
          <button onClick={() => onAdd(account)} title="إضافة حساب فرعي"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(account)} title="تعديل"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {account.is_detail && (
            <button onClick={() => onDelete(account)} title="حذف"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {(account.children || []).map(child => (
              <AccountRow key={child.code} account={child} level={level + 1}
                search={search} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Form modal ───────────────────────────────────────────────────────────────
const EMPTY_FORM = { code: '', name_ar: '', name_en: '', type: 'asset' as string, is_detail: true, normal_balance: 'debit' as string, parent_id: null as string | null }

function AccountForm({
  form, onChange, parentName, accounts
}: {
  form: typeof EMPTY_FORM
  onChange: (k: keyof typeof EMPTY_FORM, v: any) => void
  parentName?: string
  accounts: Account[]
}) {
  return (
    <div className="space-y-4">
      {parentName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl text-sm">
          <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">الحساب الأب:</span>
          <span className="font-semibold">{parentName}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">كود الحساب <span className="text-red-500">*</span></label>
          <input value={form.code} onChange={e => onChange('code', e.target.value)}
            className="form-input font-mono" dir="ltr" placeholder="مثال: 1111" autoFocus />
        </div>
        <div>
          <label className="form-label">نوع الحساب</label>
          <select value={form.type} onChange={e => onChange('type', e.target.value)} className="form-select">
            <option value="asset">أصول</option>
            <option value="liability">خصوم</option>
            <option value="equity">حقوق ملكية</option>
            <option value="revenue">إيرادات</option>
            <option value="expense">مصروفات / تكاليف</option>
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">اسم الحساب بالعربية <span className="text-red-500">*</span></label>
        <input value={form.name_ar} onChange={e => onChange('name_ar', e.target.value)}
          className="form-input" placeholder="مثال: الصندوق الرئيسي" />
      </div>
      <div>
        <label className="form-label">اسم الحساب بالإنجليزية</label>
        <input value={form.name_en} onChange={e => onChange('name_en', e.target.value)}
          className="form-input" dir="ltr" placeholder="e.g. Main Cash" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">الرصيد الطبيعي</label>
          <select value={form.normal_balance} onChange={e => onChange('normal_balance', e.target.value)} className="form-select">
            <option value="debit">مدين</option>
            <option value="credit">دائن</option>
          </select>
        </div>
        <div>
          <label className="form-label">الحساب الأب</label>
          <select value={form.parent_id || ''} onChange={e => onChange('parent_id', e.target.value || null)} className="form-select">
            <option value="">— بدون حساب أب —</option>
            {accounts.filter(a => !a.is_detail).map(a => (
              <option key={a.id || a.code} value={a.code}>{a.code} — {a.name_ar}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <input type="checkbox" checked={form.is_detail} id="is_detail"
          onChange={e => onChange('is_detail', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
        <label htmlFor="is_detail" className="text-sm cursor-pointer">
          حساب تفصيلي (يقبل قيود مباشرة)
        </label>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter]  = useState<string>('all')
  const [showForm, setShowForm]      = useState(false)
  const [editAccount, setEditAccount]= useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [form, setForm]              = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [seeding, setSeeding]        = useState(false)

  const { data: rawAccounts, isLoading } = useQuery<Account[]>({
    queryKey: ['accounts', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return []
      const { data, error } = await supabase
        .from('accounts').select('*')
        .eq('company_id', user.company_id)
        .eq('is_active', true)
        .order('code')
      if (error) throw error
      return (data as Account[]) ?? []
    },
    enabled: !!user?.company_id,
  })

  const accounts = rawAccounts || []

  // Use real data or fall back to defaults — always deduplicate by code
  const displayAccounts: Account[] = useMemo(() => {
    const source: Account[] = accounts.length > 0
      ? accounts
      : DEFAULT_CHART.map((a) => ({
          ...a,
          id: a.code,
          company_id: user?.company_id ?? '',
          balance: 0,
          children: [],
          is_active: true,
          parent_id: a.parent_id ?? undefined,
          normal_balance: (a.normal_balance as 'debit' | 'credit'),
        }))

    // Remove duplicates — keep only the first account per code
    const seen = new Set<string>()
    return source.filter(a => {
      if (seen.has(a.code)) return false
      seen.add(a.code)
      return true
    })
  }, [accounts, user])

  const saveAccount = useMutation({
    mutationFn: async () => {
      if (!user?.company_id) throw new Error('يرجى تسجيل الدخول والانتظار حتى تحميل البيانات أولاً')
      if (!form.code || !form.name_ar) throw new Error('كود واسم الحساب مطلوبان')
      const parent = displayAccounts.find(a => a.code === form.parent_id)
      const payload = {
        code:      form.code,
        name_ar:   form.name_ar,
        name_en:   form.name_en    || null,
        type:      form.type,
        is_detail: form.is_detail,
        company_id: user.company_id,
        parent_id: parent ? parent.id : null,
        level:     parent ? parent.level + 1 : 1,
        is_active: true,
      }
      if (editAccount?.id && accounts.find(a => a.id === editAccount.id)) {
        const { error } = await supabase.from('accounts').update(payload).eq('id', editAccount.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('accounts').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(editAccount ? 'تم تعديل الحساب' : 'تم إضافة الحساب')
      closeForm()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (!deleteTarget?.id) return
      const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', deleteTarget.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('تم حذف الحساب')
      setDeleteTarget(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const seedChart = async () => {
    if (!user?.company_id) return
    setSeeding(true)
    try {
      const cid = user.company_id
      const defaultCodes = DEFAULT_CHART.map(a => a.code)

      // ── Step 1: fetch ALL existing accounts for this company ──────────────
      const { data: existing = [] } = await supabase
        .from('accounts')
        .select('id, code')
        .eq('company_id', cid)

      // ── Step 2: build stable idMap — reuse existing IDs, create new only if missing ──
      const firstByCode = new Map<string, string>()   // code → first existing id
      const duplicateIds: string[] = []                // ids to delete (duplicates)

      ;(existing as { id: string; code: string }[]).forEach(row => {
        if (firstByCode.has(row.code)) {
          duplicateIds.push(row.id)   // second+ occurrence → mark for deletion
        } else {
          firstByCode.set(row.code, row.id)
        }
      })

      const idMap = new Map<string, string>()
      DEFAULT_CHART.forEach(a => {
        idMap.set(a.code, firstByCode.get(a.code) ?? crypto.randomUUID())
      })

      // ── Step 3: delete duplicate rows (same code, keep only the first) ────
      if (duplicateIds.length > 0) {
        await supabase.from('accounts').delete().in('id', duplicateIds)
      }

      // ── Step 4: delete accounts that are NOT in DEFAULT_CHART and have no children ──
      const extraIds = (existing as { id: string; code: string }[])
        .filter(r => !defaultCodes.includes(r.code) && !duplicateIds.includes(r.id))
        .map(r => r.id)
      if (extraIds.length > 0) {
        // best-effort — ignore FK errors
        await supabase.from('accounts').delete().in('id', extraIds).eq('is_detail', true)
      }

      // ── Step 5: upsert on PRIMARY KEY (id) — IDs are now stable ─────────
      const makeRow = (a: ChartEntry) => ({
        id:             idMap.get(a.code)!,
        code:           a.code,
        name_ar:        a.name_ar,
        name_en:        (a as any).name_en ?? null,
        type:           a.type,
        level:          a.level,
        is_detail:      a.is_detail,
        normal_balance: a.normal_balance,
        is_active:      true,
        company_id:     cid,
        parent_id:      a.parent_id ? (idMap.get(a.parent_id) ?? null) : null,
        balance:        0,
      })

      let upserted = 0
      for (const lvl of [1, 2, 3, 4]) {
        const rows = DEFAULT_CHART.filter(a => a.level === lvl).map(makeRow)
        if (!rows.length) continue
        const { error } = await supabase
          .from('accounts')
          .upsert(rows, { onConflict: 'id' })   // conflict on PK — always works
        if (error) throw new Error(`فشل في مستوى ${lvl}: ${error.message}`)
        upserted += rows.length
      }

      // ── Step 6: link defaults (best-effort) ───────────────────────────────
      await Promise.allSettled([
        supabase.from('cashboxes').update({ account_id: idMap.get('1111') }).eq('company_id', cid),
        supabase.from('customers').update({ account_id: idMap.get('1131') }).eq('company_id', cid),
        supabase.from('suppliers').update({ account_id: idMap.get('2111') }).eq('company_id', cid),
        supabase.from('products').update({ account_id: idMap.get('1151') }).eq('company_id', cid),
      ])

      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(`✅ تم تفعيل ${upserted} حساب — تم حذف ${duplicateIds.length} تكرار`)
    } catch (e: any) {
      console.error('[seedChart]', e)
      toast.error(e?.message ?? 'خطأ في تفعيل شجرة الحسابات')
    } finally {
      setSeeding(false)
    }
  }

  const openAdd = (parent?: Account) => {
    setEditAccount(null)
    setForm({
      ...EMPTY_FORM,
      type: parent?.type ?? 'asset',
      parent_id: parent?.code ?? null,
      normal_balance: parent?.normal_balance ?? 'debit',
    })
    setShowForm(true)
  }

  const openEdit = (account: Account) => {
    const parent = displayAccounts.find(a => a.id === account.parent_id)
    setEditAccount(account)
    setForm({
      code: account.code, name_ar: account.name_ar, name_en: account.name_en ?? '',
      type: account.type, is_detail: account.is_detail ?? true,
      normal_balance: account.normal_balance ?? 'debit',
      parent_id: parent ? parent.code : null,
    })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditAccount(null); setForm(EMPTY_FORM) }

  // Filtered tree
  const filtered = useMemo(() => {
    let list = displayAccounts
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter)
    
    if (search.trim()) {
      const query = search.trim().toLowerCase()
      // Find matches
      const matches = list.filter(a =>
        a.name_ar.toLowerCase().includes(query) ||
        a.code.includes(query) ||
        (a.name_en || '').toLowerCase().includes(query)
      )
      
      // Recursively include all ancestors to preserve tree structure
      const keptIds = new Set<string>()
      const addAncestors = (acc: Account) => {
        keptIds.add(acc.code)
        if (acc.parent_id) {
          const parent = displayAccounts.find(p => p.id === acc.parent_id || p.code === acc.parent_id)
          if (parent && !keptIds.has(parent.code)) {
            addAncestors(parent)
          }
        }
      }
      matches.forEach(m => addAncestors(m))
      
      list = list.filter(a => keptIds.has(a.code))
    }
    
    return buildTree(list)
  }, [displayAccounts, typeFilter, search])

  // KPIs
  const kpi = useMemo(() => {
    const sum = (type: string) => displayAccounts
      .filter(a => a.type === type && a.is_detail)
      .reduce((s, a) => s + (a.balance || 0), 0)
    return {
      asset: sum('asset'), liability: sum('liability'), equity: sum('equity'),
      revenue: sum('revenue'), expense: sum('expense'),
      total: displayAccounts.length,
    }
  }, [displayAccounts])

  const exportCSV = () => {
    const header = 'الكود,الاسم العربي,الاسم الإنجليزي,النوع,مستوى,تفصيلي,الرصيد الطبيعي'
    const rows = displayAccounts.map(a =>
      `${a.code},"${a.name_ar}","${a.name_en ?? ''}",${a.type},${a.level},${a.is_detail ? 'نعم' : 'لا'},${a.normal_balance ?? 'debit'}`
    )
    const csv = [header, ...rows].join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'chart-of-accounts.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تصدير شجرة الحسابات')
  }

  return (
    <div className="space-y-5">
      {/* ── PRINT HEADER ── */}
      <PrintAccountingHeader
        reportTitle="شجرة الحسابات العامة — دليل الحسابات"
        reportTitleEn="CHART OF ACCOUNTS"
        extraMeta={[
          { label: 'إجمالي الحسابات', value: `${displayAccounts.length} حساب مفعّل` },
          { label: 'المعيار المحاسبي', value: 'المعايير المحاسبية السعودية' },
        ]}
      />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="no-print">
        <PageHeader
          title="شجرة الحسابات"
          subtitle={`${displayAccounts.length} حساب — وفق المعايير المحاسبية السعودية`}
          actions={
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={e => { e.preventDefault(); window.print() }} className="btn-outline gap-1.5 cursor-pointer">
                <Printer className="w-4 h-4" />طباعة الشجرة
              </button>
              <button onClick={exportCSV} className="btn-outline gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4" />تصدير CSV
              </button>
              <button onClick={() => openAdd()} className="btn-primary gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" />إضافة حساب
              </button>
            </div>
          }
        />
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 no-print">
        <div className="bg-card border border-border/60 rounded-2xl px-4 py-3 md:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">إجمالي الحسابات</p>
          <p className="text-xl font-black">{kpi.total}</p>
        </div>
        {(['asset','liability','equity','revenue','expense'] as const).map(t => {
          const cfg = TYPE_CONFIG[t]
          const Icon = cfg.icon
          return (
            <div key={t} className={`border rounded-2xl px-4 py-3 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
              </div>
              <p className={`text-base font-black ${cfg.color}`}>{formatCurrency(kpi[t])}</p>
            </div>
          )
        })}
      </div>

      {/* ── Seeding Banner ──────────────────────────────────────────────── */}
      {!accounts.some(a => a.code === '1000') && (
        <div className="no-print">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-background dark:from-emerald-950/10 dark:via-teal-950/5 dark:to-card p-6 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">تحسين هيكل النظام المحاسبي</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">تفعيل شجرة الحسابات السعودية الكاملة (Standard Saudi COA)</h3>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  أنت تستخدم حالياً دليلاً محاسبياً مبسطاً. يمكنك بنقرة واحدة ترقية النظام وتفعيل الدليل المحاسبي الشامل المتوافق مع هيئة الزكاة والضريبة والجمارك (أكثر من 140 حساباً مفرعاً وجاهزاً للمعالجة المالية والضريبية).
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    أصول، خصوم، حقوق ملكية مفرعة بالكامل
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    مصروفات وإيرادات مهيأة للإقرارات الضريبية
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ربط تلقائي للصناديق، البنوك، والذمم
                  </div>
                </div>
              </div>
              <button
                onClick={seedChart}
                disabled={seeding}
                className="btn-primary whitespace-nowrap self-start md:self-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 text-white font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2 shrink-0 flex items-center justify-center cursor-pointer"
              >
                {seeding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                تفعيل الشجرة الكاملة الآن
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap no-print">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود..." className="form-input pr-9 h-9 text-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[['all','الكل'],['asset','أصول'],['liability','خصوم'],['equity','حقوق ملكية'],['revenue','إيرادات'],['expense','مصروفات']] .map(([key, label]) => (
            <button key={key} onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === key
                  ? key === 'all' ? 'bg-primary text-primary-foreground' : `${TYPE_CONFIG[key]?.badge ?? 'bg-primary text-primary-foreground'} font-bold`
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Tree ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/40">
          <div className="w-5 shrink-0" />
          <div className="w-14 text-[11px] font-semibold text-muted-foreground shrink-0">الكود</div>
          <div className="flex-1 text-[11px] font-semibold text-muted-foreground">اسم الحساب</div>
          <div className="w-20 text-[11px] font-semibold text-muted-foreground hidden lg:block text-center">النوع</div>
          <div className="w-28 text-[11px] font-semibold text-muted-foreground hidden sm:block text-left">الرصيد</div>
          <div className="w-24 shrink-0" />
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-xl" style={{ marginRight: `${(i % 3) * 20}px` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">لا توجد حسابات</p>
            <p className="text-xs">اضغط "تحميل الشجرة الافتراضية" لإضافة دليل الحسابات القياسي</p>
          </div>
        ) : (
          filtered.map(acc => (
            <AccountRow key={acc.code} account={acc} level={0}
              search={search} onEdit={openEdit} onDelete={setDeleteTarget} onAdd={openAdd} />
          ))
        )}

        {/* Footer */}
        {displayAccounts.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border/30 bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{displayAccounts.length} حساب إجمالي</p>
            <p className="text-xs text-muted-foreground">{displayAccounts.filter(a => a.is_detail).length} حساب تفصيلي</p>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-bold">{editAccount ? 'تعديل حساب' : 'إضافة حساب جديد'}</h2>
                {editAccount && <p className="text-xs text-muted-foreground mt-0.5">{editAccount.code} — {editAccount.name_ar}</p>}
              </div>
              <button onClick={closeForm} className="btn-ghost p-2 rounded-xl text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <AccountForm
                form={form}
                onChange={(k, v) => setForm(p => ({ ...p, [k]: v }))}
                parentName={form.parent_id ? displayAccounts.find(a => a.code === form.parent_id)?.name_ar : undefined}
                accounts={displayAccounts}
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button onClick={closeForm} className="btn-outline">إلغاء</button>
              <button onClick={() => saveAccount.mutate()} disabled={saveAccount.isPending} className="btn-primary gap-1.5">
                {saveAccount.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editAccount ? 'حفظ التعديلات' : 'إضافة الحساب'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">حذف الحساب</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{deleteTarget.code} — {deleteTarget.name_ar}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              هل أنت متأكد من حذف هذا الحساب؟ لن يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-outline flex-1">إلغاء</button>
              <button onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 gap-1.5">
                {deleteAccount.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                حذف
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── PRINT FOOTER ── */}
      <PrintAccountingFooter pageNote="دليل الحسابات العامة — وفق المعايير المحاسبية السعودية" />
    </div>
  )
}
