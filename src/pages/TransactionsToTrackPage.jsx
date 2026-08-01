import { useRef, useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { newId, readPendingTransactionsFile } from '../lib/storage'
import { money } from '../lib/budget'
import ConfirmDialog from '../components/ConfirmDialog'

function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7)
}
function labelFor(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// If the transaction's month doesn't exist yet, create it by copying the
// most recent existing month's category structure (planned amounts carried
// over, spent/paid reset) — same behavior as the month switcher's "copy" option.
function ensureMonth(doc, key) {
  if (doc.months[key]) return doc
  const keys = Object.keys(doc.months).sort()
  const latest = doc.months[keys[keys.length - 1]]
  const groups = latest.groups.map((g) => ({
    id: newId(),
    name: g.name,
    account: g.account,
    items: g.items.map((it) => ({
      id: newId(),
      name: it.name,
      due: it.due,
      planned: it.planned,
      spent: 0,
      paid: false,
      balance: it.balance ?? 0,
      apr: it.apr ?? 0,
    })),
  }))
  const income = latest.income.map((s) => ({ id: newId(), name: s.name, planned: s.planned }))
  return {
    ...doc,
    months: { ...doc.months, [key]: { label: labelFor(key), income, groups, transactions: [], accountNotes: {} } },
  }
}

export default function TransactionsToTrackPage() {
  const { doc, setDoc } = useBudget()
  const fileRef = useRef(null)
  const [status, setStatus] = useState('')
  const [selections, setSelections] = useState({}) // { [pendingId]: { groupName, itemName } }
  const [pendingDiscard, setPendingDiscard] = useState(null)

  const pending = [...(doc.pendingTransactions || [])].sort((a, b) => (a.date < b.date ? 1 : -1))
  const monthKeys = Object.keys(doc.months).sort()
  const latestMonth = doc.months[monthKeys[monthKeys.length - 1]]

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const items = await readPendingTransactionsFile(file)
      setDoc((prev) => {
        const existingIds = new Set((prev.pendingTransactions || []).map((p) => p.id))
        const fresh = items.filter((it) => !existingIds.has(it.id))
        return { ...prev, pendingTransactions: [...(prev.pendingTransactions || []), ...fresh] }
      })
      setStatus(`Imported ${items.length} transaction(s) to review.`)
    } catch (err) {
      setStatus(`Import failed: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  const setSelection = (id, patch) => {
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const groupsForDate = (dateStr) => {
    const key = monthKeyOf(dateStr)
    return (doc.months[key] || latestMonth)?.groups || []
  }

  const assign = (tx) => {
    const sel = selections[tx.id]
    if (!sel?.groupName || !sel?.itemName) return
    setDoc((prev) => {
      const key = monthKeyOf(tx.date)
      const next = ensureMonth(prev, key)
      const month = next.months[key]
      const group = month.groups.find((g) => g.name === sel.groupName)
      const item = group?.items.find((it) => it.name === sel.itemName)
      if (!group || !item) return prev
      const loggedAt = new Date(`${tx.date}T${tx.time || '12:00'}:00`).toISOString()
      const record = {
        id: newId(),
        type: tx.type,
        amount: tx.amount,
        groupId: group.id,
        itemId: item.id,
        note: tx.merchant || tx.note || '',
        loggedAt,
      }
      const updatedMonth = {
        ...month,
        transactions: [...(month.transactions || []), record],
        groups: month.groups.map((g) =>
          g.id !== group.id
            ? g
            : { ...g, items: g.items.map((it) => (it.id !== item.id ? it : { ...it, spent: (Number(it.spent) || 0) + tx.amount })) },
        ),
      }
      return {
        ...next,
        activeMonth: prev.activeMonth,
        months: { ...next.months, [key]: updatedMonth },
        pendingTransactions: (prev.pendingTransactions || []).filter((p) => p.id !== tx.id),
      }
    })
    setSelections((prev) => {
      const { [tx.id]: _, ...rest } = prev
      return rest
    })
  }

  const runDiscard = () => {
    setDoc((prev) => ({
      ...prev,
      pendingTransactions: (prev.pendingTransactions || []).filter((p) => p.id !== pendingDiscard.id),
    }))
    setPendingDiscard(null)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Transactions to Track
        </h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Import a batch of transactions parsed from your USAA email alerts, then assign each one
          to a category and item below. Once assigned, it's logged in that month's Transactions
          ledger and added to the item's spent total.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Import transactions (.json)
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
          {status && <span className="text-sm text-slate-500">{status}</span>}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold dark:border-slate-800">
          {pending.length} pending
        </div>
        {pending.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Nothing to review right now.</p>}
        {pending.map((tx) => {
          const groups = groupsForDate(tx.date)
          const sel = selections[tx.id] || {}
          const group = groups.find((g) => g.name === sel.groupName)
          const willCreateMonth = !doc.months[monthKeyOf(tx.date)]
          return (
            <div key={tx.id} className="border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span
                    className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                      tx.type === 'deposit'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {tx.type}
                  </span>
                  <span className="font-semibold">{money(tx.amount)}</span>
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                    {tx.date} {tx.time || ''} — {tx.merchant || tx.note || 'No description'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDiscard(tx)}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  Discard
                </button>
              </div>
              {willCreateMonth && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {labelFor(monthKeyOf(tx.date))} doesn't exist yet — assigning will create it by
                  copying {latestMonth?.label}'s categories.
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
                  Category
                  <select
                    value={sel.groupName || ''}
                    onChange={(e) => setSelection(tx.id, { groupName: e.target.value, itemName: '' })}
                    className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="">Select category…</option>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
                  Item
                  <select
                    disabled={!group}
                    value={sel.itemName || ''}
                    onChange={(e) => setSelection(tx.id, { itemName: e.target.value })}
                    className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="">Select item…</option>
                    {group?.items.map((it) => (
                      <option key={it.name} value={it.name}>
                        {it.name || 'Unnamed item'}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!sel.groupName || !sel.itemName}
                  onClick={() => assign(tx)}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  Assign
                </button>
              </div>
            </div>
          )
        })}
      </section>

      <ConfirmDialog
        open={!!pendingDiscard}
        title="Discard transaction?"
        message={`This removes the ${pendingDiscard ? money(pendingDiscard.amount) : ''} ${pendingDiscard?.type} from your review list without logging it anywhere. This can't be undone.`}
        confirmLabel="Discard"
        onConfirm={runDiscard}
        onCancel={() => setPendingDiscard(null)}
      />
    </div>
  )
}
