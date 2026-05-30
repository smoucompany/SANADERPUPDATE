import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean   // mobile drawer state
  language: string
  vatRate: number
  currency: string
  companyName: string
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  setLanguage: (lang: string) => void
  setCompanySettings: (settings: { vatRate?: number; currency?: string; companyName?: string }) => void
  applyTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      language: 'ar',
      vatRate: 15,
      currency: 'SAR',
      companyName: 'نظام الإدارة المتكامل',

      setTheme: (theme) => {
        set({ theme })
        get().applyTheme()
      },

      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleMobileSidebar: () => set(state => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),
      closeMobileSidebar: () => set({ sidebarMobileOpen: false }),
      setLanguage: (language) => set({ language }),

      setCompanySettings: (settings) => set(prev => ({ ...prev, ...settings })),

      applyTheme: () => {
        const { theme } = get()
        const root = document.documentElement
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }),
    { name: 'erp-settings' }
  )
)
