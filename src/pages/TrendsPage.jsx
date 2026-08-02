import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useBudget } from '../lib/BudgetContext'
import { groupTotals, money } from '../lib/budget'

const PIE_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0d9488', '#14b8a6', '#2dd4bf', '#0891b2', '#0e7490']

function PlannedVsSpentTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold">{d.name}</p>
      <p>Planned: {money(d.planned)}</p>
      <p>Spent: {money(d.spent)}</p>
    </div>
  )
}

export default function TrendsPage() {
  const { month } = useBudget()

  const breakdown = month.groups
    .map((g) => {
      const t = groupTotals(g)
      return { name: g.name, planned: Math.round(t.planned * 100) / 100, spent: Math.round(t.spent * 100) / 100 }
    })
    .filter((d) => d.planned > 0)
    .sort((a, b) => b.planned - a.planned)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {month.label} — Planned vs. Spent by Category
        </h2>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No budgeted categories yet this month.</p>
        ) : (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="planned"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={120}
                  isAnimationActive={false}
                >
                  {breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PlannedVsSpentTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
