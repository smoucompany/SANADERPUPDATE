import { useState } from 'react'
import { User, Lock, Bell, Shield, Camera, Save, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'profile', label: 'الملف الشخصي', icon: User },
  { id: 'password', label: 'كلمة المرور', icon: Lock },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'security', label: 'الأمان', icon: Shield },
]

const AVATAR_COLORS = [
  'gradient-blue', 'gradient-green', 'gradient-purple', 'gradient-orange', 'gradient-red'
]

const ROLE_LABEL: Record<string, string> = {
  admin: 'مدير النظام', accountant: 'محاسب', cashier: 'كاشير', manager: 'مدير', employee: 'موظف'
}

const RECENT_ACTIVITY = [
  { action: 'تسجيل دخول', device: 'Chrome على Windows', ip: '192.168.1.1', time: 'منذ 5 دقائق' },
  { action: 'تعديل إعدادات', device: 'Chrome على Windows', ip: '192.168.1.1', time: 'منذ ساعة' },
  { action: 'تسجيل دخول', device: 'Safari على iPhone', ip: '192.168.1.5', time: 'أمس 10:30م' },
  { action: 'تسجيل دخول', device: 'Chrome على Windows', ip: '192.168.1.1', time: 'قبل يومين 9:00ص' },
]

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedColor, setSelectedColor] = useState(0)

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    job_title: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    current: '', new_pass: '', confirm: ''
  })

  const [notifPrefs, setNotifPrefs] = useState({
    sales: true, purchases: true, inventory: true, hr: false, system: true, email: false, sms: false
  })

  const initials = user?.full_name
    ? user.full_name.trim().split(' ').slice(0, 2).map((w: string) => w[0]).join('')
    : 'م'

  const handleSaveProfile = async () => {
    if (!profileForm.full_name.trim()) { toast.error('الاسم مطلوب'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    toast.success('تم حفظ الملف الشخصي بنجاح')
  }

  const handleChangePassword = async () => {
    if (!passwordForm.current) { toast.error('أدخل كلمة المرور الحالية'); return }
    if (passwordForm.new_pass.length < 8) { toast.error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'); return }
    if (passwordForm.new_pass !== passwordForm.confirm) { toast.error('كلمتا المرور غير متطابقتين'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new_pass })
    setSaving(false)
    if (error) { toast.error('تعذر تغيير كلمة المرور'); return }
    toast.success('تم تغيير كلمة المرور بنجاح')
    setPasswordForm({ current: '', new_pass: '', confirm: '' })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="الملف الشخصي" subtitle={user?.email || ''} />

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5">
        {/* Left: Avatar + tabs */}
        <div className="space-y-4">
          {/* Avatar card */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full ${AVATAR_COLORS[selectedColor]} flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
                {initials}
              </div>
              <button className="absolute -bottom-1 -left-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <div className="text-center">
              <p className="font-bold">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABEL[user?.role || ''] || 'موظف'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            {/* Color picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 text-center">لون الأفاتار</p>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c, i) => (
                  <button key={i} onClick={() => setSelectedColor(i)}
                    className={`w-6 h-6 rounded-full ${c} transition-transform ${selectedColor === i ? 'scale-125 ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-colors border-b border-border/40 last:border-0
                  ${activeTab === tab.id ? 'bg-primary/5 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Tab content */}
        <div className="bg-card border border-border/60 rounded-2xl p-6">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h2 className="font-bold text-lg">بيانات الملف الشخصي</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">الاسم الكامل *</label>
                  <input value={profileForm.full_name} onChange={e => setProfileForm(p => ({...p, full_name: e.target.value}))}
                    className="form-input" placeholder="الاسم الكامل" />
                </div>
                <div>
                  <label className="form-label">رقم الجوال</label>
                  <input value={profileForm.phone} onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))}
                    className="form-input" placeholder="05xxxxxxxx" dir="ltr" />
                </div>
                <div>
                  <label className="form-label">البريد الإلكتروني</label>
                  <input value={profileForm.email} disabled className="form-input opacity-60 cursor-not-allowed" dir="ltr" />
                  <p className="text-xs text-muted-foreground mt-1">لا يمكن تغيير البريد الإلكتروني</p>
                </div>
                <div>
                  <label className="form-label">المسمى الوظيفي</label>
                  <input value={profileForm.job_title} onChange={e => setProfileForm(p => ({...p, job_title: e.target.value}))}
                    className="form-input" placeholder="مثال: محاسب أول" />
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-xl space-y-2">
                <p className="text-sm font-semibold">معلومات الحساب</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">الدور</p>
                    <p className="font-medium">{ROLE_LABEL[user?.role || ''] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الشركة</p>
                    <p className="font-medium">{user?.company_id ? 'مرتبط بشركة' : '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ التغييرات
                </button>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-5 max-w-md">
              <h2 className="font-bold text-lg">تغيير كلمة المرور</h2>
              <div className="space-y-4">
                {[
                  { label: 'كلمة المرور الحالية', key: 'current', show: showCurrent, toggle: () => setShowCurrent(p => !p) },
                  { label: 'كلمة المرور الجديدة', key: 'new_pass', show: showNew, toggle: () => setShowNew(p => !p) },
                  { label: 'تأكيد كلمة المرور', key: 'confirm', show: showConfirm, toggle: () => setShowConfirm(p => !p) },
                ].map(field => (
                  <div key={field.key}>
                    <label className="form-label">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? 'text' : 'password'}
                        value={passwordForm[field.key as keyof typeof passwordForm]}
                        onChange={e => setPasswordForm(p => ({...p, [field.key]: e.target.value}))}
                        className="form-input pl-10"
                        dir="ltr"
                      />
                      <button type="button" onClick={field.toggle}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {passwordForm.new_pass && (
                <div className="space-y-1">
                  {[
                    { label: '8 أحرف على الأقل', ok: passwordForm.new_pass.length >= 8 },
                    { label: 'تطابق كلمة التأكيد', ok: passwordForm.new_pass === passwordForm.confirm && !!passwordForm.confirm },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center gap-2 text-xs ${r.ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${r.ok ? 'opacity-100' : 'opacity-30'}`} />
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleChangePassword} disabled={saving} className="btn-primary gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                تغيير كلمة المرور
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h2 className="font-bold text-lg">تفضيلات الإشعارات</h2>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground mb-3">إشعارات النظام</p>
                {[
                  { key: 'sales', label: 'المبيعات والفواتير', desc: 'إشعار عند إنشاء أو تعديل فاتورة' },
                  { key: 'purchases', label: 'المشتريات', desc: 'إشعار عند استلام أوامر الشراء' },
                  { key: 'inventory', label: 'المخزون', desc: 'تنبيه عند انخفاض مستوى المخزون' },
                  { key: 'hr', label: 'الموارد البشرية', desc: 'إشعارات الإجازات والحضور' },
                  { key: 'system', label: 'إشعارات النظام', desc: 'التحديثات والتنبيهات الهامة' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <button onClick={() => setNotifPrefs(p => ({...p, [n.key]: !p[n.key as keyof typeof p]}))}
                      className={`w-11 h-6 rounded-full transition-colors relative ${notifPrefs[n.key as keyof typeof notifPrefs] ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPrefs[n.key as keyof typeof notifPrefs] ? 'translate-x-1' : 'translate-x-5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground mb-3">قنوات الإشعارات</p>
                {[
                  { key: 'email', label: 'البريد الإلكتروني', desc: 'إرسال الإشعارات على بريدك' },
                  { key: 'sms', label: 'رسائل SMS', desc: 'إرسال تنبيهات بالرسائل القصيرة' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <button onClick={() => setNotifPrefs(p => ({...p, [n.key]: !p[n.key as keyof typeof p]}))}
                      className={`w-11 h-6 rounded-full transition-colors relative ${notifPrefs[n.key as keyof typeof notifPrefs] ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPrefs[n.key as keyof typeof notifPrefs] ? 'translate-x-1' : 'translate-x-5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => toast.success('تم حفظ تفضيلات الإشعارات')} className="btn-primary gap-2">
                  <Save className="w-4 h-4" />حفظ التفضيلات
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="font-bold text-lg">الأمان والخصوصية</h2>

              <div className="p-4 border border-border/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">التحقق بخطوتين (2FA)</p>
                    <p className="text-xs text-muted-foreground">حماية إضافية لحسابك</p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 px-2.5 py-1 rounded-full font-semibold">غير مفعّل</span>
                </div>
                <button onClick={() => toast.success('جاري إعداد التحقق بخطوتين...')} className="btn-outline text-sm gap-1.5">
                  <Shield className="w-3.5 h-3.5" />تفعيل الآن
                </button>
              </div>

              <div>
                <p className="font-semibold mb-3">سجل النشاط الأخير</p>
                <div className="space-y-2">
                  {RECENT_ACTIVITY.map((act, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{act.action}</p>
                        <p className="text-xs text-muted-foreground">{act.device}</p>
                        <p className="text-xs text-muted-foreground font-mono">{act.ip} • {act.time}</p>
                      </div>
                      {i === 0 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full font-semibold shrink-0">الجلسة الحالية</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/50 pt-4">
                <button onClick={() => toast.success('تم تسجيل الخروج من جميع الأجهزة')}
                  className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />تسجيل الخروج من جميع الأجهزة الأخرى
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
