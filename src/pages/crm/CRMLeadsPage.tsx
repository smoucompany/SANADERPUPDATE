import { useState } from 'react'
import { Plus, Phone, Mail, MessageSquare, Search, TrendingUp, Users, DollarSign, Target, Edit2, Trash2, Loader2, Save } from 'lucide-react'
import { useLeads, useCreateLead, useUpdateLeadStage } from '@/hooks/useCRM'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from 'react-hot-toast'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

type Lead = {
  id: string
  name: string
  company: string
  phone: string
  email: string
  source: string
  status: LeadStatus
  value: number
  assigned_to: string
  created_at: string
  last_contact: string
  notes: string
}

const STAGES: { id: LeadStatus; label: string; color: string; bg: string }[] = [
  { id: 'new',         label: 'جديد',         color: 'text-gray-700',    bg: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'contacted',   label: 'تم التواصل',   color: 'text-blue-700',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'qualified',   label: 'مؤهَّل',       color: 'text-indigo-700',  bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { id: 'proposal',    label: 'عرض سعر',      color: 'text-amber-700',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'negotiation', label: 'تفاوض',        color: 'text-orange-700',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'won',         label: 'رُبح',         color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { id: 'lost',        label: 'خُسر',         color: 'text-red-700',     bg: 'bg-red-100 dark:bg-red-900/30' },
]

const SOURCES = ['موقع إلكتروني', 'إحالة', 'واتساب', 'معرض تجاري', 'إعلان', 'بريد إلكتروني', 'أخرى']


const EMPTY_FORM = { name:'', company:'', phone:'', email:'', source:'', status:'new' as LeadStatus, value:'', assigned_to:'', notes:'' }

export default function CRMLeadsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: leadsResult, isLoading } = useLeads({ stage: filterStatus || undefined, search: search || undefined })
  const leads: Lead[] = (leadsResult?.data ?? []).map((l: any) => ({
    id: l.id, name: l.name, company: l.company || '', phone: l.phone || '',
    email: l.email || '', source: l.source || '', status: l.stage as LeadStatus,
    value: l.expected_value || 0, assigned_to: l.assigned_to || '',
    created_at: l.created_at, last_contact: l.last_contact_date || l.created_at, notes: l.notes || '',
  }))

  const createLead = useCreateLead()
  const updateStage = useUpdateLeadStage()

  const filtered = leads

  const totalValue = leads.filter(l => l.status !== 'lost').reduce((s, l) => s + l.value, 0)
  const wonValue   = leads.filter(l => l.status === 'won').reduce((s, l) => s + l.value, 0)
  const conversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0

  const handleSubmit = async () => {
    if (!form.name || !form.company || !form.phone) { toast.error('الاسم والشركة والهاتف مطلوبة'); return }
    const payload = {
      name: form.name, company: form.company, phone: form.phone, email: form.email,
      source: form.source, stage: form.status, expected_value: Number(form.value) || 0,
      assigned_to: form.assigned_to, notes: form.notes,
    }
    if (editLead?.id) {
      const { error } = await supabase.from('crm_leads').update(payload).eq('id', editLead.id)
      if (error) { toast.error(error.message); return }
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('تم تعديل العميل المحتمل')
    } else {
      await createLead.mutateAsync(payload)
    }
    setShowForm(false)
    setEditLead(null)
    setForm(EMPTY_FORM)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('crm_leads').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ['leads'] })
    toast.success('تم حذف العميل المحتمل')
    setDeleteId(null)
  }

  const openEdit = (lead: Lead) => {
    setEditLead(lead)
    setForm({ name: lead.name, company: lead.company, phone: lead.phone, email: lead.email,
      source: lead.source, status: lead.status, value: String(lead.value),
      assigned_to: lead.assigned_to, notes: lead.notes })
    setShowForm(true)
  }

  const handleCall = (lead: Lead) => {
    if (lead.phone) window.open(`tel:${lead.phone}`)
    else toast.error('لا يوجد رقم هاتف')
  }

  const handleWhatsapp = (lead: Lead) => {
    const num = lead.phone?.replace(/\D/g, '')
    if (num) window.open(`https://wa.me/${num}`, '_blank')
    else toast.error('لا يوجد رقم هاتف')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="العملاء المحتملون"
        subtitle={`${leads.length} فرصة • ${STAGES.filter(s => s.id !== 'won' && s.id !== 'lost').length} مراحل نشطة`}
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 bg-muted p-1 rounded-xl">
              {(['kanban','list'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === m ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {m === 'kanban' ? 'كانبان' : 'قائمة'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
              <Plus className="w-4 h-4" />عميل محتمل جديد
            </button>
          </div>
        }
      />

      {/* Stats */}
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الفرص', value: leads.length, sub: 'عميل محتمل', bg: 'bg-blue-500', icon: Users },
          { label: 'قيمة خط الأعمال', value: formatCurrency(totalValue), sub: 'متوقعة', bg: 'bg-primary', icon: DollarSign },
          { label: 'معدل التحويل', value: `${conversionRate}%`, sub: 'نسبة الإغلاق', bg: 'bg-emerald-500', icon: Target },
          { label: 'صفقات مُغلقة', value: formatCurrency(wonValue), sub: 'إيرادات محققة', bg: 'bg-amber-500', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0 shadow-lg`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في العملاء..."
            className="form-input pr-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!filterStatus ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            الكل ({leads.length})
          </button>
          {STAGES.map(s => {
            const count = leads.filter(l => l.status === s.id).length
            return (
              <button key={s.id} onClick={() => setFilterStatus(filterStatus === s.id ? '' : s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filterStatus === s.id ? 'bg-primary text-primary-foreground' : `${s.bg} ${s.color}`}`}>
                {s.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Kanban view */}
      {viewMode === 'kanban' && !filterStatus && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.filter(s => s.id !== 'won' && s.id !== 'lost').map(stage => {
            const stageleads = filtered.filter(l => l.status === stage.id)
            const stageValue = stageleads.reduce((s, l) => s + l.value, 0)
            return (
              <div key={stage.id} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${stage.bg} ${stage.color}`}>{stage.label}</span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">{stageleads.length} • </span>
                    <span className="text-xs font-semibold">{formatCurrency(stageValue)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {stageleads.map(lead => (
                    <div key={lead.id} className="bg-card border border-border/60 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer space-y-2.5">
                      <div>
                        <p className="font-semibold text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.company}</p>
                      </div>
                      <p className="font-bold text-primary text-sm">{formatCurrency(lead.value)}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleCall(lead)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                          <Phone className="w-3 h-3" />اتصال
                        </button>
                        <button onClick={() => handleWhatsapp(lead)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 text-emerald-700 transition-colors">
                          <MessageSquare className="w-3 h-3" />واتساب
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{lead.source}</span>
                        <span>{lead.assigned_to.split(' ')[0]}</span>
                      </div>
                    </div>
                  ))}
                  {stageleads.length === 0 && (
                    <div className="bg-muted/30 border-2 border-dashed border-border/50 rounded-xl py-8 text-center text-xs text-muted-foreground">
                      لا يوجد عملاء
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {(viewMode === 'list' || filterStatus) && (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">العميل المحتمل</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">المرحلة</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">القيمة</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">المصدر</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">المسؤول</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">آخر تواصل</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const stage = STAGES.find(s => s.id === lead.status)!
                return (
                  <tr key={lead.id} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.company}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stage.bg} ${stage.color}`}>{stage.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{formatCurrency(lead.value)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{lead.source}</td>
                    <td className="px-4 py-3 text-sm">{lead.assigned_to}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{formatDate(lead.last_contact)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleCall(lead)} title="اتصال"
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleWhatsapp(lead)} title="واتساب"
                          className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(lead)} title="تعديل"
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(lead.id)} title="حذف"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Won/Lost summary */}
      <div className="grid grid-cols-2 gap-4">
        {(['won','lost'] as const).map(status => {
          const s = STAGES.find(x => x.id === status)!
          const items = leads.filter(l => l.status === status)
          return (
            <div key={status} className="bg-card border border-border/60 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold ${s.color}`}>{s.label === 'رُبح' ? 'الصفقات المُغلقة (ربح)' : 'الصفقات المفقودة (خسارة)'}</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>{items.length}</span>
              </div>
              {items.map(l => (
                <div key={l.id} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.company}</p>
                  </div>
                  <span className="font-bold">{formatCurrency(l.value)}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Add/Edit Lead Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditLead(null); setForm(EMPTY_FORM) }}
        title={editLead ? 'تعديل العميل المحتمل' : 'إضافة عميل محتمل جديد'}>
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">الاسم *</label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="form-input" placeholder="اسم الشخص" />
            </div>
            <div>
              <label className="form-label">الشركة *</label>
              <input value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} className="form-input" placeholder="اسم الشركة" />
            </div>
            <div>
              <label className="form-label">الهاتف *</label>
              <input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">البريد</label>
              <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="form-input" dir="ltr" />
            </div>
            <div>
              <label className="form-label">مصدر العميل</label>
              <select value={form.source} onChange={e => setForm(p => ({...p, source: e.target.value}))} className="form-select">
                <option value="">اختر المصدر</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">المرحلة</label>
              <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value as LeadStatus}))} className="form-select">
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">القيمة المتوقعة (ر.س)</label>
              <input type="number" value={form.value} onChange={e => setForm(p => ({...p, value: e.target.value}))} className="form-input" />
            </div>
            <div>
              <label className="form-label">المسؤول</label>
              <input value={form.assigned_to} onChange={e => setForm(p => ({...p, assigned_to: e.target.value}))} className="form-input" placeholder="اسم المسؤول" />
            </div>
          </div>
          <div>
            <label className="form-label">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} className="form-input resize-none h-20" placeholder="تفاصيل إضافية..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => { setShowForm(false); setEditLead(null); setForm(EMPTY_FORM) }} className="btn-outline">إلغاء</button>
            <button onClick={handleSubmit} disabled={createLead.isPending} className="btn-primary gap-2">
              {createLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editLead ? 'حفظ التعديلات' : 'إضافة العميل'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف العميل المحتمل"
        message="هل أنت متأكد من حذف هذا العميل المحتمل؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
