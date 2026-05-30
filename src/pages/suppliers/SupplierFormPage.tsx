import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, ArrowRight, Loader2, Building, CreditCard, Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'
import PageHeader from '@/components/shared/PageHeader'
import { motion } from 'framer-motion'

const schema = z.object({
  name_ar: z.string().min(1, 'الاسم مطلوب'),
  name_en: z.string().optional(),
  code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  tax_number: z.string().optional(),
  bank_account: z.string().optional(),
  payment_days: z.number().min(0).default(30),
  notes: z.string().optional()
})
type FormData = z.infer<typeof schema>

export default function SupplierFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { user } = useAuthStore()
  const create = useCreateSupplier()
  const update = useUpdateSupplier()

  const { data: supplier } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => { 
      const { data } = await supabase.from('suppliers').select('*').eq('id', id!).single()
      return data 
    },
    enabled: !!id
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema), 
    defaultValues: { payment_days: 30 }
  })

  useEffect(() => { if (supplier) reset(supplier) }, [supplier])

  const onSubmit = async (data: FormData) => {
    if (isEdit && id) await update.mutateAsync({ id, ...data })
    else await create.mutateAsync(data)
    navigate('/suppliers')
  }

  const loading = create.isPending || update.isPending

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full"
    >
      <PageHeader title={isEdit ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
        subtitle="شاشة تحرير وإضافة الموردين وإدارة تفاصيل حساباتهم المالية"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/suppliers')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm active:scale-[0.97] transition-all">
              <ArrowRight className="w-4 h-4 ml-1" />رجوع للوحة الموردين
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={loading} className="btn-primary gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm active:scale-[0.97] transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}حفظ التغييرات
            </button>
          </div>
        }
      />
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Card (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <Building className="w-4.5 h-4.5 text-primary" />المعلومات الأساسية والاتصال للمورد
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">الاسم بالعربية *</label>
                <input {...register('name_ar')} className="form-input rounded-xl border-border/50 focus:ring-primary/20" placeholder="اسم المورد الكامل" />
                {errors.name_ar && <p className="text-destructive text-xs mt-1">{errors.name_ar.message}</p>}
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">الاسم بالإنجليزية</label>
                <input {...register('name_en')} className="form-input rounded-xl border-border/50 focus:ring-primary/20" placeholder="Supplier name in English" dir="ltr" />
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">كود المورد</label>
                <input {...register('code')} className="form-input rounded-xl border-border/50 focus:ring-primary/20" placeholder="SUPP-0001" dir="ltr" />
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">رقم الجوال / الهاتف</label>
                <input {...register('phone')} className="form-input rounded-xl border-border/50 focus:ring-primary/20" placeholder="05xxxxxxxx" dir="ltr" />
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">البريد الإلكتروني</label>
                <input {...register('email')} className="form-input rounded-xl border-border/50 focus:ring-primary/20" placeholder="supplier@domain.com" type="email" dir="ltr" />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">رقم الحساب البنكي (IBAN)</label>
                <input {...register('bank_account')} className="form-input rounded-xl border-border/50 focus:ring-primary/20 font-mono" placeholder="SAxxxxxxxxxxxxxxxxxxxxxx" dir="ltr" />
              </div>

              <div className="col-span-2">
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">العنوان بالتفصيل</label>
                <textarea {...register('address')} className="form-input rounded-xl border-border/50 focus:ring-primary/20 resize-none h-20 text-sm" placeholder="الشارع، الحي، المدينة، الرمز البريدي..." />
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Settings Card (Right Column) */}
        <div className="space-y-6">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <CreditCard className="w-4.5 h-4.5 text-primary" />إعدادات السداد والضرائب
            </h3>

            <div className="space-y-4">
              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">المدينة</label>
                <input {...register('city')} className="form-input rounded-xl border-border/50 focus:ring-primary/20" placeholder="الرياض، جدة، الدمام..." />
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">الرقم الضريبي للمورد</label>
                <input {...register('tax_number')} className="form-input rounded-xl border-border/50 focus:ring-primary/20" placeholder="3xxxxxxxxxxxxxx" dir="ltr" />
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">فترة السداد المستحقة للمورد (بالأيام)</label>
                <input {...register('payment_days', { valueAsNumber: true })} type="number" className="form-input rounded-xl border-border/50 focus:ring-primary/20 font-bold" dir="ltr" placeholder="30" />
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">ملاحظات خاصة</label>
                <textarea {...register('notes')} className="form-input rounded-xl border-border/50 focus:ring-primary/20 resize-none h-24 text-sm" placeholder="أي ملاحظات تخص التعامل مع هذا المورد..." />
              </div>
            </div>
          </div>

          <div className="bg-muted/30 border border-border/30 p-4 rounded-2xl space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />أمن البيانات والتتبع:
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              سيتم تسجيل هذا المورد وربطه بالدليل المحاسبي للذمم الدائنة تلقائياً لإصدار فواتير المشتريات وسندات الصرف بطريقة سليمة محاسبياً وقانونياً.
            </p>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
