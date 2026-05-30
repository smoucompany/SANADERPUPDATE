import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Edit2, Printer, Download, TrendingDown, Calendar, DollarSign, Package, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const MOCK_ASSETS: Record<string, any> = {
  '1': {
    id:'1', name:'سيارة تويوتا كامري 2024', category:'مركبات', serial:'1HGBH41JXMN109186',
    purchase_date:'2024-01-15', purchase_cost:185000, useful_life:5, depreciation_method:'القسط الثابت',
    salvage_value:18500, accumulated_depreciation:37000, book_value:148000,
    location:'المستودع الرئيسي', supplier:'وكالة تويوتا', insurance:'2025-01-15',
    notes:'مركبة الإدارة العامة', status:'active',
    maintenance: [
      { date:'2026-03-15', type:'صيانة دورية', cost:1200, notes:'تغيير زيت وفلتر' },
      { date:'2025-09-10', type:'إطارات جديدة', cost:3200, notes:'تغيير 4 إطارات' },
    ]
  },
  '2': {
    id:'2', name:'معدات مطبخ صناعي', category:'معدات وآلات', serial:'KITCH-2023-001',
    purchase_date:'2023-06-01', purchase_cost:85000, useful_life:10, depreciation_method:'القسط الثابت',
    salvage_value:8500, accumulated_depreciation:22950, book_value:62050,
    location:'المطبخ', supplier:'مزود المعدات الصناعية', insurance:'2024-06-01',
    notes:'', status:'active',
    maintenance: [
      { date:'2026-01-20', type:'صيانة دورية', cost:800, notes:'تنظيف وفحص' },
    ]
  },
  '3': {
    id:'3', name:'خادم Dell PowerEdge R740', category:'أجهزة الحاسب', serial:'SRV2024-XR740-001',
    purchase_date:'2024-03-01', purchase_cost:45000, useful_life:5, depreciation_method:'القسط الثابت',
    salvage_value:4500, accumulated_depreciation:8100, book_value:36900,
    location:'غرفة الخادم', supplier:'Dell Technologies', insurance:'2025-03-01',
    notes:'خادم قاعدة البيانات الرئيسي', status:'active',
    maintenance: []
  },
}

function generateDepreciationSchedule(asset: any) {
  const annualDep = (asset.purchase_cost - asset.salvage_value) / asset.useful_life
  const startYear = new Date(asset.purchase_date).getFullYear()
  const schedule = []
  let bookValue = asset.purchase_cost
  let accumulated = 0

  for (let i = 1; i <= asset.useful_life; i++) {
    const dep = Math.min(annualDep, bookValue - asset.salvage_value)
    accumulated += dep
    bookValue -= dep
    schedule.push({
      year: startYear + i - 1,
      period: `السنة ${i}`,
      depreciation: dep,
      accumulated,
      book_value: Math.max(asset.salvage_value, bookValue),
      isCurrentYear: (startYear + i - 1) === new Date().getFullYear(),
    })
  }
  return schedule
}

export default function AssetDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const asset = MOCK_ASSETS[id as string] || MOCK_ASSETS['1']
  const schedule = generateDepreciationSchedule(asset)
  const depreciationRate = Math.round(((asset.purchase_cost - asset.book_value) / asset.purchase_cost) * 100)
  const remainingLife = asset.useful_life - Math.floor((Date.now() - new Date(asset.purchase_date).getTime()) / (365.25 * 24 * 3600 * 1000))
  const annualDep = (asset.purchase_cost - asset.salvage_value) / asset.useful_life

  const chartData = schedule.map(s => ({ name: s.year.toString(), 'القيمة الدفترية': Math.round(s.book_value), 'الاستهلاك المتراكم': Math.round(s.accumulated) }))

  if (!asset) return (
    <div className="text-center py-20 text-muted-foreground">
      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>لم يتم العثور على الأصل</p>
      <button onClick={() => navigate('/assets')} className="btn-outline mt-4 gap-1.5">
        <ArrowRight className="w-4 h-4" />العودة للأصول
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title={asset.name}
        subtitle={`${asset.category} • ${asset.serial}`}
        actions={
          <>
            <button onClick={() => navigate('/assets')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => window.print()} className="btn-outline gap-1.5">
              <Printer className="w-4 h-4" />طباعة
            </button>
            <button onClick={() => toast.success('جاري تصدير بطاقة الأصل')} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير
            </button>
            <button onClick={() => navigate(`/assets/${id}/edit`)} className="btn-primary gap-1.5">
              <Edit2 className="w-4 h-4" />تعديل
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Main */}
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'تكلفة الشراء',     value:formatCurrency(asset.purchase_cost),          color:'text-foreground', bg:'bg-blue-500',    icon:DollarSign },
              { label:'الاستهلاك المتراكم',value:formatCurrency(asset.accumulated_depreciation),color:'text-red-600',    bg:'bg-red-500',     icon:TrendingDown },
              { label:'القيمة الدفترية',  value:formatCurrency(asset.book_value),             color:'text-primary',    bg:'bg-primary',     icon:Package },
              { label:'العمر المتبقي',    value:`${Math.max(0, remainingLife)} سنة`,           color:'text-amber-600',  bg:'bg-amber-500',   icon:Calendar },
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
              <span className="text-2xl font-black text-primary">{depreciationRate}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${depreciationRate}%`,
                  background: depreciationRate > 80 ? '#ef4444' : depreciationRate > 50 ? '#f59e0b' : '#3b82f6'
                }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>تاريخ الشراء: {formatDate(asset.purchase_date)}</span>
              <span>قيمة الخردة: {formatCurrency(asset.salvage_value)}</span>
            </div>
          </div>

          {/* Depreciation chart */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4">منحنى الاستهلاك</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="bookValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="accDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Area type="monotone" dataKey="القيمة الدفترية" stroke="#3b82f6" fill="url(#bookValue)" />
                <Area type="monotone" dataKey="الاستهلاك المتراكم" stroke="#ef4444" fill="url(#accDep)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Depreciation schedule table */}
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
                  <tr key={row.year} className={`border-t border-border/40 transition-colors ${row.isCurrentYear ? 'bg-primary/5 font-semibold' : 'hover:bg-muted/20'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.year}
                        {row.isCurrentYear && (
                          <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold">الحالية</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-red-500">{formatCurrency(row.depreciation)}</td>
                    <td className="px-4 py-3 text-center text-orange-500">{formatCurrency(row.accumulated)}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{formatCurrency(row.book_value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t-2 border-border">
                <tr>
                  <td className="px-4 py-3 font-bold">الإجمالي</td>
                  <td className="px-4 py-3 text-center font-bold text-red-500">{formatCurrency(asset.purchase_cost - asset.salvage_value)}</td>
                  <td className="px-4 py-3 text-center font-bold text-orange-500">{formatCurrency(asset.purchase_cost - asset.salvage_value)}</td>
                  <td className="px-4 py-3 text-center font-bold">{formatCurrency(asset.salvage_value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Maintenance history */}
          {asset.maintenance.length > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50">
                <h3 className="font-bold">سجل الصيانة</h3>
              </div>
              <div className="divide-y divide-border/40">
                {asset.maintenance.map((m: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{m.type}</p>
                      <p className="text-xs text-muted-foreground">{m.notes}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{formatCurrency(m.cost)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Asset info */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">بيانات الأصل</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'الفئة', value: asset.category },
                { label: 'الرقم التسلسلي', value: asset.serial },
                { label: 'الموقع', value: asset.location },
                { label: 'المورد', value: asset.supplier },
                { label: 'تاريخ الشراء', value: formatDate(asset.purchase_date) },
                { label: 'العمر الإنتاجي', value: `${asset.useful_life} سنوات` },
                { label: 'طريقة الاستهلاك', value: asset.depreciation_method },
                { label: 'قسط الاستهلاك السنوي', value: formatCurrency(annualDep) },
                { label: 'انتهاء التأمين', value: asset.insurance ? formatDate(asset.insurance) : '—' },
              ].map(f => (
                <div key={f.label} className="flex justify-between">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-right max-w-[55%]">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insurance alert */}
          {asset.insurance && new Date(asset.insurance) < new Date(Date.now() + 30*24*3600*1000) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-700 dark:text-amber-500">تنبيه: التأمين ينتهي قريباً</p>
                <p className="text-xs text-amber-600 mt-0.5">{formatDate(asset.insurance)}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">الحالة</h3>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${asset.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-700'}`}>
              {asset.status === 'active' ? 'نشط' : asset.status === 'disposed' ? 'مستبعد' : 'مُباع'}
            </span>
            {asset.notes && <p className="text-xs text-muted-foreground mt-3">{asset.notes}</p>}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-2">
            <button onClick={() => window.print()} className="btn-outline gap-2 w-full">
              <Printer className="w-4 h-4" />طباعة بطاقة الأصل
            </button>
            <button onClick={() => toast.success('جاري تسجيل عملية صيانة')} className="btn-outline gap-2 w-full">
              <Calendar className="w-4 h-4" />تسجيل صيانة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
