import type {
  NeedsWantsTags,
  RecurringSubscription,
  SpendingProfile,
  TagBreakdownItem,
  TagDictionary,
  TransactionRow,
} from "./types"
import { classifyTagEssentiality } from "./tag-dictionary"

const RECURRING_AMOUNT_TOLERANCE = 0.05
const RECURRING_MIN_OCCURRENCES = 3
const RECURRING_CADENCE_DAYS_MIN = 25
const RECURRING_CADENCE_DAYS_MAX = 35

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function monthKey(date: Date): string {
  return `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`
}

function normalizeNarration(narration: string): string {
  return narration
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
}

function amountsMatch(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true
  const diff = Math.abs(a - b)
  const avg = (a + b) / 2
  return diff / avg <= RECURRING_AMOUNT_TOLERANCE
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function detectRecurringSubscriptions(expenses: TransactionRow[]): RecurringSubscription[] {
  const groups = new Map<string, TransactionRow[]>()

  for (const txn of expenses) {
    const key = `${normalizeNarration(txn.narration)}|${Math.round(Number(txn.withdrawal_amt))}`
    const existing = groups.get(key) ?? []
    existing.push(txn)
    groups.set(key, existing)
  }

  const subscriptions: RecurringSubscription[] = []

  for (const [key, txns] of groups) {
    if (txns.length < RECURRING_MIN_OCCURRENCES) continue

    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))
    let cadenceMatches = 0

    for (let i = 1; i < sorted.length; i++) {
      const prev = parseDate(sorted[i - 1].date)
      const curr = parseDate(sorted[i].date)
      if (!prev || !curr) continue
      const days = daysBetween(prev, curr)
      if (days >= RECURRING_CADENCE_DAYS_MIN && days <= RECURRING_CADENCE_DAYS_MAX) {
        cadenceMatches++
      }
    }

    const cadenceRatio = cadenceMatches / (sorted.length - 1)
    if (cadenceRatio < 0.5) continue

    const amounts = sorted.map((t) => Number(t.withdrawal_amt))
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length
    const allSimilar = amounts.every((a) => amountsMatch(a, avgAmount))
    if (!allSimilar) continue

    const [narrationPattern] = key.split("|")
    const primaryTag = sorted[0].tags?.[0]
    const totalPaid = amounts.reduce((s, a) => s + a, 0)
    const monthsActive = sorted.length

    subscriptions.push({
      id: `recurring-${key.replace(/\|/g, "-").toLowerCase()}`,
      name: narrationPattern || sorted[0].narration.slice(0, 50),
      tag: primaryTag,
      narrationPattern,
      monthlyAmount: Math.round(avgAmount * 100) / 100,
      monthsActive,
      totalPaid: Math.round(totalPaid * 100) / 100,
      transactionIds: sorted.map((t) => t.id),
      confidence: cadenceRatio >= 0.8 && monthsActive >= 6 ? "high" : "medium",
    })
  }

  return subscriptions.sort((a, b) => b.totalPaid - a.totalPaid)
}

export function buildSpendingProfile(
  expenses: TransactionRow[],
  allTransactions: TransactionRow[],
  dictionary: TagDictionary,
  needsWants: NeedsWantsTags
): SpendingProfile {
  const dates = expenses.map((t) => t.date).sort()
  const period = {
    from: dates[0] ?? new Date().toISOString().split("T")[0],
    to: dates[dates.length - 1] ?? new Date().toISOString().split("T")[0],
  }

  const totalExpenses = expenses.reduce((s, t) => s + Number(t.withdrawal_amt || 0), 0)
  const monthSet = new Set<string>()
  expenses.forEach((t) => {
    const d = parseDate(t.date)
    if (d) monthSet.add(monthKey(d))
  })
  const monthCount = Math.max(monthSet.size, 1)

  let needs = 0
  let wants = 0
  let unclassified = 0
  const needsTransactionIds: string[] = []
  const wantsTransactionIds: string[] = []
  const unclassifiedTransactionIds: string[] = []

  const tagMap = new Map<string, { amount: number; ids: string[] }>()

  for (const txn of expenses) {
    const amt = Number(txn.withdrawal_amt || 0)
    const tags = txn.tags ?? []

    if (tags.length === 0) {
      const bucket = tagMap.get("Untagged") ?? { amount: 0, ids: [] }
      bucket.amount += amt
      bucket.ids.push(txn.id)
      tagMap.set("Untagged", bucket)
    } else {
      for (const tag of tags) {
        if (tag.toLowerCase() === "investment") continue
        const bucket = tagMap.get(tag) ?? { amount: 0, ids: [] }
        bucket.amount += amt
        bucket.ids.push(txn.id)
        tagMap.set(tag, bucket)
      }
    }

    const essentiality = classifyTagEssentiality(
      tags[0] ?? "Untagged",
      tags,
      dictionary,
      needsWants
    )

    if (essentiality === "need") {
      needs += amt
      needsTransactionIds.push(txn.id)
    } else if (essentiality === "want") {
      wants += amt
      wantsTransactionIds.push(txn.id)
    } else {
      unclassified += amt
      unclassifiedTransactionIds.push(txn.id)
    }
  }

  const tagBreakdown: TagBreakdownItem[] = Array.from(tagMap.entries())
    .map(([tag, data]) => ({
      tag,
      amount: Math.round(data.amount * 100) / 100,
      percent: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 1000) / 10 : 0,
      transactionCount: data.ids.length,
      transactionIds: data.ids,
    }))
    .sort((a, b) => b.amount - a.amount)

  const monthlyExpenseMap = new Map<string, number>()
  const monthlyIncomeMap = new Map<string, number>()

  for (const txn of expenses) {
    const d = parseDate(txn.date)
    if (!d) continue
    const key = monthKey(d)
    monthlyExpenseMap.set(key, (monthlyExpenseMap.get(key) ?? 0) + Number(txn.withdrawal_amt || 0))
  }

  for (const txn of allTransactions) {
    if (Number(txn.deposit_amt || 0) <= 0) continue
    const d = parseDate(txn.date)
    if (!d) continue
    const key = monthKey(d)
    monthlyIncomeMap.set(key, (monthlyIncomeMap.get(key) ?? 0) + Number(txn.deposit_amt || 0))
  }

  const allMonths = new Set([...monthlyExpenseMap.keys(), ...monthlyIncomeMap.keys()])
  const monthlyTrend = Array.from(allMonths)
    .map((month) => ({
      month,
      expenses: Math.round((monthlyExpenseMap.get(month) ?? 0) * 100) / 100,
      income: Math.round((monthlyIncomeMap.get(month) ?? 0) * 100) / 100,
      sortKey: new Date(`${month.split(" ")[0]} 1, ${month.split(" ")[1]}`).getTime(),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ month, expenses: exp, income }) => ({ month, expenses: exp, income }))

  const merchantMap = new Map<string, { amount: number; count: number; ids: string[] }>()
  for (const txn of expenses) {
    const name = normalizeNarration(txn.narration).slice(0, 30) || "Unknown"
    const bucket = merchantMap.get(name) ?? { amount: 0, count: 0, ids: [] }
    bucket.amount += Number(txn.withdrawal_amt || 0)
    bucket.count += 1
    bucket.ids.push(txn.id)
    merchantMap.set(name, bucket)
  }

  const topMerchants = Array.from(merchantMap.entries())
    .map(([name, data]) => ({
      name,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      transactionIds: data.ids,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15)

  const recurringSubscriptions = detectRecurringSubscriptions(expenses)

  return {
    period,
    summary: {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      monthlyAverage: Math.round((totalExpenses / monthCount) * 100) / 100,
      transactionCount: expenses.length,
      monthCount,
    },
    needsVsWants: {
      needs: Math.round(needs * 100) / 100,
      wants: Math.round(wants * 100) / 100,
      unclassified: Math.round(unclassified * 100) / 100,
      needsTransactionIds,
      wantsTransactionIds,
      unclassifiedTransactionIds,
    },
    tagBreakdown,
    monthlyTrend,
    recurringSubscriptions,
    bracketCreep: {
      expenseGrowthRate: null,
      incomeGrowthRate: null,
      riskLevel: "unknown",
      narrative: "",
      firstPeriodAvgMonthlyExpense: null,
      lastPeriodAvgMonthlyExpense: null,
      computed: false,
      limitations: [],
    },
    topMerchants,
  }
}
