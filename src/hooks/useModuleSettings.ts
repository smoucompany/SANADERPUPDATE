import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

// Reads and writes a JSON settings blob from/to the company_settings table.
// Falls back to localStorage so the app works even if the table is missing.
export function useModuleSettings<T extends Record<string, unknown>>(
  key: string,
  defaults: T
): {
  settings: T
  isLoading: boolean
  isSaving: boolean
  save: (patch: Partial<T>, silent?: boolean) => Promise<void>
} {
  const { user } = useAuthStore()
  const lsKey = `module_settings_${key}_${user?.company_id ?? 'local'}`

  const readLocal = (): Partial<T> => {
    try { return JSON.parse(localStorage.getItem(lsKey) ?? '{}') } catch { return {} }
  }
  const writeLocal = (data: T) => {
    try { localStorage.setItem(lsKey, JSON.stringify(data)) } catch {}
  }

  const [settings, setSettings] = useState<T>({ ...defaults, ...readLocal() })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load from Supabase on mount
  useEffect(() => {
    if (!user?.company_id) return
    let cancelled = false
    setIsLoading(true)

    Promise.resolve(
      supabase
        .from('company_settings')
        .select('value')
        .eq('company_id', user.company_id)
        .eq('key', key)
        .maybeSingle()
    ).then(({ data }) => {
      if (cancelled) return
      if (data?.value) {
        try {
          const remote = JSON.parse(data.value) as Partial<T>
          const merged = { ...defaults, ...remote }
          setSettings(merged)
          writeLocal(merged)
        } catch {}
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company_id, key])

  const save = useCallback(async (patch: Partial<T>, silent = false) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    writeLocal(next)
    setIsSaving(true)

    try {
      if (user?.company_id) {
        const { error } = await supabase
          .from('company_settings')
          .upsert(
            { company_id: user.company_id, key, value: JSON.stringify(next) },
            { onConflict: 'company_id,key' }
          )
        if (error) throw error
      }
      if (!silent) toast.success('تم حفظ الإعدادات')
    } catch {
      if (!silent) toast.success('تم حفظ الإعدادات محلياً')
    } finally {
      setIsSaving(false)
    }
  }, [settings, user?.company_id, key])

  return { settings, isLoading, isSaving, save }
}
