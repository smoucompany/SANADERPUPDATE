import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Printer, Pause, X, ChevronDown, Barcode, User,
  Percent, Tag, CheckCircle2, XCircle, Loader2,
  Package, AlertTriangle, DollarSign, Wallet,
  Clock, Building2, Banknote, Vault, Timer,
  LogOut, TrendingUp, ArrowRight, Home
} from 'lucide-react'
import { usePOSStore } from '@/store/posStore'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { useWarehouses, useCashboxes, useActiveShift, openShift, closeShift } from '@/hooks/useWarehouses'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import type { Customer, Product, CartItem } from '@/types'
import toast from 'react-hot-toast'
import Modal from '@/components/shared/Modal'
import { useQueryClient } from '@tanstack/react-query'

// ─────────────────────────────────────────────────────────────
// Shift timer
// ─────────────────────────────────────────────────────────────
function useShiftTimer(openedAt?: string) {
  const [elapsed, setElapsed] = useState('00:00:00')
  useEffect(() => {
    if (!openedAt) return
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000)
      const h = Math.floor(diff / 3600).toString().padStart(2, '0')
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [openedAt])
  return elapsed
}

// ─────────────────────────────────────────────────────────────
// Open Session Screen (full-screen — renders outside MainLayout)
// ─────────────────────────────────────────────────────────────
function POSOpenSession({ onOpened }: { onOpened: () => void }) {
  const navigate = useNavigate()
  const { user, company } = useAuthStore()
  const qc = useQueryClient()
  const { data: cashboxes = [], isLoading: cashboxLoading } = useCashboxes()

  const [cashboxId, setCashboxId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const dateStr = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  // useCashboxes always returns at least one local cashbox — no auto-create needed

  useEffect(() => {
    if (cashboxes.length > 0 && !cashboxId) {
      const def = cashboxes.find(c => c.is_default) || cashboxes[0]
      setCashboxId(def.id)
    }
  }, [cashboxes, cashboxId])


  const addPreset = (v: number) => setAmount(p => String((parseFloat(p) || 0) + v))

  const handleOpen = async () => {
    setError('')
    const float = parseFloat(amount)
    if (!amount || isNaN(float)) { setError('يرجى إدخال مبلغ الصندوق الافتتاحي'); return }
    if (float < 0) { setError('المبلغ لا يمكن أن يكون سالباً'); return }
    if (!cashboxId) { setError('يرجى اختيار الصندوق'); return }

    setLoading(true)
    try {
      await openShift({
        userId: user!.id,
        companyId: user!.company_id,
        cashboxId,
        openingBalance: float,
        notes: notes || undefined,
      })
      setSuccess(true)
      qc.invalidateQueries({ queryKey: ['active-shift'] })
      setTimeout(() => onOpened(), 1500)
    } catch (e: any) {
      setError(e.message || 'حدث خطأ')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-5 text-white">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6, delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          <h2 className="text-2xl font-bold">تم فتح العهدة بنجاح</h2>
          <p className="text-emerald-300 text-sm">جاري الانتقال إلى نقطة البيع...</p>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }} />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col relative overflow-hidden">

      {/* Back button */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm font-medium transition-all">
          <Home className="w-4 h-4" />
          العودة للنظام
        </button>
      </div>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-md">

          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-indigo-500 to-blue-600
                            flex items-center justify-center mx-auto mb-4
                            shadow-[0_8px_32px_rgba(99,102,241,0.5)]">
              <Vault className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1.5">فتح عهدة نقطة البيع</h1>
            <p className="text-indigo-200/70 text-sm leading-relaxed">
              يرجى إدخال الرصيد الافتتاحي للصندوق قبل بدء العمل
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5">

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'الكاشير', icon: User, value: user?.full_name },
                { label: 'الشركة', icon: Building2, value: company?.name_ar || '—' },
                { label: 'الوقت', icon: Clock, value: timeStr },
                { label: 'العملة', icon: Banknote, value: company?.currency || 'SAR' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-2xl px-3.5 py-3">
                  <p className="text-[10px] text-indigo-300 font-medium mb-1 flex items-center gap-1.5">
                    <s.icon className="w-3 h-3" />{s.label}
                  </p>
                  <p className="text-white font-semibold text-sm truncate">{s.value}</p>
                </div>
              ))}
            </div>

            <div>
              <label className="text-[12px] font-semibold text-indigo-200 mb-1.5 block">الصندوق</label>
              <select value={cashboxId} onChange={e => setCashboxId(e.target.value)} disabled={cashboxLoading}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer">
                {cashboxLoading
                  ? <option>جاري التحميل...</option>
                  : cashboxes.length === 0
                    ? <option value="">لا توجد صناديق — أضف صندوقاً من الإعدادات</option>
                    : cashboxes.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name_ar}</option>)
                }
              </select>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-indigo-200 mb-1.5 block">
                مبلغ الصندوق الافتتاحي
              </label>
              <div className="relative">
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="text-indigo-300 font-medium text-sm">{company?.currency || 'SAR'}</span>
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOpen()}
                  placeholder="0.00" min="0" step="0.01" dir="ltr"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-4 pr-16 py-4
                             text-white text-3xl font-bold text-left placeholder:text-white/25
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {[100, 200, 500, 1000, 2000].map(v => (
                  <button key={v} onClick={() => addPreset(v)}
                    className="flex-1 min-w-[52px] py-2 rounded-xl text-xs font-bold text-emerald-300
                               bg-emerald-500/15 border border-emerald-500/30
                               hover:bg-emerald-500/25 hover:text-emerald-200 transition-colors">
                    +{v}
                  </button>
                ))}
                <button onClick={() => setAmount('')}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-300
                             bg-rose-500/15 border border-rose-500/30
                             hover:bg-rose-500/25 transition-colors">
                  تصفير
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-indigo-200 mb-1.5 block">ملاحظات (اختياري)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="ملاحظات الوردية..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white
                           placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 rounded-xl px-3.5 py-2.5 text-rose-300 text-sm overflow-hidden">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={handleOpen} disabled={loading || cashboxes.length === 0}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-base
                         bg-gradient-to-l from-indigo-600 to-blue-600
                         hover:from-indigo-500 hover:to-blue-500
                         active:scale-[0.98] transition-all duration-150
                         shadow-[0_4px_20px_rgba(99,102,241,0.5)]
                         flex items-center justify-center gap-2.5
                         disabled:opacity-60 disabled:cursor-not-allowed">
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" />جاري فتح العهدة...</>
                : <><Vault className="w-5 h-5" />فتح الوردية</>
              }
            </button>

            <p className="text-center text-[11px] text-indigo-300/60">{dateStr}</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Close Shift Modal
// ─────────────────────────────────────────────────────────────
function CloseShiftModal({ shift, onClose }: { shift: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [actual, setActual] = useState('')
  const [loading, setLoading] = useState(false)

  const opening = shift?.opening_balance || 0
  const expected = shift?.expected_balance || opening
  const actualNum = parseFloat(actual) || 0
  const diff = actualNum - expected

  const handleClose = async () => {
    if (!actual) { toast.error('أدخل الرصيد الفعلي'); return }
    setLoading(true)
    try {
      await closeShift(shift.id, actualNum, expected)
      qc.invalidateQueries({ queryKey: ['active-shift'] })
      toast.success('تم إغلاق الوردية بنجاح')
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'رصيد الافتتاح', value: formatCurrency(opening), color: 'text-blue-600' },
          { label: 'الرصيد المتوقع', value: formatCurrency(expected), color: 'text-indigo-600' },
        ].map(s => (
          <div key={s.label} className="bg-muted/50 rounded-xl px-4 py-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">{s.label}</p>
            <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <label className="form-label">الرصيد الفعلي في الصندوق</label>
        <input type="number" value={actual} onChange={e => setActual(e.target.value)}
          className="form-input text-xl text-center font-bold" dir="ltr" placeholder="0.00" autoFocus />
      </div>

      {actual && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm
            ${diff >= 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700'}`}>
          <span>{diff >= 0 ? 'فائض في الصندوق' : 'عجز في الصندوق'}</span>
          <span>{diff >= 0 ? '+' : ''}{formatCurrency(Math.abs(diff))}</span>
        </motion.div>
      )}

      <button onClick={handleClose} disabled={loading || !actual} className="btn-destructive w-full justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
        تأكيد إغلاق الوردية
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Payment Modal
// ─────────────────────────────────────────────────────────────
function PaymentModal({ total, customer, onConfirm, onClose }: {
  total: number
  customer: { name_ar: string } | null
  onConfirm: (method: string, paid: number) => void
  onClose: () => void
}) {
  const [method, setMethod]         = useState('cash')
  const [paidAmount, setPaidAmount] = useState(total.toFixed(2))
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [downPayment, setDownPayment]   = useState('')

  const paid      = parseFloat(paidAmount) || 0
  const change    = Math.max(0, paid - total)
  const down      = parseFloat(downPayment) || 0
  const remaining = Math.max(0, total - down)
  const isDeferred = method === 'deferred'

  const METHODS = [
    { value: 'cash',     label: 'نقدي',   icon: DollarSign, color: 'text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' },
    { value: 'mada',     label: 'مدى',    icon: CreditCard, color: 'text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/20' },
    { value: 'transfer', label: 'تحويل',  icon: TrendingUp, color: 'text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-900/20' },
    { value: 'deferred', label: 'آجل',    icon: Tag,        color: 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20' },
  ]

  const handleConfirm = () => {
    if (isDeferred && !customer) {
      alert('يجب اختيار عميل للبيع الآجل')
      return
    }
    const finalPaid = isDeferred
      ? (splitEnabled ? down : 0)
      : Math.min(paid, total)
    onConfirm(method, finalPaid)
  }

  return (
    <div className="space-y-4">

      {/* Total */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 text-center">
        <p className="text-sm text-muted-foreground mb-1">الإجمالي المطلوب</p>
        <p className="text-4xl font-black text-primary tabular-nums">{formatCurrency(total)}</p>
      </div>

      {/* Payment methods */}
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map(m => (
          <button key={m.value} onClick={() => { setMethod(m.value); setSplitEnabled(false) }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all
              ${method === m.value
                ? `${m.color} border-current`
                : 'border-border hover:border-primary/40 text-muted-foreground'}`}>
            <m.icon className="w-5 h-5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Cash: show paid + change */}
      {method === 'cash' && (
        <div className="space-y-3">
          <div>
            <label className="form-label">المبلغ المستلم</label>
            <div className="flex gap-2 flex-wrap mt-1.5 mb-2">
              {[total, Math.ceil(total/50)*50, Math.ceil(total/100)*100].filter((v,i,a)=>a.indexOf(v)===i).map(v => (
                <button key={v} onClick={() => setPaidAmount(v.toFixed(2))}
                  className="px-2.5 py-1 bg-muted rounded-lg text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors">
                  {formatCurrency(v)}
                </button>
              ))}
            </div>
            <input value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
              type="number" className="form-input text-2xl font-bold text-center" dir="ltr" autoFocus />
          </div>
          <AnimatePresence>
            {change > 0 && (
              <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">الباقي للعميل</span>
                <span className="text-xl font-black text-emerald-600">{formatCurrency(change)}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Deferred: customer + optional split */}
      {isDeferred && (
        <div className="space-y-3">
          {/* Customer info */}
          <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 ${
            customer ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'
          }`}>
            <User className={`w-5 h-5 shrink-0 ${customer ? 'text-emerald-600' : 'text-red-500'}`} />
            <div className="flex-1">
              {customer ? (
                <>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{customer.name_ar}</p>
                  <p className="text-xs text-emerald-600/70">عميل محدد — جاهز للبيع الآجل</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-red-600">لا يوجد عميل محدد</p>
                  <p className="text-xs text-red-500">يجب اختيار عميل للبيع الآجل</p>
                </>
              )}
            </div>
            {customer ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
          </div>

          {/* Split payment toggle */}
          <button onClick={() => setSplitEnabled(!splitEnabled)}
            className={`flex items-center gap-2 w-full p-3 rounded-xl border text-sm font-medium transition-all ${
              splitEnabled ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
            }`}>
            <Percent className="w-4 h-4" />
            تقسيم المبلغ (دفعة مقدمة + آجل)
            <span className={`mr-auto text-xs px-2 py-0.5 rounded-full ${splitEnabled ? 'bg-primary text-white' : 'bg-muted'}`}>
              {splitEnabled ? 'مفعّل' : 'غير مفعّل'}
            </span>
          </button>

          {/* Split details */}
          <AnimatePresence>
            {splitEnabled && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                className="overflow-hidden space-y-3">
                <div>
                  <label className="form-label">الدفعة المقدمة الآن</label>
                  <input value={downPayment} onChange={e => setDownPayment(e.target.value)}
                    type="number" min="0" max={total} placeholder="0.00"
                    className="form-input text-xl font-bold text-center" dir="ltr" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">مدفوع الآن</p>
                    <p className="font-black text-emerald-600 text-lg">{formatCurrency(down)}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">المتبقي آجل</p>
                    <p className="font-black text-amber-600 text-lg">{formatCurrency(remaining)}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full deferred summary */}
          {!splitEnabled && (
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-amber-700">إجمالي الآجل</span>
              <span className="text-xl font-black text-amber-600">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      )}

      {/* Confirm button */}
      <button onClick={handleConfirm}
        disabled={isDeferred && !customer}
        className="btn-primary w-full justify-center text-base py-3.5 gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        <CheckCircle2 className="w-5 h-5" />
        {isDeferred
          ? splitEnabled ? `تأكيد — دفعة ${formatCurrency(down)} + آجل ${formatCurrency(remaining)}`  : 'تأكيد البيع الآجل'
          : 'تأكيد الدفع'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Cart Item Row
// ─────────────────────────────────────────────────────────────
function CartItemRow({ item, onUpdate, onRemove }: {
  item: CartItem; onUpdate: (id: string, qty: number) => void; onRemove: (id: string) => void
}) {
  return (
    <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.product_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(item.unit_price)} × {item.quantity}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onUpdate(item.id, item.quantity - 1)}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
        <button onClick={() => onUpdate(item.id, item.quantity + 1)}
          className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold">{formatCurrency(item.total)}</p>
        <button onClick={() => onRemove(item.id)} className="text-destructive/60 hover:text-destructive mt-0.5 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// Product Card
// ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const stock = product.current_stock ?? 0
  const lowStock = product.track_inventory && stock <= (product.min_stock_alert || 0)
  const outOfStock = product.track_inventory && !product.allow_negative_stock && stock <= 0

  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={`pos-product-card text-right flex flex-col relative ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {outOfStock && (
        <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10">
          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">نفد المخزون</span>
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-primary" />
        </div>
        {lowStock && !outOfStock && (
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        )}
      </div>
      <p className="text-sm font-medium leading-tight line-clamp-2 flex-1 mb-2">{product.name_ar}</p>
      <div className="flex items-center justify-between mt-auto">
        <p className="text-base font-bold text-primary">{formatCurrency(product.selling_price)}</p>
        {product.track_inventory && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md
            ${lowStock ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-700'}`}>
            {stock}
          </span>
        )}
      </div>
      {product.barcode && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{product.barcode}</p>}
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────
// Main POS Page
// ─────────────────────────────────────────────────────────────
export default function POSPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showCloseShift, setShowCloseShift] = useState(false)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [discountOpen, setDiscountOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: products = [], isLoading: productsLoading } = useProducts({ search: searchQuery || undefined, is_active: true })
  const { data: customers = [] } = useCustomers(customerSearch)
  const { data: warehouses = [] } = useWarehouses()
  const { data: activeShift, refetch: refetchShift } = useActiveShift()
  const createInvoice = useCreateInvoice()
  const pos = usePOSStore()
  const timer = useShiftTimer(activeShift?.opened_at)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'F8') { e.preventDefault(); if (pos.cart.length > 0) setShowPayment(true) }
      if (e.key === 'Escape') { setShowPayment(false); setShowCustomerSearch(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pos.cart.length])

  const handleAddProduct = useCallback((product: Product) => {
    pos.addToCart({
      product_id: product.id,
      product_name: product.name_ar,
      barcode: product.barcode,
      unit_name: product.unit?.abbreviation,
      quantity: 1,
      unit_price: product.selling_price,
      original_price: product.selling_price,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: 0,
      vat_rate: product.vat_rate || 0,
      vat_amount: 0,
      total: product.selling_price
    })
  }, [pos])

  const handleConfirmPayment = async (method: string, paidAmount: number) => {
    const defaultWarehouse = warehouses.find(w => w.is_default) || warehouses[0]
    const invoiceData = {
      customer_id: pos.customer?.id,
      cashbox_id: activeShift?.cashbox_id,
      shift_id: activeShift?.id,
      warehouse_id: defaultWarehouse?.id,
      invoice_date: new Date().toISOString().split('T')[0],
      payment_method: method as 'cash' | 'mada' | 'transfer' | 'deferred',
      subtotal: pos.subtotal,
      discount_type: pos.discountType,
      discount_value: pos.discountValue,
      discount_amount: pos.discountAmount,
      tax_amount: pos.taxAmount,
      total: pos.total,
      paid_amount: method === 'deferred' ? 0 : Math.min(paidAmount, pos.total),
      remaining_amount: method === 'deferred' ? pos.total : Math.max(0, pos.total - paidAmount),
      status: (method === 'deferred' ? 'confirmed' : 'paid') as 'paid' | 'confirmed',
      is_pos: true,
      notes: pos.notes
    }
    const items = pos.cart.map((item, i) => ({
      product_id: item.product_id, product_name: item.product_name, barcode: item.barcode,
      unit_name: item.unit_name, quantity: item.quantity, unit_price: item.unit_price,
      discount_type: item.discount_type, discount_value: item.discount_value,
      discount_amount: item.discount_amount, vat_rate: item.vat_rate,
      vat_amount: item.vat_amount, total: item.total, sort_order: i
    }))
    try {
      await createInvoice.mutateAsync({ invoice: invoiceData, items })
      pos.clearCart()
      setShowPayment(false)
      toast.success('تمت عملية البيع بنجاح ✓')
    } catch { /* handled in hook */ }
  }

  const categories = [...new Set(products.map(p => p.category?.name_ar).filter(Boolean))]
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category?.name_ar === selectedCategory)
    : products

  // ── No open shift (or DB unavailable): show open-session screen ──
  if (!activeShift) {
    return <POSOpenSession onOpened={() => refetchShift()} />
  }

  // ── Active POS ──
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── POS Top Bar ── */}
      <div className="flex items-center justify-between px-4 h-14 bg-card border-b border-border/60 shrink-0
                      shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground
                       bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-xl transition-colors">
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">وردية مفتوحة</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <span>العهدة: <strong className="text-foreground">{formatCurrency(activeShift.opening_balance)}</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Timer className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{timer}</span>
          </div>
        </div>

        <button onClick={() => setShowCloseShift(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-600
                     bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                     px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          إغلاق الوردية
        </button>
      </div>

      {/* ── POS Body ── */}
      <div className="flex flex-1 gap-3 overflow-hidden p-3">

        {/* Products Panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">

          {/* Search */}
          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الباركود... (F2)" className="form-input pr-9 h-10" />
            </div>
            <button className="btn-outline px-3 h-10" title="مسح بالباركود">
              <Barcode className="w-4 h-4" />
            </button>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 shrink-0" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors
                  ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                الكل ({products.length})
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat!)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors
                    ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 15 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                <Package className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">لا توجد منتجات</p>
                {searchQuery && <p className="text-xs opacity-60">جرب بحثاً مختلفاً</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-3">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAdd={handleAddProduct} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-80 xl:w-96 flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden shrink-0
                        shadow-[0_2px_16px_rgba(0,0,0,0.06)]">

          {/* Customer selector */}
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <button onClick={() => setShowCustomerSearch(true)}
              className="flex-1 flex items-center gap-2 text-sm hover:bg-muted rounded-xl px-2 py-1.5 transition-colors">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className={pos.customer ? 'font-medium' : 'text-muted-foreground'}>
                {pos.customer?.name_ar || 'عميل نقدي'}
              </span>
            </button>
            {pos.customer && (
              <button onClick={() => pos.setCustomer(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Held invoices */}
          {pos.heldInvoices.length > 0 && (
            <div className="px-3 py-2 border-b border-border/40 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {pos.heldInvoices.map(inv => (
                <button key={inv.id} onClick={() => pos.recallInvoice(inv.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20
                             border border-orange-200 text-xs text-orange-700 hover:bg-orange-100 shrink-0 transition-colors">
                  <Pause className="w-3 h-3" />
                  معلقة ({inv.cart.length})
                </button>
              ))}
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4">
            <AnimatePresence>
              {pos.cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-14 text-muted-foreground gap-3">
                  <ShoppingCart className="w-14 h-14 opacity-15" />
                  <p className="text-sm font-medium">السلة فارغة</p>
                  <p className="text-xs opacity-60">انقر على منتج لإضافته</p>
                </div>
              ) : pos.cart.map(item => (
                <CartItemRow key={item.id} item={item}
                  onUpdate={(id, qty) => qty <= 0 ? pos.removeFromCart(id) : pos.updateCartItem(id, { quantity: qty })}
                  onRemove={pos.removeFromCart} />
              ))}
            </AnimatePresence>
          </div>

          {/* Totals & actions */}
          {pos.cart.length > 0 && (
            <div className="border-t border-border/40 p-4 space-y-3 bg-muted/20 shrink-0">

              {/* Discount toggle */}
              <button onClick={() => setDiscountOpen(!discountOpen)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full transition-colors">
                <Percent className="w-4 h-4" />
                إضافة خصم
                <ChevronDown className={`w-3.5 h-3.5 mr-auto transition-transform ${discountOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {discountOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex gap-2">
                      <select value={pos.discountType}
                        onChange={e => pos.setDiscount(e.target.value as 'percentage' | 'fixed', pos.discountValue)}
                        className="form-select text-sm h-9 w-24">
                        <option value="percentage">%</option>
                        <option value="fixed">مبلغ</option>
                      </select>
                      <input type="number" value={pos.discountValue}
                        onChange={e => pos.setDiscount(pos.discountType, parseFloat(e.target.value) || 0)}
                        className="form-input text-sm h-9 flex-1" placeholder="0" dir="ltr" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Summary */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatCurrency(pos.subtotal)}</span><span>المجموع الفرعي</span>
                </div>
                {pos.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>-{formatCurrency(pos.discountAmount)}</span><span>الخصم</span>
                  </div>
                )}
                {pos.taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{formatCurrency(pos.taxAmount)}</span><span>ضريبة القيمة المضافة</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl pt-2 border-t border-border/50">
                  <span className="text-primary">{formatCurrency(pos.total)}</span>
                  <span>الإجمالي</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button onClick={pos.holdInvoice} className="btn-outline flex-1 justify-center py-2.5" title="تعليق">
                  <Pause className="w-4 h-4" />
                </button>
                <button onClick={pos.clearCart} className="btn-outline px-3 py-2.5" title="مسح السلة">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
                <button onClick={() => setShowPayment(true)} className="btn-primary flex-1 justify-center py-2.5 font-bold gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  دفع (F8)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={showCloseShift} onClose={() => setShowCloseShift(false)} title="إغلاق الوردية" size="sm">
        <CloseShiftModal shift={activeShift} onClose={() => { setShowCloseShift(false) }} />
      </Modal>

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="إتمام الدفع" size="sm">
        <PaymentModal total={pos.total} customer={pos.customer} onConfirm={handleConfirmPayment} onClose={() => setShowPayment(false)} />
      </Modal>

      <Modal open={showCustomerSearch} onClose={() => setShowCustomerSearch(false)} title="اختيار العميل" size="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف..." className="form-input pr-9" autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {customers.map((c: Customer) => (
              <button key={c.id}
                onClick={() => { pos.setCustomer(c); setShowCustomerSearch(false); setCustomerSearch('') }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-right transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {c.name_ar?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name_ar}</p>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </div>
                {c.balance > 0 && <span className="text-xs text-orange-500 shrink-0">{formatCurrency(c.balance)}</span>}
              </button>
            ))}
            {customers.length === 0 && customerSearch && (
              <p className="text-sm text-muted-foreground text-center py-6">لا يوجد عملاء مطابقون</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
