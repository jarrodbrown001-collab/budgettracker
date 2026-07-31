import { useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { newId } from '../lib/storage'
import { groupTotals, money, remaining, isDebtGroup } from '../lib/budget'
import MoneyInput from './MoneyInput'
import ConfirmDialog from './ConfirmDialog'

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
        { id: newId(), name: '', due: '', planned: 0, spent: 0, paid: false, balance: 0, apr: 0 },
      ],
    })
  }

  const togglePaid = (it, paid) => {
    patchItem(it.id, { paid, spent: paid ? it.planned : 0 })
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
    ? 'grid-cols-[minmax(140px,1fr)_4rem_5rem_4rem_5rem_5rem_5rem_3rem_1.5rem]'
    : 'grid-cols-[minmax(140px,1fr)_4rem_5rem_5rem_5rem_3rem_1.5rem]'

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2 bg-slate-100 px-4 py-2 dark:bg-slate-800">
        <div className="flex flex-wrap items-baseline gap-1">
          <input
            value={group.name}
            onChange={(e) => patchGroup({ name: e.target.value })}
            className="min-w-0 rounded border border-transparent bg-transparent text-sm font-bold uppercase tracking-wide outline-none hover:border-slate-300 focus:border-slate-400 dark:hover:border-slate-600"
          />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(</span>
          <input
            value={group.account}
            placeholder="Account, e.g. USAA – 3399"
            onChange={(e) => patchGroup({ account: e.target.value })}
            className="w-40 rounded border border-transparent bg-transparent text-xs font-normal text-slate-500 outline-none hover:border-slate-300 focus:border-slate-400 dark:text-slate-400 dark:hover:border-slate-600"
          />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">)</span>
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
          <span>Day</span>
          {debt && (
            <>
              <span className="text-right">Balance</span>
              <span className="text-right">APR</span>
            </>
          )}
          <span className="text-right">Planned</span>
          <span className="text-right">Spent</span>
          <span className="text-right">Remaining</span>
          <span className="text-center">Paid</span>
          <span />
        </div>

        {group.items.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No items yet.</p>}

        {group.items.map((it) => (
          <div
            key={it.id}
            className={`grid ${colTemplate} items-center gap-2 border-b border-slate-100 px-4 py-1.5 last:border-b-0 dark:border-slate-800`}
          >
            <input
              value={it.name}
              placeholder="Item name"
              onChange={(e) => patchItem(it.id, { name: e.target.value })}
              className="min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:hover:border-slate-700"
            />
            <input
              type="number"
              min="1"
              max="31"
              step="1"
              value={it.due === '' || it.due == null ? '' : it.due}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value
                if (v === '') return patchItem(it.id, { due: '' })
                const n = Math.max(1, Math.min(31, Math.round(Number(v))))
                patchItem(it.id, { due: n })
              }}
              className="w-14 min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-slate-500 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:hover:border-slate-700"
              aria-label={`${it.name || 'item'} due day of month`}
            />
            {debt && (
              <>
                <MoneyInput value={it.balance} onChange={(v) => patchItem(it.id, { balance: v })} />
                <input
                  type="number"
                  step="0.01"
                  value={it.apr || it.apr === 0 ? it.apr : ''}
                  onChange={(e) => patchItem(it.id, { apr: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-16 min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-right text-sm hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:hover:border-slate-700"
                  aria-label={`${it.name || 'debt'} APR percent`}
                />
              </>
            )}
            <MoneyInput value={it.planned} onChange={(v) => patchItem(it.id, { planned: v })} />
            <MoneyInput value={it.spent} onChange={(v) => patchItem(it.id, { spent: v })} />
            <span className={`text-right text-sm ${remaining(it) < 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
              {money(remaining(it))}
            </span>
            <span className="flex justify-center">
              <input
                type="checkbox"
                checked={!!it.paid}
                onChange={(e) => togglePaid(it, e.target.checked)}
                aria-label={`Mark ${it.name || 'item'} as paid`}
                className="h-4 w-4 accent-emerald-600"
              />
            </span>
            <button
              type="button"
              aria-label={`Remove ${it.name || 'item'}`}
              onClick={() => confirmRemoveItem(it)}
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
