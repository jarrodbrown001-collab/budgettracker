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
      if (Math.abs((Number(t.amount) || 0) - amount) > 0.005) continue
      if (isoDateOf(t.loggedAt) !== candidate.date) continue
      const loggedNote = (t.note || '').trim().toLowerCase()
      if (merchant && loggedNote && loggedNote !== merchant) continue
      return t
    }
  }
  return null
}
