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

// USAA formats the Date column differently depending on which export you
// run — "Download Transactions" for a date range uses M/D/YYYY, while
// "Last 50 Transactions" uses ISO YYYY-MM-DD. Accept either.
function parseUsaaDate(rawDate) {
  const iso = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const slash = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, m, d, y] = slash
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
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
// the email-JSON import: { id, type, amount, date, time, merchant, status }.
// Pending rows are included (not skipped) so you can allocate them ahead of
// time — their amount can still change before posting, so a re-export after
// posting may add a second entry if the final amount differs (the id is
// amount-derived); if it posts for the exact same amount the re-import is
// deduped automatically like any other repeat row.
export function parseUsaaCsv(text) {
  const rows = parseCsvRows(text.trim())
  if (rows.length < 2) return { items: [], pendingCount: 0, skippedInvalid: 0 }

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
  let pendingCount = 0
  let skippedInvalid = 0

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const status = (row[statusIdx] || '').trim()
    const isPending = /pending/i.test(status)

    const rawDate = (row[dateIdx] || '').trim()
    const date = parseUsaaDate(rawDate)
    const amount = parseFloat(row[amtIdx])
    if (!date || Number.isNaN(amount)) {
      skippedInvalid++
      continue
    }
    if (isPending) pendingCount++
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
      status: isPending ? 'pending' : 'posted',
    })
  }

  return { items, pendingCount, skippedInvalid }
}
