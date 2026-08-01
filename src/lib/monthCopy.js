import { newId } from './storage'

export function blankMonth(label) {
  return { label, income: [], groups: [], transactions: [], accountNotes: {} }
}

// Copies a month's category structure forward. Planned amounts carry over,
// spent/paid reset for every item. For items flagged `rollover` (sinking
// funds / savings goals), whatever was left unspent this month (planned -
// spent) is added to the item's running `balance` instead of being reset —
// that's what makes the "saved so far" total accumulate month over month.
// Non-rollover items keep their balance unchanged (irrelevant to them,
// except Debt items which track balance manually and are left untouched).
export function cloneMonthForward(source, label) {
  const groups = source.groups.map((g) => ({
    id: newId(),
    name: g.name,
    account: g.account,
    items: g.items.map((it) => {
      const carriedBalance = it.rollover
        ? (Number(it.balance) || 0) + (Number(it.planned) || 0) - (Number(it.spent) || 0)
        : (it.balance ?? 0)
      return {
        id: newId(),
        name: it.name,
        due: it.due,
        planned: it.planned,
        spent: 0,
        paid: false,
        balance: carriedBalance,
        apr: it.apr ?? 0,
        rollover: !!it.rollover,
      }
    }),
  }))
  const income = source.income.map((s) => ({ id: newId(), name: s.name, planned: s.planned }))
  return { label, income, groups, transactions: [], accountNotes: {} }
}
