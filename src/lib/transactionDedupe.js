function isoDateOf(loggedAt) {
  const d = new Date(loggedAt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Strips everything but letters/digits so merchant text compares the same
// regardless of formatting — USAA's own export is inconsistent about
// whether "Description" is populated: sometimes it's a clean name ("H-E-B"),
// sometimes it's blank and falls back to the raw "Original Description"
// ("HEB CURBSIDE   800-432-3113 TX"). A plain substring check treats those
// as unrelated ("h-e-b" never appears inside "heb curbside...") even though
// they're the same real purchase.
function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Finds an already-logged transaction (in any month, already assigned to a
// category) that matches a candidate import by date + amount + merchant, so
// re-importing the same real-world transaction under a different generated
// id doesn't get treated as new.
export function findExistingMatch(doc, candidate) {
  const amount = Number(candidate.amount)
  const merchant = normalize(candidate.merchant || candidate.note || '')
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
      const loggedNote = normalize(t.note || '')
      if (merchant && loggedNote && !loggedNote.includes(merchant)) continue
      return t
    }
  }
  return null
}
