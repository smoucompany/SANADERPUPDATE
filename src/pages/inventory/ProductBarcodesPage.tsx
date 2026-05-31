import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, Search, CheckSquare, Square, Settings2, Download, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

type LabelSize = 'small' | 'medium' | 'large'
type BarcodeType = 'barcode' | 'qr'

const LABEL_SIZES: Record<LabelSize, { label: string; w: string; h: string; desc: string }> = {
  small:  { label: 'صغير',  w: '5cm',  h: '2.5cm', desc: '5×2.5 سم' },
  medium: { label: 'متوسط', w: '7cm',  h: '4cm',   desc: '7×4 سم' },
  large:  { label: 'كبير',  w: '10cm', h: '6cm',   desc: '10×6 سم' },
}


function BarcodePreview({ barcode, type, name, price, size }: { barcode: string; type: BarcodeType; name: string; price: number; size: LabelSize }) {
  const cfg = LABEL_SIZES[size]
  const bars = barcode.split('').map((_, i) => (i % 3 !== 2 ? 2 : 4))

  return (
    <div className="border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center gap-1 p-2 bg-white dark:bg-gray-900"
      style={{ width: size === 'small' ? 140 : size === 'medium' ? 180 : 220, minHeight: size === 'small' ? 70 : size === 'medium' ? 100 : 140 }}>
      <p className="text-[9px] font-bold text-center text-black dark:text-white leading-tight line-clamp-2 max-w-full">{name}</p>
      {type === 'barcode' ? (
        <div className="flex items-end gap-px my-1">
          {bars.slice(0, 20).map((w, i) => (
            <div key={i} style={{ width: w, height: size === 'small' ? 24 : size === 'medium' ? 32 : 40 }}
              className={`${i % 2 === 0 ? 'bg-black dark:bg-white' : 'bg-transparent'}`} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-px my-1 bg-black dark:bg-white p-1 rounded-sm">
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} style={{ width: size === 'small' ? 6 : 8, height: size === 'small' ? 6 : 8 }}
              className={Math.random() > 0.5 ? 'bg-black dark:bg-white' : 'bg-white dark:bg-black'} />
          ))}
        </div>
      )}
      <p className="text-[8px] font-mono text-black dark:text-white">{barcode}</p>
      <p className="text-[9px] font-bold text-black dark:text-white">{price.toLocaleString()} ر.س</p>
    </div>
  )
}

export default function ProductBarcodesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [labelSize, setLabelSize] = useState<LabelSize>('medium')
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('barcode')
  const [showPrice, setShowPrice] = useState(true)
  const [showSku, setShowSku] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<any>(null)

  const { data: products = [] } = useQuery({
    queryKey: ['products-barcodes', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id,name_ar,barcode,sku,selling_price,unit')
        .eq('company_id', user!.company_id).eq('is_active', true).limit(100)
      return data || []
    },
    enabled: !!user
  })

  const filtered = products.filter((p: any) =>
    !search || p.name_ar?.includes(search) || p.barcode?.includes(search) || p.sku?.includes(search)
  )

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((p: any) => p.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setQty = (id: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, qty) }))
  }

  const totalLabels = [...selected].reduce((s, id) => s + (quantities[id] || 1), 0)

  const handlePrint = () => {
    if (selected.size === 0) { toast.error('اختر منتجاً واحداً على الأقل'); return }
    toast.success(`جاري طباعة ${totalLabels} ملصق...`)
    window.print()
  }

  const selectedProducts = filtered.filter((p: any) => selected.has(p.id))

  return (
    <div className="space-y-5">
      <PageHeader
        title="طباعة الباركود"
        subtitle="طباعة ملصقات الأسعار والباركود للمنتجات"
        actions={
          <>
            <button onClick={() => navigate('/products')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => toast.success('جاري تصدير الملصقات...')} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير PDF
            </button>
            <button type="button" onClick={handlePrint} className="btn-primary gap-1.5">
              <Printer className="w-4 h-4" />طباعة ({totalLabels} ملصق)
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {/* Products list */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المنتجات..."
              className="form-input pr-9" />
          </div>

          {/* Select all */}
          <div className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-4 py-2.5">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              {selected.size === filtered.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
              تحديد الكل ({filtered.length} منتج)
            </button>
            <span className="text-xs text-muted-foreground">{selected.size} محدد • {totalLabels} ملصق</span>
          </div>

          {/* Products */}
          <div className="space-y-2">
            {filtered.map((product: any) => {
              const isSelected = selected.has(product.id)
              return (
                <div key={product.id}
                  className={`bg-card border rounded-xl px-4 py-3 flex items-center gap-3 transition-all cursor-pointer hover:shadow-sm
                    ${isSelected ? 'border-primary shadow-sm' : 'border-border/60'}`}>
                  <button onClick={() => toggleOne(product.id)} className="shrink-0">
                    {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => toggleOne(product.id)}>
                    <p className="font-medium text-sm truncate">{product.name_ar}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{product.barcode}</span>
                      {product.sku && <span>• {product.sku}</span>}
                      <span>• {(product.selling_price || 0).toLocaleString()} ر.س</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">الكمية:</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(product.id, (quantities[product.id] || 1) - 1)}
                          className="w-6 h-6 rounded-lg bg-muted hover:bg-muted/80 text-sm font-bold flex items-center justify-center transition-colors">-</button>
                        <span className="w-8 text-center font-bold text-sm">{quantities[product.id] || 1}</span>
                        <button onClick={() => setQty(product.id, (quantities[product.id] || 1) + 1)}
                          className="w-6 h-6 rounded-lg bg-muted hover:bg-muted/80 text-sm font-bold flex items-center justify-center transition-colors">+</button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => setPreviewProduct(previewProduct?.id === product.id ? null : product)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors shrink-0 ${previewProduct?.id === product.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    معاينة
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings & Preview */}
        <div className="space-y-4">
          {/* Print settings */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">إعدادات الطباعة</h3>
            </div>

            <div>
              <label className="form-label">حجم الملصق</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(LABEL_SIZES).map(([size, cfg]) => (
                  <button key={size} onClick={() => setLabelSize(size as LabelSize)}
                    className={`p-3 rounded-xl border text-center transition-all ${labelSize === size ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-border'}`}>
                    <p className="text-xs font-bold">{cfg.label}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">نوع الباركود</label>
              <div className="flex gap-2">
                {[{ v: 'barcode', l: 'باركود' }, { v: 'qr', l: 'QR كود' }].map(opt => (
                  <button key={opt.v} onClick={() => setBarcodeType(opt.v as BarcodeType)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${barcodeType === opt.v ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground hover:text-foreground'}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="form-label">عناصر الملصق</label>
              {[
                { state: showPrice, setter: setShowPrice, label: 'إظهار السعر' },
                { state: showSku, setter: setShowSku, label: 'إظهار رمز المنتج (SKU)' },
              ].map(opt => (
                <div key={opt.label} className="flex items-center justify-between">
                  <span className="text-sm">{opt.label}</span>
                  <button onClick={() => opt.setter(!opt.state)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${opt.state ? 'bg-primary' : 'bg-muted'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${opt.state ? 'translate-x-1' : 'translate-x-5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {previewProduct && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-4">معاينة الملصق</h3>
              <div className="flex justify-center">
                <BarcodePreview
                  barcode={previewProduct.barcode || '0000000000000'}
                  type={barcodeType}
                  name={previewProduct.name_ar}
                  price={showPrice ? (previewProduct.selling_price || 0) : 0}
                  size={labelSize}
                />
              </div>
            </div>
          )}

          {/* Print summary */}
          {selected.size > 0 && (
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">ملخص الطباعة</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المنتجات المحددة</span>
                  <span className="font-bold">{selected.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي الملصقات</span>
                  <span className="font-bold">{totalLabels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">حجم الملصق</span>
                  <span className="font-bold">{LABEL_SIZES[labelSize].desc}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">نوع الباركود</span>
                  <span className="font-bold">{barcodeType === 'barcode' ? 'باركود' : 'QR كود'}</span>
                </div>
              </div>
              <button type="button" onClick={handlePrint} className="btn-primary w-full gap-2 mt-4">
                <Printer className="w-4 h-4" />طباعة {totalLabels} ملصق
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
