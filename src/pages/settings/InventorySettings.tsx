import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Boxes, AlertTriangle, Bell, Hash, Tag, Package, Warehouse, Save, Loader2, Edit2, Trash2, Zap } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { SectionCard, SettingRow, Toggle } from './shared'
import toast from 'react-hot-toast'

function UnitsManager() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: units = [], isLoading } = useQuery<{ id: string; name_ar: string; name_en?: string; abbreviation: string; is_active: boolean }[]>({
    queryKey: ['units', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return []
      const { data, error } = await supabase.from('units').select('*').eq('company_id', user.company_id).order('name_ar')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.company_id
  })

  const [form, setForm] = useState({ name_ar: '', name_en: '', abbreviation: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const DEFAULT_UNITS = [
    { name_ar: 'قطعة', name_en: 'Piece', abbreviation: 'قطعة' },
    { name_ar: 'كيلوغرام', name_en: 'Kilogram', abbreviation: 'كغ' },
    { name_ar: 'جرام', name_en: 'Gram', abbreviation: 'غ' },
    { name_ar: 'لتر', name_en: 'Liter', abbreviation: 'لتر' },
    { name_ar: 'متر', name_en: 'Meter', abbreviation: 'م' },
    { name_ar: 'صندوق', name_en: 'Box', abbreviation: 'صندوق' },
    { name_ar: 'دزينة', name_en: 'Dozen', abbreviation: 'دز' },
    { name_ar: 'طن', name_en: 'Ton', abbreviation: 'طن' },
  ]

  const handleSeed = async () => {
    if (!user?.company_id) {
      toast.error('يرجى تسجيل الدخول والانتظار حتى تحميل بيانات الحساب')
      return
    }
    setSaving(true)
    try {
      const rows = DEFAULT_UNITS.map(u => ({ ...u, company_id: user.company_id, is_active: true }))
      const { error } = await supabase.from('units').upsert(rows, { onConflict: 'company_id,name_ar', ignoreDuplicates: true })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['units'] })
      toast.success('تم إضافة الوحدات الافتراضية')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (!form.name_ar.trim() || !form.abbreviation.trim()) { toast.error('الاسم والاختصار مطلوبان'); return }
    if (!user?.company_id) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        const { error } = await supabase.from('units').update({ name_ar: form.name_ar, name_en: form.name_en, abbreviation: form.abbreviation }).eq('id', editId)
        if (error) throw error
        toast.success('تم تحديث الوحدة')
      } else {
        const { error } = await supabase.from('units').insert({ company_id: user.company_id, ...form, is_active: true })
        if (error) throw error
        toast.success('تم إضافة الوحدة')
      }
      qc.invalidateQueries({ queryKey: ['units'] })
      setForm({ name_ar: '', name_en: '', abbreviation: '' }); setEditId(null)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('units').update({ is_active: !active }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['units'] })
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('units').delete().eq('id', id)
    if (error) { toast.error('لا يمكن حذف وحدة مستخدمة في منتجات'); return }
    qc.invalidateQueries({ queryKey: ['units'] }); toast.success('تم الحذف')
  }

  return (
    <SectionCard title="وحدات القياس" icon={Package} iconColor="apple-teal">
      <div className="py-3 space-y-4">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="form-label">الاسم بالعربية *</label>
            <input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} className="form-input" placeholder="كيلوغرام" />
          </div>
          <div>
            <label className="form-label">الاختصار *</label>
            <input value={form.abbreviation} onChange={e => setForm(p => ({ ...p, abbreviation: e.target.value }))} className="form-input" placeholder="كغ" dir="ltr" />
          </div>
          <div>
            <label className="form-label">الاسم بالإنجليزية</label>
            <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} className="form-input" placeholder="Kilogram" dir="ltr" />
          </div>
          <div className="col-span-3 flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? 'تحديث' : 'إضافة وحدة'}
            </button>
            {editId && (
              <button onClick={() => { setEditId(null); setForm({ name_ar: '', name_en: '', abbreviation: '' }) }} className="btn-outline">إلغاء</button>
            )}
            {units.length === 0 && (
              <button onClick={handleSeed} disabled={saving} className="btn-outline gap-2 mr-auto text-sm">
                <Zap className="w-3.5 h-3.5" />إضافة الوحدات الشائعة تلقائياً
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : units.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-2xl">
            <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد وحدات قياس بعد</p>
            <button onClick={handleSeed} disabled={saving} className="mt-3 btn-primary text-xs gap-1.5">
              <Zap className="w-3.5 h-3.5" />إضافة الوحدات الشائعة
            </button>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الاسم</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الاختصار</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الإنجليزية</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الحالة</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{u.name_ar}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{u.abbreviation}</span></td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs" dir="ltr">{u.name_en || '—'}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleToggle(u.id, u.is_active)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {u.is_active ? 'نشط' : 'موقوف'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditId(u.id); setForm({ name_ar: u.name_ar, name_en: u.name_en || '', abbreviation: u.abbreviation }) }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default function InventorySettings() {
  const { sub } = useParams<{ sub: string }>()
  const [negativeStock, setNegativeStock] = useState(false)
  const [autoReorder, setAutoReorder] = useState(true)
  const [batchTracking, setBatchTracking] = useState(false)
  const [expiryTracking, setExpiryTracking] = useState(true)

  const SaveBtn = () => (
    <div className="flex justify-end pt-2">
      <button onClick={() => toast.success('تم حفظ الإعدادات')} className="btn-primary gap-2">
        <Save className="w-4 h-4" />حفظ التغييرات
      </button>
    </div>
  )

  if (sub === 'warehouses') return (
    <div className="space-y-4">
      <SectionCard title="إدارة المخازن" icon={Warehouse} iconColor="apple-teal">
        <div className="py-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">اسم المخزن</label>
              <input className="form-input" placeholder="المخزن الرئيسي" />
            </div>
            <div>
              <label className="form-label">الموقع</label>
              <input className="form-input" placeholder="الرياض، المدينة الصناعية" />
            </div>
            <div className="col-span-2 flex justify-end">
              <button className="btn-primary gap-2"><Save className="w-4 h-4" />إضافة مخزن</button>
            </div>
          </div>
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">اسم المخزن</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الموقع</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium">المخزن الرئيسي</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">الرياض</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">افتراضي</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  )

  if (sub === 'units') return (
    <div className="space-y-4">
      <UnitsManager />
    </div>
  )

  if (sub === 'pricing') return (
    <div className="space-y-4">
      <SectionCard title="طرق التسعير والتكلفة" icon={Tag} iconColor="apple-green">
        <div className="py-3 space-y-4">
          <div>
            <label className="form-label">طريقة احتساب تكلفة المخزون</label>
            <select className="form-select">
              <option value="avg">المتوسط المرجح (WAVG)</option>
              <option value="fifo">الوارد أولاً صادر أولاً (FIFO)</option>
              <option value="lifo">الوارد أخيراً صادر أولاً (LIFO)</option>
              <option value="standard">التكلفة المعيارية</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">عدد مستويات الأسعار</label>
              <select className="form-select">
                <option>1 سعر</option>
                <option>2 سعر</option>
                <option>3 أسعار</option>
              </select>
            </div>
            <div>
              <label className="form-label">السعر الافتراضي للبيع</label>
              <select className="form-select">
                <option>السعر الأول</option>
                <option>السعر الثاني</option>
                <option>السعر الثالث</option>
              </select>
            </div>
          </div>
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'limits') return (
    <div className="space-y-4">
      <SectionCard title="حدود وتنبيهات المخزون" icon={Boxes} iconColor="apple-teal">
        <SettingRow icon={AlertTriangle} iconColor="apple-red" label="السماح بالمخزون السالب" desc="السماح ببيع المنتجات عند نفاد المخزون">
          <Toggle checked={negativeStock} onChange={setNegativeStock} />
        </SettingRow>
        <SettingRow icon={Bell} iconColor="apple-orange" label="إعادة الطلب التلقائي" desc="إشعار عند وصول المخزون للحد الأدنى">
          <Toggle checked={autoReorder} onChange={setAutoReorder} />
        </SettingRow>
        <div className="py-3">
          <label className="form-label">حد التنبيه الافتراضي للمخزون</label>
          <input type="number" className="form-input" dir="ltr" defaultValue={10} min="0" />
        </div>
      </SectionCard>
      <SectionCard title="تتبع المخزون المتقدم" icon={Hash} iconColor="apple-purple">
        <SettingRow icon={Hash} iconColor="apple-purple" label="تتبع الدفعات (Batch)" desc="تتبع المخزون بأرقام الدفعات">
          <Toggle checked={batchTracking} onChange={setBatchTracking} />
        </SettingRow>
        <SettingRow icon={Bell} iconColor="apple-pink" label="تتبع تواريخ الانتهاء" desc="تنبيهات انتهاء صلاحية المنتجات">
          <Toggle checked={expiryTracking} onChange={setExpiryTracking} />
        </SettingRow>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  if (sub === 'numbering') return (
    <div className="space-y-4">
      <SectionCard title="الترقيم التلقائي" icon={Hash} iconColor="apple-blue">
        <div className="py-3 grid grid-cols-2 gap-4">
          {[
            { label: 'بادئة الفاتورة', val: 'INV-' },
            { label: 'بادئة المشتريات', val: 'PUR-' },
            { label: 'بادئة قيود اليومية', val: 'JRN-' },
            { label: 'بادئة أوامر الصرف', val: 'ISS-' },
            { label: 'بادئة الإرجاع', val: 'RET-' },
            { label: 'عدد أرقام الرمز', val: '6' },
          ].map(f => (
            <div key={f.label}>
              <label className="form-label">{f.label}</label>
              <input className="form-input" dir="ltr" defaultValue={f.val} />
            </div>
          ))}
        </div>
      </SectionCard>
      <SaveBtn />
    </div>
  )

  return null
}
