import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Company } from '@/types'

interface AuthState {
  user: User | null
  company: Company | null
  session: unknown | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setCompany: (company: Company | null) => void
  setSession: (session: unknown) => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  loadUserProfile: () => Promise<void>
  hasPermission: (module: string, action: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setCompany: (company) => set({ company }),
      setSession: (session) => set({ session }),

      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) return { error: error.message }
          set({ session: data.session, isAuthenticated: true })
          get().loadUserProfile()
          return { error: null }
        } catch (err) {
          return { error: 'حدث خطأ غير متوقع' }
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, company: null, session: null, isAuthenticated: false })
      },

      loadUserProfile: async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) {
            set({ user: null, company: null, isAuthenticated: false, isLoading: false })
            return
          }

          // Race profile fetch against 8s timeout so we never hang
          const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
            Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))])

          const profileResult = await withTimeout(
            Promise.resolve(supabase.from('users').select('*').eq('id', authUser.id).single())
              .then(r => r.data),
            8000
          )

          if (!profileResult) {
            // DB unreachable or no profile — stay authenticated if we have persisted data
            set({ isLoading: false, isAuthenticated: true })
            return
          }

          const companyResult = await withTimeout(
            Promise.resolve(supabase.from('companies').select('*').eq('id', (profileResult as any).company_id).single())
              .then(r => r.data),
            8000
          )

          // Update last_login in background (don't await)
          supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', authUser.id).then(() => {})

          set({
            user: { ...profileResult, email: authUser.email } as User,
            company: companyResult as Company,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (e) {
          console.error('[auth] exception:', e)
          set({ isLoading: false, isAuthenticated: true })
        }
      },

      hasPermission: (module, action) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'admin') return true
        const key = `${module}:${action}`
        return user.permissions?.[key] === true
      }
    }),
    {
      name: 'erp-auth',
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
