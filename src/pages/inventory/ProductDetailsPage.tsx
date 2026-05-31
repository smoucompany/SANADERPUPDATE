import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Edit2, Package, TrendingUp, TrendingDown, AlertTriangle, Warehouse, Tag, BarChart3, ShoppingCart, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const STOCK_TREND: { date: string; stock: number }[] = []

const MOVEMENT_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sale:       { label:'بيع',      color:'text-red-500',    icon:ShoppingCart },
  purchase:   { label:'شراء',     color:'text-emerald-600',icon:ShoppingBag },
  adjustment: { label:'تسوية',    color:'text-blue-600',   icon:Package },
  transfer:   { label:'تحويل',    color:'text-purple-600', icon:Warehouse },
  return:     { label:'مرتجع',    color:'text-amber-600',  icon:TrendingUp },
}

export default function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, category:categories(name_ar)')
        .eq('id', id!).eq('company_id', user!.company_id).single()
      return data || null
    },
    enabled: !!id && !!user
  })

  const movements: { date: string; type: string; ref: string; qty: number; balance: number; note: string }[] = []
  const warehouses: { name: string; qty: number; reserved: number; available: number }[] = []

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}</div>
  if (!product) return <div className="text-center py-20 text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>لم يتم العثور على المنتج</p></div>

  const margin = Math.round(((product.selling_price - product.cost_price) / product.selling_price) * 100)
  const isLowStock = product.current_stock <= product.min_stock
  const isOverStock = product.current_stock >= product.max_stock

  return (
    <div className="space-y-5">
      <PageHeader
        title={product.name_ar}
        subtitle={`${product.sku} • ${product.barcode}`}
        actions={
          <>
            <button onClick={() => navigate('/products')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => navigate(`/products/${id}/edit`)} className="btn-primary gap-1.5">
              <Edit2 className="w-4 h-4" />تعديل
            </button>
          </>
        }
      />

      {/* Stock alert */}
      {isLowStock && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-3.5">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            تحذير: المخزون منخفض! الكمية الحالية ({product.current_stock}) أقل من الحد الأدنى ({product.min_stock})
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        {/* Main */}
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'المخزون الحالي', value:`${product.current_stock} ${product.unit}`, color: isLowStock ? 'text-red-600' : 'text-foreground', bg: isLowStock ? 'bg-red-500' : 'bg-primary', icon:Package },
              { label:'سعر البيع',      value:formatCurrency(product.selling_price),      color:'text-emerald-600', bg:'bg-emerald-500', icon:Tag },
              { label:'سعر التكلفة',   value:formatCurrency(product.cost_price),         color:'text-blue-600',    bg:'bg-blue-500',    icon:ShoppingBag },
              { label:'هامش الربح',    value:`${margin}%`,                               color:'text-purple-600',  bg:'bg-purple-500',  icon:BarChart3 },
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

          {/* Stock trend chart */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />حركة المخزون - آخر شهر
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={STOCK_TREND}>
                <defs>
                  <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="stock" stroke="hsl(var(--primary))" fill="url(#stockGrad)" name="المخزون" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Warehouses */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-primary" />توزيع المخزون بالمستودعات
            </h3>
            <div className="space-y-3">
              {warehouses.map((wh, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{wh.name}</p>
                      <span className="font-black text-primary">{wh.qty} {product.unit}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(wh.qty / product.current_stock) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>محجوز: {wh.reserved}</span>
                      <span>متاح: {wh.available}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Movement log */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50">
              <h3 className="font-bold">آخر حركات المخزون</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">التاريخ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">المرجع</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">النوع</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">الكمية</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mv, i) => {
                  const cfg = MOVEMENT_CFG[mv.type] || MOVEMENT_CFG.adjustment
                  const Icon = cfg.icon
                  return (
                    <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">{formatDate(mv.date)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{mv.ref}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`flex items-center justify-center gap-1 text-xs font-semibold ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5" />{cfg.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${mv.qty > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {mv.qty > 0 ? '+' : ''}{mv.qty}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-primary">{mv.balance}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Product info */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="w-full aspect-square bg-muted/40 rounded-xl flex items-center justify-center mb-4">
              <Package className="w-16 h-16 text-muted-foreground/30" />
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                { label:'الفئة', value: typeof product.category === 'object' ? (product.category as any)?.name_ar : product.category },
                { label:'الوحدة', value: product.unit },
                { label:'الباركود', value: product.barcode },
                { label:'رمز المنتج', value: product.sku },
                { label:'المورد', value: product.supplier },
                { label:'تاريخ الإضافة', value: formatDate(product.created_at) },
              ].map(f => f.value && (
                <div key={f.label} className="flex justify-between">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-right text-xs max-w-[55%] truncate">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">الأسعار</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label:'سعر البيع', value:formatCurrency(product.selling_price), color:'text-emerald-600' },
                { label:'أدنى سعر', value:formatCurrency(product.min_price), color:'text-amber-600' },
                { label:'سعر الجملة', value:formatCurrency(product.wholesale_price), color:'text-blue-600' },
                { label:'سعر التكلفة', value:formatCurrency(product.cost_price), color:'text-foreground' },
              ].map(f => (
                <div key={f.label} className="flex justify-between">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className={`font-bold ${f.color}`}>{f.value}</span>
                </div>
              ))}
              <div className="border-t border-border/50 pt-2 flex justify-between">
                <span className="text-muted-foreground">هامش الربح</span>
                <span className="font-black text-purple-600">{margin}%</span>
              </div>
            </div>
          </div>

          {/* Stock levels */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h3 className="font-semibold mb-3">مستويات المخزون</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label:'الحد الأدنى', value:product.min_stock, color:'text-red-500' },
                { label:'نقطة إعادة الطلب', value:product.reorder_point, color:'text-amber-600' },
                { label:'الحد الأقصى', value:product.max_stock, color:'text-emerald-600' },
              ].map(f => (
                <div key={f.label} className="flex justify-between">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className={`font-bold ${f.color}`}>{f.value} {product.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {product.description && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-2 text-sm">الوصف</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
