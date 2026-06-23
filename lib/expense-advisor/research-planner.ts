import OpenAI from "openai"
import type { SpendingProfile } from "./types"

const MAX_QUERIES = 10

export async function planResearchQueries(
  profile: SpendingProfile,
  openaiApiKey: string
): Promise<string[]> {
  const client = new OpenAI({ apiKey: openaiApiKey })

  const topTags = profile.tagBreakdown.slice(0, 8).map((t) => ({
    tag: t.tag,
    amount: t.amount,
    percent: t.percent,
  }))

  const recurring = profile.recurringSubscriptions.slice(0, 5).map((s) => ({
    name: s.name,
    monthlyAmount: s.monthlyAmount,
    monthsActive: s.monthsActive,
  }))

  const prompt = `You are a personal finance research planner for India (INR, 2025).
Given this spending profile, generate ${MAX_QUERIES} specific web search queries to find:
- Ways to cut expenses in top spending categories
- Subscription plan comparisons (monthly vs annual) where relevant
- Bracket creep / lifestyle inflation prevention strategies
- Advice from Dave Ramsey, Robert Kiyosaki, Ramit Sethi on discretionary spending

Top tags: ${JSON.stringify(topTags)}
Recurring payments: ${JSON.stringify(recurring)}
Wants spend: ₹${profile.needsVsWants.wants}
Bracket creep risk: ${profile.bracketCreep.riskLevel}

Return ONLY a JSON array of search query strings, no other text.`

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content ?? "{}"
  try {
    const parsed = JSON.parse(content) as { queries?: string[] } | string[]
    const queries = Array.isArray(parsed)
      ? parsed
      : parsed.queries ?? []
    return queries.slice(0, MAX_QUERIES).filter((q) => typeof q === "string" && q.length > 0)
  } catch {
    return fallbackQueries(profile)
  }
}

function fallbackQueries(profile: SpendingProfile): string[] {
  const queries = [
    "how to prevent lifestyle inflation bracket creep personal finance",
    "Dave Ramsey cut discretionary spending tips",
    "India reduce food delivery swiggy spending tips 2025",
  ]
  for (const tag of profile.tagBreakdown.slice(0, 5)) {
    if (tag.tag !== "Untagged") {
      queries.push(`how to reduce ${tag.tag} expenses India personal finance`)
    }
  }
  for (const sub of profile.recurringSubscriptions.slice(0, 3)) {
    queries.push(`${sub.name} subscription India monthly vs annual plan price 2025`)
  }
  return queries.slice(0, MAX_QUERIES)
}
