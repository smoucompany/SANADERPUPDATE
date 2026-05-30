import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, Loader2, ArrowRight, User, Briefcase, DollarSign, Phone, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const DEPARTMENTS = [
  'الإدارة العامة','المبيعات','المشتريات','المحاسبة والمالية',
  'المخزون والعمليات','الموارد البشرية','تقنية المعلومات','التسويق'
]
const POSITIONS = [
  'مدير عام','مدير قسم','محاسب أول','محاسب','مسؤول مبيعات',
  'مشرف مخزون','مهندس نظم','موظف خدمة عملاء','سائق','أخرى'
]

type Tab = 'personal' | 'job' | 'salary' | 'emergency'
const TAB_ORDER: Tab[] = ['personal', 'job', 'salary', 'emergency']

const EMPTY_FORM = {
  full_name: '', national_id: '', birth_date: '', nationality: 'سعودي',
  gender: 'male', marital_status: 'single', phone: '', email: '', address: '',
  employee_number: '', department: '', position: '',
  hire_date: new Date().toISOString().slice(0, 10),
  contract_type: 'full_time', work_location: 'مقر الشركة',
  basic_salary: '', housing_allowance: '', transportation_allowance: '',
  other_allowances: '', bank_name: '', iban: '',
  emergency_name: '', emergency_relation: '', emergency_phone: '',
  status: 'active',
}

export default function EmployeeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isEdit = !!id

  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(isEdit)
  const [form, setForm]           = useState(EMPTY_FORM)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Load existing employee in edit mode
  useEffect(() => {
    if (!id || !user) return
    setLoading(true)
    Promise.resolve(
      supabase.from('employees').select('*').eq('id', id).eq('company_id', user.company_id).single()
    ).then(({ data, error }) => {
        if (error || !data) { toast.error('تعذّر تحميل بيانات الموظف'); navigate('/hr/employees'); return }
        setForm({
          full_name:                data.full_name              ?? '',
          national_id:              data.national_id            ?? '',
          birth_date:               data.birth_date             ?? '',
          nationality:              data.nationality            ?? 'سعودي',
          gender:                   data.gender                 ?? 'male',
          marital_status:           data.marital_status         ?? 'single',
          phone:                    data.phone                  ?? '',
          email:                    data.email                  ?? '',
          address:                  data.address                ?? '',
          employee_number:          data.employee_number        ?? '',
          department:               data.department             ?? '',
          position:                 data.position               ?? '',
          hire_date:                data.hire_date              ?? new Date().toISOString().slice(0, 10),
          contract_type:            data.contract_type          ?? 'full_time',
          work_location:            data.work_location          ?? 'مقر الشركة',
          basic_salary:             String(data.basic_salary    ?? ''),
          housing_allowance:        String(data.housing_allowance       ?? ''),
          transportation_allowance: String(data.transportation_allowance ?? ''),
          other_allowances:         String(data.other_allowances        ?? ''),
          bank_name:                data.bank_name              ?? '',
          iban:                     data.iban                   ?? '',
          emergency_name:           data.emergency_name         ?? '',
          emergency_relation:       data.emergency_relation     ?? '',
          emergency_phone:          data.emergency_phone        ?? '',
          status:                   data.status                 ?? 'active',
        })
      }).finally(() => setLoading(false))
  }, [id, user])

  const totalSalary = (+form.basic_salary || 0) + (+form.housing_allowance || 0) +
    (+form.transportation_allowance || 0) + (+form.other_allowances || 0)

  const handleSave = async () => {
    if (!form.full_name || !form.department || !form.position || !form.basic_salary) {
      toast.error('يرجى ملء: الاسم والقسم والمنصب والراتب الأساسي')
      return
    }
    if (!user) return
    setSaving(true)

    const payload = {
      company_id:               user.company_id,
      full_name:                form.full_name,
      national_id:              form.national_id       || null,
      birth_date:               form.birth_date        || null,
      nationality:              form.nationality,
      gender:                   form.gender,
      marital_status:           form.marital_status,
      phone:                    form.phone             || null,
      email:                    form.email             || null,
      address:                  form.address           || null,
      employee_number:          form.employee_number   || null,
      department:               form.department,
      position:                 form.position,
      hire_date:                form.hire_date,
      contract_type:            form.contract_type,
      work_location:            form.work_location     || null,
      basic_salary:             +form.basic_salary     || 0,
      housing_allowance:        +form.housing_allowance        || 0,
      transportation_allowance: +form.transportation_allowance || 0,
      other_allowances:         +form.other_allowances         || 0,
      bank_name:                form.bank_name         || null,
      iban:                     form.iban              || null,
      emergency_name:           form.emergency_name    || null,
      emergency_relation:       form.emergency_relation || null,
      emergency_phone:          form.emergency_phone   || null,
      status:                   form.status,
    }

    try {
      if (isEdit && id) {
        const { error } = await supabase.from('employees').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('employees').insert(payload)
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success(isEdit ? 'تم تحديث بيانات الموظف بنجاح' : 'تم إضافة الموظف بنجاح')
      navigate('/hr/employees')
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'personal',  label: 'البيانات الشخصية', icon: User },
    { id: 'job',       label: 'بيانات الوظيفة',   icon: Briefcase },
    { id: 'salary',    label: 'الراتب والمزايا',  icon: DollarSign },
    { id: 'emergency', label: 'جهة الاتصال',       icon: Phone },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary opacity-60" />
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
        subtitle="إدارة الموارد البشرية"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/hr/employees')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'حفظ التغييرات' : 'إضافة الموظف'}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold transition-all
              ${activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6">

        {/* Personal */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">الاسم الكامل <span className="text-red-500">*</span></label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                className="form-input" placeholder="الاسم الرباعي" />
            </div>
            <div>
              <label className="form-label">رقم الهوية / الإقامة</label>
              <input value={form.national_id} onChange={e => set('national_id', e.target.value)}
                className="form-input" dir="ltr" placeholder="1XXXXXXXXX" maxLength={10} />
            </div>
            <div>
              <label className="form-label">تاريخ الميلاد</label>
              <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)}
                className="form-input" dir="ltr" max={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="form-label">الجنسية</label>
              <input value={form.nationality} onChange={e => set('nationality', e.target.value)}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">الجنس</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className="form-select">
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="form-label">الحالة الاجتماعية</label>
              <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)} className="form-select">
                <option value="single">أعزب</option>
                <option value="married">متزوج</option>
                <option value="divorced">مطلق</option>
                <option value="widowed">أرمل</option>
              </select>
            </div>
            <div>
              <label className="form-label">رقم الجوال</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="form-input" dir="ltr" placeholder="+966 5x xxx xxxx" />
            </div>
            <div>
              <label className="form-label">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="form-input" dir="ltr" placeholder="employee@company.com" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">العنوان</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)}
                className="form-input resize-none h-16" placeholder="المدينة، الحي، الشارع" />
            </div>
          </div>
        )}

        {/* Job */}
        {activeTab === 'job' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">رقم الموظف</label>
              <input value={form.employee_number} onChange={e => set('employee_number', e.target.value)}
                className="form-input" dir="ltr" placeholder="EMP-007" />
            </div>
            <div>
              <label className="form-label">تاريخ التعيين <span className="text-red-500">*</span></label>
              <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)}
                className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">القسم <span className="text-red-500">*</span></label>
              <select value={form.department} onChange={e => set('department', e.target.value)} className="form-select">
                <option value="">اختر القسم</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">المنصب / الوظيفة <span className="text-red-500">*</span></label>
              <select value={form.position} onChange={e => set('position', e.target.value)} className="form-select">
                <option value="">اختر المنصب</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">نوع العقد</label>
              <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)} className="form-select">
                <option value="full_time">دوام كامل</option>
                <option value="part_time">دوام جزئي</option>
                <option value="contract">عقد مؤقت</option>
                <option value="intern">متدرب</option>
              </select>
            </div>
            <div>
              <label className="form-label">موقع العمل</label>
              <input value={form.work_location} onChange={e => set('work_location', e.target.value)}
                className="form-input" placeholder="مقر الشركة / عن بُعد" />
            </div>
            <div>
              <label className="form-label">الحالة الوظيفية</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="form-select">
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="on_leave">إجازة</option>
                <option value="terminated">منتهي</option>
              </select>
            </div>
          </div>
        )}

        {/* Salary */}
        {activeTab === 'salary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">الراتب الأساسي <span className="text-red-500">*</span></label>
              <input type="number" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)}
                className="form-input" dir="ltr" min="0" placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">بدل السكن</label>
              <input type="number" value={form.housing_allowance} onChange={e => set('housing_allowance', e.target.value)}
                className="form-input" dir="ltr" min="0" placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">بدل المواصلات</label>
              <input type="number" value={form.transportation_allowance} onChange={e => set('transportation_allowance', e.target.value)}
                className="form-input" dir="ltr" min="0" placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">بدلات أخرى</label>
              <input type="number" value={form.other_allowances} onChange={e => set('other_allowances', e.target.value)}
                className="form-input" dir="ltr" min="0" placeholder="0.00" />
            </div>
            <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">إجمالي الراتب الشهري</p>
              <p className="text-3xl font-black text-primary mt-1">{totalSalary.toLocaleString('ar-SA')} ر.س</p>
            </div>
            <div>
              <label className="form-label">البنك</label>
              <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)}
                className="form-input" placeholder="مثال: البنك الأهلي السعودي" />
            </div>
            <div>
              <label className="form-label">رقم IBAN</label>
              <input value={form.iban} onChange={e => set('iban', e.target.value)}
                className="form-input" dir="ltr" placeholder="SA..." maxLength={24} />
            </div>
          </div>
        )}

        {/* Emergency */}
        {activeTab === 'emergency' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">اسم جهة الاتصال</label>
              <input value={form.emergency_name} onChange={e => set('emergency_name', e.target.value)}
                className="form-input" placeholder="اسم الشخص" />
            </div>
            <div>
              <label className="form-label">صلة القرابة</label>
              <select value={form.emergency_relation} onChange={e => set('emergency_relation', e.target.value)} className="form-select">
                <option value="">اختر الصلة</option>
                <option>زوج / زوجة</option>
                <option>أب / أم</option>
                <option>أخ / أخت</option>
                <option>صديق</option>
                <option>أخرى</option>
              </select>
            </div>
            <div>
              <label className="form-label">رقم هاتف الطوارئ</label>
              <input value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)}
                className="form-input" dir="ltr" placeholder="+966 5x xxx xxxx" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          {activeTab !== 'personal' && (
            <button onClick={() => setActiveTab(TAB_ORDER[TAB_ORDER.indexOf(activeTab) - 1])} className="btn-outline">
              السابق
            </button>
          )}
          {activeTab !== 'emergency' && (
            <button onClick={() => setActiveTab(TAB_ORDER[TAB_ORDER.indexOf(activeTab) + 1])} className="btn-outline">
              التالي
            </button>
          )}
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'حفظ التغييرات' : 'إضافة الموظف'}
        </button>
      </div>
    </div>
  )
}
