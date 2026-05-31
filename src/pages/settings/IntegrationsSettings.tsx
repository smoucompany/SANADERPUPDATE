import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { MessageSquare, Mail, Smartphone, Eye, EyeOff, Key, Copy, RefreshCw, Save } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import toast from 'react-hot-toast'

export default function IntegrationsSettings() {
  const { sub } = useParams<{ sub: string }>()
  const [waEnabled, setWaEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => toast.success('تم حفظ الإعدادات')} className="btn-primary gap-2">
        <Save className="w-4 h-4" />حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'whatsapp') return (
    <div className="space-y-4">
      <SectionCard title="واتساب كلاود" icon={MessageSquare} iconColor="apple-green">
        <SettingRow icon={Smartphone} iconColor="apple-green" label="تفعيل WhatsApp API" desc="إرسال الفواتير والإشعارات عبر WhatsApp">
          <Toggle checked={waEnabled} onChange={setWaEnabled} />
        </SettingRow>
        {waEnabled && (
          <div className="py-3 space-y-3">
            <div>
              <label className="form-label">WhatsApp Token</label>
              <div className="relative">
                <input type={showToken ? 'text' : 'password'} className="form-input pl-10" dir="ltr" placeholder="EAAxxxxx..." />
                <button onClick={() => setShowToken(!showToken)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Phone Number ID</label>
              <input className="form-input" dir="ltr" placeholder="1234567890" />
            </div>
            <div>
              <label className="form-label">Business Account ID</label>
              <input className="form-input" dir="ltr" placeholder="0987654321" />
            </div>
          </div>
        )}
      </SectionCard>
      {waEnabled && <SaveBtn />}
    </div>
  )

  if (sub === 'email') return (
    <div className="space-y-4">
      <SectionCard title="البريد الإلكتروني SMTP" icon={Mail} iconColor="apple-blue">
        <SettingRow icon={Mail} iconColor="apple-blue" label="تفعيل البريد الإلكتروني" desc="إرسال الفواتير والتقارير بالبريد">
          <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
        </SettingRow>
        {emailEnabled && (
          <div className="py-3 grid grid-cols-2 gap-3">
            {[
              { label: 'SMTP Host', ph: 'smtp.gmail.com' },
              { label: 'SMTP Port', ph: '587' },
              { label: 'اسم المستخدم', ph: 'user@gmail.com' },
              { label: 'كلمة المرور', ph: '••••••••' },
              { label: 'اسم المرسل', ph: 'شركة الأمانة' },
              { label: 'بريد الرد', ph: 'noreply@company.com' },
            ].map(f => (
              <div key={f.label}>
                <label className="form-label">{f.label}</label>
                <input className="form-input" dir="ltr" placeholder={f.ph} />
              </div>
            ))}
            <div className="col-span-2">
              <button onClick={() => toast.success('تم إرسال بريد الاختبار')} className="btn-outline text-xs gap-2">
                <Mail className="w-3.5 h-3.5" />إرسال بريد اختبار
              </button>
            </div>
          </div>
        )}
      </SectionCard>
      {emailEnabled && <SaveBtn />}
    </div>
  )

  if (sub === 'sms') return (
    <div className="space-y-4">
      <SectionCard title="الرسائل النصية SMS" icon={Smartphone} iconColor="apple-orange">
        <SettingRow icon={Smartphone} iconColor="apple-orange" label="تفعيل الرسائل النصية" desc="إرسال إشعارات عبر SMS">
          <Toggle checked={smsEnabled} onChange={setSmsEnabled} />
        </SettingRow>
        {smsEnabled && (
          <div className="py-3 space-y-3">
            <div>
              <label className="form-label">مزود الخدمة</label>
              <select className="form-select">
                <option>Unifonic</option>
                <option>Msegat</option>
                <option>Taqnyat</option>
                <option>Zain SMS</option>
              </select>
            </div>
            <div>
              <label className="form-label">API Key</label>
              <input className="form-input" dir="ltr" placeholder="sk_xxxxxxxxxxxxx" />
            </div>
            <div>
              <label className="form-label">اسم المرسل (Sender ID)</label>
              <input className="form-input" dir="ltr" placeholder="MyCompany" maxLength={11} />
            </div>
          </div>
        )}
      </SectionCard>
      {smsEnabled && <SaveBtn />}
    </div>
  )

  if (sub === 'api') return (
    <div className="space-y-4">
      <SectionCard title="مفاتيح API" icon={Key} iconColor="apple-indigo">
        <div className="py-3 space-y-4">
          <div className="bg-muted/40 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">مفتاح API الحالي</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input pl-10 font-mono text-xs"
                  dir="ltr"
                  value="YOUR_API_KEY"
                  readOnly
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button onClick={() => { navigator.clipboard.writeText('YOUR_API_KEY'); toast.success('تم النسخ') }}
                className="btn-outline p-2.5">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <button onClick={() => { if (confirm('هل تريد إعادة إنشاء مفتاح API؟ سيتم إلغاء المفتاح القديم.')) toast.success('تم إنشاء مفتاح جديد') }}
            className="btn-outline gap-2 text-sm text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20">
            <RefreshCw className="w-3.5 h-3.5" />إعادة إنشاء المفتاح
          </button>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">نطاقات الصلاحية (Scopes)</p>
            <div className="grid grid-cols-2 gap-2">
              {['read:products','write:products','read:sales','write:sales','read:reports','admin:all'].map(scope => (
                <label key={scope} className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                  <input type="checkbox" className="rounded" defaultChecked={!scope.includes('admin')} />
                  {scope}
                </label>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )

  return <Navigate to="/settings/integrations/api" replace />
}
