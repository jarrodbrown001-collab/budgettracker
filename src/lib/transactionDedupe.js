function isoDateOf(loggedAt) {
  const d = new Date(loggedAt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Finds an already-logged transaction (in any month, already assigned to a
// category) that matches a candidate import by date + amount + merchant, so
// re-importing the same real-world transaction under a different generated
// id doesn't get treated as new.
export function findExistingMatch(doc, candidate) {
  const amount = Number(candidate.amount)
  const merchant = (candidate.merchant || candidate.note || '').trim().toLowerCase()
  for (const key of Object.keys(doc.months)) {
    for (const t of doc.months[key].transactions || []) {
      // A split transaction logs one record per category with only its
      // share of the total, so comparing against t.amount alone would never
      // match — sourceAmount (when present) carries the original total each
      // split shares, so the candidate's full amount matches every sibling.
      const loggedAmount = Number(t.sourceAmount ?? t.amount) || 0
      if (Math.abs(loggedAmount - amount) > 0.005) continue
      if (isoDateOf(t.loggedAt) !== candidate.date) continue
      // The logged note may be just the merchant, or the merchant with a
      // user-added comment appended ("Target — Piper birthday gift"), so
      // match on containment rather than exact equality.
      const loggedNote = (t.note || '').trim().toLowerCase()
      if (merchant && loggedNote && !loggedNote.includes(merchant)) continue
      return t
    }
  }
  return null
}
