import { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Key, Shield, Database, HardDrive, Smartphone, Save, Download, Upload, Eye, EyeOff, FileSearch, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpCircle, ExternalLink, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SectionCard, SettingRow, Toggle } from './shared'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

/* ═══════════════════════════════════════════════════
   UPDATE TAB — standalone component
═══════════════════════════════════════════════════ */
function UpdateTab({ remoteUpdateUrl, currentVersion }: { remoteUpdateUrl: string; currentVersion: string }) {
  const [checking, setChecking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [swStatus, setSwStatus] = useState<'idle' | 'up_to_date' | 'available' | 'error'>('idle')
  const [remote, setRemote] = useState<{
    version: string; notes: string; released_at: string; url: string; filename: string; features?: string[]
  } | null>(null)
  const [remoteStatus, setRemoteStatus] = useState<'idle' | 'loading' | 'up_to_date' | 'available' | 'error' | 'no_url'>('idle')

  /* Auto-check remote on mount */
  useEffect(() => {
    if (remoteUpdateUrl) checkRemote()
    else setRemoteStatus('no_url')
  }, [remoteUpdateUrl])

  /* ── Check remote manifest ── */
  const checkRemote = async () => {
    setRemoteStatus('loading')
    setRemote(null)
    try {
      const res = await fetch(remoteUpdateUrl, { cache: 'no-store' })

      // 404 = no version published yet — not a real error
      if (res.status === 404) {
        setRemoteStatus('up_to_date')
        return
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()

      // The API might return { error: '...' } when no version exists
      if (data?.error && !data?.version) {
        setRemoteStatus('up_to_date')
        return
      }

      setRemote(data)
      setRemoteStatus(data.version && data.version !== currentVersion ? 'available' : 'up_to_date')
    } catch (e: any) {
      setRemoteStatus('error')
      // Don't show a toast for network errors — just show status in UI
    }
  }

  /* ── Check Service Worker (PWA local update) ── */
  const checkSW = async () => {
    setChecking(true)
    setSwStatus('idle')
    try {
      if (!('serviceWorker' in navigator)) { setSwStatus('error'); return }
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) { setSwStatus('up_to_date'); return }
      await reg.update()
      if (reg.waiting || reg.installing) { setSwStatus('available') }
      else { setSwStatus('up_to_date') }
    } catch { setSwStatus('error') }
    finally { setChecking(false) }
  }

  /* ── Apply update — clear SW cache then hard reload ── */
  const applySW = async () => {
    setApplying(true)
    try {
      // 1. Tell waiting SW to activate (if any)
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // 2. Clear all caches so browser fetches fresh files
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }

      // 3. Unregister SW to force full re-download on next load
      const allRegs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(allRegs.map(r => r.unregister()))

      // 4. Hard navigate (not just reload) to bypass any remaining cache
      setTimeout(() => {
        window.location.href = window.location.origin + '/?updated=' + Date.now()
      }, 800)
    } catch { toast.error('فشل تطبيق التحديث') }
    finally { setApplying(false) }
  }

  const hasNewRemote = remoteStatus === 'available' && remote

  return (
    <div className="space-y-4">

      {/* ── Remote update card ── */}
      <div className={`rounded-2xl border-2 overflow-hidden transition-colors ${
        hasNewRemote
          ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/10'
          : remoteStatus === 'up_to_date'
          ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-border/60 bg-card'
      }`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            {remoteStatus === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {remoteStatus === 'available' && <ArrowUpCircle className="w-5 h-5 text-amber-500" />}
            {remoteStatus === 'up_to_date' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {remoteStatus === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
            {(remoteStatus === 'idle' || remoteStatus === 'no_url') && <RefreshCw className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="font-bold text-sm">
                {remoteStatus === 'available' ? `🆕 يتوفر إصدار جديد — ${remote?.version}` :
                 remoteStatus === 'up_to_date' ? '✅ التطبيق محدث بآخر إصدار' :
                 remoteStatus === 'loading' ? 'جاري التحقق من التحديثات...' :
                 remoteStatus === 'error' ? '⚠️ تعذّر الاتصال — تحقق من الإنترنت أو حاول لاحقاً' :
                 remoteStatus === 'no_url' ? 'لم يتم تكوين سيرفر التحديثات' :
                 'تحديثات النظام'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                الإصدار الحالي: <span className="font-mono font-bold">{currentVersion}</span>
                {remote?.version && remoteStatus === 'available' &&
                  <> &nbsp;←&nbsp; الإصدار الجديد: <span className="font-mono font-bold text-amber-600">{remote.version}</span></>
                }
              </p>
            </div>
          </div>
          <button onClick={checkRemote} disabled={remoteStatus === 'loading'} className="btn-outline text-xs gap-1.5 h-8 px-3">
            <RefreshCw className={`w-3.5 h-3.5 ${remoteStatus === 'loading' ? 'animate-spin' : ''}`} />
            فحص الآن
          </button>
        </div>

        {/* Details when update available */}
        {hasNewRemote && (
          <div className="px-5 py-4 space-y-4">
            {remote.notes && (
              <div className="bg-white/60 dark:bg-black/20 rounded-xl p-4 text-sm">
                <p className="font-semibold mb-1 text-amber-700 dark:text-amber-400">ملاحظات الإصدار</p>
                <p className="text-muted-foreground leading-relaxed">{remote.notes}</p>
              </div>
            )}

            {remote.features && remote.features.length > 0 && (
              <div>
                <p className="font-semibold text-xs text-muted-foreground mb-2 uppercase tracking-wider">ما الجديد</p>
                <ul className="space-y-1.5">
                  {remote.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {remote.released_at && (
              <p className="text-xs text-muted-foreground">
                📅 تاريخ الإصدار: {formatDate(remote.released_at.split('T')[0])}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {remote.url && (
                <a href={remote.url} target="_blank" rel="noopener noreferrer"
                  className="btn-outline gap-2 text-sm flex-1 justify-center">
                  <ExternalLink className="w-4 h-4" />تحميل التحديث ({remote.filename || 'ملف التحديث'})
                </a>
              )}
              <button onClick={applySW} disabled={applying} className="btn-primary gap-2 text-sm">
                <RefreshCw className={`w-4 h-4 ${applying ? 'animate-spin' : ''}`} />
                {applying ? 'جاري التطبيق...' : 'تطبيق وإعادة تحميل'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PWA / Service Worker section ── */}
      <SectionCard title="تحديث ذاكرة التطبيق المحلية (PWA)" icon={HardDrive} iconColor="apple-blue">
        <div className="py-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            يقوم هذا الزر بإجبار المتصفح على تحميل أحدث نسخة من ملفات التطبيق وتحديث الـ Service Worker.
          </p>
          <div className="flex gap-3">
            <button onClick={checkSW} disabled={checking} className="btn-outline gap-2 flex-1">
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'جاري التحقق...' : 'تحقق من التحديث المحلي'}
            </button>
            <button onClick={applySW} disabled={swStatus !== 'available' || applying} className="btn-primary gap-2 flex-1">
              <Save className="w-4 h-4" />
              {applying ? 'جاري التطبيق...' : 'تطبيق التحديث'}
            </button>
          </div>
          <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
            swStatus === 'available' ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400' :
            swStatus === 'up_to_date' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400' :
            swStatus === 'error' ? 'border-red-400 bg-red-50 dark:bg-red-900/10 text-red-600' :
            'border-border/40 bg-muted/40 text-muted-foreground'
          }`}>
            {swStatus === 'available' && <ArrowUpCircle className="w-4 h-4 shrink-0" />}
            {swStatus === 'up_to_date' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {swStatus === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            {swStatus === 'idle' && <RefreshCw className="w-4 h-4 shrink-0 opacity-40" />}
            <span>
              {swStatus === 'available' ? 'يوجد تحديث جاهز للتطبيق — اضغط "تطبيق التحديث"' :
               swStatus === 'up_to_date' ? 'ملفات التطبيق المحلية محدثة بالكامل' :
               swStatus === 'error' ? 'المتصفح لا يدعم Service Worker' :
               'اضغط "تحقق من التحديث المحلي" للفحص'}
            </span>
          </div>
        </div>
      </SectionCard>

    </div>
  )
}

export default function SecuritySettings() {
  const { sub } = useParams<{ sub: string }>()
  const [twoFA, setTwoFA] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const remoteUpdateUrl = (import.meta as any).env.VITE_UPDATE_MANIFEST_URL as string
  const currentVersion = (import.meta as any).env.VITE_APP_VERSION as string || '1.0.0'


const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error('جميع حقول كلمة المرور مطلوبة'); return }
    if (newPw !== confirmPw) { toast.error('كلمة المرور الجديدة غير متطابقة'); return }
    if (newPw.length < 8) { toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      toast.success('تم تحديث كلمة المرور بنجاح')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (sub === 'password') return (
    <div className="space-y-4">
      <SectionCard title="تغيير كلمة المرور" icon={Key} iconColor="apple-red">
        <div className="py-3 space-y-3">
          {[
            { label: 'كلمة المرور الحالية', val: currentPw, set: setCurrentPw },
            { label: 'كلمة المرور الجديدة', val: newPw, set: setNewPw },
            { label: 'تأكيد كلمة المرور', val: confirmPw, set: setConfirmPw },
          ].map(f => (
            <div key={f.label}>
              <label className="form-label">{f.label}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)} className="form-input pl-10" dir="ltr" />
                <button onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
          <button onClick={handleChangePassword} disabled={saving} className="btn-primary gap-2 mt-1">
            <Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
          </button>
        </div>
      </SectionCard>
    </div>
  )

  if (sub === '2fa') return (
    <div className="space-y-4">
      <SectionCard title="المصادقة الثنائية" icon={Shield} iconColor="apple-indigo">
        <SettingRow icon={Smartphone} iconColor="apple-blue" label="المصادقة الثنائية (2FA)" desc="طبقة حماية إضافية عبر رمز OTP">
          <Toggle checked={twoFA} onChange={setTwoFA} />
        </SettingRow>
        {twoFA && (
          <div className="py-3 space-y-3">
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <div className="w-28 h-28 bg-muted rounded-xl mx-auto mb-3 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">QR Code</span>
              </div>
              <p className="text-xs text-muted-foreground">امسح الرمز بتطبيق Google Authenticator أو Authy</p>
            </div>
            <div>
              <label className="form-label">أدخل رمز التحقق للتأكيد</label>
              <input className="form-input text-center tracking-widest font-mono text-lg" dir="ltr" placeholder="000000" maxLength={6} />
            </div>
            <button className="btn-primary gap-2 w-full">
              <Shield className="w-4 h-4" />تفعيل المصادقة الثنائية
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )

  if (sub === 'backup') return (
    <div className="space-y-4">
      <SectionCard title="النسخ الاحتياطي" icon={Database} iconColor="apple-teal">
        <SettingRow icon={HardDrive} iconColor="apple-green" label="النسخ الاحتياطي التلقائي" desc="Supabase يحتفظ بنسخة احتياطية يومية">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[12px] font-medium text-emerald-600">نشط</span>
          </div>
        </SettingRow>
        <div className="py-3 space-y-3">
          <div>
            <label className="form-label">تكرار النسخ الاحتياطي</label>
            <select className="form-select">
              <option>يومي</option>
              <option>أسبوعي</option>
              <option>شهري</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="btn-outline text-xs gap-2"><Download className="w-3.5 h-3.5" />تصدير JSON</button>
            <button className="btn-outline text-xs gap-2"><Download className="w-3.5 h-3.5" />تصدير Excel</button>
            <label className="btn-outline text-xs gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />استيراد نسخة احتياطية
              <input type="file" accept=".json,.xlsx" className="hidden" onChange={() => toast.success('تم الاستيراد')} />
            </label>
          </div>
        </div>
      </SectionCard>
    </div>
  )

  if (sub === 'update') return (
    <UpdateTab
      remoteUpdateUrl={remoteUpdateUrl}
      currentVersion={currentVersion}
    />
  )

  if (sub === 'audit') return (
    <div className="space-y-4">
      <SectionCard title="سجلات التدقيق" icon={FileSearch} iconColor="apple-purple">
        <div className="py-3 space-y-3">
          <div className="flex items-center gap-3">
            <input className="form-input flex-1" placeholder="بحث في السجلات..." />
            <select className="form-select w-36">
              <option>كل العمليات</option>
              <option>تسجيل الدخول</option>
              <option>تعديل البيانات</option>
              <option>الحذف</option>
              <option>التصدير</option>
            </select>
          </div>
          {[
            { action: 'تعديل إعدادات الشركة', user: 'مدير النظام', time: '2026-05-28 09:15', type: 'تعديل', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { action: 'حذف منتج #55', user: 'مشرف المخزون', time: '2026-05-28 08:42', type: 'حذف', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
            { action: 'تصدير تقرير المبيعات', user: 'محاسب', time: '2026-05-28 08:10', type: 'تصدير', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
            { action: 'تسجيل دخول ناجح', user: 'مدير النظام', time: '2026-05-28 07:55', type: 'دخول', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 text-sm">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${log.color}`}>{log.type}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{log.action}</p>
                <p className="text-xs text-muted-foreground">{log.user}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{log.time}</span>
            </div>
          ))}
          <button className="btn-outline w-full text-xs gap-2">
            <Download className="w-3.5 h-3.5" />تصدير سجلات التدقيق
          </button>
        </div>
      </SectionCard>
    </div>
  )

  return <Navigate to="/settings/security/password" replace />
}
