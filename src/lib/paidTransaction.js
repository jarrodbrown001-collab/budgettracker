import { newId } from './storage'

// Checking "Paid" logs a real transaction (so it shows on the Transactions
// tab) and adds its amount to the item's spent total. Unchecking removes
// that specific transaction and reverses the spent amount, rather than
// blindly zeroing spent — that way it doesn't clobber other manually
// entered spending against the same item.
export function applyPaidToggle(month, groupId, itemId, checked) {
  const group = month.groups.find((g) => g.id === groupId)
  const item = group?.items.find((it) => it.id === itemId)
  if (!group || !item) return month

  if (checked) {
    const amount = Number(item.planned) || 0
    const tx = {
      id: newId(),
      type: 'expense',
      amount,
      groupId,
      itemId,
      note: 'Marked paid',
      loggedAt: new Date().toISOString(),
    }
    return {
      ...month,
      transactions: [...(month.transactions || []), tx],
      groups: month.groups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: g.items.map((it) =>
                it.id !== itemId
                  ? it
                  : { ...it, paid: true, paidTransactionId: tx.id, spent: (Number(it.spent) || 0) + amount },
              ),
            },
      ),
    }
  }

  const txId = item.paidTransactionId
  const tx = txId ? (month.transactions || []).find((t) => t.id === txId) : null
  return {
    ...month,
    transactions: txId ? (month.transactions || []).filter((t) => t.id !== txId) : month.transactions,
    groups: month.groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            items: g.items.map((it) =>
              it.id !== itemId
                ? it
                : { ...it, paid: false, paidTransactionId: null, spent: (Number(it.spent) || 0) - (tx?.amount || 0) },
            ),
          },
    ),
  }
}
