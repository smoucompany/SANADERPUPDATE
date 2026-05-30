import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-500/[0.06] rounded-full blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-8 relative"
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-18 h-18 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600
                     flex items-center justify-center
                     shadow-[0_8px_40px_rgba(59,130,246,0.3)]"
          style={{ width: 72, height: 72 }}
        >
          <Sparkles className="w-9 h-9 text-white" />
        </motion.div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">نظام الإدارة المتكامل</h2>
          <p className="text-xs text-muted-foreground/50 font-semibold tracking-[0.25em] uppercase">SANAD ERP SYSTEM</p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-primary/70"
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
