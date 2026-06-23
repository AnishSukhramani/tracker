import { promises as fs } from "fs"
import path from "path"
import type { AdvisorFramework } from "./types"

const FRAMEWORKS_PATH = path.join(process.cwd(), "data", "advisor-frameworks.json")

export async function loadAdvisorFrameworks(): Promise<AdvisorFramework[]> {
  try {
    const content = await fs.readFile(FRAMEWORKS_PATH, "utf-8")
    const data = JSON.parse(content) as { frameworks: AdvisorFramework[] }
    return data.frameworks ?? []
  } catch {
    return []
  }
}
