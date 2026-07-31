export default function MoneyInput({ value, onChange, className = '' }) {
  return (
    <input
      type="number"
      step="0.01"
      inputMode="decimal"
      value={value === 0 ? 0 : value || ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
      className={`w-24 min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-right text-sm text-slate-600 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:text-slate-300 dark:hover:border-slate-700 ${className}`}
    />
  )
}
