import { formatCurrency, formatDate } from '@/lib/utils'

interface ReceiptItem {
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

interface PrintReceiptThermalProps {
  invoice: {
    invoice_number: string
    invoice_date: string
    payment_method: string
    subtotal: number
    discount_amount?: number
    tax_amount: number
    total: number
    paid_amount?: number
    notes?: string
  }
  items: ReceiptItem[]
  company: {
    name_ar?: string
    tax_number?: string
    address?: string
    phone?: string
  }
  cashierName?: string
  customerName?: string
}

const PAYMENT_AR: Record<string, string> = {
  cash: 'نقدي', mada: 'مدى', transfer: 'تحويل', deferred: 'آجل'
}

const DIVIDER = '────────────────────────'
const DOUBLE  = '════════════════════════'

export function PrintReceiptThermal({ invoice, items, company, cashierName, customerName }: PrintReceiptThermalProps) {
  const change = Math.max(0, (invoice.paid_amount ?? 0) - invoice.total)

  return (
    <div className="print-thermal-wrapper" dir="rtl">

      {/* Header */}
      <div className="print-thermal-header">
        <div className="print-thermal-store-name">{company.name_ar}</div>
        {company.address && <div className="print-thermal-address">{company.address}</div>}
        {company.phone   && <div className="print-thermal-phone">☏ {company.phone}</div>}
        {company.tax_number && (
          <div className="print-thermal-vat">رقم ضريبي: {company.tax_number}</div>
        )}
      </div>

      <div className="print-thermal-divider">{DOUBLE}</div>

      {/* Invoice info */}
      <div className="print-thermal-info">
        <div className="print-thermal-row">
          <span>رقم الإيصال</span>
          <span className="print-thermal-mono">{invoice.invoice_number}</span>
        </div>
        <div className="print-thermal-row">
          <span>التاريخ</span>
          <span>{formatDate(invoice.invoice_date)}</span>
        </div>
        <div className="print-thermal-row">
          <span>الوقت</span>
          <span>{new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {cashierName && (
          <div className="print-thermal-row">
            <span>الكاشير</span>
            <span>{cashierName}</span>
          </div>
        )}
        {customerName && (
          <div className="print-thermal-row">
            <span>العميل</span>
            <span>{customerName}</span>
          </div>
        )}
      </div>

      <div className="print-thermal-divider">{DIVIDER}</div>

      {/* Items */}
      <div className="print-thermal-items-header">
        <span className="print-thermal-item-desc">الصنف</span>
        <span>الكمية</span>
        <span>المبلغ</span>
      </div>
      <div className="print-thermal-divider">{DIVIDER}</div>

      {items.map((item, i) => (
        <div key={i} className="print-thermal-item">
          <div className="print-thermal-item-name">{item.product_name}</div>
          <div className="print-thermal-item-calc">
            <span className="print-thermal-item-price">
              {item.quantity} × {formatCurrency(item.unit_price)}
            </span>
            <span className="print-thermal-item-total">{formatCurrency(item.total)}</span>
          </div>
        </div>
      ))}

      <div className="print-thermal-divider">{DIVIDER}</div>

      {/* Totals */}
      <div className="print-thermal-totals">
        <div className="print-thermal-row">
          <span>المجموع</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        {(invoice.discount_amount ?? 0) > 0 && (
          <div className="print-thermal-row discount">
            <span>الخصم</span>
            <span>- {formatCurrency(invoice.discount_amount ?? 0)}</span>
          </div>
        )}
        <div className="print-thermal-row">
          <span>ضريبة القيمة المضافة 15%</span>
          <span>{formatCurrency(invoice.tax_amount)}</span>
        </div>
      </div>

      <div className="print-thermal-divider">{DOUBLE}</div>

      <div className="print-thermal-grand-total">
        <span>الإجمالي</span>
        <span>{formatCurrency(invoice.total)}</span>
      </div>

      <div className="print-thermal-divider">{DOUBLE}</div>

      {/* Payment */}
      <div className="print-thermal-payment">
        <div className="print-thermal-row">
          <span>طريقة الدفع</span>
          <span>{PAYMENT_AR[invoice.payment_method] ?? invoice.payment_method}</span>
        </div>
        {(invoice.paid_amount ?? 0) > 0 && (
          <div className="print-thermal-row">
            <span>المبلغ المستلم</span>
            <span>{formatCurrency(invoice.paid_amount ?? 0)}</span>
          </div>
        )}
        {change > 0 && (
          <div className="print-thermal-row change">
            <span>الباقي</span>
            <span>{formatCurrency(change)}</span>
          </div>
        )}
      </div>

      <div className="print-thermal-divider">{DIVIDER}</div>

      {/* QR placeholder */}
      <div className="print-thermal-qr-section">
        <div className="print-thermal-qr-box">
          <svg viewBox="0 0 100 100" className="print-thermal-qr-svg">
            <rect x="0"  y="0"  width="30" height="30" fill="black" />
            <rect x="4"  y="4"  width="22" height="22" fill="white" />
            <rect x="8"  y="8"  width="14" height="14" fill="black" />
            <rect x="70" y="0"  width="30" height="30" fill="black" />
            <rect x="74" y="4"  width="22" height="22" fill="white" />
            <rect x="78" y="8"  width="14" height="14" fill="black" />
            <rect x="0"  y="70" width="30" height="30" fill="black" />
            <rect x="4"  y="74" width="22" height="22" fill="white" />
            <rect x="8"  y="78" width="14" height="14" fill="black" />
            <rect x="38" y="4"  width="8"  height="8"  fill="black" />
            <rect x="50" y="4"  width="6"  height="6"  fill="black" />
            <rect x="35" y="35" width="10" height="10" fill="black" />
            <rect x="50" y="35" width="15" height="6"  fill="black" />
            <rect x="70" y="35" width="8"  height="10" fill="black" />
            <rect x="4"  y="40" width="14" height="8"  fill="black" />
            <rect x="38" y="50" width="6"  height="14" fill="black" />
            <rect x="50" y="50" width="8"  height="8"  fill="black" />
            <rect x="65" y="55" width="14" height="6"  fill="black" />
            <rect x="84" y="50" width="8"  height="10" fill="black" />
            <rect x="50" y="70" width="6"  height="14" fill="black" />
            <rect x="62" y="72" width="10" height="10" fill="black" />
            <rect x="78" y="68" width="8"  height="8"  fill="black" />
          </svg>
        </div>
        <div className="print-thermal-qr-text">امسح للتحقق من الفاتورة</div>
      </div>

      {/* Footer */}
      <div className="print-thermal-footer">
        <div className="print-thermal-thanks">شكراً لزيارتكم</div>
        <div className="print-thermal-thanks-en">Thank you for your visit</div>
        {invoice.notes && <div className="print-thermal-notes">{invoice.notes}</div>}
        <div className="print-thermal-footer-line">{company.name_ar} © {new Date().getFullYear()}</div>
      </div>

    </div>
  )
}
