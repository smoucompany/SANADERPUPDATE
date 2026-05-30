import { useEffect, useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, ArrowRight, Loader2, RefreshCw, Copy, Barcode } from 'lucide-react'
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

// ─── Barcode generators ───────────────────────────────────────────────────────
function generateEAN13(): string {
  // 12 random digits then compute EAN-13 check digit
  // Weights: odd positions (1,3,5…) = ×1, even positions (2,4,6…) = ×3 (1-indexed)
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
  const checksum = digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0)
  const check = (10 - (checksum % 10)) % 10
  return [...digits, check].join('')
}

function generateCode128(): string {
  const prefix = 'PRD'
  const timestamp = Date.now().toString().slice(-7)
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}${timestamp}${rand}`
}

function generateQR(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()
}

const BARCODE_TYPES = [
  { key: 'ean13',   label: 'EAN-13 (13 رقم)',   gen: generateEAN13  },
  { key: 'code128', label: 'Code 128 (حروف+أرقام)', gen: generateCode128 },
  { key: 'qr',      label: 'QR Code (16 حرف)',   gen: generateQR     },
] as const

const schema = z.object({
  name_ar: z.string().min(1, 'اسم المنتج مطلوب'),
  name_en: z.string().optional(),
  code: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  unit_id: z.string().optional(),
  cost_price: z.number().min(0).default(0),
  selling_price: z.number().min(0, 'سعر البيع مطلوب'),
  min_selling_price: z.number().min(0).default(0),
  vat_rate: z.number().min(0).max(100).default(15),
  is_vat_inclusive: z.boolean().default(false),
  track_inventory: z.boolean().default(true),
  allow_negative_stock: z.boolean().default(false),
  min_stock_alert: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
  is_service: z.boolean().default(false),
  description: z.string().optional(),
  notes: z.string().optional()
})
type FormData = z.infer<typeof schema>

export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { user } = useAuthStore()
  const [barcodeType, setBarcodeType] = useState<'ean13' | 'code128' | 'qr'>('ean13')


  const { data: product } = useProduct(id)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('company_id', user!.company_id).eq('is_active', true).order('name_ar')
      return data || []
    },
    enabled: !!user
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from('units').select('*').eq('company_id', user!.company_id).eq('is_active', true)
      return data || []
    },
    enabled: !!user
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { vat_rate: 15, track_inventory: true, is_active: true, cost_price: 0, selling_price: 0, min_selling_price: 0, min_stock_alert: 0 }
  })

  const generateBarcode = useCallback(() => {
    const gen = BARCODE_TYPES.find(t => t.key === barcodeType)?.gen ?? generateEAN13
    const value = gen()
    setValue('barcode', value, { shouldDirty: true })
    toast.success('تم توليد باركود جديد')
  }, [barcodeType, setValue])

  const copyBarcode = useCallback(() => {
    const val = watch('barcode')
    if (!val) return
    navigator.clipboard.writeText(val).then(() => toast.success('تم النسخ'))
  }, [watch])

  useEffect(() => {
    if (product) reset({ ...product, cost_price: product.cost_price || 0, selling_price: product.selling_price || 0 })
  }, [product])

  const isService = watch('is_service')
  const loading = createProduct.isPending || updateProduct.isPending

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && id) await updateProduct.mutateAsync({ id, ...data })
      else await createProduct.mutateAsync(data)
      navigate('/products')
    } catch { /* error toast shown by hook */ }
  }

  const Field = ({ name, label, type = 'text', placeholder = '', required = false }: {
    name: keyof FormData; label: string; type?: string; placeholder?: string; required?: boolean
  }) => (
    <div>
      <label className="form-label">{label} {required && <span className="text-destructive">*</span>}</label>
      <input
        {...register(name, { valueAsNumber: type === 'number' })}
        type={type}
        placeholder={placeholder}
        dir={type === 'number' ? 'ltr' : 'rtl'}
        className="form-input"
      />
      {errors[name] && <p className="text-destructive text-xs mt-1">{errors[name]?.message as string}</p>}
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        actions={
          <>
            <button onClick={() => navigate('/products')} className="btn-outline gap-1.5"><ArrowRight className="w-4 h-4" />رجوع</button>
            <button onClick={handleSubmit(onSubmit)} disabled={loading} className="btn-primary gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ المنتج
            </button>
          </>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Right column: Basic Info + Description */}
        <div className="xl:col-span-2 space-y-5">
          {/* Basic Info */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border/40">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h3 className="font-bold text-base">المعلومات الأساسية</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field name="name_ar" label="اسم المنتج بالعربية" required placeholder="أدخل اسم المنتج" /></div>
              <Field name="name_en" label="اسم المنتج بالإنجليزية" placeholder="Product name" />
              <Field name="code" label="كود المنتج" placeholder="P001" />
              {/* ── Barcode field with auto-generate ── */}
              <div className="col-span-2 md:col-span-1">
                <label className="form-label flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-muted-foreground" />
                  الباركود
                </label>

                {/* Type selector */}
                <div className="flex gap-1 mb-1.5">
                  {BARCODE_TYPES.map(t => (
                    <button key={t.key} type="button"
                      onClick={() => setBarcodeType(t.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        barcodeType === t.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Input + buttons */}
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      {...register('barcode')}
                      type="text"
                      placeholder={barcodeType === 'ean13' ? '1234567890123' : barcodeType === 'code128' ? 'PRD0000000000' : 'A1B2C3D4E5F6G7H8'}
                      dir="ltr"
                      className="form-input font-mono text-sm pl-3 pr-3 w-full"
                    />
                  </div>
                  <button type="button" onClick={generateBarcode}
                    title="توليد باركود تلقائي"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                    توليد
                  </button>
                  <button type="button" onClick={copyBarcode}
                    title="نسخ الباركود"
                    className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Live preview */}
                {watch('barcode') && (
                  <div className="mt-1.5 flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-lg">
                    <Barcode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs text-foreground tracking-wider select-all flex-1" dir="ltr">
                      {watch('barcode')}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {watch('barcode')?.length} حرف
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">التصنيف</label>
                <select {...register('category_id')} className="form-select">
                  <option value="">بدون تصنيف</option>
                  {categories.map((c: Record<string,string>) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">وحدة القياس</label>
                <select {...register('unit_id')} className="form-select">
                  <option value="">اختر الوحدة</option>
                  {units.map((u: Record<string,string>) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="form-label">الوصف</label>
                <textarea {...register('description')} className="form-input resize-none h-24 text-sm" placeholder="وصف المنتج..." />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border/40">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-base">التسعير</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field name="cost_price" label="سعر التكلفة" type="number" placeholder="0.00" />
              <Field name="selling_price" label="سعر البيع" type="number" placeholder="0.00" required />
              <Field name="min_selling_price" label="أدنى سعر للبيع" type="number" placeholder="0.00" />
              <Field name="vat_rate" label="نسبة ض.ق.م %" type="number" placeholder="15" />
              <div className="flex items-center gap-3 pt-5 col-span-2">
                <input {...register('is_vat_inclusive')} type="checkbox" className="w-4 h-4 rounded" id="vat_inc" />
                <label htmlFor="vat_inc" className="text-sm cursor-pointer">السعر شامل الضريبة</label>
              </div>
            </div>
          </div>
        </div>

        {/* Left column: Inventory Settings */}
        <div>
          <div className="bg-card border border-border/60 rounded-xl p-6 sticky top-20">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border/40">
              <div className="w-1 h-5 rounded-full bg-orange-500" />
              <h3 className="font-bold text-base">إعدادات المخزون</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <input {...register('is_service')} type="checkbox" className="w-4 h-4 rounded" id="is_service" />
                <label htmlFor="is_service" className="text-sm cursor-pointer font-medium">خدمة (لا تحتاج مخزون)</label>
              </div>
              {!isService && (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <input {...register('track_inventory')} type="checkbox" className="w-4 h-4 rounded" id="track_inv" />
                    <label htmlFor="track_inv" className="text-sm cursor-pointer font-medium">تتبع المخزون</label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <input {...register('allow_negative_stock')} type="checkbox" className="w-4 h-4 rounded" id="neg_stock" />
                    <label htmlFor="neg_stock" className="text-sm cursor-pointer font-medium">السماح بالمخزون السالب</label>
                  </div>
                  <Field name="min_stock_alert" label="حد التنبيه للمخزون" type="number" placeholder="10" />
                </>
              )}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <input {...register('is_active')} type="checkbox" className="w-4 h-4 rounded" id="is_active" />
                <label htmlFor="is_active" className="text-sm cursor-pointer font-medium">المنتج نشط</label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
