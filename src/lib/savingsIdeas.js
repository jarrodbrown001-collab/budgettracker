function findItem(month, name) {
  for (const g of month.groups) {
    const it = g.items.find((i) => i.name.trim().toLowerCase() === name.toLowerCase())
    if (it) return it
  }
  return null
}

function sumItems(month, names) {
  return names.reduce((s, n) => s + (findItem(month, n)?.planned || 0), 0)
}

// Recommendations mirror the original spreadsheet's "Savings Ideas" tab, computed live
// from whatever items currently exist in the budget (an idea is skipped if its item is gone).
export function computeIdeas(month) {
  const ideas = []

  const subNames = ['YouTube Premium', 'Peacock Streaming', 'Paramount Plus & Showtime', 'CineMark Movies']
  const subsCurrent = sumItems(month, subNames)
  if (subsCurrent > 0) {
    ideas.push({
      id: 'subs',
      label: 'Trim subscriptions: cancel/rotate YouTube Premium, Peacock, Paramount+, and CineMark',
      current: subsCurrent,
      cut: subsCurrent,
      newTarget: 0,
      why: 'Low-friction — targets overlapping entertainment subscriptions rather than core needs.',
    })
  }

  const groceries = findItem(month, 'Groceries')
  if (groceries) {
    ideas.push({
      id: 'groceries',
      label: 'Groceries: set a 10% lower target and meal-plan around that number',
      current: groceries.planned,
      cut: groceries.planned * 0.1,
      newTarget: groceries.planned * 0.9,
      why: 'Groceries are the largest flexible everyday category, so a modest percentage cut creates meaningful savings.',
    })
  }

  const funEatingCurrent = sumItems(month, ['Family Fun', 'Eating Out'])
  if (funEatingCurrent > 0) {
    ideas.push({
      id: 'fun-eating',
      label: 'Family fun + eating out: cap both at 50% of the current plan',
      current: funEatingCurrent,
      cut: funEatingCurrent * 0.5,
      newTarget: funEatingCurrent * 0.5,
      why: 'These are discretionary and can be replaced with lower-cost home or community activities.',
    })
  }

  const extraMortgage = findItem(month, 'M&T Extra House Payment')
  if (extraMortgage && extraMortgage.planned > 0) {
    ideas.push({
      id: 'extra-mortgage',
      label: 'Pause the extra mortgage payment until emergency savings goal is stronger',
      current: extraMortgage.planned,
      cut: extraMortgage.planned,
      newTarget: 0,
      why: 'Keeps the required mortgage paid while redirecting extra principal toward liquid savings.',
    })
  }

  const occasionCurrent = sumItems(month, ['Birthdays/Special Occasion', 'J & A Special Occasion', 'Family Vacation'])
  if (occasionCurrent > 0) {
    ideas.push({
      id: 'occasions',
      label: 'Reduce special occasions / birthdays / vacation sinking funds by 20%',
      current: occasionCurrent,
      cut: occasionCurrent * 0.2,
      newTarget: occasionCurrent * 0.8,
      why: 'These are still funded, just at a slower pace, freeing cash this month.',
    })
  }

  const datesCurrent = sumItems(month, ['J & A Dates', 'J & V Dates', 'J & P Dates'])
  if (datesCurrent > 0) {
    ideas.push({
      id: 'dates',
      label: 'Lower J&A / J&V / J&P date categories by 25%',
      current: datesCurrent,
      cut: datesCurrent * 0.25,
      newTarget: datesCurrent * 0.75,
      why: 'Keeps the intent of the categories while creating a repeatable monthly reduction.',
    })
  }

  const byId = Object.fromEntries(ideas.map((i) => [i.id, i]))
  const sumCuts = (ids) => ids.reduce((s, id) => s + (byId[id]?.cut || 0), 0)

  const scenarios = [
    {
      id: 'conservative',
      label: 'Conservative: subscriptions + groceries only',
      monthly: sumCuts(['subs', 'groceries']),
      destination: 'Emergency Fund',
    },
    {
      id: 'balanced',
      label: 'Balanced: top 4 ideas',
      monthly: sumCuts(['subs', 'groceries', 'fun-eating', 'extra-mortgage']),
      destination: 'Emergency Fund, then Ally savings',
    },
    {
      id: 'aggressive',
      label: 'Aggressive: all ideas',
      monthly: sumCuts(ideas.map((i) => i.id)),
      destination: 'Emergency Fund / Roth IRAs / College',
    },
  ].map((s) => ({ ...s, annual: s.monthly * 12 }))

  return { ideas, scenarios }
}
