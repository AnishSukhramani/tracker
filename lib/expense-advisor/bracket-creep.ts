import type { BracketCreepSignals, MonthlyTrendPoint } from "./types"

const MIN_MONTHS_FOR_COMPARISON = 4

export function computeBracketCreepSignals(
  monthlyTrend: MonthlyTrendPoint[]
): BracketCreepSignals {
  const limitations: string[] = [
    "Income trend uses all deposits, not salary-specific tags — may include transfers and non-salary credits.",
    "Expense growth alone does not prove lifestyle inflation without reliable income comparison.",
  ]

  if (monthlyTrend.length < MIN_MONTHS_FOR_COMPARISON) {
    return {
      expenseGrowthRate: null,
      incomeGrowthRate: null,
      riskLevel: "unknown",
      narrative:
        "Insufficient monthly data (need at least 4 months) to compute bracket creep signals.",
      firstPeriodAvgMonthlyExpense: null,
      lastPeriodAvgMonthlyExpense: null,
      computed: false,
      limitations: [
        ...limitations,
        `Only ${monthlyTrend.length} month(s) of data available.`,
      ],
    }
  }

  const midpoint = Math.floor(monthlyTrend.length / 2)
  const firstHalf = monthlyTrend.slice(0, midpoint)
  const secondHalf = monthlyTrend.slice(midpoint)

  const avg = (items: MonthlyTrendPoint[], field: "expenses" | "income") => {
    if (items.length === 0) return 0
    return items.reduce((s, m) => s + m[field], 0) / items.length
  }

  const firstExpenseAvg = avg(firstHalf, "expenses")
  const lastExpenseAvg = avg(secondHalf, "expenses")
  const firstIncomeAvg = avg(firstHalf, "income")
  const lastIncomeAvg = avg(secondHalf, "income")

  const expenseGrowthRate =
    firstExpenseAvg > 0
      ? Math.round(((lastExpenseAvg - firstExpenseAvg) / firstExpenseAvg) * 1000) / 10
      : null

  const incomeGrowthRate =
    firstIncomeAvg > 0
      ? Math.round(((lastIncomeAvg - firstIncomeAvg) / firstIncomeAvg) * 1000) / 10
      : null

  let riskLevel: BracketCreepSignals["riskLevel"] = "low"
  let narrative = ""

  if (expenseGrowthRate !== null && expenseGrowthRate > 15) {
    if (incomeGrowthRate !== null && expenseGrowthRate > incomeGrowthRate + 5) {
      riskLevel = "high"
      narrative = `Expenses grew ${expenseGrowthRate}% (first half avg ${Math.round(firstExpenseAvg)} → second half avg ${Math.round(lastExpenseAvg)}) while income grew ${incomeGrowthRate}%. Spending is outpacing income — classic bracket creep pattern.`
    } else if (incomeGrowthRate === null || firstIncomeAvg === 0) {
      riskLevel = "medium"
      narrative = `Expenses grew ${expenseGrowthRate}% between first and second half of the period. Income comparison unavailable or unreliable — treat as a warning to cap discretionary spend.`
      limitations.push("Could not reliably compare to income growth.")
    } else {
      riskLevel = "medium"
      narrative = `Expenses grew ${expenseGrowthRate}% while income grew ${incomeGrowthRate}%. Monitor wants categories to prevent lifestyle inflation as income rises.`
    }
  } else {
    riskLevel = "low"
    narrative =
      expenseGrowthRate !== null
        ? `Expense growth (${expenseGrowthRate}%) is moderate. Continue separating needs from wants to avoid bracket creep as income increases.`
        : "Unable to compute meaningful expense growth rate."
  }

  return {
    expenseGrowthRate,
    incomeGrowthRate,
    riskLevel,
    narrative,
    firstPeriodAvgMonthlyExpense: Math.round(firstExpenseAvg * 100) / 100,
    lastPeriodAvgMonthlyExpense: Math.round(lastExpenseAvg * 100) / 100,
    computed: true,
    limitations,
  }
}
