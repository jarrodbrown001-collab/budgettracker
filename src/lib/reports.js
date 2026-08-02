// Gathers logged transactions between two dates (inclusive), scanning every
// month in the doc since a window can cross a month boundary (e.g. "last 7
// days" from Aug 2 reaches back into July).
export function transactionsBetween(doc, start, end) {
  const results = []
  for (const key of Object.keys(doc.months)) {
    const month = doc.months[key]
    for (const t of month.transactions || []) {
      const d = new Date(t.loggedAt)
      if (d >= start && d <= end) {
        const group = month.groups.find((g) => g.id === t.groupId)
        const item = group?.items.find((it) => it.id === t.itemId)
        results.push({
          ...t,
          date: d,
          categoryName: group?.name || '(deleted category)',
          itemName: item?.name || '',
        })
      }
    }
  }
  results.sort((a, b) => b.date - a.date)
  return results
}

// The last `days` calendar days, inclusive of today.
export function currentWindow(days) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

// The `days`-long window immediately preceding a given window, for
// period-over-period comparison.
export function previousWindow(start, days) {
  const end = new Date(start)
  end.setDate(end.getDate() - 1)
  end.setHours(23, 59, 59, 999)
  const prevStart = new Date(end)
  prevStart.setDate(prevStart.getDate() - (days - 1))
  prevStart.setHours(0, 0, 0, 0)
  return { start: prevStart, end }
}

export function transactionsInRange(doc, days) {
  const { start, end } = currentWindow(days)
  return { transactions: transactionsBetween(doc, start, end), start, end }
}

export function summarize(transactions) {
  const expenses = transactions.filter((t) => t.type === 'expense')
  const deposits = transactions.filter((t) => t.type === 'deposit')
  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0)
  const totalDeposited = deposits.reduce((s, t) => s + t.amount, 0)

  const byCategory = new Map()
  for (const t of expenses) {
    byCategory.set(t.categoryName, (byCategory.get(t.categoryName) || 0) + t.amount)
  }
  const categories = [...byCategory.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  return { totalSpent, totalDeposited, categories, count: transactions.length }
}

export function topPurchases(transactions, n = 5) {
  return [...transactions]
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
}

export function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  const sameYear = start.getFullYear() === end.getFullYear()
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return sameYear ? `${startStr} – ${endStr}` : `${start.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${endStr}`
}
