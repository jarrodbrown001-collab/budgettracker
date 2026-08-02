import { useBudget } from '../lib/BudgetContext'
import { money, remaining } from '../lib/budget'
import { applyPaidToggle } from '../lib/paidTransaction'
import MoneyInput from './MoneyInput'
import SpendProgress from './SpendProgress'

export default function FavoritesSection() {
  const { month, updateMonth } = useBudget()

  const favorites = month.groups.flatMap((g) => g.items.filter((it) => it.favorite).map((it) => ({ group: g, item: it })))

  if (favorites.length === 0) return null

  const patchItem = (groupId, itemId, patch) => {
    updateMonth((m) => ({
      ...m,
      groups: m.groups.map((g) =>
        g.id !== groupId ? g : { ...g, items: g.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) },
      ),
    }))
  }

  const togglePaid = (groupId, it, paid) => {
    updateMonth((m) => applyPaidToggle(m, groupId, it.id, paid))
  }

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-amber-300 bg-white dark:border-amber-800 dark:bg-slate-900">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        ★ Favorites
      </div>
      {favorites.map(({ group, item }) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2 last:border-b-0 dark:border-slate-800"
        >
          <button
            type="button"
            onClick={() => patchItem(group.id, item.id, { favorite: false })}
            aria-label={`Unfavorite ${item.name || 'item'}`}
            className="text-amber-500"
          >
            ★
          </button>
          <div className="min-w-[10rem] flex-1">
            <p className="text-sm font-medium">{item.name || 'Unnamed item'}</p>
            <p className="text-xs text-slate-400">{group.name}</p>
            <SpendProgress planned={item.planned} spent={item.spent} />
          </div>
          <label className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
            Planned
            <MoneyInput
              value={item.planned}
              onChange={(v) => patchItem(group.id, item.id, { planned: v })}
              className="mt-0.5 w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
            Spent
            <MoneyInput
              value={item.spent}
              onChange={(v) => patchItem(group.id, item.id, { spent: v })}
              className="mt-0.5 w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
            Remaining
            <span
              className={`mt-1.5 text-sm font-medium ${remaining(item) < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}
            >
              {money(remaining(item))}
            </span>
          </div>
          <label className="flex flex-col items-center text-xs text-slate-500 dark:text-slate-400">
            Paid
            <input
              type="checkbox"
              checked={!!item.paid}
              onChange={(e) => togglePaid(group.id, item, e.target.checked)}
              aria-label={`Mark ${item.name || 'item'} as paid`}
              className="mt-1.5 h-4 w-4 accent-emerald-600"
            />
          </label>
        </div>
      ))}
    </section>
  )
}
