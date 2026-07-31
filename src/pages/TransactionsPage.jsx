import { useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import { newId } from '../lib/storage'
import { money } from '../lib/budget'
import ConfirmDialog from '../components/ConfirmDialog'

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

export default function TransactionsPage() {
  const { month, updateMonth } = useBudget()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [groupId, setGroupId] = useState('')
  const [itemId, setItemId] = useState('')
  const [note, setNote] = useState('')
  const [dateStr, setDateStr] = useState(todayStr())
  const [timeStr, setTimeStr] = useState(nowStr())
  const [pendingDelete, setPendingDelete] = useState(null)

  const group = month.groups.find((g) => g.id === groupId)
  const transactions = [...(month.transactions || [])].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))

  const totalExpenses = (month.transactions || []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalDeposits = (month.transactions || []).filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)

  const addTransaction = (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
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
    setAmount('')
    setNote('')
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
              items: g.items.map((it) => (it.id !== tx.itemId ? it : { ...it, spent: (Number(it.spent) || 0) - tx.amount })),
            },
      ),
    }))
    setPendingDelete(null)
  }

  return (
    <div className="space-y-6">
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
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Category / bucket
            <select
              required
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value)
                setItemId('')
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
          </label>

          <label className="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
            Item
            <select
              required
              disabled={!group}
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Select item…</option>
              {group?.items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name || 'Unnamed item'}
                </option>
              ))}
            </select>
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
