import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'
import { ar } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency in Arabic
export function formatCurrency(amount: number | null | undefined, currency = 'SAR'): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

// Format number
export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

// Format date in Arabic
export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, fmt, { locale: ar })
}

// Format date and time
export function formatDateTime(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'dd/MM/yyyy HH:mm', { locale: ar })
}

// Get today's date as ISO string
export function today(): string {
  return new Date().toISOString().split('T')[0]
}

// Calculate VAT — clamps negative amounts to 0
export function calculateVat(amount: number, vatRate: number, inclusive = false): {
  baseAmount: number
  vatAmount: number
  totalAmount: number
} {
  const safeAmount = Math.max(0, amount)
  if (inclusive) {
    const baseAmount = safeAmount / (1 + vatRate / 100)
    const vatAmount = safeAmount - baseAmount
    return { baseAmount, vatAmount, totalAmount: safeAmount }
  } else {
    const vatAmount = safeAmount * (vatRate / 100)
    return { baseAmount: safeAmount, vatAmount, totalAmount: safeAmount + vatAmount }
  }
}

// Calculate discount — percentage capped at 100%, result capped at amount
export function calculateDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    const pct = Math.min(Math.max(discountValue, 0), 100)
    return Math.min((amount * pct) / 100, amount)
  }
  return Math.min(Math.max(discountValue, 0), amount)
}

// Generate QR code data for Saudi invoices (ZATCA format)
export function generateZATCAQR(params: {
  sellerName: string
  taxNumber: string
  invoiceDate: string
  invoiceTotal: string
  vatTotal: string
}): string {
  const tlvData = [
    encodeTLV(1, params.sellerName),
    encodeTLV(2, params.taxNumber),
    encodeTLV(3, params.invoiceDate),
    encodeTLV(4, params.invoiceTotal),
    encodeTLV(5, params.vatTotal)
  ].join('')
  return btoa(tlvData)
}

function encodeTLV(tag: number, value: string): string {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(value)
  return String.fromCharCode(tag) + String.fromCharCode(encoded.length) + String.fromCharCode(...encoded)
}

// Get status label in Arabic
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'مسودة',
    confirmed: 'مؤكدة',
    paid: 'مدفوعة',
    partial: 'جزئية',
    cancelled: 'ملغاة',
    returned: 'مرتجعة',
    open: 'مفتوحة',
    closed: 'مغلقة',
    posted: 'منشورة',
    active: 'نشط',
    suspended: 'موقوف'
  }
  return labels[status] || status
}

// Get payment method label
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'نقدي',
    mada: 'مدى',
    transfer: 'تحويل بنكي',
    credit: 'بطاقة ائتمان',
    mixed: 'مختلط',
    deferred: 'آجل'
  }
  return labels[method] || method
}

// Get account type label
export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    asset: 'أصول',
    liability: 'خصوم',
    equity: 'حقوق ملكية',
    revenue: 'إيرادات',
    expense: 'مصروفات'
  }
  return labels[type] || type
}

// Export statement to PDF
export async function exportStatementToPDF(rows: Record<string, unknown>[], filename: string) {
  const jsPDFClass = (await import('jspdf')).jsPDF
  await import('jspdf-autotable')
  const doc = new (jsPDFClass as any)({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  doc.setFont('Cairo')
  doc.setFontSize(12)
  doc.text('كشف حساب المورد', 40, 40)
  (doc as any).autoTable({
    startY: 60,
    head: [[ 'التاريخ', 'المرجع', 'البيان', 'مدين', 'دائن', 'الرصيد' ]],
    body: rows.map(row => [
      String(row['التاريخ'] || ''),
      String(row['المرجع'] || ''),
      String(row['البيان'] || ''),
      String(row['مدين'] || ''),
      String(row['دائن'] || ''),
      String(row['الرصيد'] || '')
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 }
  })
  doc.save(`${filename}.pdf`)
}

// Export to Excel
export async function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// Export to CSV
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n')
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

// Truncate text
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}

// Validate Saudi phone number
export function isValidSaudiPhone(phone: string): boolean {
  return /^(05|5|966|00966)[0-9]{8}$/.test(phone.replace(/\s|-/g, ''))
}

// Generate random color for charts
export function generateColors(count: number): string[] {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#14B8A6',
    '#6366F1', '#A855F7', '#22D3EE', '#4ADE80', '#FBBF24'
  ]
  return Array.from({ length: count }, (_, i) => colors[i % colors.length])
}

// Print helper — uses a hidden iframe to avoid popup-blocker issues and
// injects self-contained CSS so the output looks correct without Tailwind.
export function printElement(elementId: string, title = 'طباعة') {
  const element = document.getElementById(elementId)
  if (!element) {
    console.warn(`printElement: no element found with id="${elementId}"`)
    return
  }

  // Remove any previously-orphaned print iframe
  document.getElementById('__print_iframe__')?.remove()

  const iframe = document.createElement('iframe')
  iframe.id = '__print_iframe__'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;top:0;left:-200%;width:100%;height:100%;border:none;'
  document.body.appendChild(iframe)

  const iwin = iframe.contentWindow
  if (!iwin) { iframe.remove(); return }

  const printDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  iwin.document.open()
  iwin.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 12mm 15mm; direction: rtl; font-size: 10.5pt; color: #1a1a1a; background: white; }

    /* ── Print header ───────────────────────── */
    .prt-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8pt; border-bottom: 2pt solid #1e3a5f; margin-bottom: 14pt; }
    .prt-title   { font-size: 15pt; font-weight: 900; color: #1e3a5f; letter-spacing: -0.3pt; }
    .prt-date    { font-size: 8.5pt; color: #6b7280; }

    /* ── Table ─────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    thead tr { background: linear-gradient(90deg,#1e3a5f,#2d6a9f); color: white; }
    th { padding: 7pt 9pt; text-align: right; font-weight: 700; font-size: 8.5pt; letter-spacing: 0.2pt; border: none; }
    td { padding: 5.5pt 9pt; border-bottom: 0.5pt solid #e5e7eb; vertical-align: middle; }
    tbody tr:nth-child(even) td { background: #f8faff; }
    tbody tr:last-child td { border-bottom: none; }

    /* ── Colour utility classes (mirrors Tailwind) ─ */
    .font-medium, .font-semibold { font-weight: 600; }
    .font-bold, .font-black      { font-weight: 800; }
    .text-emerald-600, .text-emerald-500 { color: #16a34a; }
    .text-orange-500, .text-orange-600   { color: #ea580c; }
    .text-red-500, .text-red-600         { color: #dc2626; }
    .text-blue-600, .text-primary        { color: #2563eb; }
    .text-muted-foreground               { color: #6b7280; }
    .text-foreground                     { color: #111827; }
    .text-sm  { font-size: 9pt; }
    .text-xs  { font-size: 8pt; }
    .text-2xl { font-size: 14pt; }
    .font-mono { font-family: 'Courier New', monospace; }

    /* ── Card / badge snippets ─────────────── */
    .rounded-xl, .rounded-2xl, .rounded-full { border-radius: 6pt; }
    .bg-muted\\/50, .bg-card { background: #f9fafb; }
    .border, .border-border\\/60 { border: 0.5pt solid #e5e7eb; }
    .p-4, .p-5 { padding: 8pt; }
    .space-y-2 > * + *, .space-y-3 > * + * { margin-top: 5pt; }

    /* ── Hide interactive / screen-only nodes ─ */
    button, input, select, textarea, .no-print,
    [data-radix-popper-content-wrapper], svg { display: none !important; }

    /* Show text-only icon replacements if any */
    .lucide { display: none !important; }
  </style>
</head>
<body>
  <div class="prt-header">
    <div class="prt-title">${title}</div>
    <div class="prt-date">تاريخ الطباعة: ${printDate}</div>
  </div>
  ${element.innerHTML}
</body>
</html>`)
  iwin.document.close()

  const doPrint = () => {
    iwin.focus()
    iwin.print()
    // Remove iframe 3 s after print dialog closes / completes
    setTimeout(() => { try { iframe.remove() } catch { /* ignore */ } }, 3000)
  }

  // Wait for fonts then print; fall back to a fixed timeout
  const fonts = (iwin.document as Document & { fonts?: FontFaceSet }).fonts
  if (fonts?.ready) {
    fonts.ready.then(doPrint).catch(() => setTimeout(doPrint, 900))
  } else {
    setTimeout(doPrint, 900)
  }
}

// Local storage helper
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch { return null }
  },
  set: (key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  },
  remove: (key: string) => {
    try { localStorage.removeItem(key) } catch {}
  }
}

// Status color helper
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    returned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    closed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}
