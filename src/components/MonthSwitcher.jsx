import { useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { blankMonth, cloneMonthForward } from '../lib/monthCopy'

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
  const [pendingKey, setPendingKey] = useState(null) // new month key awaiting copy/blank choice

  const goTo = (key) => {
    if (doc.months[key]) {
      setDoc((prev) => ({ ...prev, activeMonth: key }))
      return
    }
    setPendingKey(key)
  }

  const createMonth = (mode) => {
    const key = pendingKey
    setDoc((prev) => {
      const keys = Object.keys(prev.months).sort()
      const latest = keys[keys.length - 1]
      const month =
        mode === 'copy' ? cloneMonthForward(prev.months[latest], labelFor(key)) : blankMonth(labelFor(key))
      return { ...prev, activeMonth: key, months: { ...prev.months, [key]: month } }
    })
    setPendingKey(null)
  }

  const latestKey = monthKeys[monthKeys.length - 1]

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

      {pendingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPendingKey(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">{labelFor(pendingKey)} has no data yet</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Start it blank, or copy {doc.months[latestKey]?.label}'s categories and planned amounts forward (spent and
              paid status reset to $0 / unpaid).
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingKey(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMonth('blank')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Start blank
              </button>
              <button
                type="button"
                onClick={() => createMonth('copy')}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Copy {doc.months[latestKey]?.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
