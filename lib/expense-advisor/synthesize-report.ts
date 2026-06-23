import OpenAI from "openai"
import type {
  AdvisorFramework,
  AuditableClaim,
  ExpenseAdvisorReport,
  Playbook,
  ResearchQueryResult,
  SpendingProfile,
} from "./types"

export async function synthesizeReport(
  profile: SpendingProfile,
  claims: AuditableClaim[],
  research: ResearchQueryResult[],
  frameworks: AdvisorFramework[],
  openaiApiKey: string
): Promise<Pick<ExpenseAdvisorReport, "playbook" | "narrative" | "research">> {
  const client = new OpenAI({ apiKey: openaiApiKey })

  const researchSummary = research
    .map(
      (r) =>
        `Query: ${r.query}\n` +
        r.results.map((res) => `- ${res.title} (${res.url}): ${res.content}`).join("\n")
    )
    .join("\n\n")

  const claimsSummary = claims.map((c) => ({
    id: c.id,
    finding: c.finding,
    severity: c.severity,
    confidence: c.confidence,
    amount: c.calculations[0]?.result,
    limitations: c.limitations,
  }))

  const frameworkText = frameworks
    .map((f) => `${f.name}: ${f.expenseCuttingLens}`)
    .join("\n")

  const prompt = `You are an aggressive but data-honest personal finance advisor for India (INR).
Your goal: help prevent bracket creep (lifestyle inflation as income rises).

RULES:
- NEVER invent rupee amounts. Only use numbers from the SpendingProfile and AuditableClaims below.
- Every cut recommendation MUST reference a claim id (e.g. "tag-grocery-3").
- Assign severity based on confidence: high+want=cut/eliminate, need=trim max, low/untagged=info only.
- State limitations when data is payment-only (no usage data).
- Be aggressive within what the data supports — no assumptions about watch hours or order frequency.
- Apply multiple advisor frameworks where relevant.

SpendingProfile:
${JSON.stringify(profile, null, 2)}

AuditableClaims (reference these ids):
${JSON.stringify(claimsSummary, null, 2)}

Advisor frameworks:
${frameworkText}

Web research results:
${researchSummary}

Return JSON matching this structure:
{
  "playbook": {
    "frameworkInsights": [{ "framework": string, "principle": string, "appliedTo": string[], "relatedClaimIds": string[] }],
    "cutCandidates": [{ "claimId": string, "tag": string, "amount": number, "severity": "trim"|"cut"|"eliminate", "action": string, "bracketCreepNote": string, "researchBasis": string, "sources": [{ "title": string, "url": string }] }],
    "subscriptionOptimizations": [{ "claimId": string, "name": string, "currentCost": number, "recommendation": string, "savings": number, "usageCaveat": string, "sources": [{ "title": string, "url": string }] }],
    "behavioralTactics": string[],
    "lockInStrategies": string[]
  },
  "narrative": {
    "executiveSummary": string (markdown),
    "dataHalf": string (markdown, Part 1 summary),
    "researchHalf": string (markdown, Part 2 playbook)
  }
}`

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You produce structured JSON only. Be thorough and aggressive within data bounds. Every recommendation cites claim IDs.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content ?? "{}"

  try {
    const parsed = JSON.parse(content) as {
      playbook?: Playbook
      narrative?: ExpenseAdvisorReport["narrative"]
    }

    const queriesRun = research.map((r) => r.query)
    const sources = research.flatMap((r) =>
      r.results.map((res) => ({
        title: res.title,
        url: res.url,
        usedFor: r.query,
      }))
    )

    return {
      playbook: parsed.playbook ?? emptyPlaybook(),
      narrative: parsed.narrative ?? {
        executiveSummary: "Analysis complete. See data and playbook sections.",
        dataHalf: "",
        researchHalf: "",
      },
      research: { queriesRun, sources },
    }
  } catch {
    return {
      playbook: emptyPlaybook(),
      narrative: {
        executiveSummary: "Synthesis partially failed — review Part 1 data claims below.",
        dataHalf: buildFallbackDataNarrative(profile),
        researchHalf: "Research synthesis unavailable. Review auditable claims for deterministic insights.",
      },
      research: {
        queriesRun: research.map((r) => r.query),
        sources: research.flatMap((r) =>
          r.results.map((res) => ({
            title: res.title,
            url: res.url,
            usedFor: r.query,
          }))
        ),
      },
    }
  }
}

function emptyPlaybook(): Playbook {
  return {
    frameworkInsights: [],
    cutCandidates: [],
    subscriptionOptimizations: [],
    behavioralTactics: [],
    lockInStrategies: [],
  }
}

function buildFallbackDataNarrative(profile: SpendingProfile): string {
  return `Total expenses: ₹${profile.summary.totalExpenses.toLocaleString("en-IN")} over ${profile.summary.monthCount} months. Wants: ₹${profile.needsVsWants.wants.toLocaleString("en-IN")}. Bracket creep risk: ${profile.bracketCreep.riskLevel}.`
}

export function enrichClaimsWithPlaybook(
  claims: AuditableClaim[],
  playbook: Playbook
): AuditableClaim[] {
  const claimMap = new Map(claims.map((c) => [c.id, c]))

  for (const cut of playbook.cutCandidates) {
    const claim = claimMap.get(cut.claimId)
    if (claim) {
      claim.severity = cut.severity
      claim.reasoning.push(`Playbook action: ${cut.action}`)
      claim.reasoning.push(`Bracket creep note: ${cut.bracketCreepNote}`)
      if (cut.researchBasis) claim.reasoning.push(`Research: ${cut.researchBasis}`)
      if (cut.sources?.length) claim.researchSources = cut.sources
    }
  }

  return claims
}
