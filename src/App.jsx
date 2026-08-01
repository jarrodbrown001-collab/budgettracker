import { HashRouter, Routes, Route } from 'react-router-dom'
import { BudgetProvider } from './lib/BudgetContext'
import Layout from './components/Layout'
import BudgetPage from './pages/BudgetPage'
import TransactionsPage from './pages/TransactionsPage'
import TransactionsToTrackPage from './pages/TransactionsToTrackPage'
import SavingsIdeasPage from './pages/SavingsIdeasPage'
import TrendsPage from './pages/TrendsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BudgetProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<BudgetPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="transactions-to-track" element={<TransactionsToTrackPage />} />
            <Route path="savings-ideas" element={<SavingsIdeasPage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </BudgetProvider>
  )
}
