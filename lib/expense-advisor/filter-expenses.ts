import type { TransactionRow } from "./types"

export const EXPENSE_EXCLUSION_RULES = [
  "withdrawal_amt must be > 0",
  'exclude tags containing "investment" (case-insensitive)',
  'exclude tags containing "ipo" (case-insensitive)',
] as const

export function hasInvestmentTag(tags: string[] | null | undefined): boolean {
  return (tags ?? []).some((tag) => tag.toLowerCase() === "investment")
}

export function hasIpoTag(tags: string[] | null | undefined): boolean {
  return (tags ?? []).some((tag) => tag.toLowerCase().includes("ipo"))
}

export function isExpenseTransaction(txn: Pick<TransactionRow, "withdrawal_amt" | "tags">): boolean {
  if (Number(txn.withdrawal_amt || 0) <= 0) return false
  if (hasInvestmentTag(txn.tags)) return false
  if (hasIpoTag(txn.tags)) return false
  return true
}

export function filterExpenses(
  transactions: TransactionRow[],
  dateFrom?: string,
  dateTo?: string
): { expenses: TransactionRow[]; excluded: TransactionRow[] } {
  const expenses: TransactionRow[] = []
  const excluded: TransactionRow[] = []

  for (const txn of transactions) {
    if (dateFrom && txn.date < dateFrom) {
      excluded.push(txn)
      continue
    }
    if (dateTo && txn.date > dateTo) {
      excluded.push(txn)
      continue
    }

    if (isExpenseTransaction(txn)) {
      expenses.push(txn)
    } else if (Number(txn.withdrawal_amt || 0) > 0) {
      excluded.push(txn)
    }
  }

  return { expenses, excluded }
}
