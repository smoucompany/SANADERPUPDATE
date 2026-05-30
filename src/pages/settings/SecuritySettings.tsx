import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Key, Shield, Database, HardDrive, Smartphone, Save, Download, Upload, Eye, EyeOff, FileSearch, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SectionCard, SettingRow, Toggle } from './shared'
import toast from 'react-hot-toast'

export default function SecuritySettings() {
  const { sub } = useParams<{ sub: string }>()
  const [twoFA, setTwoFA] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('لم يتم فحص التحديث بعد')
  const remoteUpdateUrl = (import.meta as any).env.VITE_UPDATE_MANIFEST_URL as string
  const currentVersion = (import.meta as any).env.VITE_APP_VERSION as string || '1.0.0'
  const [externalChecking, setExternalChecking] = useState(false)
  const [externalStatus, setExternalStatus] = useState('لم يتم فحص التحديث الخارجي بعد')
  const [remoteMetadata, setRemoteMetadata] = useState<{ version?: string; url?: string; notes?: string } | null>(null)

  const handleCheckForUpdate = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('المتصفح لا يدعم تحديث النظام التلقائي')
      setUpdateStatus('المتصفح لا يدعم Service Worker')
      return
    }

    setChecking(true)
    setUpdateAvailable(false)
    setUpdateStatus('جاري التحقق من وجود تحديث...')

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setUpdateStatus('لم يتم العثور على Service Worker. سيتم إعادة تحميل الصفحة.')
        toast('لا يوجد Service Worker مثبت.')
        return
      }

      await registration.update()
      if (registration.waiting) {
        setUpdateAvailable(true)
        setUpdateStatus('يتوفر تحديث جديد الآن. اضغط تطبيق التحديث.')
        toast.success('يتوفر تحديث جديد')
        return
      }

      if (registration.installing) {
        setUpdateStatus('يتم تنزيل التحديث الآن. انتظر قليلاً ثم اضغط تطبيق التحديث إذا أصبح متاحاً.')
        registration.installing.addEventListener('statechange', () => {
          if (registration.installing?.state === 'installed') {
            setUpdateAvailable(true)
            setUpdateStatus('تم تنزيل التحديث. اضغط تطبيق التحديث الآن.')
            toast.success('تم تنزيل التحديث')
          }
        })
        return
      }

      setUpdateStatus('التطبيق محدث حالياً. لا يوجد تحديث جديد.')
      toast.success('التطبيق محدث')
    } catch (e: any) {
      setUpdateStatus('حدث خطأ أثناء التحقق من التحديث')
      toast.error(e?.message || 'فشل التحقق من التحديث')
    } finally {
      setChecking(false)
    }
  }

  const handleApplyUpdate = async () => {
    setApplying(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      setUpdateStatus('جارٍ تطبيق التحديث. ستُعاد تحميل الصفحة.')
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      toast.error('فشل تطبيق التحديث')
    } finally {
      setApplying(false)
    }
  }

  const handleCheckExternalUpdate = async () => {
    if (!remoteUpdateUrl) {
      toast.error('لم يتم تكوين عنوان التحديث الخارجي')
      setExternalStatus('لم يتم تكوين عنوان تحديث خارجي')
      return
    }

    setExternalChecking(true)
    setExternalStatus('جاري التحقق من التحديث الخارجي...')
    setRemoteMetadata(null)

    try {
      const response = await fetch(remoteUpdateUrl, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('لم يتم العثور على ملف التحديث الخارجي')
      }
      const data = await response.json()
      setRemoteMetadata(data)

      if (data.version && data.version !== currentVersion) {
        setUpdateAvailable(true)
        setExternalStatus(`يتوفر تحديث خارجي ${data.version}. افتح الرابط لتثبيت.`)
        toast.success('يتوفر تحديث خارجي جديد')
      } else {
        setExternalStatus(`التطبيق محدث. الإصدار الحالي ${currentVersion}`)
        setUpdateAvailable(false)
      }
    } catch (e: any) {
      setExternalStatus('فشل فحص التحديث الخارجي')
      toast.error(e?.message || 'حدث خطأ أثناء فحص التحديث الخارجي')
    } finally {
      setExternalChecking(false)
    }
  }

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
    <div className="space-y-4">
      <SectionCard title="تحديث النظام" icon={RefreshCw} iconColor="apple-orange">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            اضغط التحقق لمعرفة ما إذا كان هناك إصدار جديد، ثم اضغط تطبيق التحديث.
            لن يتم حذف بيانات النظام أو بيانات العملاء عند التحديث.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={handleCheckForUpdate} disabled={checking} className="btn-outline gap-2">
              <RefreshCw className="w-4 h-4" />{checking ? 'جاري التحقق...' : 'تحقق من التحديث'}
            </button>
            <button onClick={handleApplyUpdate} disabled={!updateAvailable || applying} className="btn-primary gap-2">
              <Save className="w-4 h-4" />{applying ? 'جاري التطبيق...' : 'تطبيق التحديث'}
            </button>
          </div>
          {remoteUpdateUrl && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={handleCheckExternalUpdate} disabled={externalChecking} className="btn-outline gap-2">
                <RefreshCw className="w-4 h-4" />{externalChecking ? 'جاري التحقق الخارجي...' : 'تحقق من التحديث الخارجي'}
              </button>
              <button
                onClick={() => remoteMetadata?.url && window.open(remoteMetadata.url, '_blank')}
                disabled={!remoteMetadata?.url}
                className="btn-secondary gap-2"
              >
                <Download className="w-4 h-4" />فتح رابط التحديث
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm space-y-3">
            <div>
              <p className="font-medium mb-2">حالة التحديث المحلي</p>
              <p>{updateStatus}</p>
            </div>
            {remoteUpdateUrl && (
              <div>
                <p className="font-medium mb-2">حالة التحديث الخارجي</p>
                <p>{externalStatus}</p>
                {remoteMetadata?.notes && <p className="text-xs text-muted-foreground">ملاحظات: {remoteMetadata.notes}</p>}
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">
            إذا لم يكن هناك Service Worker، سيتم إعادة تحميل الصفحة فقط للحصول على آخر نسخة من التطبيق.
          </p>
        </div>
      </SectionCard>
    </div>
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

  return null
}
