import { useRef, useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { exportJSON, importJSON } from '../lib/storage'
import ConfirmDialog from '../components/ConfirmDialog'

export default function SettingsPage() {
  const { doc, setDoc } = useBudget()
  const fileRef = useRef(null)
  const [status, setStatus] = useState('')
  const [pendingDeleteMonth, setPendingDeleteMonth] = useState(null) // month key

  const monthKeys = Object.keys(doc.months).sort()

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const next = await importJSON(file)
      setDoc(next)
      setStatus('Backup restored successfully.')
    } catch (err) {
      setStatus(`Import failed: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  const runDeleteMonth = () => {
    setDoc((prev) => {
      const remainingKeys = Object.keys(prev.months).filter((k) => k !== pendingDeleteMonth)
      const remainingMonths = Object.fromEntries(remainingKeys.map((k) => [k, prev.months[k]]))
      const activeMonth =
        prev.activeMonth === pendingDeleteMonth ? remainingKeys.sort()[remainingKeys.length - 1] : prev.activeMonth
      return { ...prev, months: remainingMonths, activeMonth }
    })
    setPendingDeleteMonth(null)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Backup &amp; Restore
        </h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Your data is stored only in this browser. Export a backup regularly, especially before
          switching devices or browsers — this JSON file is also a good way to sync via OneDrive
          manually until cloud sync is added.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportJSON(doc)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Export backup (.json)
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Import backup (.json)
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
        </div>
        {status && <p className="mt-2 text-sm text-slate-500">{status}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Months
        </h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Delete a month you created by mistake (e.g. accidentally populated a future month too
          early). This removes all of that month's budget, transactions, and account notes — it
          doesn't touch any other month.
        </p>
        <ul className="space-y-1">
          {monthKeys.map((k) => (
            <li
              key={k}
              className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-1.5 text-sm dark:border-slate-800"
            >
              <span>
                {doc.months[k].label} <span className="text-xs text-slate-400">({k})</span>
              </span>
              <button
                type="button"
                disabled={monthKeys.length <= 1}
                onClick={() => setPendingDeleteMonth(k)}
                className="text-xs text-slate-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          About
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          BudgetTracker — a zero-based monthly budget, ported from the Brown family's EveryDollar
          spreadsheet. Use the month switcher at the top to move between months; a new month
          copies your categories and planned amounts forward with spent reset to $0.
        </p>
      </section>

      <ConfirmDialog
        open={!!pendingDeleteMonth}
        title="Delete month?"
        message={
          pendingDeleteMonth
            ? `This permanently removes "${doc.months[pendingDeleteMonth]?.label}" and everything in it — budget, transactions, account notes. This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={runDeleteMonth}
        onCancel={() => setPendingDeleteMonth(null)}
      />
    </div>
  )
}
