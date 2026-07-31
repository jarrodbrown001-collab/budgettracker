export const money = (n) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const remaining = (item) => (Number(item.planned) || 0) - (Number(item.spent) || 0)

export const isDebtGroup = (name) => name.trim().toLowerCase() === 'debt'

export function groupTotals(group) {
  const planned = group.items.reduce((s, it) => s + (Number(it.planned) || 0), 0)
  const spent = group.items.reduce((s, it) => s + (Number(it.spent) || 0), 0)
  return { planned, spent, remaining: planned - spent }
}

export function monthTotals(month) {
  const totalIncome = month.income.reduce((s, i) => s + (Number(i.planned) || 0), 0)
  const groupSums = month.groups.map(groupTotals)
  const totalBudgeted = groupSums.reduce((s, g) => s + g.planned, 0)
  const totalSpent = groupSums.reduce((s, g) => s + g.spent, 0)
  return {
    totalIncome,
    totalBudgeted,
    totalSpent,
    leftToBudget: totalIncome - totalBudgeted,
    remainingToSpend: totalIncome - totalSpent,
  }
}

// Sum of planned amounts across groups the user is treating as savings/wealth-building.
export function savingsPlanned(month) {
  const names = ['To Emergency Fund', 'To Ally Savings']
  return month.groups
    .filter((g) => names.includes(g.name))
    .reduce((s, g) => s + groupTotals(g).planned, 0)
}

// Rolls category totals up by bank account, so it's clear how much needs to sit in
// each account before its due dates hit. Debt is excluded — its "account" field
// describes a payoff methodology (Baby Step 2), not a real bank account.
export function accountTotals(month) {
  const byAccount = new Map()
  for (const g of month.groups) {
    if (isDebtGroup(g.name)) continue
    const key = g.account?.trim() || 'Unassigned'
    const t = groupTotals(g)
    const prev = byAccount.get(key) || { account: key, planned: 0, spent: 0, remaining: 0 }
    byAccount.set(key, {
      account: key,
      planned: prev.planned + t.planned,
      spent: prev.spent + t.spent,
      remaining: prev.remaining + t.remaining,
    })
  }
  return [...byAccount.values()].sort((a, b) => b.planned - a.planned)
}
