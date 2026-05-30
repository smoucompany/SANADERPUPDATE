import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, Download, FileSpreadsheet, CheckCircle2,
  AlertTriangle, XCircle, ChevronRight, Loader2,
  FileUp, Table2, Info
} from 'lucide-react'
import {
  parseFile, validateProducts, validateInventory,
  downloadTemplate, type ImportResult, type ImportRow,
  PRODUCT_COLUMNS, INVENTORY_COLUMNS
} from '@/lib/importExport'

type ImportType = 'products' | 'inventory'

interface Props {
  type:     ImportType
  onImport: (rows: ImportRow[]) => Promise<void>
  onClose:  () => void
}

const STEPS = ['اختر الملف', 'مراجعة البيانات', 'الاستيراد'] as const

function StatusBadge({ status }: { status: ImportRow['status'] }) {
  if (status === 'valid')   return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-2.5 h-2.5" />صحيح</span>
  if (status === 'warning') return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full"><AlertTriangle className="w-2.5 h-2.5" />تحذير</span>
  return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full"><XCircle className="w-2.5 h-2.5" />خطأ</span>
}

export default function ImportExportModal({ type, onImport, onClose }: Props) {
  const [step, setStep]           = useState<0|1|2>(0)
  const [dragging, setDragging]   = useState(false)
  const [parsing, setParsing]     = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [fileName, setFileName]   = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | ImportRow['status']>('all')
  const [importDone, setImportDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const cols    = type === 'products' ? PRODUCT_COLUMNS : INVENTORY_COLUMNS
  const typeLabel = type === 'products' ? 'المنتجات' : 'المخزون'

  const processFile = useCallback(async (file: File) => {
    if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel', 'text/csv', ''].includes(file.type)
        && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('يرجى رفع ملف Excel (.xlsx) أو CSV (.csv) فقط')
      return
    }
    setFileName(file.name)
    setParsing(true)
    try {
      const rows   = await parseFile(file)
      // Skip example row (if it matches example data)
      const dataRows = rows.filter((r, i) => {
        if (i === 0) {
          const firstVal = Object.values(r)[0]?.toString() || ''
          return !['شاشة','Samsung','example','مثال'].some(ex => firstVal.includes(ex))
        }
        return true
      })
      const validated = type === 'products'
        ? validateProducts(dataRows)
        : validateInventory(dataRows)
      setResult(validated)
      setStep(1)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setParsing(false)
    }
  }, [type])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleImport = async () => {
    if (!result) return
    const validRows = result.rows.filter(r => r.status !== 'error')
    setImporting(true)
    setStep(2)
    try {
      await onImport(validRows)
      setImportedCount(validRows.length)
      setImportDone(true)
    } catch (e: any) {
      alert('حدث خطأ أثناء الاستيراد: ' + e.message)
    } finally {
      setImporting(false)
    }
  }

  const filtered = result?.rows.filter(r => filterStatus === 'all' || r.status === filterStatus) ?? []

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -16 }}
        className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base">استيراد {typeLabel}</h2>
              <p className="text-xs text-muted-foreground">رفع بيانات {typeLabel} من ملف Excel أو CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-border/30 bg-muted/20 shrink-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                step === i ? 'bg-primary text-primary-foreground' :
                step > i  ? 'text-emerald-600'  : 'text-muted-foreground'
              }`}>
                {step > i
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] font-bold border-current">{i+1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-1 rotate-180" />}
            </div>
          ))}

          {/* Download template button */}
          <button onClick={() => downloadTemplate(type)}
            className="flex items-center gap-1.5 mr-auto text-xs text-primary hover:text-primary/80 font-medium">
            <Download className="w-3.5 h-3.5" />
            تنزيل القالب
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── Step 0: Upload ── */}
            {step === 0 && (
              <motion.div key="step0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-6 space-y-5">

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                    dragging
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                  {parsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-sm font-medium">جاري قراءة الملف...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                        <FileUp className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-base mb-1">اسحب الملف هنا أو انقر للاختيار</p>
                        <p className="text-sm text-muted-foreground">Excel (.xlsx) أو CSV (.csv) — حتى 10MB</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">.xlsx</span>
                        <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">.xls</span>
                        <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">.csv</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column reference */}
                <div className="bg-muted/30 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Table2 className="w-3.5 h-3.5" />
                    أعمدة القالب ({cols.length} عمود)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {cols.map(col => (
                      <div key={col.key} className="flex items-center gap-1.5 text-xs">
                        {col.required
                          ? <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />}
                        <span className={col.required ? 'font-medium' : 'text-muted-foreground'}>{col.label}</span>
                        {col.required && <span className="text-red-500 text-[10px]">*</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> مطلوب
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 inline-block mr-2" /> اختياري
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Preview & Validation ── */}
            {step === 1 && result && (
              <motion.div key="step1"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-6 space-y-4">

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'إجمالي الصفوف',  value: result.total,    color: 'text-foreground',    bg: 'bg-muted/50' },
                    { label: 'صفوف صحيحة',    value: result.valid,    color: 'text-emerald-600',   bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'تحذيرات',        value: result.warnings, color: 'text-amber-600',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'أخطاء',          value: result.errors,   color: 'text-red-600',       bg: 'bg-red-50 dark:bg-red-900/20' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {result.errors > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    الصفوف التي تحتوي على أخطاء لن يتم استيرادها. يمكنك استيراد الصفوف الصحيحة فقط ({result.valid}).
                  </div>
                )}

                {/* File name */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="font-medium text-foreground">{fileName}</span>
                  <span>·</span>
                  <span>{result.total} صف</span>
                </div>

                {/* Filter */}
                <div className="flex gap-1.5">
                  {[
                    { key: 'all',     label: `الكل (${result.total})` },
                    { key: 'valid',   label: `صحيح (${result.valid})` },
                    { key: 'warning', label: `تحذير (${result.warnings})` },
                    { key: 'error',   label: `خطأ (${result.errors})` },
                  ].map(f => (
                    <button key={f.key} onClick={() => setFilterStatus(f.key as typeof filterStatus)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        filterStatus === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}>{f.label}</button>
                  ))}
                </div>

                {/* Preview table */}
                <div className="border border-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground w-12">#</th>
                          <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground w-20">الحالة</th>
                          {cols.slice(0, 5).map(col => (
                            <th key={col.key} className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">
                              {col.label.replace(' *','')}
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(row => (
                          <tr key={row.rowIndex} className={`border-t border-border/40 ${
                            row.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' :
                            row.status === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                          }`}>
                            <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                            <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                            {cols.slice(0, 5).map(col => (
                              <td key={col.key} className={`px-3 py-2 max-w-[120px] truncate ${
                                col.required && !row.data[col.key] ? 'text-red-500 font-medium' : ''
                              }`}>
                                {row.data[col.key] || <span className="text-muted-foreground/40">—</span>}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-xs">
                              {row.errors.length > 0 && (
                                <span className="text-red-500">{row.errors[0]}</span>
                              )}
                              {row.errors.length === 0 && row.warnings.length > 0 && (
                                <span className="text-amber-600">{row.warnings[0]}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">لا توجد صفوف</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Done ── */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-12 flex flex-col items-center justify-center gap-5 text-center">
                {importing ? (
                  <>
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                    <p className="text-lg font-bold">جاري استيراد البيانات...</p>
                    <p className="text-sm text-muted-foreground">يرجى الانتظار</p>
                  </>
                ) : importDone ? (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </motion.div>
                    <div>
                      <p className="text-xl font-black text-emerald-600">تم الاستيراد بنجاح!</p>
                      <p className="text-muted-foreground mt-1">
                        تم استيراد <strong className="text-foreground">{importedCount}</strong> {typeLabel === 'المنتجات' ? 'منتج' : 'سجل مخزون'} بنجاح
                      </p>
                    </div>
                    <button onClick={onClose} className="btn-primary gap-2 mt-2">
                      <CheckCircle2 className="w-4 h-4" />
                      إغلاق
                    </button>
                  </>
                ) : null}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer actions */}
        {step === 1 && result && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10 shrink-0">
            <button onClick={() => { setStep(0); setResult(null); setFileName('') }}
              className="btn-outline gap-1.5 text-sm">
              <Upload className="w-4 h-4" />
              رفع ملف آخر
            </button>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                سيتم استيراد <strong className="text-foreground">{result.valid}</strong> من أصل <strong className="text-foreground">{result.total}</strong> صف
              </p>
              <button onClick={handleImport} disabled={result.valid === 0}
                className="btn-primary gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <CheckCircle2 className="w-4 h-4" />
                استيراد {result.valid} صف
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
