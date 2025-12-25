import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_FILE_PATH = path.join(process.cwd(), "data", "needs-wants-tags.json")

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), "data")
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// Read tags from JSON file
async function readTags() {
  try {
    await ensureDataDirectory()
    const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8")
    return JSON.parse(fileContent)
  } catch (error) {
    // If file doesn't exist, return default structure
    return { needsTags: [], wantsTags: [] }
  }
}

// Write tags to JSON file
async function writeTags(needsTags: string[], wantsTags: string[]) {
  await ensureDataDirectory()
  const data = { needsTags, wantsTags }
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

export const runtime = "nodejs"

// GET: Read tags
export async function GET() {
  try {
    const data = await readTags()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error reading tags:", error)
    return NextResponse.json(
      { error: "Failed to read tags" },
      { status: 500 }
    )
  }
}

// POST: Update tags
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { needsTags, wantsTags } = body as {
      needsTags: string[]
      wantsTags: string[]
    }

    if (!Array.isArray(needsTags) || !Array.isArray(wantsTags)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      )
    }

    await writeTags(needsTags, wantsTags)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error writing tags:", error)
    return NextResponse.json(
      { error: "Failed to save tags" },
      { status: 500 }
    )
  }
}

