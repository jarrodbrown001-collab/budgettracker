import { newId } from '../lib/storage'
import { money } from '../lib/budget'
import MoneyInput from './MoneyInput'

// One row per category/item allocation. Used both for the manual "Log a
// Transaction" form and for assigning an imported pending transaction —
// both need "split this amount across N categories" with the same
// search-by-item-first, auto-fill-category interaction as a single
// (unsplit) entry.
export function emptySplit(amount = 0) {
  return { key: newId(), itemQuery: '', groupName: '', itemName: '', amount }
}

export default function SplitAllocator({ groups, total, splits, onChange }) {
  const allocated = splits.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const remaining = Math.round((total - allocated) * 100) / 100
  const balanced = Math.abs(remaining) < 0.005

  const itemOptions = groups.flatMap((g) =>
    g.items.map((it, idx) => ({
      key: `${g.id || g.name}:::${it.id || it.name}:::${idx}`,
      label: `${g.name} › ${it.name || 'Unnamed item'}`,
      groupName: g.name,
      itemName: it.name,
    })),
  )

  const updateRow = (idx, patch) => {
    onChange(splits.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const onItemPick = (idx, value) => {
    const match = itemOptions.find((o) => o.label === value)
    if (match) {
      updateRow(idx, { itemQuery: value, groupName: match.groupName, itemName: match.itemName })
    } else {
      updateRow(idx, { itemQuery: value, itemName: '' })
    }
  }

  const addRow = () => {
    onChange([...splits, emptySplit(remaining > 0 ? remaining : 0)])
  }

  const removeRow = (idx) => {
    if (splits.length <= 1) return
    onChange(splits.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {splits.map((row, idx) => (
        <div key={row.key} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 min-w-[10rem] flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            {idx === 0 ? 'Item' : `Split ${idx + 1} item`}
            <input
              list={`split-items-${row.key}`}
              value={row.itemQuery}
              onChange={(e) => onItemPick(idx, e.target.value)}
              placeholder="Search any item…"
              autoComplete="off"
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <datalist id={`split-items-${row.key}`}>
              {itemOptions.map((o) => (
                <option key={o.key} value={o.label} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Amount
            <MoneyInput
              value={row.amount}
              onChange={(v) => updateRow(idx, { amount: v })}
              className="mt-1 w-28 rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          {splits.length > 1 && (
            <button
              type="button"
              aria-label={`Remove split ${idx + 1}`}
              onClick={() => removeRow(idx)}
              className="mb-1.5 text-slate-300 hover:text-red-500"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={addRow} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
          + Split into another category
        </button>
        <span className={`text-xs font-medium ${balanced ? 'text-emerald-600' : 'text-amber-600 dark:text-amber-400'}`}>
          Allocated {money(allocated)} of {money(total)}
          {!balanced && ` — ${money(Math.abs(remaining))} ${remaining > 0 ? 'left to assign' : 'over'}`}
        </span>
      </div>
    </div>
  )
}
