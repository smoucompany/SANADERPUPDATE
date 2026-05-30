import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Plus, Download, Search, TrendingUp, TrendingDown, Wallet, RefreshCw, Filter, Printer } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'

type TxType = 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest'

type Transaction = {
  id: string
  date: string
  description: string
  type: TxType
  reference: string
  debit: number
  credit: number
  balance: number
  category: string
  reconciled: boolean
}

const ACCOUNTS: Record<string, any> = {
  '1': { id:'1', name:'الحساب الجاري الرئيسي', bank:'بنك الراجحي', number:'608010167519', iban:'SA0380000000608010167519', currency:'SAR', balance:285400 },
  '2': { id:'2', name:'حساب المشتريات',        bank:'البنك الأهلي', number:'0123456789',   iban:'SA4420000001234567891234', currency:'SAR', balance:98750 },
  '3': { id:'3', name:'حساب التوفير',           bank:'بنك الإنماء',  number:'123456789',    iban:'SA5614000001234567891234', currency:'SAR', balance:512000 },
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id:'1', date:'2026-05-28', description:'تحصيل فاتورة مبيعات #INV-2026-045', type:'deposit', reference:'INV-2026-045', debit:0, credit:42500, balance:285400, category:'مبيعات', reconciled:true },
  { id:'2', date:'2026-05-27', description:'دفع فاتورة مورد - مؤسسة النور', type:'withdrawal', reference:'PUR-2026-023', debit:18750, credit:0, balance:242900, category:'مشتريات', reconciled:true },
  { id:'3', date:'2026-05-26', description:'تحصيل فاتورة مبيعات #INV-2026-044', type:'deposit', reference:'INV-2026-044', debit:0, credit:31000, balance:261650, category:'مبيعات', reconciled:false },
  { id:'4', date:'2026-05-25', description:'رواتب موظفون - مايو 2026', type:'withdrawal', reference:'PAY-2026-05', debit:109275, credit:0, balance:230650, category:'رواتب', reconciled:true },
  { id:'5', date:'2026-05-24', description:'مصاريف إيجار المكتب', type:'withdrawal', reference:'EXP-2026-089', debit:15000, credit:0, balance:339925, category:'مصروفات', reconciled:true },
  { id:'6', date:'2026-05-23', description:'تحصيل دفعة من شركة الأفق', type:'deposit', reference:'REC-2026-015', debit:0, credit:75000, balance:354925, category:'مبيعات', reconciled:false },
  { id:'7', date:'2026-05-22', description:'عمولة بنكية شهرية', type:'fee', reference:'FEE-2026-05', debit:125, credit:0, balance:279925, category:'مصروفات بنكية', reconciled:true },
  { id:'8', date:'2026-05-20', description:'فوائد حساب التوفير', type:'interest', reference:'INT-2026-05', debit:0, credit:1250, balance:280050, category:'إيرادات مالية', reconciled:true },
  { id:'9', date:'2026-05-18', description:'تحصيل فاتورة #INV-2026-041', type:'deposit', reference:'INV-2026-041', debit:0, credit:28000, balance:278800, category:'مبيعات', reconciled:true },
  { id:'10', date:'2026-05-15', description:'دفع ضريبة القيمة المضافة', type:'withdrawal', reference:'VAT-Q1-2026', debit:45320, credit:0, balance:250800, category:'ضرائب', reconciled:true },
]

const TYPE_CFG: Record<TxType, { label: string; color: string; bg: string }> = {
  deposit:    { label: 'إيداع',  color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  withdrawal: { label: 'سحب',   color: 'text-red-700',     bg: 'bg-red-100 dark:bg-red-900/30' },
  transfer:   { label: 'تحويل', color: 'text-blue-700',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  fee:        { label: 'رسوم',  color: 'text-orange-700',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
  interest:   { label: 'فائدة', color: 'text-purple-700',  bg: 'bg-purple-100 dark:bg-purple-900/30' },
}

const EMPTY_FORM = { date: '', description: '', type: 'deposit' as TxType, reference: '', amount: '', category: '' }

export default function BankTransactionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TxType | ''>('')
  const [showUnreconciled, setShowUnreconciled] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const account = ACCOUNTS[id as string] || ACCOUNTS['1']

  const filtered = MOCK_TRANSACTIONS.filter(tx =>
    (!search || tx.description.includes(search) || tx.reference.includes(search)) &&
    (!filterType || tx.type === filterType) &&
    (!showUnreconciled || !tx.reconciled)
  )

  const totalDebit = MOCK_TRANSACTIONS.reduce((s, tx) => s + tx.debit, 0)
  const totalCredit = MOCK_TRANSACTIONS.reduce((s, tx) => s + tx.credit, 0)
  const unreconciledCount = MOCK_TRANSACTIONS.filter(tx => !tx.reconciled).length

  const handleSubmit = async () => {
    if (!form.date || !form.description || !form.amount) { toast.error('أدخل جميع البيانات المطلوبة'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    toast.success('تم تسجيل الحركة البنكية')
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={account.name}
        subtitle={`${account.bank} • ${account.iban}`}
        actions={
          <>
            <button onClick={() => navigate('/bank-accounts')} className="btn-outline gap-1.5">
              <ArrowRight className="w-4 h-4" />رجوع
            </button>
            <button onClick={() => toast.success('جاري تصدير كشف الحساب')} className="btn-outline gap-1.5">
              <Download className="w-4 h-4" />تصدير
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />إضافة حركة
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'الرصيد الحالي',      value:formatCurrency(account.balance), color:'text-primary',    bg:'bg-primary',     icon:Wallet },
          { label:'إجمالي الإيداعات',   value:formatCurrency(totalCredit),     color:'text-emerald-600', bg:'bg-emerald-500', icon:TrendingUp },
          { label:'إجمالي المسحوبات',   value:formatCurrency(totalDebit),      color:'text-red-500',     bg:'bg-red-500',     icon:TrendingDown },
          { label:'غير مُطابَق',        value:`${unreconciledCount} حركة`,     color:'text-amber-600',   bg:'bg-amber-500',   icon:RefreshCw },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الحركات..."
            className="form-input pr-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!filterType ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            الكل
          </button>
          {Object.entries(TYPE_CFG).map(([type, cfg]) => (
            <button key={type} onClick={() => setFilterType(filterType === type as TxType ? '' : type as TxType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filterType === type ? 'bg-primary text-primary-foreground' : `${cfg.bg} ${cfg.color}`}`}>
              {cfg.label}
            </button>
          ))}
          <button onClick={() => setShowUnreconciled(!showUnreconciled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${showUnreconciled ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <Filter className="w-3 h-3" />غير مُطابَق
          </button>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
          <h3 className="font-semibold">حركات الحساب</h3>
          <button onClick={() => window.print()} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
            <Printer className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">التاريخ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">البيان</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">النوع</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">المرجع</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground text-red-500">مدين</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground text-emerald-600">دائن</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">الرصيد</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">مُطابَق</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => {
                const typeCfg = TYPE_CFG[tx.type]
                return (
                  <tr key={tx.id} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeCfg.bg} ${typeCfg.color}`}>{typeCfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{tx.reference}</td>
                    <td className="px-4 py-3 text-center text-red-500 font-medium">{tx.debit > 0 ? formatCurrency(tx.debit) : '—'}</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-medium">{tx.credit > 0 ? formatCurrency(tx.credit) : '—'}</td>
                    <td className="px-4 py-3 text-center font-bold">{formatCurrency(tx.balance)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toast.success('تم تحديث حالة التطابق')}
                        className={`w-5 h-5 rounded-full border-2 transition-colors ${tx.reconciled ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground hover:border-primary'}`}>
                        {tx.reconciled && <span className="text-white text-[10px] flex items-center justify-center h-full">✓</span>}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">لا توجد حركات مطابقة</td></tr>
              )}
            </tbody>
            <tfoot className="bg-muted/30 border-t-2 border-border">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-bold text-sm">الإجمالي</td>
                <td className="px-4 py-3 text-center font-bold text-red-500">{formatCurrency(filtered.reduce((s, t) => s + t.debit, 0))}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-600">{formatCurrency(filtered.reduce((s, t) => s + t.credit, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add transaction modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إضافة حركة بنكية">
        <div className="space-y-4 p-1">
          <div>
            <label className="form-label">نوع الحركة</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TYPE_CFG).map(([type, cfg]) => (
                <button key={type} onClick={() => setForm(p => ({...p, type: type as TxType}))}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border
                    ${form.type === type ? 'bg-primary text-primary-foreground border-transparent' : 'border-border/60 text-muted-foreground hover:text-foreground'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">التاريخ *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">المبلغ (ر.س) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">البيان *</label>
            <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="form-input" placeholder="وصف الحركة" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">المرجع</label>
              <input value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">الفئة</label>
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} className="form-select">
                <option value="">اختر الفئة</option>
                {['مبيعات','مشتريات','رواتب','مصروفات','ضرائب','مصروفات بنكية','إيرادات مالية','أخرى'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
