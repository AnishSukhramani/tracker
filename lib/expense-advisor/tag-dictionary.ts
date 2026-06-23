import { promises as fs } from "fs"
import path from "path"
import type { NeedsWantsTags, TagDictionary, TagDictionaryEntry } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const TAG_DICTIONARY_PATH = path.join(DATA_DIR, "tag-dictionary.json")
const NEEDS_WANTS_PATH = path.join(DATA_DIR, "needs-wants-tags.json")

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

export async function loadTagDictionary(): Promise<TagDictionary> {
  return readJsonFile<TagDictionary>(TAG_DICTIONARY_PATH, {})
}

export async function loadNeedsWantsTags(): Promise<NeedsWantsTags> {
  return readJsonFile<NeedsWantsTags>(NEEDS_WANTS_PATH, {
    needsTags: [],
    wantsTags: [],
  })
}

export function classifyTagEssentiality(
  tag: string,
  tags: string[],
  dictionary: TagDictionary,
  needsWants: NeedsWantsTags
): "need" | "want" | "unknown" {
  if (tags.length === 0) {
    if (needsWants.needsTags.includes("Untagged")) return "need"
    if (needsWants.wantsTags.includes("Untagged")) return "want"
    return "unknown"
  }

  for (const t of tags) {
    const entry = dictionary[t]
    if (entry?.essentiality === "need") return "need"
    if (entry?.essentiality === "want") return "want"
  }

  for (const t of tags) {
    if (needsWants.needsTags.includes(t)) return "need"
    if (needsWants.wantsTags.includes(t)) return "want"
  }

  const dictEntry = dictionary[tag]
  if (dictEntry) return dictEntry.essentiality

  return "unknown"
}

export function getTagEntry(tag: string, dictionary: TagDictionary): TagDictionaryEntry | null {
  return dictionary[tag] ?? null
}
