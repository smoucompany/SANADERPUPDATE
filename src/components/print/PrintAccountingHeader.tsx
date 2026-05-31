import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/lib/utils'

interface PrintAccountingHeaderProps {
  reportTitle: string
  reportTitleEn?: string
  subtitle?: string
  dateFrom?: string
  dateTo?: string
  extraMeta?: { label: string; value: string }[]
}

/* ─── Small watermark SVG ─── */
function WatermarkLines() {
  return (
    <svg
      style={{ position:'absolute', left:0, top:0, width:'100%', height:'100%', opacity:0.03, pointerEvents:'none' }}
      preserveAspectRatio="none" viewBox="0 0 200 80"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1="0" y1={i * 7} x2="200" y2={i * 7} stroke="#b8934a" strokeWidth="1"/>
      ))}
    </svg>
  )
}

export function PrintAccountingHeader({
  reportTitle,
  reportTitleEn,
  subtitle,
  dateFrom,
  dateTo,
  extraMeta = [],
}: PrintAccountingHeaderProps) {
  const { company } = useAuthStore()
  const today = new Date().toLocaleDateString('ar-SA')
  const todayEn = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="pac-header print-only" dir="rtl">

      {/* ══ TOP GOLD BAR ══ */}
      <div className="pac-gold-bar" />

      {/* ══ MAIN HEADER ══ */}
      <div className="pac-header-inner">

        {/* RIGHT: Company identity */}
        <div className="pac-company-block">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" className="pac-logo" />
          ) : (
            <div className="pac-logo-ph">
              {(company?.name_ar || 'ش')[0]}
            </div>
          )}
          <div className="pac-company-info">
            <h1 className="pac-company-ar">{company?.name_ar || 'اسم الشركة'}</h1>
            {company?.name_en && <p className="pac-company-en">{company.name_en}</p>}
            <div className="pac-company-rule" />
            <div className="pac-company-sub">
              {company?.tax_number     && <span>الرقم الضريبي: {company.tax_number}</span>}
              {company?.commercial_reg && <span>السجل التجاري: {company.commercial_reg}</span>}
            </div>
            <div className="pac-company-contact">
              {company?.phone   && <span>{company.phone}</span>}
              {company?.email   && <span>{company.email}</span>}
              {company?.address && <span>{company.address}</span>}
            </div>
          </div>
        </div>

        {/* LEFT: Report badge */}
        <div className="pac-report-badge">
          <WatermarkLines />
          <div className="pac-badge-inner">
            <span className="pac-badge-cat">تقرير مالي محاسبي</span>
            <span className="pac-badge-cat-en">Financial Report</span>
            <div className="pac-badge-divider" />
            <span className="pac-badge-date">{today}</span>
            <span className="pac-badge-date-en">{todayEn}</span>
          </div>
        </div>

      </div>

      {/* ══ GEO STRIP ══ */}
      <div className="pac-geo-strip">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="pac-geo-item" style={{ opacity: 0.1 + (i % 4) * 0.07 }} />
        ))}
      </div>

      {/* ══ REPORT TITLE BAND ══ */}
      <div className="pac-title-band">
        <h2 className="pac-title-ar">{reportTitle}</h2>
        {reportTitleEn && <span className="pac-title-en">{reportTitleEn}</span>}
      </div>

      {/* ══ META ROW ══ */}
      <div className="pac-meta-row">
        {dateFrom && dateTo && (
          <div className="pac-meta-item">
            <span className="pac-meta-label">الفترة المالية</span>
            <span className="pac-meta-value">
              من {formatDate(dateFrom)} إلى {formatDate(dateTo)}
            </span>
          </div>
        )}
        {subtitle && (
          <div className="pac-meta-item">
            <span className="pac-meta-label">البيان</span>
            <span className="pac-meta-value">{subtitle}</span>
          </div>
        )}
        {extraMeta.map(m => (
          <div key={m.label} className="pac-meta-item">
            <span className="pac-meta-label">{m.label}</span>
            <span className="pac-meta-value">{m.value}</span>
          </div>
        ))}
        <div className="pac-meta-item pac-meta-seal">
          <div className="pac-seal">
            <span>وثيقة رسمية</span>
            <span className="pac-seal-en">OFFICIAL DOCUMENT</span>
          </div>
        </div>
      </div>

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Footer component — use at the BOTTOM of print pages
───────────────────────────────────────────────────── */
export function PrintAccountingFooter({ pageNote }: { pageNote?: string }) {
  const { company } = useAuthStore()
  const now = new Date()

  return (
    <div className="pac-footer print-only" dir="rtl">
      <div className="pac-footer-rule" />
      <div className="pac-footer-inner">
        <div className="pac-footer-left">
          <span className="pac-footer-company">{company?.name_ar}</span>
          {company?.tax_number && <span>الرقم الضريبي: {company.tax_number}</span>}
        </div>
        <div className="pac-footer-center">
          {pageNote && <span>{pageNote}</span>}
          <span>تم الإنشاء إلكترونياً بتاريخ {now.toLocaleDateString('ar-SA')} الساعة {now.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' })}</span>
        </div>
        <div className="pac-footer-right">
          <div className="pac-footer-sig">
            <div className="pac-footer-sig-line" />
            <span>المدير المالي المفوَّض</span>
          </div>
        </div>
      </div>
      <div className="pac-gold-bar-bottom" />
    </div>
  )
}
