# BudgetTracker

A zero-based monthly budget app, ported from the Brown family's EveryDollar spreadsheet.

Live: https://jarrodbrown001-collab.github.io/budgettracker/

## Features

- Income, Giving, Expenses, Bills, Insurance, Subscriptions, Sinking Funds, Emergency Fund,
  Savings, and Debt categories — fully editable (add/remove categories and items)
- Planned / Spent / Remaining tracked per item, with live subtotals and a zero-based budget
  summary ("Left to Budget" check)
- Multi-month support — switch months with the arrows/dropdown; a new month copies your
  categories and planned amounts forward with spent reset to $0
- Savings Ideas page — live recommendations and monthly/annual savings scenarios, computed from
  your current budget
- Export/Import JSON backup (Settings page)

## Stack

React + Vite + Tailwind CSS v4 + React Router, no backend — all data lives in browser
`localStorage`. Cloud sync (cross-device) is a planned future addition.

## Development

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`.
