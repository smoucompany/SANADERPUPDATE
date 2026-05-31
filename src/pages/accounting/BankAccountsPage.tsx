import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, CreditCard, Edit2, Trash2, Eye, TrendingUp, TrendingDown, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from 'react-hot-toast'

type BankAccount = {
  id: string
  account_name: string
  bank_name: string
  account_number: string
  iban: string
  currency: string
  balance: number
  is_default: boolean
  is_active: boolean
}

const BANKS = ['البنك الأهلي السعودي','بنك الراجحي','بنك الرياض','البنك السعودي للاستثمار','بنك البلاد','البنك العربي الوطني','بنك سامبا','بنك الجزيرة']
const CURRENCIES = ['SAR','USD','AED','EUR','GBP']


export default function BankAccountsPage() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ account_name:'', bank_name:'', account_number:'', iban:'', currency:'SAR', opening_balance:'0' })
  const set = (k: string, v: string) => setForm(p => ({...p,[k]:v}))

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bank_accounts', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase.from('bank_accounts').select('*').eq('company_id', user.company_id).order('account_name')
      return (data as BankAccount[]) || []
    },
    enabled: !!user,
  })

  const totalBalance = bankAccounts.reduce((s,a) => s + a.balance, 0)
  const activeAccounts = bankAccounts.filter(a => a.is_active).length

  const qc = useQueryClient()

  const handleSave = async () => {
    if (!form.account_name || !form.bank_name || !form.account_number) { toast.error('أدخل بيانات الحساب'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('bank_accounts').insert({
        company_id:      user!.company_id,
        account_name:    form.account_name,
        bank_name:       form.bank_name,
        account_number:  form.account_number,
        iban:            form.iban,
        currency:        form.currency,
        balance:         parseFloat(form.opening_balance) || 0,
        is_default:      false,
        is_active:       true,
      })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['bank_accounts'] })
      toast.success('تم إضافة الحساب البنكي')
      setShowForm(false)
      setForm({ account_name:'', bank_name:'', account_number:'', iban:'', currency:'SAR', opening_balance:'0' })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('bank_accounts').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ['bank_accounts'] })
    toast.success('تم حذف الحساب')
    setDeleteId(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الحسابات البنكية"
        subtitle={`${bankAccounts.length} حساب`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />إضافة حساب
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium opacity-90">إجمالي الأرصدة</p>
            <CreditCard className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-3xl font-black">{formatCurrency(totalBalance)}</p>
          <p className="text-xs opacity-70 mt-1">{activeAccounts} حسابات نشطة</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">إجمالي الإيداعات (هذا الشهر)</p>
            <p className="text-xl font-black text-emerald-600">—</p>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-red-500 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">إجمالي السحوبات (هذا الشهر)</p>
            <p className="text-xl font-black text-red-500">—</p>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bankAccounts.map(account => (
          <div key={account.id} className={`bg-card border rounded-2xl p-5 hover:shadow-md transition-all ${account.is_default ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border/60'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">{account.account_name}</p>
                  {account.is_default && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">افتراضي</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(account.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">البنك</span>
                <span className="font-medium text-xs">{account.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الحساب</span>
                <span className="font-mono text-xs">{account.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IBAN</span>
                <span className="font-mono text-xs">{account.iban}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">العملة</span>
                <span className="font-semibold">{account.currency}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-0.5">الرصيد الحالي</p>
              <p className="text-2xl font-black text-primary">{formatCurrency(account.balance)}</p>
            </div>

            <button className="mt-3 w-full btn-outline text-xs gap-1.5">
              <Eye className="w-3.5 h-3.5" />عرض الحركات
            </button>
          </div>
        ))}
      </div>

      {/* Add Account Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إضافة حساب بنكي">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">اسم الحساب *</label>
              <input value={form.account_name} onChange={e => set('account_name', e.target.value)} className="form-input" placeholder="الحساب الرئيسي" />
            </div>
            <div className="col-span-2">
              <label className="form-label">البنك *</label>
              <select value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className="form-select">
                <option value="">اختر البنك</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">رقم الحساب *</label>
              <input value={form.account_number} onChange={e => set('account_number', e.target.value)} className="form-input" dir="ltr" placeholder="SA29 6000..." />
            </div>
            <div>
              <label className="form-label">رمز IBAN</label>
              <input value={form.iban} onChange={e => set('iban', e.target.value)} className="form-input" dir="ltr" placeholder="SA..." />
            </div>
            <div>
              <label className="form-label">العملة</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className="form-select">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الرصيد الافتتاحي</label>
              <input type="number" value={form.opening_balance} onChange={e => set('opening_balance', e.target.value)} className="form-input" dir="ltr" min="0" step="0.01" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              إضافة الحساب
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete}
        title="حذف الحساب البنكي" message="هل أنت متأكد؟ سيتم حذف الحساب وجميع بياناته." />
    </div>
  )
}
