import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { useBudget } from '../lib/BudgetContext'
import { monthTotals, groupTotals, money } from '../lib/budget'

const BAR_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0d9488', '#14b8a6', '#2dd4bf', '#0891b2', '#0e7490']

export default function TrendsPage() {
  const { doc, month } = useBudget()
  // Only months up to and including the one currently being viewed — no projecting
  // ahead into months that haven't happened yet from the user's perspective.
  const monthKeys = Object.keys(doc.months)
    .filter((k) => k <= doc.activeMonth)
    .sort()

  const series = monthKeys.map((k) => {
    const t = monthTotals(doc.months[k])
    return {
      key: k,
      label: doc.months[k].label,
      Income: Math.round(t.totalIncome * 100) / 100,
      Budgeted: Math.round(t.totalBudgeted * 100) / 100,
      Spent: Math.round(t.totalSpent * 100) / 100,
    }
  })

  const breakdown = month.groups
    .map((g) => ({ name: g.name, value: Math.round(groupTotals(g).planned * 100) / 100 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => a.value - b.value)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Income vs. Budgeted vs. Spent
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => money(v)} width={90} />
              <Tooltip formatter={(v) => money(v)} />
              <Legend />
              <Bar dataKey="Income" fill="#059669" isAnimationActive={false} />
              <Bar dataKey="Budgeted" fill="#f59e0b" isAnimationActive={false} />
              <Bar dataKey="Spent" fill="#ef4444" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {month.label} — Planned Spending by Category
        </h2>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No budgeted categories yet this month.</p>
        ) : (
          <div style={{ height: Math.max(240, breakdown.length * 40) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => money(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={200} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="value" isAnimationActive={false}>
                  {breakdown.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
