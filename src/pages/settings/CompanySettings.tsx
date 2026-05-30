import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, DollarSign, FileText, MapPin, Phone, AtSign, Link2, Percent, Save, Loader2, Globe, Calendar, Upload, X, ImageIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SectionCard } from './shared'
import toast from 'react-hot-toast'

export default function CompanySettings() {
  const { sub } = useParams<{ sub: string }>()
  const { company, setCompany } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>(company?.logo_url || '')

  const [form, setForm] = useState({
    name_ar:        company?.name_ar        || '',
    name_en:        company?.name_en        || '',
    phone:          company?.phone          || '',
    email:          company?.email          || '',
    address:        company?.address        || '',
    tax_number:     company?.tax_number     || '',
    commercial_reg: company?.commercial_reg || '',
    vat_rate:       company?.vat_rate       || 15,
    currency:       company?.currency       || 'SAR',
    website:        company?.website        || '',
  })
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoUpload = async (file: File) => {
    if (!company) return
    if (!['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'].includes(file.type)) {
      toast.error('صيغة غير مدعومة — استخدم PNG أو JPG أو SVG')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2MB')
      return
    }
    setLogoUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `logos/${company.id}.${ext}`
      let finalLogoUrl = ''

      try {
        // Try uploading to Supabase Storage first
        const { error: uploadErr } = await supabase.storage
          .from('company-assets')
          .upload(path, file, { upsert: true, contentType: file.type })

        if (uploadErr) throw uploadErr

        const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
        finalLogoUrl = data.publicUrl + '?t=' + Date.now()
      } catch (storageErr: any) {
        console.warn('Supabase storage upload failed, falling back to Base64 data URL:', storageErr)
        // Convert file to Base64 data URL as a robust fallback
        finalLogoUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('فشل تحويل الصورة إلى ترميز Base64'))
          reader.readAsDataURL(file)
        })
      }

      // Save URL (either storage public URL or Base64 data URL) to companies table
      const { error: dbErr } = await supabase.from('companies')
        .update({ logo_url: finalLogoUrl }).eq('id', company.id)
      if (dbErr) throw dbErr

      setLogoPreview(finalLogoUrl)
      setCompany({ ...company, logo_url: finalLogoUrl })
      toast.success('تم حفظ الشعار بنجاح')
    } catch (e: any) {
      toast.error(e.message || 'خطأ في رفع الشعار')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!company) return
    await supabase.from('companies').update({ logo_url: null }).eq('id', company.id)
    setLogoPreview('')
    setCompany({ ...company, logo_url: undefined })
    toast.success('تم حذف الشعار')
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('companies').update(form).eq('id', company!.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('تم حفظ إعدادات الشركة'); qc.invalidateQueries() },
    onError: (e: Error) => toast.error(e.message)
  })

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary gap-2">
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'info') return (
    <div className="space-y-4">

      {/* ── Logo Upload ── */}
      <SectionCard title="شعار الشركة" icon={ImageIcon} iconColor="apple-purple">
        <div className="py-3 flex items-start gap-6">
          {/* Preview */}
          <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-border flex items-center justify-center shrink-0 bg-muted/30 overflow-hidden relative">
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="شعار الشركة" className="w-full h-full object-contain p-2" />
                <button onClick={handleRemoveLogo}
                  className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-30" />
                <p className="text-[10px]">لا يوجد شعار</p>
              </div>
            )}
            {logoUploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-2xl">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Upload controls */}
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">شعار الشركة</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              يظهر الشعار في فواتير البيع، إيصالات نقطة البيع، والتقارير المطبوعة.
              <br />الصيغ المدعومة: PNG، JPG، SVG — الحد الأقصى: 2MB
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={logoUploading}
                className="btn-primary gap-2 text-sm">
                {logoUploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الرفع...</>
                  : <><Upload className="w-4 h-4" />رفع شعار</>}
              </button>
              {logoPreview && (
                <button onClick={handleRemoveLogo} className="btn-outline gap-2 text-sm text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <X className="w-4 h-4" />حذف الشعار
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="معلومات الشركة الأساسية" icon={Building2} iconColor="apple-blue">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="form-label">اسم الشركة بالعربية *</label>
            <input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} className="form-input" placeholder="اسم الشركة" />
          </div>
          <div>
            <label className="form-label">اسم الشركة بالإنجليزية</label>
            <input value={form.name_en} onChange={e => set('name_en', e.target.value)} className="form-input" dir="ltr" placeholder="Company Name" />
          </div>
          <div>
            <label className="form-label">رقم الهاتف</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="form-input pr-9" dir="ltr" placeholder="+966 5x xxx xxxx" />
            </div>
          </div>
          <div>
            <label className="form-label">البريد الإلكتروني</label>
            <div className="relative">
              <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.email} onChange={e => set('email', e.target.value)} className="form-input pr-9" dir="ltr" type="email" placeholder="info@company.com" />
            </div>
          </div>
          <div>
            <label className="form-label">الموقع الإلكتروني</label>
            <div className="relative">
              <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.website} onChange={e => set('website', e.target.value)} className="form-input pr-9" dir="ltr" placeholder="https://www.company.com" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="form-label">العنوان</label>
            <div className="relative">
              <MapPin className="absolute right-3 top-3 w-3.5 h-3.5 text-muted-foreground" />
              <textarea value={form.address} onChange={e => set('address', e.target.value)} className="form-input pr-9 resize-none h-16 text-sm" placeholder="المدينة، الحي، الشارع" />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="البيانات الرسمية" icon={FileText} iconColor="apple-indigo">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">الرقم الضريبي</label>
            <input value={form.tax_number} onChange={e => set('tax_number', e.target.value)} className="form-input" dir="ltr" placeholder="3xxxxxxxxxxxxxxxxx" />
          </div>
          <div>
            <label className="form-label">السجل التجاري</label>
            <input value={form.commercial_reg} onChange={e => set('commercial_reg', e.target.value)} className="form-input" dir="ltr" placeholder="1xxxxxxxxx" />
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'currency') return (
    <div className="space-y-4">
      <SectionCard title="العملة الافتراضية" icon={DollarSign} iconColor="apple-green">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">العملة الافتراضية</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className="form-select">
              {[['SAR','ريال سعودي'],['USD','دولار أمريكي'],['AED','درهم إماراتي'],['KWD','دينار كويتي'],
                ['BHD','دينار بحريني'],['OMR','ريال عُماني'],['QAR','ريال قطري'],['EGP','جنيه مصري'],['JOD','دينار أردني']
              ].map(([v,l]) => <option key={v} value={v}>{l} ({v})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">نسبة ضريبة القيمة المضافة %</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={form.vat_rate} onChange={e => set('vat_rate', parseFloat(e.target.value) || 0)} type="number" className="form-input pl-9" dir="ltr" min="0" max="100" step="0.5" />
            </div>
          </div>
          <div>
            <label className="form-label">عدد الخانات العشرية للأسعار</label>
            <select className="form-select" dir="ltr">
              <option value="2">2 (افتراضي)</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div>
            <label className="form-label">فاصل الآلاف</label>
            <select className="form-select" dir="ltr">
              <option value="comma">فاصلة (1,000)</option>
              <option value="dot">نقطة (1.000)</option>
              <option value="space">مسافة (1 000)</option>
            </select>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'locale') return (
    <div className="space-y-4">
      <SectionCard title="المنطقة الزمنية واللغة" icon={Globe} iconColor="apple-blue">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">المنطقة الزمنية</label>
            <select className="form-select">
              <option value="Asia/Riyadh">توقيت الرياض (GMT+3)</option>
              <option value="Asia/Dubai">توقيت دبي (GMT+4)</option>
              <option value="Africa/Cairo">توقيت القاهرة (GMT+2)</option>
              <option value="Asia/Kuwait">توقيت الكويت (GMT+3)</option>
              <option value="Asia/Bahrain">توقيت البحرين (GMT+3)</option>
              <option value="Asia/Muscat">توقيت مسقط (GMT+4)</option>
            </select>
          </div>
          <div>
            <label className="form-label">لغة الواجهة</label>
            <select className="form-select">
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="form-label">تنسيق التاريخ</label>
            <select className="form-select" dir="ltr">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="form-label">تنسيق الوقت</label>
            <select className="form-select" dir="ltr">
              <option value="12">12 ساعة (AM/PM)</option>
              <option value="24">24 ساعة</option>
            </select>
          </div>
          <div>
            <label className="form-label">نوع التقويم</label>
            <select className="form-select">
              <option value="gregorian">ميلادي</option>
              <option value="hijri">هجري</option>
              <option value="both">الاثنان</option>
            </select>
          </div>
          <div>
            <label className="form-label">أول يوم في الأسبوع</label>
            <select className="form-select">
              <option value="0">الأحد</option>
              <option value="6">السبت</option>
              <option value="1">الاثنين</option>
            </select>
          </div>
        </div>
      </SectionCard>
      <div className="flex justify-end">
        <button onClick={() => toast.success('تم حفظ إعدادات المنطقة الزمنية')} className="btn-primary gap-2">
          <Save className="w-4 h-4" />حفظ التغييرات
        </button>
      </div>
    </div>
  )

  if (sub === 'fiscal') return (
    <div className="space-y-4">
      <SectionCard title="السنة المالية" icon={Calendar} iconColor="apple-indigo">
        <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">بداية السنة المالية</label>
            <input type="date" className="form-input" dir="ltr" defaultValue="2025-01-01" />
          </div>
          <div>
            <label className="form-label">نهاية السنة المالية</label>
            <input type="date" className="form-input" dir="ltr" defaultValue="2025-12-31" />
          </div>
          <div>
            <label className="form-label">الشهر الأول للسنة المالية</label>
            <select className="form-select">
              {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
                .map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">حالة الفترة المحاسبية الحالية</label>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">مفتوحة</span>
            </div>
          </div>
        </div>
      </SectionCard>
      <div className="flex justify-end">
        <button onClick={() => toast.success('تم حفظ السنة المالية')} className="btn-primary gap-2">
          <Save className="w-4 h-4" />حفظ التغييرات
        </button>
      </div>
    </div>
  )

  return null
}
