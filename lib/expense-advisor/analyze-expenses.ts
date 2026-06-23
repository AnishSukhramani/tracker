import type {
  AnalyzeOptions,
  ExpenseAdvisorReport,
  TransactionRow,
} from "./types"
import { filterExpenses, EXPENSE_EXCLUSION_RULES } from "./filter-expenses"
import { buildSpendingProfile } from "./preprocess"
import { buildAuditableClaims, buildAuditTrail } from "./build-claims"
import { loadTagDictionary, loadNeedsWantsTags } from "./tag-dictionary"
import { loadAdvisorFrameworks } from "./load-frameworks"
import { planResearchQueries } from "./research-planner"
import { runWebResearch } from "./web-research"
import { synthesizeReport, enrichClaimsWithPlaybook } from "./synthesize-report"

const DISCLAIMER =
  "This report is generated from bank transaction data only. It does not reflect usage, intent, or non-bank spending. Verify all figures and recommendations before acting. Not saved — session only."

export async function analyzeExpenses(
  transactions: TransactionRow[],
  options: AnalyzeOptions = {}
): Promise<ExpenseAdvisorReport> {
  const { dateFrom, dateTo, skipResearch = false } = options

  const { expenses, excluded } = filterExpenses(transactions, dateFrom, dateTo)
  const [dictionary, needsWants, frameworks] = await Promise.all([
    loadTagDictionary(),
    loadNeedsWantsTags(),
    loadAdvisorFrameworks(),
  ])

  const profile = buildSpendingProfile(expenses, transactions, dictionary, needsWants)

  const dataScope = {
    totalTransactionsFetched: transactions.length,
    expensesIncluded: expenses.length,
    expensesExcluded: excluded.length,
    period: profile.period,
  }

  let claims = buildAuditableClaims(profile, dictionary, needsWants, dataScope)

  let playbook = {
    frameworkInsights: [] as ExpenseAdvisorReport["playbook"]["frameworkInsights"],
    cutCandidates: [] as ExpenseAdvisorReport["playbook"]["cutCandidates"],
    subscriptionOptimizations: [] as ExpenseAdvisorReport["playbook"]["subscriptionOptimizations"],
    behavioralTactics: [] as string[],
    lockInStrategies: [] as string[],
  }

  let narrative = {
    executiveSummary: "",
    dataHalf: "",
    researchHalf: "",
  }

  let research = {
    queriesRun: [] as string[],
    sources: [] as Array<{ title: string; url: string; usedFor: string }>,
  }

  const openaiKey = process.env.OPENAI_API_KEY
  const tavilyKey = process.env.TAVILY_API_KEY

  if (!skipResearch && openaiKey) {
    try {
      const queries = await planResearchQueries(profile, openaiKey)

      let researchResults: Awaited<ReturnType<typeof runWebResearch>> = []
      if (tavilyKey && queries.length > 0) {
        researchResults = await runWebResearch(queries, tavilyKey)
      }

      const synthesis = await synthesizeReport(
        profile,
        claims,
        researchResults,
        frameworks,
        openaiKey
      )

      playbook = synthesis.playbook
      narrative = synthesis.narrative
      research = synthesis.research
      claims = enrichClaimsWithPlaybook(claims, playbook)
    } catch (err) {
      narrative = {
        executiveSummary:
          "Part 1 data analysis complete. Research synthesis failed — review deterministic claims below.",
        dataHalf: `Analyzed ${expenses.length} expense transactions. Total: ₹${profile.summary.totalExpenses.toLocaleString("en-IN")}.`,
        researchHalf: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      }
    }
  } else if (!openaiKey) {
    narrative = {
      executiveSummary:
        "Part 1 deterministic analysis complete. Set OPENAI_API_KEY and TAVILY_API_KEY for research-backed playbook.",
      dataHalf: `Total expenses: ₹${profile.summary.totalExpenses.toLocaleString("en-IN")}. Wants: ₹${profile.needsVsWants.wants.toLocaleString("en-IN")}.`,
      researchHalf: "Research playbook skipped — API keys not configured.",
    }
  } else {
    narrative = {
      executiveSummary: "Deterministic expense analysis.",
      dataHalf: `Total: ₹${profile.summary.totalExpenses.toLocaleString("en-IN")} across ${profile.summary.transactionCount} transactions.`,
      researchHalf: "",
    }
  }

  if (!narrative.dataHalf) {
    narrative.dataHalf = `**Period:** ${profile.period.from} to ${profile.period.to}\n\n**Total expenses:** ₹${profile.summary.totalExpenses.toLocaleString("en-IN")}\n\n**Monthly average:** ₹${profile.summary.monthlyAverage.toLocaleString("en-IN")}\n\n**Needs / Wants / Unclassified:** ₹${profile.needsVsWants.needs.toLocaleString("en-IN")} / ₹${profile.needsVsWants.wants.toLocaleString("en-IN")} / ₹${profile.needsVsWants.unclassified.toLocaleString("en-IN")}`
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      period: profile.period,
      aggressiveness: "high",
      disclaimer: DISCLAIMER,
    },
    dataAnalysis: {
      summary: profile.summary,
      needsVsWants: profile.needsVsWants,
      tagBreakdown: profile.tagBreakdown,
      monthlyTrend: profile.monthlyTrend,
      recurringSubscriptions: profile.recurringSubscriptions,
      bracketCreepSignals: profile.bracketCreep,
    },
    research,
    playbook,
    narrative,
    auditTrail: buildAuditTrail(claims, dataScope),
  }
}

export { EXPENSE_EXCLUSION_RULES }
