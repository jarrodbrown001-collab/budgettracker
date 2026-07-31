import { useEffect, useState } from 'react'
import { money } from '../lib/budget'

// Shows a formatted $1,234.56 value when not focused, and a plain editable
// number while focused/typing.
const DEFAULT_CLASS =
  'w-24 min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-right text-sm text-slate-600 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:text-slate-300 dark:hover:border-slate-700'

export default function MoneyInput({ value, onChange, className }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    if (!focused) setRaw(value === 0 ? '' : String(value))
  }, [value, focused])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? raw : money(value)}
      onFocus={(e) => {
        setFocused(true)
        setRaw(value === 0 ? '' : String(value))
        requestAnimationFrame(() => e.target.select())
      }}
      onChange={(e) => {
        const v = e.target.value
        if (!/^-?\d*\.?\d*$/.test(v)) return
        setRaw(v)
        onChange(v === '' || v === '-' ? 0 : parseFloat(v))
      }}
      onBlur={() => setFocused(false)}
      className={className ?? DEFAULT_CLASS}
    />
  )
}
