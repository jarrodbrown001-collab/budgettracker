import { useState } from 'react'
import { money, remaining } from '../lib/budget'

// Quick-reference table of every item's planned/spent/remaining, so you can
// see what's left in a category before deciding where to allocate a
// transaction — collapsible and filterable since a full budget can run to
// 70+ items.
export default function BudgetReference({ month }) {
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const rows = month.groups.flatMap((g) =>
    g.items
      .filter((it) => !q || `${g.name} ${it.name}`.toLowerCase().includes(q))
      .map((it) => ({ groupName: g.name, item: it })),
  )

  return (
    <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Budget Reference — {month.label}
        </h2>
        <span className="text-xs text-slate-400">{open ? 'Hide ▲' : 'Show ▼'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by category or item…"
            className="mb-3 w-full max-w-xs rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="max-h-[36rem] overflow-y-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-2">Category</th>
                  <th className="py-1 pr-2">Item</th>
                  <th className="py-1 pr-2 text-right">Planned</th>
                  <th className="py-1 pr-2 text-right">Spent</th>
                  <th className="py-1 pr-2 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ groupName, item }) => {
                  const rem = remaining(item)
                  return (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-2 text-slate-500 dark:text-slate-400">{groupName}</td>
                      <td className="py-1 pr-2">{item.name || 'Unnamed item'}</td>
                      <td className="py-1 pr-2 text-right">{money(item.planned)}</td>
                      <td className="py-1 pr-2 text-right">{money(item.spent)}</td>
                      <td
                        className={`py-1 pr-2 text-right font-medium ${
                          rem < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {money(rem)}
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-400">
                      No items match "{query}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
