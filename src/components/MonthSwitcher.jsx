import { useBudget } from '../lib/BudgetContext'
import { newId } from '../lib/storage'

function shiftMonthKey(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function labelFor(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function cloneForward(source) {
  const groups = source.groups.map((g) => ({
    id: newId(),
    name: g.name,
    account: g.account,
    items: g.items.map((it) => ({
      id: newId(),
      name: it.name,
      due: it.due,
      planned: it.planned,
      spent: 0,
      balance: it.balance ?? 0,
      apr: it.apr ?? 0,
    })),
  }))
  const income = source.income.map((s) => ({ id: newId(), name: s.name, planned: s.planned }))
  return { income, groups }
}

export default function MonthSwitcher() {
  const { doc, setDoc } = useBudget()
  const monthKeys = Object.keys(doc.months).sort()

  const goTo = (key) => {
    setDoc((prev) => {
      if (prev.months[key]) return { ...prev, activeMonth: key }

      // Only fabricate data when moving to a new month *after* the latest one on record
      // (copy-forward planned amounts, spent reset to 0). Jumping to an earlier,
      // never-recorded month starts blank instead of cloning unrelated data into it.
      const keys = Object.keys(prev.months).sort()
      const latest = keys[keys.length - 1]
      const isForward = key > latest
      const month = isForward ? { label: labelFor(key), ...cloneForward(prev.months[latest]) } : { label: labelFor(key), income: [], groups: [] }

      return {
        ...prev,
        activeMonth: key,
        months: { ...prev.months, [key]: month },
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous month"
        className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        onClick={() => goTo(shiftMonthKey(doc.activeMonth, -1))}
      >
        ←
      </button>
      <select
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        value={doc.activeMonth}
        onChange={(e) => goTo(e.target.value)}
      >
        {monthKeys.map((k) => (
          <option key={k} value={k}>
            {doc.months[k].label}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Next month"
        className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        onClick={() => goTo(shiftMonthKey(doc.activeMonth, 1))}
      >
        →
      </button>
    </div>
  )
}
