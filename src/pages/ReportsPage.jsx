import { useMemo, useState } from 'react'
import { useBudget } from '../lib/BudgetContext'
import {
  transactionsInRange,
  transactionsBetween,
  previousWindow,
  summarize,
  topPurchases,
  formatDateRange,
} from '../lib/reports'
import { money, groupTotals } from '../lib/budget'

const RANGE_OPTIONS = [3, 5, 7]
const BAR_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0d9488', '#14b8a6', '#2dd4bf', '#0891b2']

function categoryBudgets(month, categories) {
  return categories.map((c) => {
    const group = month.groups.find((g) => g.name === c.name)
    const planned = group ? groupTotals(group).planned : null
    const pct = planned > 0 ? (c.amount / planned) * 100 : null
    return { ...c, planned, pct, overBudget: pct != null && pct >= 100 }
  })
}

function describeTx(t) {
  const place = t.itemName ? `${t.categoryName} › ${t.itemName}` : t.categoryName
  const note = t.note && t.note !== 'Marked paid' ? ` — "${t.note}"` : ''
  return `${place}${note}`
}

function formatDateTime(d) {
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function buildTextSummary({ days, start, end, summary, delta, avgPerDay, projected, top, last10, categoriesWithBudget }) {
  const lines = []
  lines.push(`Spending Summary — Last ${days} Days (${formatDateRange(start, end)})`)
  lines.push('')
  lines.push(`Total spent: ${money(summary.totalSpent)}`)
  if (summary.totalDeposited > 0) lines.push(`Total deposited: ${money(summary.totalDeposited)}`)
  lines.push(`Vs. previous ${days} days: ${delta.amount >= 0 ? '+' : ''}${money(delta.amount)} (${delta.pct == null ? 'n/a' : `${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(0)}%`})`)
  lines.push(`Averaging ${money(avgPerDay)}/day → projects to ~${money(projected)} for a full month at this pace`)
  lines.push('')
  if (categoriesWithBudget.length > 0) {
    lines.push('By category:')
    for (const c of categoriesWithBudget) {
      const pctStr = c.pct != null ? ` (${c.pct.toFixed(0)}% of ${money(c.planned)} budget${c.overBudget ? ' — OVER' : ''})` : ''
      lines.push(`- ${c.name}: ${money(c.amount)}${pctStr}`)
    }
  } else {
    lines.push('No spending logged in this period.')
  }
  if (top.length > 0) {
    lines.push('')
    lines.push('Biggest purchases:')
    top.forEach((t, i) => {
      lines.push(`${i + 1}. ${money(t.amount)} — ${describeTx(t)} — ${formatDateTime(t.date)}`)
    })
  }
  if (last10.length > 0) {
    lines.push('')
    lines.push(`Last ${last10.length} transaction${last10.length === 1 ? '' : 's'}:`)
    for (const t of last10) {
      const sign = t.type === 'deposit' ? '+' : ''
      lines.push(`- ${formatDateTime(t.date)} — ${describeTx(t)} — ${sign}${money(t.amount)}`)
    }
  }
  return lines.join('\n')
}

function drawImage({ days, start, end, summary, delta, avgPerDay, projected, categoriesWithBudget, top, last10 }) {
  const rowHeight = 26
  const listRowHeight = 18
  const width = 640
  const height =
    260 +
    categoriesWithBudget.length * rowHeight +
    (top.length > 0 ? 32 + top.length * listRowHeight : 0) +
    (last10.length > 0 ? 32 + last10.length * listRowHeight : 0)
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1)

  let y = 40
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 22px Arial, sans-serif'
  ctx.fillText('Brown Family Spending Summary', 24, y)

  y += 26
  ctx.fillStyle = '#64748b'
  ctx.font = '14px Arial, sans-serif'
  ctx.fillText(`Last ${days} days — ${formatDateRange(start, end)}`, 24, y)

  y += 44
  ctx.fillStyle = '#059669'
  ctx.font = 'bold 32px Arial, sans-serif'
  ctx.fillText(money(summary.totalSpent), 24, y)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px Arial, sans-serif'
  ctx.fillText('total spent', 24, y + 18)

  ctx.textAlign = 'right'
  ctx.fillStyle = delta.amount > 0 ? '#dc2626' : '#059669'
  ctx.font = 'bold 14px Arial, sans-serif'
  const deltaStr = `${delta.amount >= 0 ? '+' : ''}${money(delta.amount)} vs prior ${days}d${delta.pct != null ? ` (${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(0)}%)` : ''}`
  ctx.fillText(deltaStr, width - 24, y - 8)
  ctx.fillStyle = '#64748b'
  ctx.font = '12px Arial, sans-serif'
  ctx.fillText(`${money(avgPerDay)}/day → ~${money(projected)}/mo pace`, width - 24, y + 12)
  ctx.textAlign = 'left'

  y += 40
  ctx.strokeStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.moveTo(24, y)
  ctx.lineTo(width - 24, y)
  ctx.stroke()

  y += 24
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 13px Arial, sans-serif'
  ctx.fillText('BY CATEGORY', 24, y)
  y += 12

  const maxAmount = Math.max(1, ...categoriesWithBudget.map((c) => c.amount))
  categoriesWithBudget.forEach((c, i) => {
    y += rowHeight
    const barMaxWidth = width - 220
    const barWidth = (c.amount / maxAmount) * barMaxWidth
    ctx.fillStyle = c.overBudget ? '#dc2626' : BAR_COLORS[i % BAR_COLORS.length]
    ctx.fillRect(24, y - 12, Math.max(2, barWidth), 10)
    ctx.fillStyle = '#334155'
    ctx.font = '13px Arial, sans-serif'
    ctx.fillText(c.name + (c.pct != null ? ` — ${c.pct.toFixed(0)}%${c.overBudget ? ' OVER' : ''}` : ''), 24, y + 12)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 13px Arial, sans-serif'
    ctx.fillText(money(c.amount), width - 24, y + 12)
    ctx.textAlign = 'left'
  })

  if (categoriesWithBudget.length === 0) {
    y += rowHeight
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'italic 13px Arial, sans-serif'
    ctx.fillText('No spending logged in this period.', 24, y)
  }

  const drawListSection = (title, rows, formatRow) => {
    if (rows.length === 0) return
    y += 24
    ctx.strokeStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(24, y)
    ctx.lineTo(width - 24, y)
    ctx.stroke()
    y += 20
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 13px Arial, sans-serif'
    ctx.fillText(title, 24, y)
    y += 4
    rows.forEach((t, i) => {
      y += listRowHeight
      const { label, amountStr, amountColor } = formatRow(t, i)
      ctx.fillStyle = '#334155'
      ctx.font = '12px Arial, sans-serif'
      const maxLabelWidth = width - 150
      let text = label
      while (ctx.measureText(text).width > maxLabelWidth && text.length > 3) {
        text = text.slice(0, -4) + '…'
      }
      ctx.fillText(text, 24, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = amountColor
      ctx.font = 'bold 12px Arial, sans-serif'
      ctx.fillText(amountStr, width - 24, y)
      ctx.textAlign = 'left'
    })
  }

  drawListSection('BIGGEST PURCHASES', top, (t, i) => ({
    label: `${i + 1}. ${describeTx(t)} — ${formatDateTime(t.date)}`,
    amountStr: money(t.amount),
    amountColor: '#0f172a',
  }))

  drawListSection(`LAST ${last10.length} TRANSACTION${last10.length === 1 ? '' : 'S'}`, last10, (t) => ({
    label: `${formatDateTime(t.date)} — ${describeTx(t)}`,
    amountStr: `${t.type === 'deposit' ? '+' : ''}${money(t.amount)}`,
    amountColor: t.type === 'deposit' ? '#059669' : '#0f172a',
  }))

  ctx.fillStyle = '#94a3b8'
  ctx.font = '11px Arial, sans-serif'
  ctx.fillText(`Generated ${new Date().toLocaleString()} · BudgetTracker`, 24, height - 16)

  return canvas
}

export default function ReportsPage() {
  const { doc, month } = useBudget()
  const [days, setDays] = useState(7)
  const [copyStatus, setCopyStatus] = useState('')

  const { transactions, start, end } = useMemo(() => transactionsInRange(doc, days), [doc, days])
  const summary = useMemo(() => summarize(transactions), [transactions])
  const categoriesWithBudget = useMemo(() => categoryBudgets(month, summary.categories), [month, summary.categories])
  const maxCategory = Math.max(1, ...summary.categories.map((c) => c.amount))

  const prev = useMemo(() => previousWindow(start, days), [start, days])
  const prevTransactions = useMemo(() => transactionsBetween(doc, prev.start, prev.end), [doc, prev])
  const prevSummary = useMemo(() => summarize(prevTransactions), [prevTransactions])
  const delta = useMemo(() => {
    const amount = summary.totalSpent - prevSummary.totalSpent
    const pct = prevSummary.totalSpent > 0 ? (amount / prevSummary.totalSpent) * 100 : null
    return { amount, pct }
  }, [summary.totalSpent, prevSummary.totalSpent])

  const avgPerDay = summary.totalSpent / days
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projected = avgPerDay * daysInMonth

  const top = useMemo(() => topPurchases(transactions, 5), [transactions])
  const last10 = useMemo(() => transactions.slice(0, 10), [transactions])

  const copyAsText = async () => {
    const text = buildTextSummary({ days, start, end, summary, delta, avgPerDay, projected, top, last10, categoriesWithBudget })
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('Copied to clipboard!')
    } catch {
      setCopyStatus('Could not copy — select and copy the text below manually.')
    }
    setTimeout(() => setCopyStatus(''), 3000)
  }

  const downloadImage = () => {
    const canvas = drawImage({ days, start, end, summary, delta, avgPerDay, projected, categoriesWithBudget, top, last10 })
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spending-summary-${days}day-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Spending Summary
        </h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          A quick recap to share — pick a window, then copy as text, screenshot the card below, or
          download it as an image.
        </p>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                days === d
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </section>

      {/* Screenshot-friendly card */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5">
          <h3 className="text-lg font-bold">Brown Family Spending Summary</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last {days} days — {formatDateRange(start, end)}
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-emerald-600">{money(summary.totalSpent)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">total spent</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${delta.amount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {delta.amount >= 0 ? '+' : ''}
                {money(delta.amount)} vs prior {days}d
                {delta.pct != null && ` (${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(0)}%)`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {money(avgPerDay)}/day → ~{money(projected)}/mo pace
              </p>
              {summary.totalDeposited > 0 && (
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{money(summary.totalDeposited)} deposited</p>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              By Category
            </h4>
            {categoriesWithBudget.length === 0 ? (
              <p className="text-sm italic text-slate-400">No spending logged in this period.</p>
            ) : (
              <div className="space-y-2">
                {categoriesWithBudget.map((c, i) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-200">
                        {c.name}
                        {c.overBudget && (
                          <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                            OVER BUDGET
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">
                        {money(c.amount)}
                        {c.pct != null && (
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            ({c.pct.toFixed(0)}% of {money(c.planned)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.amount / maxCategory) * 100}%`,
                          backgroundColor: c.overBudget ? '#dc2626' : BAR_COLORS[i % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {top.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Biggest Purchases
              </h4>
              <ul className="space-y-1 text-sm">
                {top.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200">
                      {t.itemName || t.note || t.categoryName}{' '}
                      <span className="text-xs text-slate-400">({t.date.toLocaleDateString()})</span>
                    </span>
                    <span className="font-semibold">{money(t.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-[11px] text-slate-400">
            Generated {new Date().toLocaleString()} · BudgetTracker
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyAsText}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Copy as text
          </button>
          <button
            type="button"
            onClick={downloadImage}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Download as image (.png)
          </button>
          {copyStatus && <span className="text-sm text-slate-500">{copyStatus}</span>}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Tip: the card above is also screenshot-ready as-is.
        </p>
      </section>

      {transactions.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold dark:border-slate-800">
            {transactions.length} transaction{transactions.length === 1 ? '' : 's'} in this window
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-1.5">Date</th>
                  <th className="px-4 py-1.5">Category</th>
                  <th className="px-4 py-1.5">Item</th>
                  <th className="px-4 py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-1.5">{t.date.toLocaleDateString()}</td>
                    <td className="px-4 py-1.5">{t.categoryName}</td>
                    <td className="px-4 py-1.5 text-slate-500 dark:text-slate-400">{t.itemName || t.note}</td>
                    <td className={`px-4 py-1.5 text-right ${t.type === 'deposit' ? 'text-emerald-600' : ''}`}>
                      {t.type === 'deposit' ? '+' : ''}
                      {money(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
