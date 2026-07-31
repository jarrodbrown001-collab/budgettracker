import { useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { newId } from '../lib/storage'
import { groupTotals, money, remaining } from '../lib/budget'
import MoneyInput from './MoneyInput'
import ConfirmDialog from './ConfirmDialog'

const isDebtGroup = (name) => name.trim().toLowerCase() === 'debt'

export default function GroupCard({ group }) {
  const { updateMonth } = useBudget()
  const totals = groupTotals(group)
  const [pendingRemove, setPendingRemove] = useState(null) // { type: 'item'|'group', id, label }
  const debt = isDebtGroup(group.name)

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
    patchGroup({
      items: [
        ...group.items,
        { id: newId(), name: '', due: '', planned: 0, spent: 0, balance: 0, apr: 0 },
      ],
    })
  }

  const sortByBalance = () => {
    patchGroup({ items: [...group.items].sort((a, b) => (a.balance || 0) - (b.balance || 0)) })
  }

  const confirmRemoveItem = (item) => setPendingRemove({ type: 'item', id: item.id, label: item.name || 'this item' })
  const confirmRemoveGroup = () =>
    setPendingRemove({
      type: 'group',
      id: group.id,
      label: `${group.name || 'this category'}${group.items.length ? ` and its ${group.items.length} item(s)` : ''}`,
    })

  const runPendingRemove = () => {
    if (pendingRemove.type === 'item') {
      patchGroup({ items: group.items.filter((it) => it.id !== pendingRemove.id) })
    } else {
      updateMonth((m) => ({ ...m, groups: m.groups.filter((g) => g.id !== group.id) }))
    }
    setPendingRemove(null)
  }

  const colTemplate = debt
    ? 'grid-cols-[minmax(140px,1fr)_5.5rem_5rem_4rem_5rem_5rem_5rem_3rem_1.5rem]'
    : 'grid-cols-[minmax(140px,1fr)_5.5rem_5rem_5rem_5rem_3rem_1.5rem]'

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-4 py-2 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={group.name}
            onChange={(e) => patchGroup({ name: e.target.value })}
            className="min-w-0 rounded border border-transparent bg-transparent text-sm font-bold uppercase tracking-wide outline-none hover:border-slate-300 focus:border-slate-400 dark:hover:border-slate-600"
          />
          <input
            value={group.account}
            placeholder="Account (e.g. USAA – 3399)"
            onChange={(e) => patchGroup({ account: e.target.value })}
            className="w-48 rounded border border-transparent bg-transparent text-xs font-normal text-slate-500 outline-none hover:border-slate-300 focus:border-slate-400 dark:text-slate-400 dark:hover:border-slate-600"
          />
        </div>
        <div className="flex items-center gap-3">
          {debt && group.items.length > 1 && (
            <button type="button" onClick={sortByBalance} className="text-xs text-emerald-700 hover:underline dark:text-emerald-400">
              Sort by balance (smallest first)
            </button>
          )}
          <button type="button" onClick={confirmRemoveGroup} className="text-xs text-slate-400 hover:text-red-500">
            Remove category
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={`grid ${colTemplate} gap-2 border-b border-slate-100 px-4 py-1 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400`}>
          <span>Item</span>
          <span>Due</span>
          {debt && (
            <>
              <span className="text-right">Balance</span>
              <span className="text-right">APR</span>
            </>
          )}
          <span className="text-right">Planned</span>
          <span className="text-right">Spent</span>
          <span className="text-right">Remaining</span>
          <span />
          <span />
        </div>

        {group.items.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No items yet.</p>}

        {group.items.map((item) => (
          <div
            key={item.id}
            className={`grid ${colTemplate} items-center gap-2 border-b border-slate-100 px-4 py-1.5 last:border-b-0 dark:border-slate-800`}
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
              className="w-20 min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-slate-500 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:hover:border-slate-700"
            />
            {debt && (
              <>
                <MoneyInput value={item.balance} onChange={(v) => patchItem(item.id, { balance: v })} />
                <input
                  type="number"
                  step="0.01"
                  value={item.apr || item.apr === 0 ? item.apr : ''}
                  onChange={(e) => patchItem(item.id, { apr: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
                  aria-label={`${item.name || 'debt'} APR percent`}
                />
              </>
            )}
            <MoneyInput value={item.planned} onChange={(v) => patchItem(item.id, { planned: v })} />
            <MoneyInput value={item.spent} onChange={(v) => patchItem(item.id, { spent: v })} />
            <span className={`text-right text-sm ${remaining(item) < 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
              {money(remaining(item))}
            </span>
            <button
              type="button"
              onClick={() => patchItem(item.id, { spent: item.planned })}
              disabled={item.spent === item.planned}
              title="Mark as paid (set spent = planned)"
              className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 dark:border-slate-700"
            >
              Paid
            </button>
            <button
              type="button"
              aria-label={`Remove ${item.name || 'item'}`}
              onClick={() => confirmRemoveItem(item)}
              className="text-slate-300 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <button type="button" onClick={addItem} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          + Add item
        </button>
        <div className="text-sm font-semibold">
          Subtotal: {money(totals.planned)} planned · {money(totals.remaining)} remaining
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRemove}
        title={pendingRemove?.type === 'group' ? 'Remove category?' : 'Remove item?'}
        message={
          pendingRemove?.type === 'group'
            ? `This permanently removes "${pendingRemove.label}" from ${group.name || 'this month'}. This can't be undone.`
            : `This permanently removes "${pendingRemove?.label}". This can't be undone.`
        }
        onConfirm={runPendingRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </section>
  )
}
