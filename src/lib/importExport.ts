import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ImportRow {
  rowIndex:  number
  data:      Record<string, string>
  errors:    string[]
  warnings:  string[]
  status:    'valid' | 'error' | 'warning'
}

export interface ImportResult {
  total:    number
  valid:    number
  errors:   number
  warnings: number
  rows:     ImportRow[]
}

// ─── Product template columns ─────────────────────────────────────────────────
export const PRODUCT_COLUMNS = [
  { key: 'name_ar',            label: 'اسم المنتج (عربي)',         required: true,  example: 'شاشة Samsung 27 بوصة' },
  { key: 'name_en',            label: 'اسم المنتج (إنجليزي)',       required: false, example: 'Samsung 27" Monitor' },
  { key: 'code',               label: 'كود المنتج',                required: false, example: 'MON-001' },
  { key: 'barcode',            label: 'الباركود',                  required: false, example: '6281234567890' },
  { key: 'category',           label: 'التصنيف',                   required: false, example: 'شاشات' },
  { key: 'unit',               label: 'وحدة القياس',               required: false, example: 'قطعة' },
  { key: 'cost_price',         label: 'سعر التكلفة',               required: false, example: '850' },
  { key: 'selling_price',      label: 'سعر البيع',                 required: true,  example: '1200' },
  { key: 'min_selling_price',  label: 'أدنى سعر بيع',              required: false, example: '1000' },
  { key: 'vat_rate',           label: 'نسبة الضريبة %',            required: false, example: '15' },
  { key: 'track_inventory',    label: 'تتبع المخزون (نعم/لا)',      required: false, example: 'نعم' },
  { key: 'min_stock_alert',    label: 'حد التنبيه للمخزون',        required: false, example: '5' },
  { key: 'is_service',         label: 'خدمة (نعم/لا)',             required: false, example: 'لا' },
  { key: 'description',        label: 'الوصف',                     required: false, example: 'شاشة IPS دقة 4K' },
  { key: 'notes',              label: 'ملاحظات',                   required: false, example: '' },
]

// ─── Inventory template columns ───────────────────────────────────────────────
export const INVENTORY_COLUMNS = [
  { key: 'barcode',     label: 'الباركود / الكود',     required: true,  example: '6281234567890' },
  { key: 'product_name',label: 'اسم المنتج',           required: false, example: 'شاشة Samsung 27"' },
  { key: 'warehouse',   label: 'المستودع',              required: false, example: 'المستودع الرئيسي' },
  { key: 'quantity',    label: 'الكمية',                required: true,  example: '100' },
  { key: 'cost_price',  label: 'سعر التكلفة',           required: false, example: '850' },
  { key: 'batch_number',label: 'رقم الدفعة',            required: false, example: 'BATCH-001' },
  { key: 'expiry_date', label: 'تاريخ الانتهاء',        required: false, example: '2026-12-31' },
]

// ─── Download template ────────────────────────────────────────────────────────
export function downloadTemplate(type: 'products' | 'inventory') {
  const cols   = type === 'products' ? PRODUCT_COLUMNS : INVENTORY_COLUMNS
  const title  = type === 'products' ? 'قالب_المنتجات' : 'قالب_المخزون'

  const wb = XLSX.utils.book_new()

  // ── Main sheet ──
  const headers = cols.map(c => c.label)
  const example = cols.map(c => c.example)
  const required= cols.map(c => c.required ? '* مطلوب' : 'اختياري')

  const ws = XLSX.utils.aoa_to_sheet([
    headers,   // row 1: headers
    example,   // row 2: example
  ])

  // Style required columns header (add asterisk note)
  cols.forEach((col, i) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: i })
    if (!ws[cellAddr]) return
    ws[cellAddr].v = col.required ? `${col.label} *` : col.label
  })

  // Column widths
  ws['!cols'] = cols.map(c => ({ wch: Math.max(c.label.length * 2, 18) }))

  XLSX.utils.book_append_sheet(wb, ws, 'البيانات')

  // ── Instructions sheet ──
  const instructions = [
    ['تعليمات الاستخدام'],
    [''],
    ['1. لا تغيّر أسماء الأعمدة في الصف الأول'],
    ['2. الخلايا التي تحمل علامة * إجبارية'],
    ['3. الصف الثاني مثال فقط — احذفه عند إدخال بياناتك'],
    ['4. تأكد من صحة تنسيق الأرقام (بدون فواصل)'],
    type === 'products'
      ? ['5. قيم تتبع المخزون / الخدمة: اكتب "نعم" أو "لا"']
      : ['5. تنسيق التاريخ: YYYY-MM-DD (مثال: 2026-12-31)'],
    ['6. احفظ الملف بصيغة Excel (.xlsx) أو CSV'],
    [''],
    ['الأعمدة الإجبارية:'],
    ...cols.filter(c => c.required).map(c => [`  • ${c.label}`]),
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions)
  wsInstr['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'التعليمات')

  XLSX.writeFile(wb, `${title}.xlsx`)
}

// ─── Parse uploaded file ──────────────────────────────────────────────────────
export async function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data   = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb     = XLSX.read(data, { type: 'array' })
        const ws     = wb.Sheets[wb.SheetNames[0]]
        const json   = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as Record<string, string>[]
        resolve(json)
      } catch (err) {
        reject(new Error('تعذّر قراءة الملف — تأكد من أنه Excel أو CSV صحيح'))
      }
    }
    reader.onerror = () => reject(new Error('خطأ في قراءة الملف'))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Map Arabic headers to keys ───────────────────────────────────────────────
function mapHeaders(
  row: Record<string, string>,
  cols: typeof PRODUCT_COLUMNS
): Record<string, string> {
  const result: Record<string, string> = {}
  cols.forEach(col => {
    // Try exact match first, then partial, then key directly
    const match = Object.keys(row).find(k =>
      k === col.label ||
      k.replace(' *', '').trim() === col.label ||
      k === col.key
    )
    result[col.key] = match ? (row[match] || '').toString().trim() : ''
  })
  return result
}

// ─── Validate products import ─────────────────────────────────────────────────
export function validateProducts(rows: Record<string, string>[]): ImportResult {
  const result: ImportRow[] = rows.map((raw, i) => {
    const data   = mapHeaders(raw, PRODUCT_COLUMNS)
    const errors: string[]   = []
    const warnings: string[] = []

    // Required fields
    if (!data.name_ar)       errors.push('اسم المنتج (عربي) مطلوب')
    if (!data.selling_price) errors.push('سعر البيع مطلوب')

    // Numeric checks
    if (data.selling_price && isNaN(+data.selling_price))
      errors.push('سعر البيع يجب أن يكون رقماً')
    if (data.cost_price && isNaN(+data.cost_price))
      errors.push('سعر التكلفة يجب أن يكون رقماً')
    if (data.vat_rate && isNaN(+data.vat_rate))
      errors.push('نسبة الضريبة يجب أن تكون رقماً')
    if (data.min_stock_alert && isNaN(+data.min_stock_alert))
      warnings.push('حد التنبيه للمخزون غير صحيح — سيُتجاهل')

    // Selling price below cost
    if (+data.selling_price > 0 && +data.cost_price > 0 && +data.selling_price < +data.cost_price)
      warnings.push('سعر البيع أقل من سعر التكلفة')

    // Boolean fields
    const boolVal = (v: string) => ['نعم','yes','true','1','صح'].includes(v.toLowerCase())
    if (data.track_inventory && !['نعم','لا','yes','no','true','false','1','0'].includes(data.track_inventory.toLowerCase()))
      warnings.push('قيمة "تتبع المخزون" غير معروفة — سيُستخدم "نعم" افتراضياً')

    return {
      rowIndex: i + 2, // +2 because row 1 is header, row 2 is example
      data,
      errors,
      warnings,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    }
  })

  return {
    total:    result.length,
    valid:    result.filter(r => r.status !== 'error').length,
    errors:   result.filter(r => r.status === 'error').length,
    warnings: result.filter(r => r.status === 'warning').length,
    rows:     result,
  }
}

// ─── Validate inventory import ────────────────────────────────────────────────
export function validateInventory(rows: Record<string, string>[]): ImportResult {
  const result: ImportRow[] = rows.map((raw, i) => {
    const data   = mapHeaders(raw, INVENTORY_COLUMNS)
    const errors: string[]   = []
    const warnings: string[] = []

    if (!data.barcode && !data.product_name) errors.push('الباركود أو اسم المنتج مطلوب')
    if (!data.quantity)   errors.push('الكمية مطلوبة')
    if (data.quantity && isNaN(+data.quantity)) errors.push('الكمية يجب أن تكون رقماً')
    if (+data.quantity < 0) errors.push('الكمية لا يمكن أن تكون سالبة')
    if (data.cost_price && isNaN(+data.cost_price)) warnings.push('سعر التكلفة غير صحيح — سيُتجاهل')
    if (data.expiry_date && isNaN(Date.parse(data.expiry_date)))
      warnings.push('تنسيق تاريخ الانتهاء غير صحيح — يجب أن يكون YYYY-MM-DD')

    return {
      rowIndex: i + 2,
      data,
      errors,
      warnings,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    }
  })

  return {
    total:    result.length,
    valid:    result.filter(r => r.status !== 'error').length,
    errors:   result.filter(r => r.status === 'error').length,
    warnings: result.filter(r => r.status === 'warning').length,
    rows:     result,
  }
}

// ─── Export products to Excel ─────────────────────────────────────────────────
export function exportProducts(products: Record<string, unknown>[]) {
  const rows = products.map(p => ({
    'اسم المنتج (عربي)':    p.name_ar   || '',
    'اسم المنتج (إنجليزي)': p.name_en   || '',
    'الكود':                p.code       || '',
    'الباركود':             p.barcode    || '',
    'التصنيف':              (p.category as Record<string,string>)?.name_ar || '',
    'وحدة القياس':          (p.unit as Record<string,string>)?.name_ar || '',
    'سعر التكلفة':          p.cost_price  || 0,
    'سعر البيع':            p.selling_price || 0,
    'أدنى سعر بيع':         p.min_selling_price || 0,
    'نسبة الضريبة %':       p.vat_rate    || 15,
    'تتبع المخزون':         p.track_inventory ? 'نعم' : 'لا',
    'حد التنبيه':           p.min_stock_alert || 0,
    'خدمة':                 p.is_service ? 'نعم' : 'لا',
    'الوصف':                p.description || '',
    'ملاحظات':              p.notes       || '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws, 'المنتجات')
  XLSX.writeFile(wb, `المنتجات_${new Date().toLocaleDateString('ar-SA').replace(/\//g,'-')}.xlsx`)
}

// ─── Export inventory to Excel ────────────────────────────────────────────────
export function exportInventory(inventory: Record<string, unknown>[]) {
  const rows = inventory.map(i => ({
    'اسم المنتج':    (i.product as Record<string,string>)?.name_ar || '',
    'الباركود':      (i.product as Record<string,string>)?.barcode || '',
    'الكود':         (i.product as Record<string,string>)?.code    || '',
    'المستودع':      (i.warehouse as Record<string,string>)?.name_ar || '',
    'الكمية':        i.quantity    || 0,
    'الكمية المتاحة':i.available_quantity || 0,
    'سعر التكلفة':   (i.product as Record<string,string>)?.cost_price || 0,
    'رقم الدفعة':    i.batch_number || '',
    'تاريخ الانتهاء':i.expiry_date  || '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws, 'المخزون')
  XLSX.writeFile(wb, `المخزون_${new Date().toLocaleDateString('ar-SA').replace(/\//g,'-')}.xlsx`)
}
