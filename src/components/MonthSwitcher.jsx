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

export default function MonthSwitcher() {
  const { doc, setDoc } = useBudget()
  const monthKeys = Object.keys(doc.months).sort()

  const goTo = (key) => {
    setDoc((prev) => {
      if (prev.months[key]) return { ...prev, activeMonth: key }
      const source = prev.months[prev.activeMonth]
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
        })),
      }))
      const income = source.income.map((s) => ({ id: newId(), name: s.name, planned: s.planned }))
      return {
        ...prev,
        activeMonth: key,
        months: { ...prev.months, [key]: { label: labelFor(key), income, groups } },
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
