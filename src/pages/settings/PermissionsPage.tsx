import { useState } from 'react'
import {
  Shield, Save, Check, X, RefreshCw, User, ChevronDown, Loader2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const ROLES = [
  { value: 'admin',     label: 'مدير النظام',     color: 'bg-purple-100 text-purple-700', desc: 'صلاحية كاملة' },
  { value: 'manager',   label: 'مدير مالي',       color: 'bg-blue-100 text-blue-700',     desc: 'إدارة المالية والمبيعات' },
  { value: 'accountant', label: 'مدير مخازن',     color: 'bg-green-100 text-green-700',   desc: 'المخازن والمشتريات' },
  { value: 'cashier',   label: 'كاشير',            color: 'bg-orange-100 text-orange-700', desc: 'نقاط البيع فقط' },
  { value: 'employee',  label: 'مستخدم عادي',     color: 'bg-gray-100 text-gray-700',     desc: 'عرض فقط' },
]

const MODULES = [
  { key: 'sales',       label: 'المبيعات',       icon: '🛒' },
  { key: 'purchases',   label: 'المشتريات',     icon: '📦' },
  { key: 'inventory',   label: 'المخازن',        icon: '🏭' },
  { key: 'accounting',  label: 'المحاسبة',       icon: '📊' },
  { key: 'cashbox',     label: 'الخزائن',        icon: '💰' },
  { key: 'bank',        label: 'البنك',           icon: '🏦' },
  { key: 'expenses',    label: 'المصروفات',      icon: '💸' },
  { key: 'recipes',     label: 'الرسبي',          icon: '👨‍🍳' },
  { key: 'customers',   label: 'العملاء',        icon: '👥' },
  { key: 'suppliers',   label: 'الموردين',       icon: '🏪' },
  { key: 'hr',          label: 'الموارد البشرية', icon: '👔' },
  { key: 'reports',     label: 'التقارير',        icon: '📈' },
  { key: 'settings',    label: 'الإعدادات',      icon: '⚙️' },
]

const PERM_COLS = [
  { key: 'can_view',    label: 'عرض' },
  { key: 'can_create',  label: 'إضافة' },
  { key: 'can_edit',    label: 'تعديل' },
  { key: 'can_delete',  label: 'حذف' },
  { key: 'can_approve', label: 'اعتماد' },
  { key: 'can_export',  label: 'تصدير' },
  { key: 'can_lock',    label: 'قفل' },
  { key: 'can_unlock',  label: 'فك قفل' },
]

// الصلاحيات الافتراضية لكل دور
const DEFAULT_PERMS: Record<string, Record<string, boolean>> = {
  admin:     { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true, can_lock: true, can_unlock: true },
  manager:   { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: true, can_export: true, can_lock: true, can_unlock: true },
  accountant: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false, can_export: true, can_lock: false, can_unlock: false },
  cashier:   { can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false, can_export: false, can_lock: false, can_unlock: false },
  employee:  { can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false, can_export: false, can_lock: false, can_unlock: false },
}

export default function PermissionsPage() {
  const { company } = useAuthStore()
  const queryClient = useQueryClient()

  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [permissions, setPermissions]   = useState<Record<string, Record<string, boolean>>>({})
  const [saving, setSaving]             = useState(false)
  const [activeRole, setActiveRole]     = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-list', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('users')
        .select('id, full_name, email, role, is_active, permissions')
        .eq('company_id', company.id)
        .order('role')
      return data || []
    },
    enabled: !!company?.id
  })

  const loadUserPermissions = async (user: any) => {
    setSelectedUser(user)
    setActiveRole(user.role)

    const { data: perms } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id)

    const permMap: Record<string, Record<string, boolean>> = {}
    MODULES.forEach(m => {
      const existing = perms?.find(p => p.module === m.key)
      if (existing) {
        permMap[m.key] = {
          can_view: existing.can_view || false,
          can_create: existing.can_create || false,
          can_edit: existing.can_edit || false,
          can_delete: existing.can_delete || false,
          can_approve: existing.can_approve || false,
          can_export: existing.can_export || false,
          can_lock: existing.can_lock || false,
          can_unlock: existing.can_unlock || false,
        }
      } else {
        // صلاحيات افتراضية
        permMap[m.key] = { ...DEFAULT_PERMS[user.role] || DEFAULT_PERMS.employee }
      }
    })
    setPermissions(permMap)
  }

  const applyRoleDefaults = (role: string) => {
    setActiveRole(role)
    const defaults = DEFAULT_PERMS[role] || DEFAULT_PERMS.employee
    const permMap: Record<string, Record<string, boolean>> = {}
    MODULES.forEach(m => {
      permMap[m.key] = { ...defaults }
    })
    setPermissions(permMap)
  }

  const togglePerm = (module: string, perm: string) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...(prev[module] || {}),
        [perm]: !(prev[module]?.[perm] ?? false)
      }
    }))
  }

  const toggleAllModule = (module: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: Object.fromEntries(PERM_COLS.map(c => [c.key, value]))
    }))
  }

  const handleSave = async () => {
    if (!selectedUser) return toast.error('اختر مستخدماً أولاً')
    setSaving(true)
    try {
      // تحديث الدور
      await supabase.from('users').update({ role: activeRole as any }).eq('id', selectedUser.id)

      // حذف الصلاحيات القديمة
      await supabase.from('user_permissions').delete().eq('user_id', selectedUser.id)

      // إدراج الصلاحيات الجديدة
      const rows = MODULES.map(m => ({
        user_id:    selectedUser.id,
        company_id: company!.id,
        module:     m.key,
        ...permissions[m.key]
      }))
      await supabase.from('user_permissions').insert(rows)

      toast.success('✅ تم حفظ الصلاحيات بنجاح')
      queryClient.invalidateQueries({ queryKey: ['users-list'] })
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة صلاحيات المستخدمين"
        subtitle="تحديد صلاحيات كل مستخدم على مستوى كل وحدة في النظام"
        actions={
          selectedUser && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              حفظ الصلاحيات
            </button>
          )
        }
      />

      {/* الأدوار المتاحة */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-blue-600" />
          الأدوار المتاحة في النظام
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {ROLES.map(role => (
            <div key={role.value} className={`border rounded-xl p-3 ${role.color.split(' ')[0]} border-opacity-50`}>
              <div className={`text-sm font-bold ${role.color.split(' ')[1]}`}>{role.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{role.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* قائمة المستخدمين */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h4 className="font-semibold text-gray-700">المستخدمون ({users.length})</h4>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
          ) : (
            <div className="divide-y overflow-y-auto max-h-[600px]">
              {(users as any[]).map((u: any) => (
                <button key={u.id}
                  onClick={() => loadUserPermissions(u)}
                  className={`w-full text-right px-4 py-3 hover:bg-blue-50 flex items-center justify-between ${
                    selectedUser?.id === u.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User size={14} className="text-gray-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{u.full_name}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ROLES.find(r => r.value === u.role)?.color || 'bg-gray-100 text-gray-600'
                  }`}>
                    {ROLES.find(r => r.value === u.role)?.label || u.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* جدول الصلاحيات */}
        <div className="lg:col-span-3">
          {!selectedUser ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <Shield size={48} className="mx-auto mb-3 opacity-30" />
              <p>اختر مستخدماً من القائمة لتعديل صلاحياته</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">صلاحيات: {selectedUser.full_name}</h4>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">تطبيق صلاحيات الدور:</span>
                  <select value={activeRole} onChange={e => applyRoleDefaults(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">الوحدة</th>
                      {PERM_COLS.map(c => (
                        <th key={c.key} className="text-center px-3 py-3 font-medium text-gray-600 w-16">
                          {c.label}
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-medium text-gray-600 w-20">الكل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {MODULES.map(m => {
                      const modPerms = permissions[m.key] || {}
                      const allEnabled = PERM_COLS.every(c => modPerms[c.key])
                      return (
                        <tr key={m.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <span>{m.icon}</span>
                              <span className="font-medium">{m.label}</span>
                            </span>
                          </td>
                          {PERM_COLS.map(c => (
                            <td key={c.key} className="px-3 py-3 text-center">
                              <button
                                onClick={() => togglePerm(m.key, c.key)}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                                  modPerms[c.key]
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300 hover:border-blue-400'
                                }`}>
                                {modPerms[c.key] && <Check size={12} />}
                              </button>
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => toggleAllModule(m.key, !allEnabled)}
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                allEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                              {allEnabled ? 'إلغاء الكل' : 'الكل'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-4 border-t bg-gray-50 flex justify-end">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <Save size={14} />
                  حفظ الصلاحيات
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
