import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header  from './Header'
import { useSettingsStore } from '@/store/settingsStore'

function useIsDesktop() {
  const [v, setV] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const fn = () => setV(window.innerWidth >= 1024)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return v
}

export default function MainLayout() {
  const { sidebarCollapsed, closeMobileSidebar } = useSettingsStore()
  const location  = useLocation()
  const isDesktop = useIsDesktop()

  useEffect(() => { closeMobileSidebar() }, [location.pathname])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobileSidebar() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const marginRight = isDesktop ? (sidebarCollapsed ? 68 : 256) : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print">
        <Sidebar />
      </div>

      {/* Sidebar margin — CSS transition بدل framer-motion لأداء أفضل */}
      <div
        className="flex flex-col min-h-screen transition-[margin-right] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginRight }}
      >
        <div className="no-print">
          <Header />
        </div>

        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 overflow-x-hidden">
          {/* انتقال خفيف — opacity فقط، بدون Y shift الذي يبطّئ الإحساس */}
          <div
            key={location.pathname}
            className="animate-fadeIn"
          >
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </div>
  )
}
