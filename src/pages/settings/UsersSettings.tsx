import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Lock, Activity, Shield, Clock, Save } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import toast from 'react-hot-toast'

export default function UsersSettings() {
  const { sub } = useParams<{ sub: string }>()
  const [upper, setUpper] = useState(true)
  const [nums, setNums] = useState(true)
  const [symbols, setSymbols] = useState(false)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => toast.success('تم حفظ الإعدادات')} className="btn-primary gap-2">
        <Save className="w-4 h-4" />حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'roles') return (
    <div className="space-y-4">
      <SectionCard title="الأدوار والصلاحيات" icon={Shield} iconColor="apple-pink">
        <div className="py-3 space-y-3">
          {[
            { role: 'مدير النظام', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', perms: 'صلاحيات كاملة' },
            { role: 'محاسب', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', perms: 'المالية والتقارير' },
            { role: 'مشرف المخزون', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', perms: 'المخزون والمنتجات' },
            { role: 'كاشير', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', perms: 'نقطة البيع فقط' },
            { role: 'موظف مبيعات', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', perms: 'المبيعات والعملاء' },
          ].map(r => (
            <div key={r.role} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
              <div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.color}`}>{r.role}</span>
                <p className="text-xs text-muted-foreground mt-1 mr-0.5">{r.perms}</p>
              </div>
              <button className="text-xs text-primary hover:underline">تعديل</button>
            </div>
          ))}
          <button className="btn-outline w-full gap-2 mt-1">
            <Shield className="w-3.5 h-3.5" />إضافة دور جديد
          </button>
        </div>
      </SectionCard>
    </div>
  )

  if (sub === 'sessions') return (
    <div className="space-y-4">
      <SectionCard title="سياسة كلمات المرور" icon={Lock} iconColor="apple-red">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">الحد الأدنى لطول كلمة المرور</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={8} min={6} max={32} />
          </div>
          <SettingRow label="إلزامية الأحرف الكبيرة"><Toggle checked={upper} onChange={setUpper} /></SettingRow>
          <SettingRow label="إلزامية الأرقام"><Toggle checked={nums} onChange={setNums} /></SettingRow>
          <SettingRow label="إلزامية الرموز الخاصة"><Toggle checked={symbols} onChange={setSymbols} /></SettingRow>
        </div>
      </SectionCard>

      <SectionCard title="إعدادات الجلسات" icon={Clock} iconColor="apple-blue">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">مدة انتهاء الجلسة (دقيقة)</label>
            <select className="form-select">
              <option value="30">30 دقيقة</option>
              <option value="60">ساعة واحدة</option>
              <option value="120">ساعتان</option>
              <option value="480">8 ساعات</option>
              <option value="0">بدون انتهاء</option>
            </select>
          </div>
          <div>
            <label className="form-label">الحد الأقصى لمحاولات الدخول الفاشلة</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={5} min={3} max={10} />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'activity') return (
    <div className="space-y-4">
      <SectionCard title="سجل النشاط" icon={Activity} iconColor="apple-teal">
        <div className="py-3 space-y-3">
          <div className="flex items-center gap-3 mb-4">
            <input className="form-input flex-1" placeholder="بحث في السجل..." />
            <select className="form-select w-36">
              <option>كل الأنشطة</option>
              <option>تسجيل الدخول</option>
              <option>التعديلات</option>
              <option>الحذف</option>
            </select>
          </div>
          {[
            { user: 'محمد أحمد', action: 'تسجيل دخول', time: 'منذ 5 دقائق', color: 'bg-emerald-500' },
            { user: 'سارة علي', action: 'تعديل منتج #102', time: 'منذ 18 دقيقة', color: 'bg-blue-500' },
            { user: 'أحمد محمود', action: 'إضافة فاتورة INV-0081', time: 'منذ ساعة', color: 'bg-indigo-500' },
            { user: 'محمد أحمد', action: 'حذف مستخدم', time: 'منذ 3 ساعات', color: 'bg-red-500' },
          ].map((log, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.user}</p>
                <p className="text-xs text-muted-foreground">{log.action}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )

  return <Navigate to="/settings/users/list" replace />
}
