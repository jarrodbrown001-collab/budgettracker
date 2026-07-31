import { useBudget } from '../lib/BudgetContext'
import { newId } from '../lib/storage'
import IncomeSection from '../components/IncomeSection'
import GroupCard from '../components/GroupCard'
import SummaryBar from '../components/SummaryBar'
import AccountRollup from '../components/AccountRollup'

export default function BudgetPage() {
  const { month, updateMonth } = useBudget()

  const addGroup = () => {
    updateMonth((m) => ({
      ...m,
      groups: [...m.groups, { id: newId(), name: 'New Category', account: '', items: [] }],
    }))
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{month.label}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every dollar gets an assignment. Update Planned + Spent — Remaining and the summary below update automatically.
        </p>
      </div>

      <IncomeSection />

      {month.groups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="mb-6 w-full rounded-lg border-2 border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700"
      >
        + Add category
      </button>

      <SummaryBar />
      <AccountRollup />
    </div>
  )
}
