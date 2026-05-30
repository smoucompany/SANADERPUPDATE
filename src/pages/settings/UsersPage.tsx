import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Shield, UserCheck, UserX, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import PageHeader from '@/components/shared/PageHeader'
import Modal from '@/components/shared/Modal'
import DataTable, { Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

type UserRole = 'admin' | 'manager' | 'accountant' | 'cashier' | 'employee'

interface AppUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  last_sign_in_at?: string
}

const roleLabels: Record<UserRole, string> = {
  admin: 'مدير النظام',
  manager: 'مدير',
  accountant: 'محاسب',
  cashier: 'كاشير',
  employee: 'موظف'
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  accountant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cashier: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  employee: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

const permissionsList = [
  { key: 'view_dashboard', label: 'عرض لوحة التحكم', group: 'عام' },
  { key: 'manage_sales', label: 'إدارة المبيعات', group: 'مبيعات' },
  { key: 'view_sales', label: 'عرض المبيعات', group: 'مبيعات' },
  { key: 'manage_purchases', label: 'إدارة المشتريات', group: 'مشتريات' },
  { key: 'manage_inventory', label: 'إدارة المخزون', group: 'مخزون' },
  { key: 'manage_customers', label: 'إدارة العملاء', group: 'عملاء/موردون' },
  { key: 'manage_suppliers', label: 'إدارة الموردين', group: 'عملاء/موردون' },
  { key: 'manage_accounting', label: 'إدارة المحاسبة', group: 'محاسبة' },
  { key: 'view_reports', label: 'عرض التقارير', group: 'تقارير' },
  { key: 'manage_settings', label: 'إدارة الإعدادات', group: 'إعدادات' },
  { key: 'manage_users', label: 'إدارة المستخدمين', group: 'إعدادات' },
  { key: 'use_pos', label: 'استخدام نقطة البيع', group: 'مبيعات' }
]

const defaultPermsByRole: Record<UserRole, string[]> = {
  admin: permissionsList.map(p => p.key),
  manager: ['view_dashboard','manage_sales','view_sales','manage_purchases','manage_inventory','manage_customers','manage_suppliers','view_reports'],
  accountant: ['view_dashboard','view_sales','manage_accounting','view_reports','manage_customers'],
  cashier: ['use_pos','view_dashboard','view_sales'],
  employee: ['view_dashboard']
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [showPermModal, setShowPermModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])

  const [form, setForm] = useState({
    full_name: '', email: '', role: 'employee' as UserRole,
    password: '', is_active: true
  })

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ['users', user?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*')
        .eq('company_id', user!.company_id).order('created_at', { ascending: false })
      return data as AppUser[] || []
    },
    enabled: !!user
  })

  const { data: userPerms = [] } = useQuery<{ permission_key: string }[]>({
    queryKey: ['user-perms', selectedUser?.id],
    queryFn: async () => {
      const { data } = await supabase.from('permissions').select('permission_key')
        .eq('user_id', selectedUser!.id).eq('company_id', user!.company_id)
      return (data || []) as { permission_key: string }[]
    },
    enabled: !!selectedUser
  })

  useEffect(() => {
    if (userPerms) {
      setSelectedPerms(userPerms.map((p: any) => p.permission_key))
    }
  }, [userPerms])

  const createUser = useMutation({
    mutationFn: async () => {
      if (!form.full_name || !form.email || !form.password) throw new Error('جميع الحقول مطلوبة')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            company_id: user!.company_id,
            role: form.role
          }
        }
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('فشل إنشاء حساب المستخدم')
      const { error } = await supabase.from('users').upsert({
        id: authData.user.id,
        company_id: user!.company_id,
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
        permissions: Object.fromEntries(defaultPermsByRole[form.role].map(k => [k, true]))
      }, { onConflict: 'id' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('تم إضافة المستخدم بنجاح')
      setShowModal(false)
      setForm({ full_name: '', email: '', role: 'employee', password: '', is_active: true })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!editUser) return
      const { error } = await supabase.from('users').update({
        full_name: form.full_name, role: form.role, is_active: form.is_active
      }).eq('id', editUser.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('تم تحديث المستخدم')
      setShowModal(false)
      setEditUser(null)
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from('users').update({ is_active }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  })

  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return
      await supabase.from('permissions').delete().eq('user_id', selectedUser.id).eq('company_id', user!.company_id)
      if (selectedPerms.length) {
        await supabase.from('permissions').insert(
          selectedPerms.map(key => ({ company_id: user!.company_id, user_id: selectedUser.id, permission_key: key, is_granted: true }))
        )
      }
    },
    onSuccess: () => {
      toast.success('تم حفظ الصلاحيات')
      setShowPermModal(false)
      setSelectedUser(null)
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const openEdit = (u: AppUser) => {
    setEditUser(u)
    setForm({ full_name: u.full_name, email: u.email, role: u.role, password: '', is_active: u.is_active })
    setShowModal(true)
  }

  const openPerms = (u: AppUser) => {
    setSelectedUser(u)
    setShowPermModal(true)
  }

  const groups = [...new Set(permissionsList.map(p => p.group))]

  const columns: Column<AppUser>[] = [
    { key: 'full_name', label: 'الاسم', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {String(v).charAt(0)}
        </div>
        <div>
          <p className="font-medium text-sm">{String(v)}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      </div>
    )},
    { key: 'role', label: 'الدور', render: v => (
      <span className={`badge text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[v as UserRole]}`}>
        {roleLabels[v as UserRole]}
      </span>
    )},
    { key: 'is_active', label: 'الحالة', render: (v, row) => (
      <button onClick={() => toggleActive.mutate({ id: row.id, is_active: !v })}
        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${v ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
        {v ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
        {v ? 'نشط' : 'موقوف'}
      </button>
    )},
    { key: 'created_at', label: 'تاريخ الإضافة', render: v => <span className="text-xs text-muted-foreground">{formatDate(String(v))}</span> },
    { key: 'id', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openPerms(row)} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-primary" title="الصلاحيات"><Shield className="w-3.5 h-3.5" /></button>
        <button onClick={() => openEdit(row)} className="btn-ghost p-1.5 rounded-lg text-muted-foreground hover:text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
        {row.id !== user?.id && (
          <button onClick={() => setDeleteId(row.id)} className="btn-ghost p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      </div>
    )}
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="المستخدمون والصلاحيات" subtitle={`${users.length} مستخدم`}
        actions={<button onClick={() => { setEditUser(null); setForm({ full_name: '', email: '', role: 'employee', password: '', is_active: true }); setShowModal(true) }} className="btn-primary gap-1.5"><Plus className="w-4 h-4" />إضافة مستخدم</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(roleLabels) as [UserRole, string][]).map(([role, label]) => {
          const count = users.filter(u => u.role === role).length
          return (
            <div key={role} className={`rounded-xl p-3 border border-border/60 ${roleColors[role].replace('text-', 'border-').split(' ')[0]}/20`}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          )
        })}
      </div>

      <DataTable data={users} columns={columns} loading={isLoading} emptyMessage="لا يوجد مستخدمون" />

      {/* Add/Edit User Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditUser(null) }}
        title={editUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'} size="sm"
        footer={<>
          <button onClick={() => { setShowModal(false); setEditUser(null) }} className="btn-outline">إلغاء</button>
          <button onClick={() => editUser ? updateUser.mutate() : createUser.mutate()}
            disabled={createUser.isPending || updateUser.isPending} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />{editUser ? 'حفظ التعديلات' : 'إضافة'}
          </button>
        </>}>
        <div className="space-y-3">
          <div><label className="form-label">الاسم الكامل *</label>
            <input value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} className="form-input" placeholder="اسم المستخدم" autoFocus />
          </div>
          <div><label className="form-label">البريد الإلكتروني *</label>
            <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className="form-input" dir="ltr" type="email" disabled={!!editUser} />
          </div>
          {!editUser && (
            <div><label className="form-label">كلمة المرور *</label>
              <input value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} className="form-input" dir="ltr" type="password" placeholder="••••••••" />
            </div>
          )}
          <div><label className="form-label">الدور الوظيفي</label>
            <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value as UserRole}))} className="form-select">
              {(Object.entries(roleLabels) as [UserRole, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} className="w-4 h-4 rounded" id="is_active" />
            <label htmlFor="is_active" className="text-sm cursor-pointer">حساب نشط</label>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal open={showPermModal} onClose={() => { setShowPermModal(false); setSelectedUser(null) }}
        title={`صلاحيات: ${selectedUser?.full_name}`} size="md"
        footer={<>
          <button onClick={() => { setShowPermModal(false); setSelectedUser(null) }} className="btn-outline">إلغاء</button>
          <div className="flex gap-2">
            <button onClick={() => setSelectedPerms(permissionsList.map(p=>p.key))} className="btn-ghost text-sm">تحديد الكل</button>
            <button onClick={() => setSelectedPerms([])} className="btn-ghost text-sm">إلغاء الكل</button>
            <button onClick={() => savePermissions.mutate()} disabled={savePermissions.isPending} className="btn-primary gap-1.5">
              <Shield className="w-4 h-4" />حفظ الصلاحيات
            </button>
          </div>
        </>}>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(roleLabels) as [UserRole, string][]).map(([role, label]) => (
              <button key={role} onClick={() => setSelectedPerms(defaultPermsByRole[role])}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${roleColors[role]}`}>
                {label}
              </button>
            ))}
          </div>
          {groups.map(group => (
            <div key={group}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{group}</p>
              <div className="space-y-1.5">
                {permissionsList.filter(p => p.group === group).map(perm => (
                  <label key={perm.key} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <input type="checkbox" checked={selectedPerms.includes(perm.key)}
                      onChange={e => setSelectedPerms(prev => e.target.checked ? [...prev, perm.key] : prev.filter(k => k !== perm.key))}
                      className="w-4 h-4 rounded" />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="حذف المستخدم" message="هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={async () => {
          if (deleteId) {
            await supabase.from('users').update({ is_active: false }).eq('id', deleteId)
            qc.invalidateQueries({ queryKey: ['users'] })
            toast.success('تم إيقاف المستخدم')
            setDeleteId(null)
          }
        }}
        onCancel={() => setDeleteId(null)} variant="destructive" />
    </div>
  )
}
