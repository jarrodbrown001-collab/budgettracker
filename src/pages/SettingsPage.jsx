import { useRef, useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { exportJSON, importJSON } from '../lib/storage'

export default function SettingsPage() {
  const { doc, setDoc } = useBudget()
  const fileRef = useRef(null)
  const [status, setStatus] = useState('')

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
          About
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          BudgetTracker — a zero-based monthly budget, ported from the Brown family's EveryDollar
          spreadsheet. Use the month switcher at the top to move between months; a new month
          copies your categories and planned amounts forward with spent reset to $0.
        </p>
      </section>
    </div>
  )
}
