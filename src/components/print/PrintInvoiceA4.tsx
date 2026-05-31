import { createPortal } from 'react-dom'
import { formatCurrency, formatDate } from '@/lib/utils'

interface InvoiceItem {
  product_name: string
  barcode?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  vat_rate?: number
  vat_amount?: number
  total: number
}

interface Company {
  name_ar?: string
  name_en?: string
  logo_url?: string
  tax_number?: string
  commercial_reg?: string
  address?: string
  phone?: string
  email?: string
  website?: string
}

interface Customer {
  name_ar?: string
  phone?: string
  address?: string
  tax_number?: string
  city?: string
}

interface PrintInvoiceA4Props {
  invoice: {
    invoice_number: string
    invoice_date: string
    due_date?: string
    status: string
    payment_method: string
    subtotal: number
    discount_amount?: number
    tax_amount: number
    total: number
    paid_amount?: number
    remaining_amount?: number
    notes?: string
  }
  items: InvoiceItem[]
  company: Company
  customer?: Customer | null
  cashierName?: string
}

const PAYMENT_MAP: Record<string, string> = {
  cash: 'نقدي', mada: 'مدى', transfer: 'تحويل بنكي',
  credit: 'بطاقة ائتمان', deferred: 'آجل', mixed: 'مختلط'
}

/* ─── Inline QR placeholder (ZATCA-style) ─── */
function QRPlaceholder() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="white"/>
      {/* Finder top-left */}
      <rect x="4" y="4" width="18" height="18" fill="none" stroke="#0d1b2a" strokeWidth="2"/>
      <rect x="8" y="8" width="10" height="10" fill="#0d1b2a"/>
      {/* Finder top-right */}
      <rect x="42" y="4" width="18" height="18" fill="none" stroke="#0d1b2a" strokeWidth="2"/>
      <rect x="46" y="8" width="10" height="10" fill="#0d1b2a"/>
      {/* Finder bottom-left */}
      <rect x="4" y="42" width="18" height="18" fill="none" stroke="#0d1b2a" strokeWidth="2"/>
      <rect x="8" y="46" width="10" height="10" fill="#0d1b2a"/>
      {/* Data dots */}
      {[26,30,34,38].map(x => [26,30,34,38].map(y =>
        Math.random() > 0.4 ? <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#0d1b2a"/> : null
      ))}
      <rect x="26" y="26" width="3" height="3" fill="#0d1b2a"/>
      <rect x="32" y="26" width="3" height="3" fill="#0d1b2a"/>
      <rect x="26" y="32" width="3" height="3" fill="#0d1b2a"/>
      <rect x="38" y="32" width="3" height="3" fill="#0d1b2a"/>
      <rect x="32" y="38" width="3" height="3" fill="#0d1b2a"/>
      <rect x="26" y="38" width="3" height="3" fill="#0d1b2a"/>
      <rect x="38" y="26" width="3" height="3" fill="#0d1b2a"/>
      <rect x="44" y="26" width="3" height="3" fill="#0d1b2a"/>
      <rect x="50" y="30" width="3" height="3" fill="#0d1b2a"/>
      <rect x="44" y="34" width="3" height="3" fill="#0d1b2a"/>
      <rect x="50" y="38" width="3" height="3" fill="#0d1b2a"/>
      <rect x="26" y="44" width="3" height="3" fill="#0d1b2a"/>
      <rect x="32" y="50" width="3" height="3" fill="#0d1b2a"/>
      <rect x="38" y="44" width="3" height="3" fill="#0d1b2a"/>
    </svg>
  )
}

export function PrintInvoiceA4({ invoice, items, company, customer, cashierName }: PrintInvoiceA4Props) {
  const isPaid = invoice.status === 'paid'
  const isPartial = invoice.status === 'partial'
  const discount = invoice.discount_amount ?? 0
  const paidAmt  = invoice.paid_amount ?? 0
  const remaining = invoice.remaining_amount ?? 0

  const statusLabel = isPaid ? 'مدفوعة' : isPartial ? 'جزئي' : 'آجل'
  const statusColor = isPaid ? '#16a34a' : isPartial ? '#d97706' : '#dc2626'
  const statusBg    = isPaid ? '#dcfce7' : isPartial ? '#fef9c3' : '#fee2e2'

  return createPortal(
    <div className="inv-a4" dir="rtl">

      {/* ══════════════════════════════════════════════════════════════
          HEADER — deep navy with golden accent strip
      ══════════════════════════════════════════════════════════════ */}
      <header className="inv-header">

        {/* Gold accent bar top */}
        <div className="inv-gold-bar" />

        <div className="inv-header-inner">

          {/* RIGHT: Company identity */}
          <div className="inv-company-block">
            {company.logo_url ? (
              <img src={company.logo_url} alt="logo" className="inv-logo" />
            ) : (
              <div className="inv-logo-placeholder">
                <span>{(company.name_ar || 'ش')[0]}</span>
              </div>
            )}
            <div className="inv-company-text">
              <h1 className="inv-company-ar">{company.name_ar || 'اسم الشركة'}</h1>
              {company.name_en && <p className="inv-company-en">{company.name_en}</p>}
              <div className="inv-company-divider" />
              <div className="inv-company-meta">
                {company.tax_number     && <span>ض: {company.tax_number}</span>}
                {company.commercial_reg && <span>س.ت: {company.commercial_reg}</span>}
              </div>
            </div>
          </div>

          {/* LEFT: Invoice badge */}
          <div className="inv-badge">
            <div className="inv-badge-diamond">
              <span className="inv-badge-ar">فاتورة ضريبية</span>
              <span className="inv-badge-en">TAX INVOICE</span>
            </div>
            <div className="inv-badge-num">{invoice.invoice_number}</div>
            <div className="inv-badge-status" style={{ background: statusBg, color: statusColor }}>
              {statusLabel}
            </div>
          </div>

        </div>

        {/* Decorative geometric strip */}
        <div className="inv-geo-strip">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="inv-geo-diamond" style={{ opacity: 0.12 + (i % 3) * 0.06 }} />
          ))}
        </div>

      </header>

      {/* ══════════════════════════════════════════════════════════════
          INFO ROW — 3 columns
      ══════════════════════════════════════════════════════════════ */}
      <section className="inv-info-row">

        {/* Company contact */}
        <div className="inv-info-card inv-info-shade">
          <div className="inv-info-heading">
            <span className="inv-info-dot" />بيانات المنشأة
          </div>
          {company.address && <p>{company.address}</p>}
          {company.phone   && <p>📞 {company.phone}</p>}
          {company.email   && <p>✉ {company.email}</p>}
          {company.website && <p>🌐 {company.website}</p>}
        </div>

        {/* Invoice meta */}
        <div className="inv-info-card inv-info-center">
          <div className="inv-info-heading">
            <span className="inv-info-dot" />بيانات الفاتورة
          </div>
          <div className="inv-meta-row"><span>رقم الفاتورة</span><strong>{invoice.invoice_number}</strong></div>
          <div className="inv-meta-row"><span>تاريخ الإصدار</span><span>{formatDate(invoice.invoice_date)}</span></div>
          {invoice.due_date && <div className="inv-meta-row"><span>تاريخ الاستحقاق</span><span>{formatDate(invoice.due_date)}</span></div>}
          <div className="inv-meta-row"><span>طريقة الدفع</span><span>{PAYMENT_MAP[invoice.payment_method] || invoice.payment_method}</span></div>
          {cashierName && <div className="inv-meta-row"><span>المحرّر</span><span>{cashierName}</span></div>}
        </div>

        {/* Customer */}
        <div className="inv-info-card">
          <div className="inv-info-heading">
            <span className="inv-info-dot" />بيانات العميل
          </div>
          {customer ? (
            <>
              <p className="inv-customer-name">{customer.name_ar}</p>
              {customer.tax_number && <div className="inv-meta-row"><span>الرقم الضريبي</span><span>{customer.tax_number}</span></div>}
              {customer.phone      && <div className="inv-meta-row"><span>الهاتف</span><span>{customer.phone}</span></div>}
              {customer.city       && <div className="inv-meta-row"><span>المدينة</span><span>{customer.city}</span></div>}
              {customer.address    && <p style={{ marginTop: 4, fontSize: '7.5pt', color: '#64748b' }}>{customer.address}</p>}
            </>
          ) : (
            <div className="inv-cash-label">
              <span>عميل نقدي</span>
              <span className="inv-cash-en">Cash Customer</span>
            </div>
          )}
        </div>

      </section>

      {/* ══════════════════════════════════════════════════════════════
          ITEMS TABLE
      ══════════════════════════════════════════════════════════════ */}
      <section className="inv-table-section">
        <table className="inv-table">
          <thead>
            <tr>
              <th className="inv-th inv-th-seq">#</th>
              <th className="inv-th inv-th-item">البند / الصنف</th>
              <th className="inv-th inv-th-center">الكمية</th>
              <th className="inv-th inv-th-num">سعر الوحدة</th>
              <th className="inv-th inv-th-num">الخصم</th>
              <th className="inv-th inv-th-center">ض.ق.م %</th>
              <th className="inv-th inv-th-num">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'inv-row-even' : 'inv-row-odd'}>
                <td className="inv-td inv-td-center inv-td-seq">{i + 1}</td>
                <td className="inv-td inv-td-item">
                  <span className="inv-item-name">{item.product_name}</span>
                  {item.barcode && <span className="inv-item-code">{item.barcode}</span>}
                </td>
                <td className="inv-td inv-td-center">{item.quantity}</td>
                <td className="inv-td inv-td-num">{formatCurrency(item.unit_price)}</td>
                <td className="inv-td inv-td-num inv-td-discount">
                  {item.discount_amount ? `- ${formatCurrency(item.discount_amount)}` : '—'}
                </td>
                <td className="inv-td inv-td-center">{item.vat_rate ?? 15}%</td>
                <td className="inv-td inv-td-num inv-td-total">{formatCurrency(item.total)}</td>
              </tr>
            ))}
            {/* Empty rows filler (min 5 rows for clean look) */}
            {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
              <tr key={`e-${i}`} className={i % 2 === 0 ? 'inv-row-odd' : 'inv-row-even'}>
                <td className="inv-td inv-td-center inv-td-seq inv-td-empty">&nbsp;</td>
                <td className="inv-td inv-td-empty">&nbsp;</td>
                <td className="inv-td inv-td-empty">&nbsp;</td>
                <td className="inv-td inv-td-empty">&nbsp;</td>
                <td className="inv-td inv-td-empty">&nbsp;</td>
                <td className="inv-td inv-td-empty">&nbsp;</td>
                <td className="inv-td inv-td-empty">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER ROW — Notes + Totals + QR
      ══════════════════════════════════════════════════════════════ */}
      <section className="inv-footer-row">

        {/* Notes + QR */}
        <div className="inv-notes-col">
          <div className="inv-notes-title">ملاحظات</div>
          <p className="inv-notes-text">
            {invoice.notes || 'شكراً لثقتكم ومعاملتكم — البضاعة المباعة لا تُستبدل ولا تُرد إلا بموافقة الإدارة.'}
          </p>
          <div className="inv-terms">
            <strong>الشروط والأحكام · Terms & Conditions:</strong>
            <br/>استلام هذه الفاتورة يُعدّ قبولاً ضمنياً لجميع بنودها وشروطها.
          </div>
          <div className="inv-qr-wrap">
            <QRPlaceholder />
            <span className="inv-qr-label">رمز التحقق ZATCA</span>
          </div>
        </div>

        {/* Totals */}
        <div className="inv-totals-col">

          <div className="inv-total-line">
            <span>المجموع الفرعي</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="inv-total-line inv-total-discount">
              <span>الخصم الإجمالي</span>
              <span>- {formatCurrency(discount)}</span>
            </div>
          )}

          <div className="inv-total-line">
            <span>ضريبة القيمة المضافة (15%)</span>
            <span>{formatCurrency(invoice.tax_amount)}</span>
          </div>

          <div className="inv-total-grand">
            <div className="inv-grand-label">
              <span>الإجمالي النهائي</span>
              <span className="inv-grand-en">TOTAL DUE</span>
            </div>
            <div className="inv-grand-amount">{formatCurrency(invoice.total)}</div>
          </div>

          {paidAmt > 0 && (
            <div className="inv-total-line inv-total-paid">
              <span>المبلغ المدفوع</span>
              <span>{formatCurrency(paidAmt)}</span>
            </div>
          )}
          {remaining > 0 && (
            <div className="inv-total-line inv-total-remaining">
              <span>المبلغ المتبقي</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          )}

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SIGNATURES
      ══════════════════════════════════════════════════════════════ */}
      <section className="inv-sigs">
        {['المستلم', 'أمين الصندوق', 'المفوَّض بالتوقيع'].map(role => (
          <div key={role} className="inv-sig-box">
            <div className="inv-sig-role">{role}</div>
            <div className="inv-sig-line" />
            <div className="inv-sig-name">الاسم: ________________</div>
          </div>
        ))}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          DOCUMENT FOOTER BAND
      ══════════════════════════════════════════════════════════════ */}
      <footer className="inv-doc-footer">
        <div className="inv-footer-gold-bar" />
        <div className="inv-footer-band">
          <div className="inv-footer-company">
            {company.name_ar && <strong>{company.name_ar}</strong>}
            {company.name_en && <span>{company.name_en}</span>}
          </div>
          <div className="inv-footer-mid">
            {company.tax_number && <span>الرقم الضريبي: {company.tax_number}</span>}
            {company.phone      && <span>{company.phone}</span>}
            {company.email      && <span>{company.email}</span>}
          </div>
          <div className="inv-footer-right">
            <span>تم الإنشاء إلكترونياً</span>
            <span>{new Date().toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
      </footer>

    </div>,
    document.body
  )
}
