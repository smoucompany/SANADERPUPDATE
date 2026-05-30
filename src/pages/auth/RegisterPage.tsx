import { motion } from 'framer-motion'
import { BarChart3, Mail, MessageCircle, ArrowRight, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

const SUPPORT_EMAIL    = 'sumooucompany@gmail.com'
const SUPPORT_WHATSAPP = '+966555006855'
const WHATSAPP_URL     = `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}`

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4
                    bg-[#09090b] relative overflow-hidden" dir="rtl">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                          flex items-center justify-center shadow-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">نظام الإدارة المتكامل</p>
            <p className="text-slate-500 text-xs">ERP System</p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-sm
                     shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_32px_80px_rgba(0,0,0,0.5)]">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20
                            border border-indigo-500/30 flex items-center justify-center">
              <Phone className="w-8 h-8 text-indigo-400" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-3">
              التسجيل الذاتي غير متاح حالياً
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              لإنشاء حساب جديد في النظام، يرجى التواصل مع فريق الدعم الفني
              وسيتم تفعيل حسابك في أقرب وقت ممكن.
            </p>
          </div>

          {/* Contact options */}
          <div className="space-y-3">

            {/* WhatsApp */}
            <motion.a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 w-full p-4 rounded-2xl
                         bg-[#25D366]/10 border border-[#25D366]/30
                         hover:bg-[#25D366]/20 hover:border-[#25D366]/50
                         transition-all duration-200 group">
              <div className="w-11 h-11 rounded-xl bg-[#25D366]/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-white text-sm font-semibold">تواصل عبر واتساب</p>
                <p className="text-[#25D366]/80 text-xs mt-0.5 font-mono" dir="ltr">
                  {SUPPORT_WHATSAPP}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#25D366]/50 group-hover:text-[#25D366] transition-colors rotate-180" />
            </motion.a>

            {/* Email */}
            <motion.a
              href={`mailto:${SUPPORT_EMAIL}?subject=طلب إنشاء حساب جديد في نظام الإدارة`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 w-full p-4 rounded-2xl
                         bg-indigo-500/10 border border-indigo-500/30
                         hover:bg-indigo-500/20 hover:border-indigo-500/50
                         transition-all duration-200 group">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-white text-sm font-semibold">تواصل عبر البريد الإلكتروني</p>
                <p className="text-indigo-400/80 text-xs mt-0.5 font-mono" dir="ltr">
                  {SUPPORT_EMAIL}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400/50 group-hover:text-indigo-400 transition-colors rotate-180" />
            </motion.a>

          </div>

          {/* Info note */}
          <div className="mt-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-slate-500 text-xs text-center leading-relaxed">
              أوقات الدعم: السبت — الخميس · ٩ص — ٦م
            </p>
          </div>

          {/* Back to login */}
          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
            <p className="text-slate-500 text-sm">
              لديك حساب بالفعل؟{' '}
              <Link to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                سجّل الدخول
              </Link>
            </p>
          </div>

        </motion.div>

        <p className="text-center text-slate-700 text-xs mt-6">
          © 2025 نظام الإدارة المتكامل · جميع الحقوق محفوظة
        </p>

      </div>
    </div>
  )
}
