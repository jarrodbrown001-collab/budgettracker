// Thin inline progress bar showing spent/planned for one budget line item.
export default function SpendProgress({ planned, spent }) {
  const p = Number(planned) || 0
  const s = Number(spent) || 0
  if (p <= 0) return null
  const pct = (s / p) * 100
  const widthPct = Math.min(100, Math.max(0, pct))
  const color = pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="mt-0.5 flex items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-full ${color}`} style={{ width: `${widthPct}%` }} />
      </div>
      <span className="text-[10px] leading-none text-slate-400 dark:text-slate-500">{Math.round(pct)}%</span>
    </div>
  )
}
