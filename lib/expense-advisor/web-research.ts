import type { ResearchQueryResult } from "./types"

const TAVILY_SEARCH_URL = "https://api.tavily.com/search"
const MAX_RESULTS_PER_QUERY = 3
const CONCURRENCY = 4

export async function runWebResearch(
  queries: string[],
  tavilyApiKey: string
): Promise<ResearchQueryResult[]> {
  const results: ResearchQueryResult[] = []

  for (let i = 0; i < queries.length; i += CONCURRENCY) {
    const batch = queries.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((query) => searchTavily(query, tavilyApiKey))
    )
    results.push(...batchResults)
  }

  return results
}

async function searchTavily(
  query: string,
  apiKey: string
): Promise<ResearchQueryResult> {
  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: MAX_RESULTS_PER_QUERY,
        include_answer: false,
      }),
    })

    if (!response.ok) {
      return { query, results: [] }
    }

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>
    }

    return {
      query,
      results: (data.results ?? []).map((r) => ({
        title: r.title ?? "Untitled",
        url: r.url ?? "",
        content: (r.content ?? "").slice(0, 500),
      })),
    }
  } catch {
    return { query, results: [] }
  }
}

export function flattenResearchSources(
  research: ResearchQueryResult[]
): Array<{ title: string; url: string; usedFor: string }> {
  const seen = new Set<string>()
  const sources: Array<{ title: string; url: string; usedFor: string }> = []

  for (const item of research) {
    for (const result of item.results) {
      if (!result.url || seen.has(result.url)) continue
      seen.add(result.url)
      sources.push({
        title: result.title,
        url: result.url,
        usedFor: item.query,
      })
    }
  }

  return sources
}
