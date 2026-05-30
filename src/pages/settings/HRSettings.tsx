import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { UserCheck, Clock, Zap, DollarSign, Wallet, Calendar, Save } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import toast from 'react-hot-toast'

export default function HRSettings() {
  const { sub } = useParams<{ sub: string }>()
  const [trackAttendance, setTrackAttendance] = useState(true)
  const [overtimeEnabled, setOvertimeEnabled] = useState(true)
  const [advanceEnabled, setAdvanceEnabled] = useState(true)
  const [annualLeave, setAnnualLeave] = useState(21)
  const [sickLeave, setSickLeave] = useState(14)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => toast.success('تم حفظ الإعدادات')} className="btn-primary gap-2">
        <Save className="w-4 h-4" />حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'attendance') return (
    <div className="space-y-4">
      <SectionCard title="الحضور والانصراف" icon={UserCheck} iconColor="apple-purple">
        <SettingRow icon={Clock} iconColor="apple-blue" label="تتبع الحضور والانصراف" desc="تسجيل أوقات الحضور والانصراف">
          <Toggle checked={trackAttendance} onChange={setTrackAttendance} />
        </SettingRow>
        <SettingRow icon={Zap} iconColor="apple-orange" label="العمل الإضافي" desc="احتساب ساعات العمل الإضافي">
          <Toggle checked={overtimeEnabled} onChange={setOvertimeEnabled} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">وقت بداية الدوام</label>
            <input type="time" className="form-input" dir="ltr" defaultValue="08:00" />
          </div>
          <div>
            <label className="form-label">وقت نهاية الدوام</label>
            <input type="time" className="form-input" dir="ltr" defaultValue="17:00" />
          </div>
          <div>
            <label className="form-label">دقائق السماح للتأخير</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={15} min={0} />
          </div>
          <div>
            <label className="form-label">طريقة تسجيل الحضور</label>
            <select className="form-select">
              <option>يدوي</option>
              <option>بصمة الإصبع</option>
              <option>رمز QR</option>
              <option>تعرف الوجه</option>
            </select>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'payroll') return (
    <div className="space-y-4">
      <SectionCard title="الرواتب والمزايا" icon={Wallet} iconColor="apple-green">
        <SettingRow icon={DollarSign} iconColor="apple-pink" label="السلفيات" desc="السماح للموظفين بطلب سلف">
          <Toggle checked={advanceEnabled} onChange={setAdvanceEnabled} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">دورة الرواتب</label>
            <select className="form-select">
              <option>شهرية</option>
              <option>نصف شهرية</option>
              <option>أسبوعية</option>
            </select>
          </div>
          <div>
            <label className="form-label">تاريخ صرف الراتب</label>
            <select className="form-select">
              {[...Array(28)].map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">نسبة التأمينات الاجتماعية %</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={9.75} step="0.25" />
          </div>
          <div>
            <label className="form-label">نسبة مكافأة نهاية الخدمة</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={8.33} step="0.01" />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'leaves') return (
    <div className="space-y-4">
      <SectionCard title="الإجازات والسلف" icon={Calendar} iconColor="apple-indigo">
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">رصيد الإجازة السنوية (يوم)</label>
            <input type="number" className="form-input" dir="ltr" value={annualLeave} onChange={e => setAnnualLeave(+e.target.value)} min={0} />
          </div>
          <div>
            <label className="form-label">رصيد الإجازة المرضية (يوم)</label>
            <input type="number" className="form-input" dir="ltr" value={sickLeave} onChange={e => setSickLeave(+e.target.value)} min={0} />
          </div>
          <div>
            <label className="form-label">إجازة الأمومة (يوم)</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={70} min={0} />
          </div>
          <div>
            <label className="form-label">إجازة الأبوة (يوم)</label>
            <input type="number" className="form-input" dir="ltr" defaultValue={3} min={0} />
          </div>
          <div className="col-span-2">
            <label className="form-label">الحد الأقصى للسلفة (% من الراتب)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} defaultValue={50} className="flex-1 accent-primary" />
              <span className="text-sm font-bold text-primary w-12 text-center">50%</span>
            </div>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  return null
}
