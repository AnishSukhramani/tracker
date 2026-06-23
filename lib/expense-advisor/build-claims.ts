import type {
  AuditableClaim,
  NeedsWantsTags,
  RecurringSubscription,
  SpendingProfile,
  TagDictionary,
} from "./types"
import { EXPENSE_EXCLUSION_RULES } from "./filter-expenses"
import { computeBracketCreepSignals } from "./bracket-creep"

let claimCounter = 0
function nextClaimId(prefix: string): string {
  claimCounter += 1
  return `${prefix}-${claimCounter}`
}

export function resetClaimCounter(): void {
  claimCounter = 0
}

export function buildAuditableClaims(
  profile: SpendingProfile,
  dictionary: TagDictionary,
  needsWants: NeedsWantsTags,
  dataScope: {
    totalTransactionsFetched: number
    expensesIncluded: number
    expensesExcluded: number
    period: { from: string; to: string }
  }
): AuditableClaim[] {
  resetClaimCounter()
  const claims: AuditableClaim[] = []

  const bracketCreep = computeBracketCreepSignals(profile.monthlyTrend)
  profile.bracketCreep = bracketCreep

  claims.push({
    id: nextClaimId("summary-total"),
    finding: `Total expenses: ₹${profile.summary.totalExpenses.toLocaleString("en-IN")} across ${profile.summary.transactionCount} transactions`,
    severity: "info",
    confidence: "high",
    confidenceReason: "Direct sum of filtered withdrawal amounts.",
    reasoning: [
      "Included only expense transactions per exclusion rules.",
      `Period: ${profile.period.from} to ${profile.period.to}.`,
    ],
    calculations: [
      {
        label: "Total expenses",
        formula: "sum(withdrawal_amt) for all included expense rows",
        inputs: {
          transactionCount: profile.summary.transactionCount,
          monthCount: profile.summary.monthCount,
        },
        result: profile.summary.totalExpenses,
        unit: "INR",
      },
      {
        label: "Monthly average",
        formula: "totalExpenses / monthCount",
        inputs: {
          totalExpenses: profile.summary.totalExpenses,
          monthCount: profile.summary.monthCount,
        },
        result: profile.summary.monthlyAverage,
        unit: "INR",
      },
    ],
    evidence: {
      dateRange: profile.period,
      filtersApplied: [...EXPENSE_EXCLUSION_RULES],
      rowCount: profile.summary.transactionCount,
    },
    limitations: ["Multi-tagged transactions may be counted in multiple tag buckets."],
  })

  claims.push({
    id: nextClaimId("needs-wants"),
    finding: `Needs: ₹${profile.needsVsWants.needs.toLocaleString("en-IN")} | Wants: ₹${profile.needsVsWants.wants.toLocaleString("en-IN")} | Unclassified: ₹${profile.needsVsWants.unclassified.toLocaleString("en-IN")}`,
    severity: "info",
    confidence: profile.needsVsWants.unclassified > 0 ? "medium" : "high",
    confidenceReason:
      profile.needsVsWants.unclassified > 0
        ? "Some transactions lack needs/wants classification."
        : "All expenses mapped via needs-wants-tags.json and tag dictionary.",
    reasoning: [
      `Needs tags: ${needsWants.needsTags.join(", ") || "(none)"}`,
      `Wants tags: ${needsWants.wantsTags.join(", ") || "(none)"}`,
      "Untagged transactions classified per needs-wants Untagged entry or as unknown.",
    ],
    calculations: [
      {
        label: "Needs total",
        formula: "sum(withdrawal_amt) where tag matches needsTags",
        inputs: { rowCount: profile.needsVsWants.needsTransactionIds.length },
        result: profile.needsVsWants.needs,
        unit: "INR",
      },
      {
        label: "Wants total",
        formula: "sum(withdrawal_amt) where tag matches wantsTags",
        inputs: { rowCount: profile.needsVsWants.wantsTransactionIds.length },
        result: profile.needsVsWants.wants,
        unit: "INR",
      },
    ],
    evidence: {
      transactionIds: [
        ...profile.needsVsWants.needsTransactionIds.slice(0, 20),
        ...profile.needsVsWants.wantsTransactionIds.slice(0, 20),
      ],
      tagsUsed: [...needsWants.needsTags, ...needsWants.wantsTags],
      rowCount:
        profile.needsVsWants.needsTransactionIds.length +
        profile.needsVsWants.wantsTransactionIds.length,
    },
    limitations: [
      "Transactions with multiple tags may be classified by first matching rule.",
      "Tag dictionary essentiality overrides when present.",
    ],
  })

  for (const item of profile.tagBreakdown.slice(0, 10)) {
    const entry = dictionary[item.tag]
    const isWant =
      entry?.essentiality === "want" ||
      needsWants.wantsTags.includes(item.tag)
    const isNeed =
      entry?.essentiality === "need" ||
      needsWants.needsTags.includes(item.tag)

    let severity: AuditableClaim["severity"] = "info"
    if (isWant && item.percent >= 5) severity = "cut"
    else if (isWant) severity = "trim"
    else if (isNeed) severity = "info"

    claims.push({
      id: nextClaimId(`tag-${item.tag.replace(/\s+/g, "-").toLowerCase()}`),
      finding: `${item.tag}: ₹${item.amount.toLocaleString("en-IN")} (${item.percent}% of spend)`,
      severity,
      confidence: item.tag === "Untagged" ? "low" : "high",
      confidenceReason:
        item.tag === "Untagged"
          ? "Untagged spend cannot be confidently classified."
          : "Tagged transactions with clear aggregation.",
      reasoning: [
        entry?.meaning
          ? `Tag meaning: ${entry.meaning}`
          : "No tag dictionary entry — classify in needs/wants.",
        isNeed ? "Classified as need — protect from aggressive cuts." : "",
        isWant ? "Classified as want — candidate for reduction." : "",
      ].filter(Boolean),
      calculations: [
        {
          label: `${item.tag} total`,
          formula: "sum(withdrawal_amt) for transactions with this tag",
          inputs: { transactionCount: item.transactionCount, percent: item.percent },
          result: item.amount,
          unit: "INR",
        },
      ],
      evidence: {
        transactionIds: item.transactionIds.slice(0, 15),
        tagsUsed: [item.tag],
        rowCount: item.transactionCount,
      },
      limitations:
        item.tag === "Untagged"
          ? ["Tag these transactions before acting on cut recommendations."]
          : [],
    })
  }

  if (bracketCreep.computed) {
    claims.push({
      id: nextClaimId("bracket-creep"),
      finding: `Bracket creep risk: ${bracketCreep.riskLevel.toUpperCase()} — ${bracketCreep.narrative}`,
      severity:
        bracketCreep.riskLevel === "high"
          ? "cut"
          : bracketCreep.riskLevel === "medium"
            ? "trim"
            : "info",
      confidence: bracketCreep.incomeGrowthRate !== null ? "medium" : "low",
      confidenceReason: bracketCreep.incomeGrowthRate
        ? "Compared first-half vs second-half expense and income averages."
        : "Income data unreliable for comparison.",
      reasoning: [
        "Bracket creep: rising income paired with rising expenses — lifestyle inflation.",
        `First period avg monthly expense: ₹${bracketCreep.firstPeriodAvgMonthlyExpense}`,
        `Last period avg monthly expense: ₹${bracketCreep.lastPeriodAvgMonthlyExpense}`,
      ],
      calculations: [
        {
          label: "Expense growth rate",
          formula: "(lastHalfAvg - firstHalfAvg) / firstHalfAvg * 100",
          inputs: {
            firstHalfAvg: bracketCreep.firstPeriodAvgMonthlyExpense ?? 0,
            lastHalfAvg: bracketCreep.lastPeriodAvgMonthlyExpense ?? 0,
          },
          result: bracketCreep.expenseGrowthRate ?? "N/A",
          unit: "%",
        },
        {
          label: "Income growth rate",
          formula: "(lastHalfIncomeAvg - firstHalfIncomeAvg) / firstHalfIncomeAvg * 100",
          inputs: {},
          result: bracketCreep.incomeGrowthRate ?? "N/A",
          unit: "%",
        },
      ],
      evidence: {
        dateRange: profile.period,
        rowCount: profile.monthlyTrend.length,
      },
      limitations: bracketCreep.limitations,
    })
  }

  for (const sub of profile.recurringSubscriptions) {
    claims.push(buildSubscriptionClaim(sub, dictionary, needsWants))
  }

  return claims
}

function buildSubscriptionClaim(
  sub: RecurringSubscription,
  dictionary: TagDictionary,
  needsWants: NeedsWantsTags
): AuditableClaim {
  const tag = sub.tag ?? "Untagged"
  const entry = dictionary[tag]
  const isWant =
    entry?.essentiality === "want" || needsWants.wantsTags.includes(tag)

  return {
    id: nextClaimId(`recurring-${sub.id}`),
    finding: `Recurring: ${sub.name} — ₹${sub.monthlyAmount}/mo × ${sub.monthsActive} months = ₹${sub.totalPaid.toLocaleString("en-IN")}`,
    severity: isWant && sub.confidence === "high" ? "trim" : "info",
    confidence: sub.confidence,
    confidenceReason: `Detected ${sub.monthsActive} payments with ~monthly cadence and consistent amounts.`,
    reasoning: [
      `Narration pattern: ${sub.narrationPattern}`,
      "Recurring detection: amount ±5% tolerance, 25–35 day cadence, ≥3 occurrences.",
      isWant
        ? "Tagged as discretionary — review for cancellation or plan switch."
        : "Verify essentiality before cutting.",
    ],
    calculations: [
      {
        label: "Monthly amount",
        formula: "average(withdrawal_amt) across matched transactions",
        inputs: { monthsActive: sub.monthsActive },
        result: sub.monthlyAmount,
        unit: "INR",
      },
      {
        label: "Total paid",
        formula: "sum(withdrawal_amt) across matched transactions",
        inputs: { transactionCount: sub.transactionIds.length },
        result: sub.totalPaid,
        unit: "INR",
      },
      {
        label: "Annualized cost",
        formula: "monthlyAmount * 12",
        inputs: { monthlyAmount: sub.monthlyAmount },
        result: Math.round(sub.monthlyAmount * 12 * 100) / 100,
        unit: "INR",
      },
    ],
    evidence: {
      transactionIds: sub.transactionIds,
      tagsUsed: sub.tag ? [sub.tag] : [],
      rowCount: sub.transactionIds.length,
    },
    limitations: [
      "Payment history only — cannot determine usage or value derived.",
      "Verify this is a subscription and not repeated one-off payments.",
    ],
  }
}

export function buildAuditTrail(
  claims: AuditableClaim[],
  dataScope: {
    totalTransactionsFetched: number
    expensesIncluded: number
    expensesExcluded: number
    period: { from: string; to: string }
  }
) {
  return {
    dataScope: {
      ...dataScope,
      exclusionRules: [...EXPENSE_EXCLUSION_RULES],
    },
    claims,
  }
}
