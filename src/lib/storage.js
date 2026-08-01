import { seedJune2026 } from './seed'

const KEY = 'budgettracker-data-v1'
let idCounter = Date.now()
export const newId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`

function defaultDoc() {
  return {
    version: 1,
    activeMonth: '2026-06',
    months: {
      '2026-06': seedJune2026(),
    },
    pendingTransactions: [],
    savingsNotes: [],
  }
}

export function load() {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    const doc = defaultDoc()
    save(doc)
    return doc
  }
  try {
    const doc = JSON.parse(raw)
    if (!doc.months || !doc.activeMonth) return defaultDoc()
    if (!doc.pendingTransactions) doc.pendingTransactions = []
    if (!doc.savingsNotes) doc.savingsNotes = []
    return doc
  } catch {
    return defaultDoc()
  }
}

export function save(doc) {
  localStorage.setItem(KEY, JSON.stringify(doc))
}

export function exportJSON(doc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budgettracker-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const doc = JSON.parse(reader.result)
        if (!doc.months || !doc.activeMonth) throw new Error('Invalid backup file')
        save(doc)
        resolve(doc)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// Reads a JSON file of parsed email transactions:
// [{ id, type: 'expense'|'deposit', amount, date: 'YYYY-MM-DD', merchant, note }]
export function readPendingTransactionsFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const items = JSON.parse(reader.result)
        if (!Array.isArray(items)) throw new Error('Expected a JSON array of transactions')
        for (const it of items) {
          if (!it.id || !it.type || !it.amount || !it.date) {
            throw new Error('Each transaction needs id, type, amount, and date')
          }
        }
        resolve(items)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
