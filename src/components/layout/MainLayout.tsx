import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSettingsStore } from '@/store/settingsStore'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isDesktop
}

export default function MainLayout() {
  const { sidebarCollapsed, closeMobileSidebar } = useSettingsStore()
  const location  = useLocation()
  const isDesktop = useIsDesktop()

  // Close mobile drawer on route change
  useEffect(() => { closeMobileSidebar() }, [location.pathname])

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobileSidebar() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  // Only apply margin on desktop — on mobile content takes full width
  const marginRight = isDesktop ? (sidebarCollapsed ? 68 : 256) : 0

  return (
    <div className="min-h-screen bg-background">

      {/* Sidebar handles its own mobile drawer + backdrop */}
      <div className="no-print">
        <Sidebar />
      </div>

      {/* Main content */}
      <motion.div
        animate={{ marginRight }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col min-h-screen"
      >
        <div className="no-print">
          <Header />
        </div>
        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 overflow-x-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
    </div>
  )
}
