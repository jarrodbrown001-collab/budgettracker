// Gathers logged transactions from the last `days` calendar days (inclusive of
// today), scanning every month in the doc since the window can cross a month
// boundary (e.g. "last 7 days" from Aug 2 reaches back into July).
export function transactionsInRange(doc, days) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

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
  return { transactions: results, start, end }
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

export function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  const sameYear = start.getFullYear() === end.getFullYear()
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return sameYear ? `${startStr} – ${endStr}` : `${start.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${endStr}`
}
