import { useBudget } from '../lib/BudgetContext'
import { monthTotals, money } from '../lib/budget'

export default function SummaryBar() {
  const { month } = useBudget()
  const t = monthTotals(month)
  const zeroBased = Math.abs(t.leftToBudget) < 0.005

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Budget Summary
      </h2>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="Planned Income" value={money(t.totalIncome)} />
        <Stat label="Total Budgeted" value={money(t.totalBudgeted)} />
        <Stat label="Total Spent" value={money(t.totalSpent)} />
        <Stat label="Remaining to Spend" value={money(t.remainingToSpend)} />
      </div>
      <div
        className={`mt-2 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
          zeroBased
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        }`}
      >
        Left to Budget: {money(t.leftToBudget)}{' '}
        {zeroBased
          ? '— zero-based, every dollar assigned.'
          : t.leftToBudget > 0
            ? '— assign the leftover to a category.'
            : '— over budget, cut something.'}
      </div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}
