import { useBudget } from '../lib/BudgetContext'
import { accountTotals, money } from '../lib/budget'

export default function AccountRollup() {
  const { month, updateMonth } = useBudget()
  const rows = accountTotals(month)

  const setNote = (account, text) => {
    updateMonth((m) => ({ ...m, accountNotes: { ...(m.accountNotes || {}), [account]: text } }))
  }

  if (rows.length === 0) return null

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        By Account — {month.label}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.account} className="rounded-md border border-slate-100 p-2 dark:border-slate-800">
            <p className="text-xs font-medium">{r.account}</p>
            <p className="mt-0.5 text-sm font-semibold">{money(r.planned)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {money(r.spent)} spent · {money(r.remaining)} remaining
            </p>
            <textarea
              value={month.accountNotes?.[r.account] || ''}
              onChange={(e) => setNote(r.account, e.target.value)}
              placeholder="Notes…"
              rows={1}
              className="mt-1 w-full resize-y rounded border border-slate-200 bg-transparent px-1.5 py-1 text-[11px] text-slate-600 outline-none focus:border-slate-400 dark:border-slate-700 dark:text-slate-300"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
