import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Company } from '@/types'

interface AuthState {
  user:            User | null
  company:         Company | null
  session:         unknown | null
  isLoading:       boolean
  isAuthenticated: boolean
  setUser:         (user: User | null) => void
  setCompany:      (company: Company | null) => void
  setSession:      (session: unknown) => void
  signIn:          (email: string, password: string) => Promise<{ error: string | null }>
  signOut:         () => Promise<void>
  loadUserProfile: () => Promise<void>
  hasPermission:   (module: string, action: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      company:         null,
      session:         null,
      isLoading:       false,
      isAuthenticated: false,

      setUser:    (user)    => set({ user, isAuthenticated: !!user }),
      setCompany: (company) => set({ company }),
      setSession: (session) => set({ session }),

      signIn: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) { set({ isLoading: false }); return { error: error.message } }
          set({ session: data.session, isAuthenticated: true })
          await get().loadUserProfile()
          return { error: null }
        } catch {
          set({ isLoading: false })
          return { error: 'حدث خطأ غير متوقع' }
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, company: null, session: null, isAuthenticated: false, isLoading: false })
      },

      loadUserProfile: async () => {
        set({ isLoading: true })
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) {
            set({ user: null, company: null, isAuthenticated: false, isLoading: false })
            return
          }

          // Fetch only needed columns — much faster than select('*')
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, company_id, role, full_name, phone, avatar_url, is_active, permissions, last_login')
            .eq('id', authUser.id)
            .single()

          if (profileError || !profile) {
            // DB unreachable — keep auth state from persisted store
            set({ isLoading: false, isAuthenticated: true })
            return
          }

          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, name_ar, name_en, logo_url, address, phone, email, tax_number, commercial_reg, currency, vat_rate, settings')
            .eq('id', profile.company_id)
            .single()

          // Update last_login silently in background
          supabase.from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', authUser.id)
            .then(() => {})

          set({
            user:            { ...profile, email: authUser.email } as User,
            company:         companyError ? get().company : company as Company,
            isAuthenticated: true,
            isLoading:       false,
          })
        } catch (e) {
          console.error('[auth]', e)
          set({ isLoading: false, isAuthenticated: true })
        }
      },

      hasPermission: (module, action) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'admin') return true
        const perms = user.permissions as Record<string, boolean> | null
        return perms?.[`${module}:${action}`] === true
      },
    }),
    {
      name: 'erp-auth',
      partialize: (s) => ({
        user:            s.user,
        company:         s.company,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
