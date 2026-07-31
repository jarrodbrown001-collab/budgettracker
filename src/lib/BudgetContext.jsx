import { createContext, useContext, useEffect, useState } from 'react'
import { load, save } from './storage'

const BudgetContext = createContext(null)

export function BudgetProvider({ children }) {
  const [doc, setDoc] = useState(() => load())

  useEffect(() => {
    save(doc)
  }, [doc])

  const month = doc.months[doc.activeMonth]

  const updateMonth = (updater) => {
    setDoc((prev) => {
      const current = prev.months[prev.activeMonth]
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, months: { ...prev.months, [prev.activeMonth]: next } }
    })
  }

  return (
    <BudgetContext.Provider value={{ doc, setDoc, month, updateMonth }}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider')
  return ctx
}
