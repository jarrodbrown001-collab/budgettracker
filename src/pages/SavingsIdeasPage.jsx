import { useBudget } from '../lib/BudgetContext'
import { computeIdeas } from '../lib/savingsIdeas'
import { money, savingsPlanned, monthTotals } from '../lib/budget'

export default function SavingsIdeasPage() {
  const { month } = useBudget()
  const { ideas, scenarios } = computeIdeas(month)
  const t = monthTotals(month)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Current Position — {month.label}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Planned income" value={money(t.totalIncome)} />
          <Stat label="Total budgeted" value={money(t.totalBudgeted)} />
          <Stat label="Left to budget" value={money(t.leftToBudget)} />
          <Stat label="Planned savings / wealth building" value={money(savingsPlanned(month))} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Recommended Cuts to Redirect Into Savings
        </h2>
        {ideas.length === 0 && (
          <p className="text-sm text-slate-500">
            No matching categories found this month — recommendations are based on common item
            names like Groceries, Subscriptions, Family Fun, etc.
          </p>
        )}
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="rounded-md border border-slate-100 p-3 dark:border-slate-800">
              <p className="text-sm font-medium">{idea.label}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{idea.why}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs">
                <span>Current: <strong>{money(idea.current)}</strong></span>
                <span className="text-emerald-600">Suggested cut: <strong>{money(idea.cut)}</strong></span>
                <span>New target: <strong>{money(idea.newTarget)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Potential Savings Scenarios
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {scenarios.map((s) => (
            <div key={s.id} className="rounded-md border border-slate-100 p-3 dark:border-slate-800">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="mt-2 text-lg font-bold text-emerald-600">{money(s.monthly)}<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{money(s.annual)}/yr</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">→ {s.destination}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  )
}
