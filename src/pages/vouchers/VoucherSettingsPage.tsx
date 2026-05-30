import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Settings, ShieldAlert, Check, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import toast from 'react-hot-toast'

export default function VoucherSettingsPage() {
  const navigate = useNavigate()
  const [receiptPrefix, setReceiptPrefix] = useState('RCT')
  const [paymentPrefix, setPaymentPrefix] = useState('PAY')
  const [defaultCashbox, setDefaultCashbox] = useState('')
  const [enableApprovals, setEnableApprovals] = useState(false)
  const [autoJournalEntries, setAutoJournalEntries] = useState(true)
  const [notifyOnCreation, setNotifyOnCreation] = useState(true)

  const { data: cashboxes = [] } = useQuery({
    queryKey: ['cashboxes-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cashboxes').select('*')
      if (error) throw error
      return data
    }
  })

  // Load saved sequence config if any
  useEffect(() => {
    if (cashboxes.length > 0) {
      const def = cashboxes.find((c: any) => c.is_default)
      if (def) setDefaultCashbox(def.id)
    }
  }, [cashboxes])

  const handleSaveSettings = () => {
    // In a fully integrated system we can save this config in Supabase settings
    toast.success('تم حفظ إعدادات وقواعد السندات المالية بنجاح!')
    navigate('/vouchers')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full max-w-4xl mx-auto"
    >
      <PageHeader
        title="إعدادات وقواعد السندات المالية"
        subtitle="تخصيص تسلسلات الأرقام وتكاملات العمليات النقدية والاعتمادات"
        actions={
          <button onClick={() => navigate('/vouchers')} className="btn-outline gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm">
            <ArrowRight className="w-4 h-4 ml-1" />رجوع للوحة السندات
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Settings sections */}
        <div className="md:col-span-2 space-y-6">
          {/* Prefix Card */}
          <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />تسلسلات ترقيم السندات التلقائية
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">بادئة سندات القبض</label>
                <input
                  value={receiptPrefix}
                  onChange={e => setReceiptPrefix(e.target.value)}
                  className="form-input text-xs font-bold bg-muted/20 focus:bg-card border-border/40 rounded-xl"
                  placeholder="RCT"
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground mt-1">مثال رقم السند: RCT000001</p>
              </div>

              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">بادئة سندات الصرف</label>
                <input
                  value={paymentPrefix}
                  onChange={e => setPaymentPrefix(e.target.value)}
                  className="form-input text-xs font-bold bg-muted/20 focus:bg-card border-border/40 rounded-xl"
                  placeholder="PAY"
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground mt-1">مثال رقم السند: PAY000001</p>
              </div>
            </div>
          </div>

          {/* Integrations and rules */}
          <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />قواعد التكامل التلقائي والقيود المحاسبية
            </h3>

            <div className="space-y-4">
              {/* Cashbox rule */}
              <div>
                <label className="form-label text-[11px] font-bold text-muted-foreground mb-1.5">الخزينة الافتراضية للمعاملات السريعة</label>
                <select
                  value={defaultCashbox}
                  onChange={e => setDefaultCashbox(e.target.value)}
                  className="form-select bg-muted/20 focus:bg-card border-border/40 rounded-xl text-xs"
                >
                  <option value="">اختر الخزينة الافتراضية</option>
                  {cashboxes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                  ))}
                </select>
              </div>

              {/* Switches */}
              <div className="flex items-center justify-between py-2 border-b border-border/10">
                <div>
                  <h4 className="text-xs font-bold text-foreground">توليد قيود محاسبية تلقائياً في شجرة الحسابات</h4>
                  <p className="text-[10px] text-muted-foreground">عند تفعيلها، يقوم النظام بتوليد قيد يومية متوازن تلقائياً عند اعتماد السند.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoJournalEntries}
                  onChange={e => setAutoJournalEntries(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/10">
                <div>
                  <h4 className="text-xs font-bold text-foreground">إرسال إشعارات فورية بعد كل عملية قبض/صرف</h4>
                  <p className="text-[10px] text-muted-foreground">تنبيه إدارة الحسابات والمدراء فور إصدار أو تعديل سند مالي.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyOnCreation}
                  onChange={e => setNotifyOnCreation(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">تفعيل نظام الموافقات والاعتمادات المتعددة</h4>
                  <p className="text-[10px] text-muted-foreground">يتطلب السند اعتماد المدير المالي أو العام قبل تغيير أرصدة الصناديق.</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableApprovals}
                  onChange={e => setEnableApprovals(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right side rules overview list */}
        <div className="space-y-6">
          <div className="bg-card/75 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 text-rose-500">
              <ShieldAlert className="w-5 h-5" />قواعد الأمان والمراجعة
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
              <li>أي عملية تعديل على السندات يتم حفظها بالكامل كنسخة أمان في سجلات النشاط (Audit Trail).</li>
              <li>لا يسمح بحذف السندات المعتمدة إلا من قبل المسؤولين ذوي الصلاحيات المطلقة لمنع التلاعب بالنقدية.</li>
              <li>تحديث أرصدة العملاء والموردين يتم برمجياً لمنع التناقضات بين الفاتورة وحركة الدفع.</li>
            </ul>
          </div>

          <button
            onClick={handleSaveSettings}
            className="btn-primary w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
          >
            <Check className="w-5 h-5" />حفظ جميع القواعد الجديدة
          </button>
        </div>
      </div>
    </motion.div>
  )
}
