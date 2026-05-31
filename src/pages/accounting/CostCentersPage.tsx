import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Target, Edit2, Trash2, ChevronLeft, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from 'react-hot-toast'

type CostCenter = {
  id: string
  code: string
  name: string
  parent_id: string | null
  budget: number
  actual: number
  level: number
  is_active: boolean
}


export default function CostCentersPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code:'', name:'', parent_id:'', budget:'0' })

  const { data: centers = [] } = useQuery<CostCenter[]>({
    queryKey: ['cost_centers', user?.company_id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase.from('cost_centers').select('*').eq('company_id', user.company_id).eq('is_active', true).order('code')
      return (data as CostCenter[]) || []
    },
    enabled: !!user,
  })

  const totalBudget = centers.filter(c => c.level === 0).reduce((s,c) => s + c.budget, 0)
  const totalActual = centers.filter(c => c.level === 0).reduce((s,c) => s + c.actual, 0)
  const utilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0

  const topLevelCenters = centers.filter(c => c.level === 0)

  const handleSave = async () => {
    if (!form.code || !form.name) { toast.error('الكود والاسم مطلوبان'); return }
    setSaving(true)
    try {
      const parent = form.parent_id ? centers.find(c => c.id === form.parent_id) : null
      const { error } = await supabase.from('cost_centers').insert({
        company_id: user!.company_id,
        code:       form.code,
        name:       form.name,
        parent_id:  form.parent_id || null,
        budget:     parseFloat(form.budget) || 0,
        actual:     0,
        level:      parent ? parent.level + 1 : 0,
        is_active:  true,
      })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['cost_centers'] })
      toast.success('تم إضافة مركز التكلفة')
      setShowForm(false)
      setForm({ code:'', name:'', parent_id:'', budget:'0' })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('cost_centers').update({ is_active: false }).eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: ['cost_centers'] })
    toast.success('تم حذف مركز التكلفة')
    setDeleteId(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="مراكز التكلفة"
        subtitle={`${centers.length} مركز تكلفة`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />إضافة مركز
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">الميزانية الإجمالية</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">المصروف الفعلي</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(totalActual)}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">نسبة الاستهلاك</p>
          <p className={`text-2xl font-black mt-1 ${utilization > 90 ? 'text-red-500' : utilization > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{utilization}%</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${utilization}%` }} />
          </div>
        </div>
      </div>

      {/* Cost Centers Tree */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50">
          <h3 className="font-semibold">هيكل مراكز التكلفة</h3>
        </div>
        <div className="divide-y divide-border/40">
          {topLevelCenters.map(center => {
            const children = centers.filter(c => c.parent_id === center.id)
            const pct = center.budget > 0 ? Math.round((center.actual / center.budget) * 100) : 0
            return (
              <div key={center.id}>
                {/* Parent */}
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{center.code}</span>
                      <span className="font-semibold">{center.name}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-48">
                        <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs text-muted-foreground">الميزانية</p>
                    <p className="font-bold text-sm">{formatCurrency(center.budget)}</p>
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs text-muted-foreground">الفعلي</p>
                    <p className={`font-bold text-sm ${pct > 90 ? 'text-red-500' : 'text-amber-600'}`}>{formatCurrency(center.actual)}</p>
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs text-muted-foreground">المتبقي</p>
                    <p className="font-bold text-sm text-emerald-600">{formatCurrency(center.budget - center.actual)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(center.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Children */}
                {children.map(child => {
                  const childPct = child.budget > 0 ? Math.round((child.actual / child.budget) * 100) : 0
                  return (
                    <div key={child.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors bg-muted/5">
                      <div className="w-4 shrink-0" />
                      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{child.code}</span>
                          <span className="text-sm font-medium">{child.name}</span>
                        </div>
                      </div>
                      <div className="text-left hidden md:block">
                        <p className="text-sm">{formatCurrency(child.budget)}</p>
                      </div>
                      <div className="text-left hidden md:block">
                        <p className={`text-sm font-medium ${childPct > 90 ? 'text-red-500' : 'text-amber-600'}`}>{formatCurrency(child.actual)}</p>
                      </div>
                      <div className="text-left hidden md:block">
                        <p className="text-sm text-emerald-600">{formatCurrency(child.budget - child.actual)}</p>
                      </div>
                      <div className="w-20 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${childPct > 90 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(childPct,100)}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8">{childPct}%</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteId(child.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="إضافة مركز تكلفة">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">كود المركز *</label>
              <input value={form.code} onChange={e => setForm(p=>({...p,code:e.target.value}))} className="form-input" dir="ltr" placeholder="10-03" />
            </div>
            <div>
              <label className="form-label">اسم المركز *</label>
              <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} className="form-input" placeholder="اسم مركز التكلفة" />
            </div>
            <div>
              <label className="form-label">المركز الأب</label>
              <select value={form.parent_id} onChange={e => setForm(p=>({...p,parent_id:e.target.value}))} className="form-select">
                <option value="">— مركز رئيسي —</option>
                {topLevelCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الميزانية السنوية</label>
              <input type="number" value={form.budget} onChange={e => setForm(p=>({...p,budget:e.target.value}))} className="form-input" dir="ltr" min="0" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}إضافة
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete}
        title="حذف مركز التكلفة" message="هل أنت متأكد؟ سيتم حذف مركز التكلفة." />
    </div>
  )
}
