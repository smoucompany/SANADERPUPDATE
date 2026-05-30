// Shared primitives used across all settings pages

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
        ${checked ? 'right-1' : 'right-6'}`} />
    </button>
  )
}

export function SettingRow({
  icon: Icon, iconColor, label, desc, children
}: {
  icon?: React.ElementType; iconColor?: string; label: string; desc?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && iconColor && (
          <span className={`icon-badge-sm ${iconColor}`}>
            <Icon className="w-3 h-3 text-white" />
          </span>
        )}
        <div>
          <p className="text-[13px] font-medium text-foreground">{label}</p>
          {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SectionCard({ title, icon: Icon, iconColor, children }: {
  title: string; icon?: React.ElementType; iconColor?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/40 flex items-center gap-3">
        {Icon && iconColor && (
          <span className={`icon-badge-sm ${iconColor}`}>
            <Icon className="w-3 h-3 text-white" />
          </span>
        )}
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      <div className="px-5">{children}</div>
    </div>
  )
}

export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`mr-auto text-[10px] font-medium ${ok ? 'text-emerald-600' : 'text-rose-500'}`}>
        {ok ? 'متصل' : 'غير متصل'}
      </span>
    </div>
  )
}
