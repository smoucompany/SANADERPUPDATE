import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Warehouse, Cashbox, Shift } from '@/types'

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_SHIFT   = 'pos_active_shift'
const LS_CASHBOX = 'pos_cashboxes'

function localShift(): Shift | null {
  try { return JSON.parse(localStorage.getItem(LS_SHIFT) || 'null') } catch { return null }
}
function saveLocalShift(s: Shift | null) {
  if (s) localStorage.setItem(LS_SHIFT, JSON.stringify(s))
  else    localStorage.removeItem(LS_SHIFT)
}
function localCashboxes(): Cashbox[] {
  try { return JSON.parse(localStorage.getItem(LS_CASHBOX) || '[]') } catch { return [] }
}
function saveLocalCashboxes(boxes: Cashbox[]) {
  localStorage.setItem(LS_CASHBOX, JSON.stringify(boxes))
}

// ─── Warehouses ───────────────────────────────────────────────────────────────
export function useWarehouses() {
  const { user } = useAuthStore()
  return useQuery<Warehouse[]>({
    queryKey: ['warehouses', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      try {
        const { data, error } = await supabase
          .from('warehouses').select('*')
          .eq('company_id', user.company_id)
          .eq('is_active', true)
          .order('name_ar')
        if (error || !data?.length) {
          // Return a default warehouse so POS can still complete sales
          return [{ id: 'default-wh', company_id: user.company_id, name_ar: 'المستودع الرئيسي', name_en: 'Main Warehouse', is_active: true, is_default: true, address: '' } as Warehouse]
        }
        return data as Warehouse[]
      } catch {
        return [{ id: 'default-wh', company_id: user?.company_id ?? '', name_ar: 'المستودع الرئيسي', name_en: 'Main Warehouse', is_active: true, is_default: true, address: '' } as Warehouse]
      }
    },
    enabled: !!user,
  })
}

// ─── Cashboxes ────────────────────────────────────────────────────────────────
export function useCashboxes() {
  const { user } = useAuthStore()
  return useQuery<Cashbox[]>({
    queryKey: ['cashboxes', user?.company_id],
    queryFn: async () => {
      if (!user) return []

      // 1. Try Supabase
      try {
        const { data, error } = await supabase
          .from('cashboxes').select('*')
          .eq('company_id', user.company_id)
          .eq('is_active', true)
        if (!error && data && data.length > 0) {
          saveLocalCashboxes(data as Cashbox[])
          return data as Cashbox[]
        }
      } catch { /* fall through */ }

      // 2. Check localStorage cache
      const cached = localCashboxes()
      if (cached.length > 0) return cached

      // 3. Create a default local cashbox so POS always has one
      const defaultBox: Cashbox = {
        id: 'local-cashbox-1',
        company_id: user.company_id,
        name_ar: 'الصندوق الرئيسي',
        name_en: 'Main Cashbox',
        balance: 0,
        is_active: true,
        is_default: true,
      }
      saveLocalCashboxes([defaultBox])
      return [defaultBox]
    },
    enabled: !!user,
    retry: false,
  })
}

// ─── Active Shift ─────────────────────────────────────────────────────────────
export function useActiveShift() {
  const { user } = useAuthStore()
  return useQuery<Shift | null>({
    queryKey: ['active-shift', user?.id],
    queryFn: async () => {
      if (!user) return null

      // 1. Try Supabase with 4-second timeout
      try {
        const dbPromise = Promise.resolve(
          supabase
            .from('shifts')
            .select('*, cashbox:cashboxes(name_ar)')
            .eq('user_id', user.id)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ).then(({ data }) => data as Shift | null).catch(() => null)

        const timeout = new Promise<null>(r => setTimeout(() => r(null), 4000))
        const dbResult = await Promise.race([dbPromise, timeout])

        if (dbResult) {
          saveLocalShift(dbResult)
          return dbResult
        }
      } catch { /* fall through */ }

      // 2. Fall back to localStorage
      return localShift()
    },
    enabled: !!user,
    retry: false,
    refetchInterval: 60000,
  })
}

// ─── Open Shift (exported for POSPage to use directly) ───────────────────────
export async function openShift(params: {
  userId: string
  companyId: string
  cashboxId: string
  openingBalance: number
  notes?: string
}): Promise<{ shift: Shift; isLocal: boolean }> {
  const shift: Shift = {
    id: crypto.randomUUID(),
    company_id: params.companyId,
    cashbox_id: params.cashboxId,
    user_id: params.userId,
    status: 'open',
    opening_balance: params.openingBalance,
    expected_balance: params.openingBalance,
    opened_at: new Date().toISOString(),
    notes: params.notes,
  }

  // Try Supabase first
  try {
    // Check for existing open shift
    const { data: existing } = await supabase
      .from('shifts').select('id').eq('user_id', params.userId).eq('status', 'open').limit(1).maybeSingle()
    if (existing) throw new Error('يوجد عهدة مفتوحة بالفعل. يرجى إغلاقها أولاً.')

    const { data, error } = await supabase.from('shifts').insert({
      id: shift.id,
      company_id: shift.company_id,
      cashbox_id: shift.cashbox_id,
      user_id: shift.user_id,
      opening_balance: shift.opening_balance,
      expected_balance: shift.expected_balance,
      status: 'open',
      opened_at: shift.opened_at,
      notes: shift.notes || null,
    }).select().single()

    if (!error && data) {
      const saved = data as Shift
      saveLocalShift(saved)
      return { shift: saved, isLocal: false }
    }
  } catch (e: any) {
    if (e.message?.includes('يوجد عهدة')) throw e
    // DB unavailable — fall through to local
  }

  // Save locally
  saveLocalShift(shift)
  return { shift, isLocal: true }
}

// ─── Close Shift (exported for POSPage to use directly) ──────────────────────
export async function closeShift(shiftId: string, closingBalance: number, expectedBalance: number): Promise<void> {
  const diff = closingBalance - expectedBalance

  // Try Supabase
  try {
    const { error } = await supabase.from('shifts').update({
      status: 'closed',
      closing_balance: closingBalance,
      expected_balance: expectedBalance,
      difference: diff,
      closed_at: new Date().toISOString(),
    }).eq('id', shiftId)
    if (!error) { saveLocalShift(null); return }
  } catch { /* fall through */ }

  // Local fallback
  saveLocalShift(null)
}
