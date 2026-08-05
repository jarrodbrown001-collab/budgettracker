import { useRef, useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { newId, readPendingTransactionsFile } from '../lib/storage'
import { money } from '../lib/budget'
import { cloneMonthForward } from '../lib/monthCopy'
import { findExistingMatch } from '../lib/transactionDedupe'
import { parseUsaaCsv } from '../lib/csvImport'
import ConfirmDialog from '../components/ConfirmDialog'
import MoneyInput from '../components/MoneyInput'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nowStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function bucketLabel(month, tx) {
  const group = month.groups.find((g) => g.id === tx.groupId)
  if (!group) return '(deleted category)'
  const item = group.items.find((it) => it.id === tx.itemId)
  return `${group.name}${item ? ` › ${item.name || 'Unnamed item'}` : ''}`
}

function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7)
}
function labelFor(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// If the transaction's month doesn't exist yet, create it by copying the
// most recent existing month's category structure (planned amounts carried
// over, spent/paid reset, rollover balances carried) — same behavior as the
// month switcher's "copy" option.
function ensureMonth(doc, key) {
  if (doc.months[key]) return doc
  const keys = Object.keys(doc.months).sort()
  const latest = doc.months[keys[keys.length - 1]]
  return {
    ...doc,
    months: { ...doc.months, [key]: cloneMonthForward(latest, labelFor(key)) },
  }
}

function PendingReview({ doc, setDoc }) {
  const fileRef = useRef(null)
  const csvFileRef = useRef(null)
  const [status, setStatus] = useState('')
  const [selections, setSelections] = useState({}) // { [pendingId]: { groupName, itemName } }
  const [pendingDiscard, setPendingDiscard] = useState(null)

  const pending = [...(doc.pendingTransactions || [])].sort((a, b) => (a.date < b.date ? 1 : -1))
  const monthKeys = Object.keys(doc.months).sort()
  const latestMonth = doc.months[monthKeys[monthKeys.length - 1]]

  // A transaction already on file — either still awaiting review or already
  // assigned into a month's ledger — is skipped instead of re-added, even if
  // this import batch generated a different id for it.
  const isDuplicate = (candidate, existingPending) => {
    if (existingPending.some((p) => p.id === candidate.id)) return true
    if (
      existingPending.some(
        (p) =>
          Math.abs((Number(p.amount) || 0) - (Number(candidate.amount) || 0)) < 0.005 &&
          p.date === candidate.date &&
          (() => {
            const a = (p.merchant || p.note || '').trim().toLowerCase()
            const b = (candidate.merchant || candidate.note || '').trim().toLowerCase()
            return !a || !b || a === b
          })(),
      )
    )
      return true
    return !!findExistingMatch(doc, candidate)
  }

  const mergeFreshItems = (items, extraNote = '') => {
    const existingPending = doc.pendingTransactions || []
    const fresh = []
    let dupCount = 0
    for (const it of items) {
      if (isDuplicate(it, existingPending)) {
        dupCount++
      } else {
        fresh.push(it)
      }
    }
    setDoc((prev) => ({ ...prev, pendingTransactions: [...(prev.pendingTransactions || []), ...fresh] }))
    setStatus(
      `Imported ${fresh.length} new transaction(s) to review${dupCount ? ` — skipped ${dupCount} already on file.` : '.'}${extraNote}`,
    )
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const items = await readPendingTransactionsFile(file)
      mergeFreshItems(items)
    } catch (err) {
      setStatus(`Import failed: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  const onImportCsv = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const { items, skippedPending, skippedInvalid } = parseUsaaCsv(text)
      const notes = []
      if (skippedPending) notes.push(`${skippedPending} still pending (re-export once posted)`)
      if (skippedInvalid) notes.push(`${skippedInvalid} row(s) couldn't be read`)
      mergeFreshItems(items, notes.length ? ` (${notes.join(', ')})` : '')
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

  // Same pattern as the manual "Log a Transaction" form: item is searchable
  // across every category without picking a category first, and picking one
  // auto-fills the category.
  const onItemQueryChange = (tx, groups, value) => {
    const match = groups
      .flatMap((g) => g.items.map((it) => ({ label: `${g.name} › ${it.name || 'Unnamed item'}`, groupName: g.name, itemName: it.name })))
      .find((o) => o.label === value)
    if (match) {
      setSelection(tx.id, { itemQuery: value, groupName: match.groupName, itemName: match.itemName })
    } else {
      setSelection(tx.id, { itemQuery: value, itemName: '' })
    }
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
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Import Transactions
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Import your weekly USAA CSV export (Settings → Download Transactions on usaa.com),
              then assign each one to a category and item below. Pending transactions are skipped
              automatically — re-export once they post.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => csvFileRef.current?.click()}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Import USAA CSV
            </button>
            <input ref={csvFileRef} type="file" accept=".csv,text/csv" hidden onChange={onImportCsv} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Import (.json)
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
          </div>
        </div>
        {status && <p className="mt-2 text-sm text-slate-500">{status}</p>}
      </section>

      {pending.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-white dark:border-amber-800 dark:bg-slate-900">
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {pending.length} to review
          </div>
          {pending.map((tx) => {
            const groups = groupsForDate(tx.date)
            const sel = selections[tx.id] || {}
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
                      {tx.usaaCategory && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          USAA: {tx.usaaCategory}
                        </span>
                      )}
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
                    {labelFor(monthKeyOf(tx.date))} doesn't exist yet — assigning will create it
                    by copying {latestMonth?.label}'s categories.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
                    Item
                    <input
                      list={`pending-item-options-${tx.id}`}
                      value={sel.itemQuery || ''}
                      onChange={(e) => onItemQueryChange(tx, groups, e.target.value)}
                      placeholder="Search any item…"
                      autoComplete="off"
                      className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <datalist id={`pending-item-options-${tx.id}`}>
                      {(sel.groupName ? groups.filter((g) => g.name === sel.groupName) : groups).flatMap((g) =>
                        g.items.map((it) => (
                          <option key={`${g.name}:::${it.name}`} value={`${g.name} › ${it.name || 'Unnamed item'}`} />
                        )),
                      )}
                    </datalist>
                  </label>
                  <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
                    Category
                    <select
                      value={sel.groupName || ''}
                      onChange={(e) => setSelection(tx.id, { groupName: e.target.value, itemName: '', itemQuery: '' })}
                      className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Select category…</option>
                      {groups.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 text-[11px] text-slate-400">Auto-fills from item</span>
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
      )}

      <ConfirmDialog
        open={!!pendingDiscard}
        title="Discard transaction?"
        message={`This removes the ${pendingDiscard ? money(pendingDiscard.amount) : ''} ${pendingDiscard?.type} from your review list without logging it anywhere. This can't be undone.`}
        confirmLabel="Discard"
        onConfirm={runDiscard}
        onCancel={() => setPendingDiscard(null)}
      />
    </>
  )
}

export default function TransactionsPage() {
  const { doc, setDoc, month, updateMonth } = useBudget()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState(0)
  const [groupId, setGroupId] = useState('')
  const [itemId, setItemId] = useState('')
  const [itemQuery, setItemQuery] = useState('')
  const [note, setNote] = useState('')
  const [dateStr, setDateStr] = useState(todayStr())
  const [timeStr, setTimeStr] = useState(nowStr())
  const [pendingDelete, setPendingDelete] = useState(null)

  const group = month.groups.find((g) => g.id === groupId)
  const transactions = [...(month.transactions || [])].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))

  // Every item across every category, searchable regardless of whether a
  // category has been picked yet — picking one auto-fills the category.
  const allItemOptions = month.groups.flatMap((g) =>
    g.items.map((it) => ({ key: `${g.id}:::${it.id}`, label: `${g.name} › ${it.name || 'Unnamed item'}`, groupId: g.id, itemId: it.id })),
  )
  const itemOptionsForSearch = groupId ? allItemOptions.filter((o) => o.groupId === groupId) : allItemOptions

  const onItemQueryChange = (value) => {
    setItemQuery(value)
    const match = allItemOptions.find((o) => o.label === value)
    if (match) {
      setGroupId(match.groupId)
      setItemId(match.itemId)
    } else {
      setItemId('')
    }
  }

  const totalExpenses = (month.transactions || []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalDeposits = (month.transactions || []).filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)

  const addTransaction = (e) => {
    e.preventDefault()
    const amt = amount
    if (!amt || amt <= 0 || !groupId || !itemId) return
    const loggedAt = new Date(`${dateStr}T${timeStr}:00`).toISOString()
    const tx = { id: newId(), type, amount: amt, groupId, itemId, note, loggedAt }
    updateMonth((m) => ({
      ...m,
      transactions: [...(m.transactions || []), tx],
      groups: m.groups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, items: g.items.map((it) => (it.id !== itemId ? it : { ...it, spent: (Number(it.spent) || 0) + amt })) },
      ),
    }))
    setAmount(0)
    setNote('')
    setItemQuery('')
    setGroupId('')
    setItemId('')
    setDateStr(todayStr())
    setTimeStr(nowStr())
  }

  const runDelete = () => {
    const tx = pendingDelete
    updateMonth((m) => ({
      ...m,
      transactions: (m.transactions || []).filter((t) => t.id !== tx.id),
      groups: m.groups.map((g) =>
        g.id !== tx.groupId
          ? g
          : {
              ...g,
              items: g.items.map((it) =>
                it.id !== tx.itemId
                  ? it
                  : {
                      ...it,
                      spent: (Number(it.spent) || 0) - tx.amount,
                      // Deleting the transaction that "Paid" created un-pays the item too.
                      ...(it.paidTransactionId === tx.id ? { paid: false, paidTransactionId: null } : {}),
                    },
              ),
            },
      ),
    }))
    setPendingDelete(null)
  }

  return (
    <div className="space-y-6">
      <PendingReview doc={doc} setDoc={setDoc} />

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Log a Transaction — {month.label}
        </h2>
        <form onSubmit={addTransaction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="expense">Expense</option>
              <option value="deposit">Deposit</option>
            </select>
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Amount
            <MoneyInput
              value={amount}
              onChange={setAmount}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Item
            <input
              list="tx-item-options"
              value={itemQuery}
              onChange={(e) => onItemQueryChange(e.target.value)}
              placeholder="Search any item…"
              autoComplete="off"
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <datalist id="tx-item-options">
              {itemOptionsForSearch.map((o) => (
                <option key={o.key} value={o.label} />
              ))}
            </datalist>
            {!itemId && itemQuery && <span className="mt-1 text-xs text-amber-600 dark:text-amber-400">No exact match yet</span>}
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Category / bucket
            <select
              required
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value)
                setItemId('')
                setItemQuery('')
              }}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select category…</option>
              {month.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="mt-1 text-xs text-slate-400">Auto-fills when you pick an item above</span>
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Date
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Time
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400 sm:col-span-2">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. HEB weekly run"
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              Log transaction
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">All Transactions</h2>
          <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>Expenses: <strong className="text-slate-700 dark:text-slate-200">{money(totalExpenses)}</strong></span>
            <span>Deposits: <strong className="text-slate-700 dark:text-slate-200">{money(totalDeposits)}</strong></span>
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions logged yet this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Time</th>
                  <th className="py-1 pr-2">Type</th>
                  <th className="py-1 pr-2">Bucket</th>
                  <th className="py-1 pr-2 text-right">Amount</th>
                  <th className="py-1 pr-2">Note</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const d = new Date(t.loggedAt)
                  return (
                    <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-2">{d.toLocaleDateString()}</td>
                      <td className="py-1.5 pr-2">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-1.5 pr-2 capitalize">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            t.type === 'expense'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2">{bucketLabel(month, t)}</td>
                      <td className="py-1.5 pr-2 text-right">{money(t.amount)}</td>
                      <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400">{t.note}</td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          aria-label="Delete transaction"
                          onClick={() => setPendingDelete(t)}
                          className="text-slate-300 hover:text-red-500"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete transaction?"
        message={
          pendingDelete
            ? `This removes the ${money(pendingDelete.amount)} ${pendingDelete.type} logged for ${bucketLabel(month, pendingDelete)} and reverses it from that item's spent total.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={runDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
