import { useNavigate } from 'react-router-dom'
import { Home, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="text-8xl font-black text-primary/20 mb-4 select-none">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">الصفحة غير موجودة</h1>
        <p className="text-muted-foreground mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-outline gap-1.5">
            <ArrowRight className="w-4 h-4" />رجوع
          </button>
          <button onClick={() => navigate('/')} className="btn-primary gap-1.5">
            <Home className="w-4 h-4" />الرئيسية
          </button>
        </div>
      </motion.div>
    </div>
  )
}
