import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, RefreshCw, ArrowLeftRight,
  TrendingUp, Lock, Star, Wallet
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface Cashbox {
  id: string
  name_ar: string
  name_en?: string
  cashbox_type: 'main' | 'sub'
  is_main: boolean
  is_default: boolean
  balance: number
  is_active: boolean
  description?: string
}

export default function CashboxesPage() {
  const navigate = useNavigate()
  const { company } = useAuthStore()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editingBox, setEditingBox] = useState<Cashbox | null>(null)
  const [form, setForm] = useState({
    name_ar: '', name_en: '', cashbox_type: 'sub' as 'main' | 'sub',
    description: '', is_active: true
  })
  const [saving, setSaving] = useState(false)

  const { data: cashboxes = [], isLoading, refetch } = useQuery({
    queryKey: ['cashboxes', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('cashboxes')
        .select('*')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('is_main', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Cashbox[]
    },
    enabled: !!company?.id
  })

  const mainCashbox  = cashboxes.find(c => c.is_main)
  const subCashboxes = cashboxes.filter(c => !c.is_main)
  const totalBalance = cashboxes.reduce((s, c) => s + (c.balance || 0), 0)

  const openAdd = () => {
    setEditingBox(null)
    setForm({ name_ar: '', name_en: '', cashbox_type: 'sub', description: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (box: Cashbox) => {
    if (box.is_main) { toast.error('لا يمكن تعديل الخزينة الرئيسية'); return }
    setEditingBox(box)
    setForm({
      name_ar: box.name_ar, name_en: box.name_en || '',
      cashbox_type: box.cashbox_type || 'sub',
      description: box.description || '',
      is_active: box.is_active
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name_ar) { toast.error('اسم الخزينة مطلوب'); return }
    setSaving(true)
    try {
      if (editingBox) {
        await supabase.from('cashboxes').update({
          name_ar: form.name_ar, name_en: form.name_en,
          description: form.description, is_active: form.is_active,
          updated_at: new Date().toISOString()
        }).eq('id', editingBox.id)
        toast.success('تم تحديث الخزينة')
      } else {
        // منع إنشاء خزينة رئيسية ثانية
        if (form.cashbox_type === 'main' && mainCashbox) {
          toast.error('يوجد بالفعل خزينة رئيسية واحدة')
          return
        }
        await supabase.from('cashboxes').insert({
          company_id: company!.id,
          name_ar: form.name_ar, name_en: form.name_en,
          cashbox_type: form.cashbox_type,
          is_main: form.cashbox_type === 'main',
          description: form.description,
          is_active: true, balance: 0
        })
        toast.success('تم إنشاء الخزينة')
      }
      queryClient.invalidateQueries({ queryKey: ['cashboxes'] })
      setShowModal(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة الخزائن"
        subtitle="الخزينة الرئيسية والفرعية"
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/cashbox/transfers')}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <ArrowLeftRight size={16} /> مستندات التحويل
            </button>
            <button onClick={() => navigate('/cashbox/movements')}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <TrendingUp size={16} /> حركة الخزائن
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} /> خزينة فرعية
            </button>
          </div>
        }
      />

      {/* ملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-sm">رصيد الخزينة الرئيسية</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(mainCashbox?.balance || 0)}</div>
            </div>
            <Star size={36} className="text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-100 text-sm">رصيد الخزائن الفرعية</div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(subCashboxes.reduce((s, c) => s + c.balance, 0))}
              </div>
            </div>
            <Wallet size={36} className="text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-100 text-sm">إجمالي الخزائن</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totalBalance)}</div>
            </div>
            <TrendingUp size={36} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* الخزينة الرئيسية */}
      {mainCashbox && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Star size={24} className="text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{mainCashbox.name_ar}</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">رئيسية</span>
                </div>
                <p className="text-sm text-gray-500">السداد للموردين • المصروفات • المدفوعات العامة</p>
              </div>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500">الرصيد الحالي</div>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(mainCashbox.balance)}</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Lock size={14} className="inline ml-1" />
            الخزينة الرئيسية فقط مخصصة لسداد الموردين والمصروفات. لا يمكن حذفها.
          </div>
        </div>
      )}

      {/* الخزائن الفرعية */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">الخزائن الفرعية ({subCashboxes.length})</h2>
        {isLoading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : subCashboxes.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            <Wallet size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد خزائن فرعية. أضف خزينة فرعية لنقاط البيع والكاشيرين.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subCashboxes.map(box => (
              <div key={box.id}
                className={`bg-white rounded-xl shadow-sm border p-5 ${!box.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Wallet size={20} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{box.name_ar}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        box.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {box.is_active ? 'نشطة' : 'موقوفة'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(box)}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">
                  {formatCurrency(box.balance)}
                </div>
                {box.description && <p className="text-xs text-gray-400">{box.description}</p>}
                <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
                  مسموح: تحصيل فواتير المبيعات • التحويل للرئيسية
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نافذة إضافة/تعديل */}
      <Modal
        open={showModal}
        title={editingBox ? 'تعديل خزينة' : 'إضافة خزينة فرعية'}
        onClose={() => setShowModal(false)}
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم الخزينة (عربي) <span className="text-red-500">*</span>
            </label>
            <input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2" placeholder="مثال: خزينة الكاشير 1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الخزينة (إنجليزي)</label>
            <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2" placeholder="Cashier 1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2" />
          </div>
          {editingBox && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <span className="text-sm">نشطة</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setShowModal(false)}
              className="flex-1 border rounded-lg py-2 hover:bg-gray-50">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
