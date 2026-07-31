import { useBudget } from '../lib/BudgetContext'
import { accountTotals, money } from '../lib/budget'

export default function AccountRollup() {
  const { month } = useBudget()
  const rows = accountTotals(month)

  if (rows.length === 0) return null

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        By Account
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.account} className="rounded-md border border-slate-100 p-3 dark:border-slate-800">
            <p className="text-sm font-medium">{r.account}</p>
            <p className="mt-1 text-lg font-semibold">{money(r.planned)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {money(r.spent)} spent · {money(r.remaining)} remaining
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
