import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, Loader2, BarChart3, ShoppingCart, Users, TrendingUp, Package, Shield } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل')
})
type FormData = z.infer<typeof schema>

const FEATURES = [
  { icon: BarChart3,   label: 'لوحة تحكم تحليلية',    color: 'text-blue-400'   },
  { icon: ShoppingCart,label: 'نقطة بيع متكاملة',      color: 'text-emerald-400'},
  { icon: Package,     label: 'إدارة المخزون',         color: 'text-violet-400' },
  { icon: Users,       label: 'إدارة العملاء CRM',     color: 'text-pink-400'   },
  { icon: TrendingUp,  label: 'تقارير مالية شاملة',    color: 'text-amber-400'  },
  { icon: Shield,      label: 'أمان وصلاحيات متقدمة', color: 'text-cyan-400'   },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const { error } = await signIn(data.email, data.password)
    setLoading(false)
    if (error) {
      toast.error(error === 'Invalid login credentials'
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : error)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex" dir="rtl">

      {/* ── Left panel — branding ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden
                      bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]
                      flex-col items-center justify-center p-12">

        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ scale: [1,1.2,1], opacity: [0.3,0.5,0.3] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
          <motion.div animate={{ scale: [1.2,1,1.2], opacity: [0.2,0.4,0.2] }}
            transition={{ duration: 8, repeat: Infinity, delay: 1 }}
            className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <motion.div animate={{ scale: [1,1.3,1], opacity: [0.15,0.3,0.15] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 max-w-md text-center">
          {/* Logo */}
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl
                            bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center
                            shadow-[0_0_60px_rgba(99,102,241,0.5)]">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              نظام الإدارة
              <span className="block text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-violet-400">
                المتكامل
              </span>
            </h1>
            <p className="text-slate-400 text-lg mb-10">
              حلول ERP متكاملة للمشاريع السعودية
            </p>
          </motion.div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.label}
                initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm
                           border border-white/10 rounded-xl px-3 py-2.5
                           hover:bg-white/10 transition-colors">
                <f.icon className={`w-4 h-4 shrink-0 ${f.color}`} />
                <span className="text-slate-300 text-xs font-medium text-right">{f.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Bottom badge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            className="mt-10 inline-flex items-center gap-2 bg-white/5 border border-white/10
                       rounded-full px-4 py-2 text-slate-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            متوافق مع هيئة الزكاة والضريبة — ZATCA
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10
                      bg-[#09090b] relative overflow-hidden">

        {/* Subtle bg pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="w-full max-w-md relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">نظام الإدارة المتكامل</p>
              <p className="text-slate-500 text-xs">ERP System</p>
            </div>
          </div>

          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">مرحباً بعودتك 👋</h2>
              <p className="text-slate-400 text-sm">سجّل دخولك للمتابعة إلى حسابك</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  {...register('email')}
                  type="email" dir="ltr"
                  placeholder="example@company.com"
                  className="w-full h-12 px-4 rounded-xl
                             bg-white/5 border border-white/10
                             text-white placeholder:text-slate-600
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
                             transition-all text-sm"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <span>⚠</span> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">كلمة المرور</label>
                  <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••" dir="ltr"
                    className="w-full h-12 px-4 pl-12 rounded-xl
                               bg-white/5 border border-white/10
                               text-white placeholder:text-slate-600
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
                               transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <span>⚠</span> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-xl font-semibold text-sm
                           bg-gradient-to-l from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500
                           text-white flex items-center justify-center gap-2
                           disabled:opacity-60 disabled:cursor-not-allowed
                           transition-all duration-200
                           shadow-[0_4px_24px_rgba(99,102,241,0.4)]
                           hover:shadow-[0_4px_32px_rgba(99,102,241,0.6)]">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />جاري تسجيل الدخول...</>
                  : <><LogIn className="w-4 h-4" />تسجيل الدخول</>}
              </motion.button>
            </form>

            {/* Register link */}
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-slate-500 text-sm">
                ليس لديك حساب؟{' '}
                <Link to="/register"
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  أنشئ حساباً مجاناً
                </Link>
              </p>
            </div>

          </motion.div>

          <p className="text-center text-slate-700 text-xs mt-8">
            © 2025 نظام الإدارة المتكامل · جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  )
}
