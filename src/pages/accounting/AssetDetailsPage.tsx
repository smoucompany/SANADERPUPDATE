import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Edit2, Printer, TrendingDown, Calendar, DollarSign, Package, AlertCircle, Plus, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

function generateDepreciationSchedule(asset: any) {
  if (!asset?.purchase_cost || !asset?.useful_life) return []
  const salvage = asset.salvage_value || 0
  const annualDep = (asset.purchase_cost - salvage) / asset.useful_life
  const startYear = new Date(asset.purchase_date).getFullYear()
  const schedule = []
  let bookValue = asset.purchase_cost
  let accumulated = 0
  for (let i = 1; i <= asset.useful_life; i++) {
    const dep = Math.min(annualDep, bookValue - salvage)
    accumulated += dep
    bookValue -= dep
    schedule.push({
      year: startYear + i - 1,
      depreciation: dep,
      accumulated,
      book_value: Math.max(salvage, bookValue),
      isCurrentYear: (startYear + i - 1) === new Date().getFullYear(),
    })
  }
  return schedule
}

export default function AssetDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [showMaintModal, setShowMaintModal] = useState(false)
  const [maintForm, setMaintForm] = useState({ type: '', cost: '', date: new Date().toISOString().slice(0, 10), notes: '' })
  const [savingMaint, setSavingMaint] = useState(false)

  const { data: asset, isLoading, refetch } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      if (!user?.company_id || !id) return null
      const { data, error } = await supabase
        .from('assets')
        .select('*, maintenance:asset_maintenance(*)')
        .eq('id', id)
        .eq('company_id', user.company_id)
        .single()
      if (error) return null
      return data
    },
    enabled: !!id && !!user?.company_id,
  })

  const handleSaveMaintenance = async () => {
    if (!maintForm.type || !maintForm.cost || !maintForm.date) {
      toast.error('أدخل نوع الصيانة والتكلفة والتاريخ')
      return
    }
    setSavingMaint(true)
    try {
      const { error } = await supabase.from('asset_maintenance').insert({
        asset_id: id,
        company_id: user!.company_id,
        type: maintForm.type,
        cost: parseFloat(maintForm.cost),
        date: maintForm.date,
        notes: maintForm.notes,
      })
      if (error) throw error
      toast.success('تم تسجيل عملية الصيانة')
      setShowMaintModal(false)
      setMaintForm({ type: '', cost: '', date: new Date().toISOString().slice(0, 10), notes: '' })
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingMaint(false)
    }
  }

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
    </div>
  )

  if (!asset) return (
    <div className="text-center py-20 text-muted-foreground">
      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="mb-4">لم يتم العثور على الأصل</p>
      <button onClick={() => navigate('/assets')} className="btn-outline gap-1.5">
        <ArrowRight className="w-4 h-4" />العودة للأصول
      </button>
    </div>
  )

  const schedule = generateDepreciationSchedule(asset)
  const purchaseCost = asset.purchase_cost || 0
  const bookValue = asset.book_value || 0
  const accumulated = asset.accumulated_depreciation || 0
  const salvage = asset.salvage_value || 0
  const usefulLife = asset.useful_life || 1
  const annualDep = (purchaseCost - salvage) / usefulLife
  const depRate = purchaseCost > 0 ? Math.round(((purchaseCost - bookValue) / purchaseCost) * 100) : 0
  const yearsElapsed = Math.floor((Date.now() - new Date(asset.purchase_date || Date.now()).getTime()) / (365.25 * 24 * 3600 * 1000))
  const remainingLife = Math.max(0, usefulLife - yearsElapsed)
  const maintenance = asset.maintenance || []

  const chartData = schedule.map(s => ({
    name: s.year.toString(),
    'القيمة الدفترية': Math.round(s.book_value),
    'الاستهلاك المتراكم': Math.round(s.accumulated),
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title={asset.name}
        subtitle={`${asset.category || ''} • ${asset.serial_number || ''}`}
        actions={
          <>
            <button onClick={() => navigate('/assets')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button type="button" onClick={() => window.print()} className="btn-outline gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
            <button onClick={() => navigate(`/assets/${id}/edit`)} className="btn-primary gap-1.5">
              <Edit2 className="w-4 h-4" />تعديل
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'تكلفة الشراء',      value: formatCurrency(purchaseCost), color: 'text-foreground', bg: 'bg-blue-500',   icon: DollarSign },
              { label: 'الاستهلاك المتراكم', value: formatCurrency(accumulated),  color: 'text-red-600',    bg: 'bg-red-500',    icon: TrendingDown },
              { label: 'القيمة الدفترية',   value: formatCurrency(bookValue),    color: 'text-primary',    bg: 'bg-primary',    icon: Package },
              { label: 'العمر المتبقي',     value: `${remainingLife} سنة`,       color: 'text-amber-600',  bg: 'bg-amber-500',  icon: Calendar },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={`font-black text-lg ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Depreciation progress */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">نسبة الاستهلاك</h3>
              <span className="text-2xl font-black text-primary">{depRate}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${depRate}%`, background: depRate > 80 ? '#ef4444' : depRate > 50 ? '#f59e0b' : '#3b82f6' }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>تاريخ الشراء: {asset.purchase_date ? formatDate(asset.purchase_date) : '—'}</span>
              <span>قيمة الخردة: {formatCurrency(salvage)}</span>
            </div>
          </div>

          {/* Depreciation chart */}
          {chartData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-bold mb-4">منحنى الاستهلاك</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="bv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="القيمة الدفترية" stroke="#3b82f6" fill="url(#bv)" />
                  <Area type="monotone" dataKey="الاستهلاك المتراكم" stroke="#ef4444" fill="url(#ad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Depreciation schedule */}
          {schedule.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50">
                <h3 className="font-bold">جدول الاستهلاك السنوي</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">السنة</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">قسط الاستهلاك</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">مجمع الاستهلاك</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">القيمة الدفترية</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(row => (
                    <tr key={row.year} className={`border-t border-border/40 ${row.isCurrentYear ? 'bg-primary/5 font-semibold' : 'hover:bg-muted/20'}`}>
                      <td className="px-4 py-3">
                        {row.year}
                        {row.isCurrentYear && <span className="mr-2 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold">الحالية</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-red-500">{formatCurrency(row.depreciation)}</td>
                      <td className="px-4 py-3 text-center text-orange-500">{formatCurrency(row.accumulated)}</td>
                      <td className="px-4 py-3 text-center font-bold text-primary">{formatCurrency(row.book_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Maintenance history */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-bold">سجل الصيانة</h3>
              <button onClick={() => setShowMaintModal(true)} className="btn-outline text-xs gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" />تسجيل صيانة
              </button>
            </div>
            {maintenance.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">لا توجد سجلات صيانة</div>
            ) : (
              <div className="divide-y divide-border/40">
                {maintenance.map((m: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{m.type}</p>
                      {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{formatCurrency(m.cost || 0)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">بيانات الأصل</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'الفئة', value: asset.category },
                { label: 'الرقم التسلسلي', value: asset.serial_number },
                { label: 'الموقع', value: asset.location },
                { label: 'المورد', value: asset.supplier },
                { label: 'تاريخ الشراء', value: asset.purchase_date ? formatDate(asset.purchase_date) : '—' },
                { label: 'العمر الإنتاجي', value: `${usefulLife} سنة` },
                { label: 'طريقة الاستهلاك', value: asset.depreciation_method },
                { label: 'القسط السنوي', value: formatCurrency(annualDep) },
                { label: 'انتهاء التأمين', value: asset.insurance_expiry ? formatDate(asset.insurance_expiry) : '—' },
              ].filter(f => f.value && f.value !== '—').map(f => (
                <div key={f.label} className="flex justify-between">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-right max-w-[55%]">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {asset.insurance_expiry && new Date(asset.insurance_expiry) < new Date(Date.now() + 30 * 24 * 3600 * 1000) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-700 dark:text-amber-400">التأمين ينتهي قريباً</p>
                <p className="text-xs text-amber-600 mt-0.5">{formatDate(asset.insurance_expiry)}</p>
              </div>
            </div>
          )}

          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">الحالة</h3>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${asset.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-700'}`}>
              {asset.status === 'active' ? 'نشط' : asset.status === 'disposed' ? 'مستبعد' : 'مُباع'}
            </span>
            {asset.notes && <p className="text-xs text-muted-foreground mt-3">{asset.notes}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => window.print()} className="btn-outline gap-2 w-full">
              <Printer className="w-4 h-4" />طباعة بطاقة الأصل
            </button>
            <button onClick={() => setShowMaintModal(true)} className="btn-outline gap-2 w-full">
              <Calendar className="w-4 h-4" />تسجيل صيانة
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance modal */}
      <Modal open={showMaintModal} onClose={() => setShowMaintModal(false)} title="تسجيل عملية صيانة">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">نوع الصيانة *</label>
              <input value={maintForm.type} onChange={e => setMaintForm(p => ({ ...p, type: e.target.value }))}
                className="form-input" placeholder="مثال: صيانة دورية، إصلاح" />
            </div>
            <div>
              <label className="form-label">التاريخ *</label>
              <input type="date" value={maintForm.date} onChange={e => setMaintForm(p => ({ ...p, date: e.target.value }))}
                className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">التكلفة (ر.س) *</label>
              <input type="number" value={maintForm.cost} onChange={e => setMaintForm(p => ({ ...p, cost: e.target.value }))}
                className="form-input" dir="ltr" min="0" step="0.01" />
            </div>
            <div className="col-span-2">
              <label className="form-label">ملاحظات</label>
              <textarea value={maintForm.notes} onChange={e => setMaintForm(p => ({ ...p, notes: e.target.value }))}
                className="form-input resize-none h-20" placeholder="تفاصيل الصيانة..." />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowMaintModal(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSaveMaintenance} disabled={savingMaint} className="btn-primary gap-2">
              {savingMaint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
