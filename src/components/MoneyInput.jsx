export default function MoneyInput({ value, onChange, className = '' }) {
  return (
    <input
      type="number"
      step="0.01"
      inputMode="decimal"
      value={value === 0 ? 0 : value || ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
      className={`w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
    />
  )
}
