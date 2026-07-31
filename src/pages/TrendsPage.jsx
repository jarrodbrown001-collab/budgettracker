import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useBudget } from '../lib/BudgetContext'
import { monthTotals, groupTotals, money } from '../lib/budget'

const PIE_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0d9488', '#14b8a6', '#2dd4bf', '#0891b2', '#0e7490']

export default function TrendsPage() {
  const { doc, month } = useBudget()
  const monthKeys = Object.keys(doc.months).sort()

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

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Income vs. Budgeted vs. Spent
        </h2>
        {series.length < 2 ? (
          <p className="text-sm text-slate-500">
            Add another month to see a trend line here — only {series.length} month of data so
            far.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => money(v)} width={90} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Line type="monotone" dataKey="Income" stroke="#059669" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="Budgeted" stroke="#f59e0b" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="Spent" stroke="#ef4444" strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {month.label} — Planned Spending by Category
        </h2>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No budgeted categories yet this month.</p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={(d) => d.name}
                  isAnimationActive={false}
                >
                  {breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
