import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

interface Category { id: string; name_ar: string; name_en?: string; code?: string; is_active: boolean }

export default function CategoriesPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [code, setCode] = useState('')

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('company_id', user!.company_id).order('name_ar')
      return data || []
    },
    enabled: !!user
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nameAr) { throw new Error('اسم التصنيف مطلوب') }
      if (editing) {
        await supabase.from('categories').update({ name_ar: nameAr, name_en: nameEn, code }).eq('id', editing.id)
      } else {
        await supabase.from('categories').insert({ name_ar: nameAr, name_en: nameEn, code, company_id: user!.company_id })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success(editing ? 'تم تحديث التصنيف' : 'تم إضافة التصنيف')
      setShowModal(false)
      setNameAr(''); setNameEn(''); setCode(''); setEditing(null)
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('categories').delete().eq('id', id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('تم حذف التصنيف') }
  })

  const openEdit = (cat: Category) => {
    setEditing(cat); setNameAr(cat.name_ar); setNameEn(cat.name_en || ''); setCode(cat.code || '')
    setShowModal(true)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="التصنيفات" subtitle={`${categories.length} تصنيف`}
        actions={<button onClick={() => setShowModal(true)} className="btn-primary gap-1.5"><Plus className="w-4 h-4" />إضافة تصنيف</button>} />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : categories.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-xl py-12 text-center text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">لا توجد تصنيفات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}
              className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{cat.name_ar}</p>
                {cat.code && <p className="text-xs text-muted-foreground">{cat.code}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(cat)} className="btn-ghost p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(cat.id)} className="btn-ghost p-1.5 rounded-lg text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null); setNameAr(''); setNameEn(''); setCode('') }}
        title={editing ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'} size="sm"
        footer={<><button onClick={() => { setShowModal(false); setEditing(null) }} className="btn-outline">إلغاء</button><button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary gap-1.5"><Plus className="w-4 h-4" />{editing ? 'تحديث' : 'إضافة'}</button></>}>
        <div className="space-y-3">
          <div><label className="form-label">اسم التصنيف *</label><input value={nameAr} onChange={e=>setNameAr(e.target.value)} className="form-input" placeholder="اسم التصنيف" autoFocus /></div>
          <div><label className="form-label">الاسم بالإنجليزية</label><input value={nameEn} onChange={e=>setNameEn(e.target.value)} className="form-input" placeholder="Category name" dir="ltr" /></div>
          <div><label className="form-label">الكود</label><input value={code} onChange={e=>setCode(e.target.value)} className="form-input" placeholder="CAT-001" dir="ltr" /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="حذف التصنيف" message="هل أنت متأكد من حذف هذا التصنيف؟"
        onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null) } }}
        onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending} />
    </div>
  )
}
