/**
 * Transaction grouping utilities
 */

export interface Transaction {
  id: string
  date: string
  narration: string
  ref_no?: string | null
  value_date?: string | null
  withdrawal_amt: number
  deposit_amt: number
  closing_balance?: number | null
  tags?: string[]
  category?: string
}

export interface GroupedTransaction {
  id: string
  date: string
  narration: string
  withdrawal_amt: number
  deposit_amt: number
  closing_balance?: number | null
  count: number
  transactions: Transaction[]
  isGroup: true
}

export type DisplayTransaction = Transaction | GroupedTransaction

/**
 * Groups transactions by date
 * All transactions on the same date are collapsed into one row
 */
export function groupByDate(transactions: Transaction[]): DisplayTransaction[] {
  const groups = new Map<string, Transaction[]>()
  
  // Group transactions by date
  transactions.forEach((txn) => {
    const dateKey = txn.date || "unknown"
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(txn)
  })
  
  // Create grouped transactions
  const grouped: GroupedTransaction[] = []
  groups.forEach((txns, date) => {
    const totalWithdrawal = txns.reduce((sum, t) => sum + (t.withdrawal_amt || 0), 0)
    const totalDeposit = txns.reduce((sum, t) => sum + (t.deposit_amt || 0), 0)
    const latestBalance = txns[txns.length - 1]?.closing_balance || null
    
    grouped.push({
      id: `group-date-${date}`,
      date,
      narration: `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`,
      withdrawal_amt: totalWithdrawal,
      deposit_amt: totalDeposit,
      closing_balance: latestBalance,
      count: txns.length,
      transactions: txns,
      isGroup: true,
    })
  })
  
  // Sort by date descending
  return grouped.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateB - dateA
  })
}

/**
 * Calculates similarity between two strings using Levenshtein distance
 * Returns a value between 0 (identical) and 1 (completely different)
 */
function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(
    longer.toLowerCase(),
    shorter.toLowerCase()
  )
  
  return distance / longer.length
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Normalizes narration for fuzzy matching
 * Removes common prefixes, suffixes, and normalizes whitespace
 */
function normalizeNarration(narration: string): string {
  return narration
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(upi|neft|imps|rtgs|atm|pos|card|online|payment|transfer)\s*/i, "")
    .replace(/\s*(payment|transfer|transaction|ref|ref no|refno).*$/i, "")
    .trim()
}

/**
 * Groups transactions by similar narration using fuzzy matching
 * Transactions with similar narrations (e.g., "Uber Trip...", "Uber Ride...") are grouped together
 */
export function groupByNarration(
  transactions: Transaction[],
  similarityThreshold: number = 0.3
): DisplayTransaction[] {
  const groups: Transaction[][] = []
  const processed = new Set<string>()
  
  transactions.forEach((txn) => {
    if (processed.has(txn.id)) return
    
    const normalized = normalizeNarration(txn.narration)
    const group: Transaction[] = [txn]
    processed.add(txn.id)
    
    // Find similar transactions
    transactions.forEach((otherTxn) => {
      if (processed.has(otherTxn.id)) return
      
      const otherNormalized = normalizeNarration(otherTxn.narration)
      const similarity = stringSimilarity(normalized, otherNormalized)
      
      if (similarity <= similarityThreshold) {
        group.push(otherTxn)
        processed.add(otherTxn.id)
      }
    })
    
    if (group.length > 1) {
      groups.push(group)
    } else {
      // Single transaction, add as-is
      groups.push([txn])
    }
  })
  
  // Create grouped transactions
  const result: DisplayTransaction[] = []
  
  groups.forEach((txns) => {
    if (txns.length === 1) {
      // Single transaction, no grouping needed
      result.push(txns[0])
    } else {
      // Grouped transactions
      const totalWithdrawal = txns.reduce((sum, t) => sum + (t.withdrawal_amt || 0), 0)
      const totalDeposit = txns.reduce((sum, t) => sum + (t.deposit_amt || 0), 0)
      const latestBalance = txns[txns.length - 1]?.closing_balance || null
      
      // Use the most common narration or first one
      const commonNarration = txns[0].narration
      
      result.push({
        id: `group-narration-${txns[0].id}`,
        date: txns[0].date, // Use first transaction's date
        narration: `${commonNarration} (${txns.length} similar)`,
        withdrawal_amt: totalWithdrawal,
        deposit_amt: totalDeposit,
        closing_balance: latestBalance,
        count: txns.length,
        transactions: txns,
        isGroup: true,
      })
    }
  })
  
  // Sort by date descending
  return result.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return dateB - dateA
  })
}

/**
 * Groups transactions based on the specified mode
 */
export function groupTransactions(
  transactions: Transaction[],
  mode: "none" | "date" | "narration"
): DisplayTransaction[] {
  switch (mode) {
    case "date":
      return groupByDate(transactions)
    case "narration":
      return groupByNarration(transactions)
    case "none":
    default:
      return transactions
  }
}

