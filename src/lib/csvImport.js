// Minimal RFC4180-ish CSV parser: handles quoted fields with embedded commas,
// quotes, and newlines. USAA's export doesn't currently quote anything, but
// this is cheap insurance against a future export that does.
function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    if (row.some((f) => f.trim() !== '')) rows.push(row)
  }
  return rows
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// USAA's "Category" column is its own auto-categorization, not our budget
// categories — kept only as a hint to speed up manual review, never mapped
// directly (it doesn't know about your categories like "Eating Out").
const IGNORED_USAA_CATEGORIES = new Set(['', 'Uncategorized', 'Category Pending'])

// Parses a USAA transaction export (Date, Description, Original Description,
// Category, Amount, Status) into the same pending-transaction shape used by
// the email-JSON import: { id, type, amount, date, time, merchant }.
// Pending rows are skipped (their amount can still change before posting) —
// they'll show up correctly once you export again after they post.
export function parseUsaaCsv(text) {
  const rows = parseCsvRows(text.trim())
  if (rows.length < 2) return { items: [], skippedPending: 0, skippedInvalid: 0 }

  const header = rows[0].map((h) => h.trim())
  const col = (name) => header.indexOf(name)
  const dateIdx = col('Date')
  const descIdx = col('Description')
  const origIdx = col('Original Description')
  const catIdx = col('Category')
  const amtIdx = col('Amount')
  const statusIdx = col('Status')

  const seen = new Map()
  const items = []
  let skippedPending = 0
  let skippedInvalid = 0

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const status = (row[statusIdx] || '').trim()
    if (/pending/i.test(status)) {
      skippedPending++
      continue
    }

    const rawDate = (row[dateIdx] || '').trim()
    const [m, d, y] = rawDate.split('/')
    const amount = parseFloat(row[amtIdx])
    if (!m || !d || !y || Number.isNaN(amount)) {
      skippedInvalid++
      continue
    }
    const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    const merchant = (row[descIdx] || row[origIdx] || '').trim() || 'Unknown'
    const usaaCategoryRaw = (row[catIdx] || '').trim()
    const usaaCategory = IGNORED_USAA_CATEGORIES.has(usaaCategoryRaw) ? '' : usaaCategoryRaw

    // Distinguishes genuinely repeated same-day/same-amount/same-merchant
    // rows (e.g. two separate $15 concession-stand purchases) from a
    // re-import of the same file, so re-uploading doesn't create dupes but
    // real repeat purchases aren't collapsed into one.
    const key = `${date}|${amount}|${merchant.toLowerCase()}`
    const occurrence = seen.get(key) || 0
    seen.set(key, occurrence + 1)

    items.push({
      id: `usaa-${date}-${Math.abs(amount)}-${slugify(merchant)}-${occurrence}`,
      type: amount < 0 ? 'expense' : 'deposit',
      amount: Math.abs(amount),
      date,
      time: '12:00',
      merchant,
      usaaCategory,
    })
  }

  return { items, skippedPending, skippedInvalid }
}
