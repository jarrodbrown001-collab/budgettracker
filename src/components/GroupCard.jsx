import { useBudget } from '../lib/BudgetContext'
import { newId } from '../lib/storage'
import { groupTotals, money, remaining } from '../lib/budget'
import MoneyInput from './MoneyInput'

export default function GroupCard({ group }) {
  const { updateMonth } = useBudget()
  const totals = groupTotals(group)

  const patchGroup = (patch) => {
    updateMonth((m) => ({
      ...m,
      groups: m.groups.map((g) => (g.id === group.id ? { ...g, ...patch } : g)),
    }))
  }

  const patchItem = (itemId, patch) => {
    patchGroup({ items: group.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) })
  }

  const addItem = () => {
    patchGroup({ items: [...group.items, { id: newId(), name: '', due: '', planned: 0, spent: 0 }] })
  }

  const removeItem = (itemId) => {
    patchGroup({ items: group.items.filter((it) => it.id !== itemId) })
  }

  const removeGroup = () => {
    updateMonth((m) => ({ ...m, groups: m.groups.filter((g) => g.id !== group.id) }))
  }

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between bg-slate-100 px-4 py-2 dark:bg-slate-800">
        <div>
          <input
            value={group.name}
            onChange={(e) => patchGroup({ name: e.target.value })}
            className="bg-transparent text-sm font-bold uppercase tracking-wide outline-none"
          />
          {group.account && (
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              ({group.account})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={removeGroup}
          className="text-xs text-slate-400 hover:text-red-500"
        >
          Remove category
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_5rem_5rem_5rem_auto] gap-2 border-b border-slate-100 px-4 py-1 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>Item</span>
        <span>Due</span>
        <span className="text-right">Planned</span>
        <span className="text-right">Spent</span>
        <span className="text-right">Remaining</span>
        <span />
      </div>

      {group.items.length === 0 && (
        <p className="px-4 py-3 text-sm text-slate-400">No items yet.</p>
      )}

      {group.items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[1fr_auto_5rem_5rem_5rem_auto] items-center gap-2 border-b border-slate-100 px-4 py-1.5 last:border-b-0 dark:border-slate-800"
        >
          <input
            value={item.name}
            placeholder="Item name"
            onChange={(e) => patchItem(item.id, { name: e.target.value })}
            className="min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:hover:border-slate-700"
          />
          <input
            value={item.due}
            placeholder="—"
            onChange={(e) => patchItem(item.id, { due: e.target.value })}
            className="w-24 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-slate-500 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:hover:border-slate-700"
          />
          <MoneyInput value={item.planned} onChange={(v) => patchItem(item.id, { planned: v })} />
          <MoneyInput value={item.spent} onChange={(v) => patchItem(item.id, { spent: v })} />
          <span
            className={`text-right text-sm ${remaining(item) < 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {money(remaining(item))}
          </span>
          <button
            type="button"
            aria-label={`Remove ${item.name || 'item'}`}
            onClick={() => removeItem(item.id)}
            className="text-slate-300 hover:text-red-500"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={addItem}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          + Add item
        </button>
        <div className="text-sm font-semibold">
          Subtotal: {money(totals.planned)} planned · {money(totals.remaining)} remaining
        </div>
      </div>
    </section>
  )
}
