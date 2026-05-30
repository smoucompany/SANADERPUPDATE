import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'destructive' | 'warning' | 'default'
  loading?: boolean
}

export default function ConfirmDialog({
  open, title = 'تأكيد', message, confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء', onConfirm, onCancel, variant = 'destructive', loading
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.15)] p-6 w-full max-w-sm z-10"
          >
            <button onClick={onCancel} className="absolute left-4 top-4 btn-ghost p-1.5 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm
                ${variant === 'destructive' ? 'bg-destructive/10 text-destructive' :
                  variant === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' :
                  'bg-primary/10 text-primary'}`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{message}</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={onCancel} className="btn-outline flex-1 justify-center">
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 justify-center ${variant === 'destructive' ? 'btn-destructive' : 'btn-primary'}`}
                >
                  {loading ? '...' : confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
