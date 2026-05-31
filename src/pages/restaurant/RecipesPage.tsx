import { useState, useMemo } from 'react'
import {
  Plus, Search, Edit2, CheckCircle, XCircle,
  ChefHat, Package, Trash2, Eye, Loader2, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function RecipesPage() {
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [viewRecipe, setViewRecipe] = useState<any | null>(null)
  const [editRecipe, setEditRecipe] = useState<any | null>(null)
  const [saving, setSaving]         = useState(false)

  const [form, setForm] = useState({
    product_id:   '',
    name_ar:      '',
    serving_size: 1,
    serving_unit: 'حصة',
    instructions: '',
    notes:        ''
  })
  const [ingredients, setIngredients] = useState<Array<{
    _id: string; product_id: string; product_name: string;
    quantity: number; unit_name: string;
  }>>([])

  const { data: recipes = [], isLoading, refetch } = useQuery({
    queryKey: ['recipes', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          product:products(name_ar, code, category:categories(name_ar)),
          items:recipe_items(*, ingredient:products(name_ar))
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id
  })

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-active', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase
        .from('products')
        .select('id, name_ar, code, unit:units(name_ar)')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name_ar')
      return data || []
    },
    enabled: !!company?.id
  })

  const filtered = useMemo(() =>
    (recipes as any[]).filter(r =>
      !search || r.name_ar?.includes(search) || r.product?.name_ar?.includes(search)
    ), [recipes, search])

  const openAdd = () => {
    setEditRecipe(null)
    setForm({ product_id: '', name_ar: '', serving_size: 1, serving_unit: 'حصة', instructions: '', notes: '' })
    setIngredients([{ _id: '1', product_id: '', product_name: '', quantity: 1, unit_name: '' }])
    setShowModal(true)
  }

  const openEdit = (recipe: any) => {
    setEditRecipe(recipe)
    setForm({
      product_id:   recipe.product_id,
      name_ar:      recipe.name_ar,
      serving_size: recipe.serving_size || 1,
      serving_unit: recipe.serving_unit || 'حصة',
      instructions: recipe.instructions || '',
      notes:        recipe.notes || ''
    })
    setIngredients(recipe.items?.map((it: any) => ({
      _id: it.id, product_id: it.product_id, product_name: it.ingredient?.name_ar || it.product_name,
      quantity: it.quantity, unit_name: it.unit_name || ''
    })) || [])
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.product_id) return toast.error('اختر المنتج المرتبط بالرسبي')
    if (!form.name_ar) return toast.error('اسم الرسبي مطلوب')
    if (ingredients.some(ing => !ing.product_id)) return toast.error('يجب تحديد جميع المكونات')
    if (ingredients.length === 0) return toast.error('يجب إضافة مكون واحد على الأقل')

    setSaving(true)
    try {
      let recipeId: string

      if (editRecipe) {
        await supabase.from('recipes').update({
          name_ar:      form.name_ar,
          serving_size: form.serving_size,
          serving_unit: form.serving_unit,
          instructions: form.instructions || null,
          notes:        form.notes || null,
          updated_at:   new Date().toISOString()
        }).eq('id', editRecipe.id)

        recipeId = editRecipe.id
        await supabase.from('recipe_items').delete().eq('recipe_id', editRecipe.id)
      } else {
        const { data: existingRecipe } = await supabase.from('recipes')
          .select('id').eq('company_id', company!.id).eq('product_id', form.product_id).single()

        if (existingRecipe) return toast.error('يوجد رسبي مسجّل لهذا المنتج مسبقاً')

        const { data: newRecipe, error } = await supabase.from('recipes').insert({
          company_id:   company!.id,
          product_id:   form.product_id,
          name_ar:      form.name_ar,
          serving_size: form.serving_size,
          serving_unit: form.serving_unit,
          instructions: form.instructions || null,
          notes:        form.notes || null,
          is_active:    true,
          is_approved:  false
        }).select('id').single()

        if (error) throw error
        recipeId = newRecipe.id
      }

      await supabase.from('recipe_items').insert(
        ingredients.map((ing, idx) => ({
          recipe_id:   recipeId,
          product_id:  ing.product_id,
          product_name: ing.product_name,
          quantity:    ing.quantity,
          unit_name:   ing.unit_name || null,
          sort_order:  idx
        }))
      )

      toast.success(editRecipe ? 'تم تحديث الرسبي' : 'تم إضافة الرسبي')
      setShowModal(false)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (recipeId: string, approve: boolean) => {
    try {
      await supabase.from('recipes').update({
        is_approved: approve,
        approved_by: approve ? user?.id : null,
        approved_at: approve ? new Date().toISOString() : null
      }).eq('id', recipeId)

      toast.success(approve ? '✅ تم اعتماد الرسبي — يمكن الآن بيع المنتج' : 'تم إلغاء اعتماد الرسبي')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (recipeId: string) => {
    if (!confirm('سيتم حذف الرسبي. تأكيد؟')) return
    try {
      await supabase.from('recipe_items').delete().eq('recipe_id', recipeId)
      await supabase.from('recipes').delete().eq('id', recipeId)
      toast.success('تم حذف الرسبي')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const addIngredient = () => {
    setIngredients(prev => [...prev, {
      _id: Date.now().toString(), product_id: '', product_name: '', quantity: 1, unit_name: ''
    }])
  }

  const updateIngredient = (id: string, field: string, value: any) => {
    setIngredients(prev => prev.map(ing => {
      if (ing._id !== id) return ing
      if (field === 'product_id') {
        const product = (allProducts as any[]).find((p: any) => p.id === value)
        return { ...ing, product_id: value, product_name: product?.name_ar || '', unit_name: product?.unit?.name_ar || '' }
      }
      return { ...ing, [field]: value }
    }))
  }

  const removeIngredient = (id: string) => {
    if (ingredients.length <= 1) return toast.error('يجب مكون واحد على الأقل')
    setIngredients(prev => prev.filter(ing => ing._id !== id))
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة الرسبي (وصفات المطعم)"
        subtitle="تحديد مكونات كل منتج — لا يمكن البيع بدون رسبي معتمد"
        actions={
          <div className="flex gap-2">
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} /> رسبي جديد
            </button>
          </div>
        }
      />

      {/* تنبيه */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-700">
          <strong>قاعدة البيع:</strong> لا يمكن بيع أي منتج إلا إذا كان له رسبي <strong>معتمد</strong>.
          الاعتماد يتطلب صلاحية مدير. الرسبي المعتمد يخصم المواد الخام تلقائياً من مخزن التشغيل (2) عند البيع.
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{(recipes as any[]).length}</div>
          <div className="text-xs text-gray-500">إجمالي الرسبي</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{(recipes as any[]).filter(r => r.is_approved).length}</div>
          <div className="text-xs text-gray-500">رسبي معتمد</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{(recipes as any[]).filter(r => !r.is_approved).length}</div>
          <div className="text-xs text-gray-500">في انتظار الاعتماد</div>
        </div>
      </div>

      {/* بحث */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="بحث باسم الرسبي أو المنتج..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 pr-9 text-sm" />
        </div>
      </div>

      {/* قائمة الرسبي */}
      {isLoading ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <ChefHat size={48} className="mx-auto mb-3 opacity-30" />
          <p>لا توجد وصفات. أضف رسبي لكل منتج مطعمك.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe: any) => (
            <div key={recipe.id}
              className={`bg-white rounded-xl shadow-sm border p-5 ${recipe.is_approved ? 'border-green-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    recipe.is_approved ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <ChefHat size={20} className={recipe.is_approved ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{recipe.name_ar}</h4>
                    <p className="text-xs text-gray-500">{recipe.product?.name_ar}</p>
                    {recipe.product?.category?.name_ar && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                        {recipe.product.category.name_ar}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  recipe.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {recipe.is_approved ? '✓ معتمد' : 'غير معتمد'}
                </span>
              </div>

              {/* المكونات */}
              <div className="mt-2 space-y-1">
                {recipe.items?.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span>{item.ingredient?.name_ar || item.product_name}</span>
                    <span className="text-gray-400">{item.quantity} {item.unit_name}</span>
                  </div>
                ))}
                {recipe.items?.length > 3 && (
                  <p className="text-xs text-gray-400">+ {recipe.items.length - 3} مكونات أخرى</p>
                )}
              </div>

              {/* أزرار */}
              <div className="mt-4 flex items-center gap-2">
                {recipe.is_approved ? (
                  <button onClick={() => handleApprove(recipe.id, false)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50">
                    <XCircle size={12} /> إلغاء الاعتماد
                  </button>
                ) : (
                  <button onClick={() => handleApprove(recipe.id, true)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                    <CheckCircle size={12} /> اعتماد الرسبي
                  </button>
                )}
                <button onClick={() => openEdit(recipe)}
                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(recipe.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة إضافة/تعديل */}
      <Modal
        open={showModal}
        title={editRecipe ? `تعديل رسبي: ${editRecipe.name_ar}` : 'إضافة رسبي جديد'}
        onClose={() => setShowModal(false)}
      >
        <div className="space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                المنتج المرتبط <span className="text-red-500">*</span>
              </label>
              <select value={form.product_id}
                onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                disabled={!!editRecipe}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="">-- اختر المنتج --</option>
                {(allProducts as any[]).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name_ar} ({p.code})</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">اسم الرسبي <span className="text-red-500">*</span></label>
              <input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">حجم الحصة</label>
              <input type="number" value={form.serving_size} min="0.001"
                onChange={e => setForm(f => ({ ...f, serving_size: parseFloat(e.target.value) }))}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">وحدة الحصة</label>
              <input value={form.serving_unit} onChange={e => setForm(f => ({ ...f, serving_unit: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2" placeholder="حصة" />
            </div>
          </div>

          {/* المكونات */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">المكونات / المواد الخام</label>
              <button onClick={addIngredient}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
                <Plus size={12} /> إضافة
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ingredients.map(ing => (
                <div key={ing._id} className="flex items-center gap-2">
                  <select value={ing.product_id}
                    onChange={e => updateIngredient(ing._id, 'product_id', e.target.value)}
                    className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                    <option value="">-- اختر المكوّن --</option>
                    {(allProducts as any[]).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name_ar}</option>
                    ))}
                  </select>
                  <input type="number" value={ing.quantity} min="0.001" step="0.001"
                    onChange={e => updateIngredient(ing._id, 'quantity', parseFloat(e.target.value))}
                    className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center" />
                  <input value={ing.unit_name} onChange={e => updateIngredient(ing._id, 'unit_name', e.target.value)}
                    className="w-20 border rounded-lg px-2 py-1.5 text-sm" placeholder="وحدة" />
                  <button onClick={() => removeIngredient(ing._id)}
                    className="p-1 hover:bg-red-50 rounded text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">طريقة التحضير</label>
            <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 font-medium flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editRecipe ? 'حفظ التعديلات' : 'إضافة الرسبي'}
            </button>
            <button onClick={() => setShowModal(false)}
              className="flex-1 border rounded-lg py-2.5">إلغاء</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
