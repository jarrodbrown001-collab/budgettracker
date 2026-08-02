import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useBudget } from '../lib/BudgetContext'
import { groupTotals, money } from '../lib/budget'

export default function TrendsPage() {
  const { month } = useBudget()

  const breakdown = month.groups
    .map((g) => {
      const t = groupTotals(g)
      return {
        name: g.name,
        Planned: Math.round(t.planned * 100) / 100,
        Spent: Math.round(t.spent * 100) / 100,
        Remaining: Math.round(t.remaining * 100) / 100,
      }
    })
    .filter((d) => d.Planned > 0)
    .sort((a, b) => b.Planned - a.Planned)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {month.label} — Planned, Spent &amp; Remaining by Category
        </h2>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No budgeted categories yet this month.</p>
        ) : (
          <div style={{ height: Math.max(280, breakdown.length * 56) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => money(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={200} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Bar dataKey="Planned" fill="#f59e0b" isAnimationActive={false} />
                <Bar dataKey="Spent" fill="#ef4444" isAnimationActive={false} />
                <Bar dataKey="Remaining" fill="#059669" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
