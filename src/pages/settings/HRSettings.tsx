import { useParams, Navigate } from 'react-router-dom'
import { UserCheck, Clock, Zap, DollarSign, Wallet, Calendar, Save, Loader2 } from 'lucide-react'
import { SectionCard, SettingRow, Toggle } from './shared'
import { useModuleSettings } from '@/hooks/useModuleSettings'

const HR_DEFAULTS = {
  track_attendance: true,
  overtime_enabled: true,
  advance_enabled: true,
  shift_start: '08:00',
  shift_end: '17:00',
  late_grace_minutes: 15,
  attendance_method: 'يدوي',
  payroll_cycle: 'شهرية',
  payroll_day: 1,
  gosi_rate: 9.75,
  end_service_rate: 8.33,
  annual_leave_days: 21,
  sick_leave_days: 14,
  maternity_leave_days: 70,
  paternity_leave_days: 3,
  advance_limit_pct: 50,
}

export default function HRSettings() {
  const { sub } = useParams<{ sub: string }>()
  const { settings: s, save, isSaving } = useModuleSettings('hr_settings', HR_DEFAULTS)

  const set = (patch: Partial<typeof HR_DEFAULTS>) => save(patch, true)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => save({})} disabled={isSaving} className="btn-primary gap-2">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'attendance') return (
    <div className="space-y-4">
      <SectionCard title="الحضور والانصراف" icon={UserCheck} iconColor="apple-purple">
        <SettingRow icon={Clock} iconColor="apple-blue" label="تتبع الحضور والانصراف" desc="تسجيل أوقات الحضور والانصراف">
          <Toggle checked={s.track_attendance} onChange={v => set({ track_attendance: v })} />
        </SettingRow>
        <SettingRow icon={Zap} iconColor="apple-orange" label="العمل الإضافي" desc="احتساب ساعات العمل الإضافي">
          <Toggle checked={s.overtime_enabled} onChange={v => set({ overtime_enabled: v })} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">وقت بداية الدوام</label>
            <input type="time" value={s.shift_start} onChange={e => set({ shift_start: e.target.value })} className="form-input" dir="ltr" />
          </div>
          <div>
            <label className="form-label">وقت نهاية الدوام</label>
            <input type="time" value={s.shift_end} onChange={e => set({ shift_end: e.target.value })} className="form-input" dir="ltr" />
          </div>
          <div>
            <label className="form-label">دقائق السماح للتأخير</label>
            <input type="number" value={s.late_grace_minutes} onChange={e => set({ late_grace_minutes: +e.target.value })} className="form-input" dir="ltr" min={0} />
          </div>
          <div>
            <label className="form-label">طريقة تسجيل الحضور</label>
            <select value={s.attendance_method} onChange={e => set({ attendance_method: e.target.value })} className="form-select">
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
          <Toggle checked={s.advance_enabled} onChange={v => set({ advance_enabled: v })} />
        </SettingRow>
        <div className="py-3 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">دورة الرواتب</label>
            <select value={s.payroll_cycle} onChange={e => set({ payroll_cycle: e.target.value })} className="form-select">
              <option>شهرية</option>
              <option>نصف شهرية</option>
              <option>أسبوعية</option>
            </select>
          </div>
          <div>
            <label className="form-label">تاريخ صرف الراتب</label>
            <select value={s.payroll_day} onChange={e => set({ payroll_day: +e.target.value })} className="form-select">
              {[...Array(28)].map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">نسبة التأمينات الاجتماعية %</label>
            <input type="number" value={s.gosi_rate} onChange={e => set({ gosi_rate: +e.target.value })} className="form-input" dir="ltr" step="0.25" />
          </div>
          <div>
            <label className="form-label">نسبة مكافأة نهاية الخدمة</label>
            <input type="number" value={s.end_service_rate} onChange={e => set({ end_service_rate: +e.target.value })} className="form-input" dir="ltr" step="0.01" />
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
            <input type="number" value={s.annual_leave_days} onChange={e => set({ annual_leave_days: +e.target.value })} className="form-input" dir="ltr" min={0} />
          </div>
          <div>
            <label className="form-label">رصيد الإجازة المرضية (يوم)</label>
            <input type="number" value={s.sick_leave_days} onChange={e => set({ sick_leave_days: +e.target.value })} className="form-input" dir="ltr" min={0} />
          </div>
          <div>
            <label className="form-label">إجازة الأمومة (يوم)</label>
            <input type="number" value={s.maternity_leave_days} onChange={e => set({ maternity_leave_days: +e.target.value })} className="form-input" dir="ltr" min={0} />
          </div>
          <div>
            <label className="form-label">إجازة الأبوة (يوم)</label>
            <input type="number" value={s.paternity_leave_days} onChange={e => set({ paternity_leave_days: +e.target.value })} className="form-input" dir="ltr" min={0} />
          </div>
          <div className="col-span-2">
            <label className="form-label">الحد الأقصى للسلفة (% من الراتب)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={s.advance_limit_pct}
                onChange={e => set({ advance_limit_pct: +e.target.value })} className="flex-1 accent-primary" />
              <span className="text-sm font-bold text-primary w-12 text-center">{s.advance_limit_pct}%</span>
            </div>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  return <Navigate to="/settings/hr/attendance" replace />
}
