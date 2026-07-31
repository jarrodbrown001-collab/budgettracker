import { useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { newId } from '../lib/storage'
import { money } from '../lib/budget'
import MoneyInput from './MoneyInput'
import ConfirmDialog from './ConfirmDialog'

export default function IncomeSection() {
  const { month, updateMonth } = useBudget()
  const total = month.income.reduce((s, i) => s + (Number(i.planned) || 0), 0)
  const [pendingRemove, setPendingRemove] = useState(null)

  const patch = (id, p) => {
    updateMonth((m) => ({ ...m, income: m.income.map((i) => (i.id === id ? { ...i, ...p } : i)) }))
  }
  const add = () => {
    updateMonth((m) => ({ ...m, income: [...m.income, { id: newId(), name: '', planned: 0 }] }))
  }
  const runRemove = () => {
    updateMonth((m) => ({ ...m, income: m.income.filter((i) => i.id !== pendingRemove.id) }))
    setPendingRemove(null)
  }

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-emerald-200 bg-white dark:border-emerald-900 dark:bg-slate-900">
      <div className="bg-emerald-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        Income
      </div>
      {month.income.map((i) => (
        <div
          key={i.id}
          className="flex items-center gap-2 border-b border-slate-100 px-4 py-1.5 last:border-b-0 dark:border-slate-800"
        >
          <input
            value={i.name}
            placeholder="Source"
            onChange={(e) => patch(i.id, { name: e.target.value })}
            className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:hover:border-slate-700"
          />
          <MoneyInput value={i.planned} onChange={(v) => patch(i.id, { planned: v })} />
          <button
            type="button"
            aria-label={`Remove ${i.name || 'income source'}`}
            onClick={() => setPendingRemove({ id: i.id, label: i.name || 'this income source' })}
            className="text-slate-300 hover:text-red-500"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between px-4 py-2">
        <button type="button" onClick={add} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          + Add income source
        </button>
        <div className="text-sm font-semibold">Total Planned Income: {money(total)}</div>
      </div>

      <ConfirmDialog
        open={!!pendingRemove}
        title="Remove income source?"
        message={`This permanently removes "${pendingRemove?.label}". This can't be undone.`}
        onConfirm={runRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </section>
  )
}
