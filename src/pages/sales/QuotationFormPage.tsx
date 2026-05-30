import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, Loader2, Plus, Trash2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCustomers } from '@/hooks/useCustomers'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

type LineItem = { product_name: string; qty: number; unit_price: number; discount: number }

const emptyLine = (): LineItem => ({ product_name: '', qty: 1, unit_price: 0, discount: 0 })

export default function QuotationFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: customers = [] } = useCustomers('')
  const isEdit = !!id

  const [form, setForm] = useState({
    customer_id: '',
    quote_date: new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: '',
    terms: 'هذا العرض ساري حتى تاريخ الانتهاء المذكور أعلاه.',
  })
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [saving, setSaving] = useState(false)

  const setLine = (i: number, k: keyof LineItem, v: string | number) =>
    setLines(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l))

  const lineTotal = (l: LineItem) => l.qty * l.unit_price * (1 - l.discount / 100)
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    if (!form.customer_id) { toast.error('اختر العميل'); return }
    if (lines.some(l => !l.product_name)) { toast.error('أدخل اسم المنتج لجميع البنود'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    toast.success(status === 'draft' ? 'تم حفظ المسودة' : 'تم إرسال العرض للعميل')
    navigate('/quotations')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'تعديل عرض السعر' : 'عرض سعر جديد'}
        subtitle="إنشاء عرض سعر للعميل"
        actions={
          <button onClick={() => navigate('/quotations')} className="btn-outline gap-1.5">
            <ArrowRight className="w-4 h-4" />رجوع
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          {/* Customer & Dates */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-4">بيانات العرض</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="form-label">العميل *</label>
                <select value={form.customer_id} onChange={e => setForm(p => ({...p, customer_id: e.target.value}))} className="form-select">
                  <option value="">اختر العميل</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">تاريخ العرض</label>
                <input type="date" value={form.quote_date} onChange={e => setForm(p => ({...p, quote_date: e.target.value}))} className="form-input" dir="ltr" />
              </div>
              <div>
                <label className="form-label">تاريخ الانتهاء</label>
                <input type="date" value={form.valid_until} onChange={e => setForm(p => ({...p, valid_until: e.target.value}))} className="form-input" dir="ltr" />
              </div>
              <div>
                <label className="form-label">مرجع العرض</label>
                <input className="form-input" dir="ltr" placeholder="REF-001" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold">بنود العرض</h3>
              <button onClick={() => setLines(p => [...p, emptyLine()])} className="btn-outline text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />إضافة بند
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[35%]">المنتج / الخدمة</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[12%]">الكمية</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[18%]">السعر</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[12%]">خصم%</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">الإجمالي</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-4 py-2">
                        <input value={line.product_name} onChange={e => setLine(i, 'product_name', e.target.value)}
                          className="form-input text-sm" placeholder="اسم المنتج أو الخدمة" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={line.qty} onChange={e => setLine(i, 'qty', +e.target.value)}
                          className="form-input text-sm" dir="ltr" min={1} />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={line.unit_price} onChange={e => setLine(i, 'unit_price', +e.target.value)}
                          className="form-input text-sm" dir="ltr" min={0} step="0.01" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={line.discount} onChange={e => setLine(i, 'discount', +e.target.value)}
                          className="form-input text-sm" dir="ltr" min={0} max={100} />
                      </td>
                      <td className="px-4 py-2 font-bold">{formatCurrency(lineTotal(line))}</td>
                      <td className="px-4 py-2">
                        {lines.length > 1 && (
                          <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} className="p-1 rounded text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-border/50 bg-muted/20">
              <div className="max-w-xs mr-auto space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الضريبة 15%</span><span>{formatCurrency(vat)}</span></div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
                  <span>الإجمالي الكلي</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} className="form-input resize-none h-24" placeholder="ملاحظات للعميل..." />
              </div>
              <div>
                <label className="form-label">الشروط والأحكام</label>
                <textarea value={form.terms} onChange={e => setForm(p=>({...p,terms:e.target.value}))} className="form-input resize-none h-24" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold">إجراءات</h3>
            <button onClick={() => handleSave('draft')} disabled={saving} className="btn-outline w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ كمسودة
            </button>
            <button onClick={() => handleSave('sent')} disabled={saving} className="btn-primary w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ وإرسال للعميل
            </button>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">ملخص</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">عدد البنود</span><span className="font-semibold">{lines.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الإجمالي</span><span className="font-bold text-primary">{formatCurrency(total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">صالح حتى</span><span>{form.valid_until}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
