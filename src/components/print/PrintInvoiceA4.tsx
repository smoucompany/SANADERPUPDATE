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

export function PrintInvoiceA4({ invoice, items, company, customer, cashierName }: PrintInvoiceA4Props) {
  const isPaid = invoice.status === 'paid'

  return (
    <div className="print-a4-wrapper" dir="rtl">

      {/* ══ HEADER BAND ══════════════════════════════════════════════ */}
      <div className="print-a4-header-band">
        <div className="print-a4-header-inner">
          {/* Company info */}
          <div className="print-a4-company">
            {company.logo_url && (
              <img src={company.logo_url} alt="logo" className="print-a4-logo" />
            )}
            <div>
              <h1 className="print-a4-company-name">{company.name_ar}</h1>
              {company.name_en && <p className="print-a4-company-en">{company.name_en}</p>}
            </div>
          </div>
          {/* Invoice badge */}
          <div className="print-a4-invoice-badge">
            <div className="print-a4-badge-title">فاتورة ضريبية</div>
            <div className="print-a4-badge-subtitle">TAX INVOICE</div>
            <div className="print-a4-badge-number">{invoice.invoice_number}</div>
          </div>
        </div>
      </div>

      {/* ══ INFO ROW ════════════════════════════════════════════════ */}
      <div className="print-a4-info-row">
        {/* Company details */}
        <div className="print-a4-info-box print-a4-info-company">
          <div className="print-a4-info-title">بيانات المنشأة</div>
          {company.tax_number     && <p><span>الرقم الضريبي:</span> {company.tax_number}</p>}
          {company.commercial_reg && <p><span>السجل التجاري:</span> {company.commercial_reg}</p>}
          {company.address        && <p><span>العنوان:</span> {company.address}</p>}
          {company.phone          && <p><span>الهاتف:</span> {company.phone}</p>}
          {company.email          && <p><span>البريد:</span> {company.email}</p>}
        </div>

        {/* Invoice details */}
        <div className="print-a4-info-box print-a4-info-details">
          <div className="print-a4-info-title">بيانات الفاتورة</div>
          <p><span>رقم الفاتورة:</span> <strong>{invoice.invoice_number}</strong></p>
          <p><span>تاريخ الإصدار:</span> {formatDate(invoice.invoice_date)}</p>
          {invoice.due_date && <p><span>تاريخ الاستحقاق:</span> {formatDate(invoice.due_date)}</p>}
          <p><span>طريقة الدفع:</span> {PAYMENT_MAP[invoice.payment_method] || invoice.payment_method}</p>
          {cashierName && <p><span>أمين الصندوق:</span> {cashierName}</p>}
          <div className={`print-a4-status-badge ${isPaid ? 'paid' : 'pending'}`}>
            {isPaid ? 'مدفوعة ✓' : invoice.status === 'partial' ? 'مدفوع جزئياً' : 'آجل'}
          </div>
        </div>

        {/* Customer details */}
        <div className="print-a4-info-box print-a4-info-customer">
          <div className="print-a4-info-title">بيانات العميل</div>
          {customer ? (
            <>
              <p className="print-a4-customer-name">{customer.name_ar}</p>
              {customer.tax_number && <p><span>الرقم الضريبي:</span> {customer.tax_number}</p>}
              {customer.phone      && <p><span>الهاتف:</span> {customer.phone}</p>}
              {customer.city       && <p><span>المدينة:</span> {customer.city}</p>}
              {customer.address    && <p><span>العنوان:</span> {customer.address}</p>}
            </>
          ) : (
            <p className="print-a4-cash-customer">عميل نقدي / Cash Customer</p>
          )}
        </div>
      </div>

      {/* ══ ITEMS TABLE ═════════════════════════════════════════════ */}
      <table className="print-a4-table">
        <thead>
          <tr>
            <th className="print-a4-th-seq">#</th>
            <th className="print-a4-th-item">البند / الصنف</th>
            <th>الكمية</th>
            <th>سعر الوحدة</th>
            <th>الخصم</th>
            <th>الضريبة %</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={i % 2 === 0 ? 'print-a4-row-even' : 'print-a4-row-odd'}>
              <td className="print-a4-td-center">{i + 1}</td>
              <td>
                <div className="print-a4-item-name">{item.product_name}</div>
                {item.barcode && <div className="print-a4-item-barcode">{item.barcode}</div>}
              </td>
              <td className="print-a4-td-center">{item.quantity}</td>
              <td className="print-a4-td-num">{formatCurrency(item.unit_price)}</td>
              <td className="print-a4-td-num">{item.discount_amount ? formatCurrency(item.discount_amount) : '—'}</td>
              <td className="print-a4-td-center">{item.vat_rate || 0}%</td>
              <td className="print-a4-td-total">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ══ FOOTER ROW ══════════════════════════════════════════════ */}
      <div className="print-a4-footer-row">
        {/* Notes */}
        <div className="print-a4-notes">
          <div className="print-a4-notes-title">ملاحظات / Notes</div>
          <p className="print-a4-notes-text">
            {invoice.notes || 'شكراً لتعاملكم معنا — البضاعة المباعة لا تُستبدل ولا تُرد إلا بموافقة الإدارة.'}
          </p>
          <div className="print-a4-terms">
            <strong>الشروط والأحكام:</strong> يُعدّ استلام هذه الفاتورة موافقةً ضمنية على جميع بنودها.
          </div>
        </div>

        {/* Totals */}
        <div className="print-a4-totals">
          <div className="print-a4-total-row">
            <span>المجموع الفرعي</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {(invoice.discount_amount ?? 0) > 0 && (
            <div className="print-a4-total-row discount">
              <span>الخصم</span>
              <span>- {formatCurrency(invoice.discount_amount ?? 0)}</span>
            </div>
          )}
          <div className="print-a4-total-row">
            <span>ضريبة القيمة المضافة 15%</span>
            <span>{formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div className="print-a4-total-row grand">
            <span>الإجمالي النهائي</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          {(invoice.paid_amount ?? 0) > 0 && (
            <div className="print-a4-total-row paid">
              <span>المدفوع</span>
              <span>{formatCurrency(invoice.paid_amount ?? 0)}</span>
            </div>
          )}
          {(invoice.remaining_amount ?? 0) > 0 && (
            <div className="print-a4-total-row remaining">
              <span>المتبقي</span>
              <span>{formatCurrency(invoice.remaining_amount ?? 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ══ SIGNATURES ══════════════════════════════════════════════ */}
      <div className="print-a4-signatures">
        {['المستلم', 'أمين الصندوق', 'المفوّض بالتوقيع'].map(role => (
          <div key={role} className="print-a4-sig-box">
            <div className="print-a4-sig-role">{role}</div>
            <div className="print-a4-sig-line" />
            <div className="print-a4-sig-name">الاسم: ___________</div>
          </div>
        ))}
      </div>

      {/* ══ DOCUMENT FOOTER ═════════════════════════════════════════ */}
      <div className="print-a4-doc-footer">
        <div className="print-a4-footer-band">
          <span>{company.name_ar}</span>
          {company.tax_number && <span>الرقم الضريبي: {company.tax_number}</span>}
          {company.phone && <span>{company.phone}</span>}
          <span>تم الإنشاء إلكترونياً · {new Date().toLocaleDateString('ar-SA')}</span>
        </div>
      </div>

    </div>
  )
}
