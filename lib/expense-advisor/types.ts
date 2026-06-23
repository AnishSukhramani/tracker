import type { Database } from "@/lib/database.types"

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"]

export type ClaimSeverity = "info" | "trim" | "cut" | "eliminate"
export type ClaimConfidence = "high" | "medium" | "low"

export interface CalculationStep {
  label: string
  formula: string
  inputs: Record<string, number | string>
  result: number | string
  unit?: string
}

export interface ClaimEvidence {
  transactionIds?: string[]
  dateRange?: { from: string; to: string }
  tagsUsed?: string[]
  filtersApplied?: string[]
  rowCount?: number
}

export interface ResearchSource {
  title: string
  url: string
}

export interface AuditableClaim {
  id: string
  finding: string
  severity: ClaimSeverity
  confidence: ClaimConfidence
  confidenceReason: string
  reasoning: string[]
  calculations: CalculationStep[]
  evidence: ClaimEvidence
  researchSources?: ResearchSource[]
  limitations: string[]
}

export interface TagDictionaryEntry {
  label: string
  meaning: string
  essentiality: "need" | "want" | "unknown"
  cuttable: boolean
  subscription?: {
    provider: string
    type: string
  }
}

export interface TagDictionary {
  [tag: string]: TagDictionaryEntry
}

export interface NeedsWantsTags {
  needsTags: string[]
  wantsTags: string[]
}

export interface AdvisorFramework {
  id: string
  name: string
  principles: string[]
  expenseCuttingLens: string
}

export interface MonthlyTrendPoint {
  month: string
  expenses: number
  income: number
}

export interface TagBreakdownItem {
  tag: string
  amount: number
  percent: number
  transactionCount: number
  transactionIds: string[]
}

export interface RecurringSubscription {
  id: string
  name: string
  tag?: string
  narrationPattern: string
  monthlyAmount: number
  monthsActive: number
  totalPaid: number
  transactionIds: string[]
  confidence: ClaimConfidence
}

export interface BracketCreepSignals {
  expenseGrowthRate: number | null
  incomeGrowthRate: number | null
  riskLevel: "low" | "medium" | "high" | "unknown"
  narrative: string
  firstPeriodAvgMonthlyExpense: number | null
  lastPeriodAvgMonthlyExpense: number | null
  computed: boolean
  limitations: string[]
}

export interface SpendingProfile {
  period: { from: string; to: string }
  summary: {
    totalExpenses: number
    monthlyAverage: number
    transactionCount: number
    monthCount: number
  }
  needsVsWants: {
    needs: number
    wants: number
    unclassified: number
    needsTransactionIds: string[]
    wantsTransactionIds: string[]
    unclassifiedTransactionIds: string[]
  }
  tagBreakdown: TagBreakdownItem[]
  monthlyTrend: MonthlyTrendPoint[]
  recurringSubscriptions: RecurringSubscription[]
  bracketCreep: BracketCreepSignals
  topMerchants: Array<{
    name: string
    amount: number
    count: number
    transactionIds: string[]
  }>
}

export interface FrameworkInsight {
  framework: string
  principle: string
  appliedTo: string[]
  relatedClaimIds: string[]
}

export interface CutCandidate {
  claimId: string
  tag: string
  amount: number
  severity: ClaimSeverity
  action: string
  bracketCreepNote: string
  researchBasis: string
  sources?: ResearchSource[]
}

export interface SubscriptionOptimization {
  claimId: string
  name: string
  currentCost: number
  recommendation: string
  savings: number
  usageCaveat: string
  sources: ResearchSource[]
}

export interface Playbook {
  frameworkInsights: FrameworkInsight[]
  cutCandidates: CutCandidate[]
  subscriptionOptimizations: SubscriptionOptimization[]
  behavioralTactics: string[]
  lockInStrategies: string[]
}

export interface ResearchMeta {
  queriesRun: string[]
  sources: Array<{ title: string; url: string; usedFor: string }>
}

export interface ExpenseAdvisorReport {
  meta: {
    generatedAt: string
    period: { from: string; to: string }
    aggressiveness: "high"
    disclaimer: string
  }
  dataAnalysis: {
    summary: SpendingProfile["summary"]
    needsVsWants: SpendingProfile["needsVsWants"]
    tagBreakdown: TagBreakdownItem[]
    monthlyTrend: MonthlyTrendPoint[]
    recurringSubscriptions: RecurringSubscription[]
    bracketCreepSignals: BracketCreepSignals
  }
  research: ResearchMeta
  playbook: Playbook
  narrative: {
    executiveSummary: string
    dataHalf: string
    researchHalf: string
  }
  auditTrail: {
    dataScope: {
      totalTransactionsFetched: number
      expensesIncluded: number
      expensesExcluded: number
      exclusionRules: string[]
      period: { from: string; to: string }
    }
    claims: AuditableClaim[]
  }
}

export interface AnalyzeOptions {
  dateFrom?: string
  dateTo?: string
  aggressiveness?: "high"
  skipResearch?: boolean
}

export interface ResearchQueryResult {
  query: string
  results: Array<{
    title: string
    url: string
    content: string
  }>
}
