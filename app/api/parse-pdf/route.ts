import { NextRequest, NextResponse } from "next/server"
import { extractFixedDeposits } from "@/lib/pdf-fd-extractor"

// Dynamic import for pdf-parse (ESM module)
async function parsePdf(buffer: Buffer) {
  const pdfParseModule = await import("pdf-parse")
  // pdf-parse exports the function directly as a named export or the module itself
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = pdfParseModule as unknown as (buffer: Buffer) => Promise<any>
  return pdfParse(buffer)
}

export const runtime = "nodejs"
export const maxDuration = 30 // 30 seconds max for PDF parsing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse PDF
    const pdfData = await parsePdf(buffer)

    // Extract text content
    const text = pdfData.text

    // Extract Fixed Deposit information
    const fixedDeposits = extractFixedDeposits(text)

    // Extract metadata
    const metadata = {
      title: pdfData.info?.Title || null,
      author: pdfData.info?.Author || null,
      subject: pdfData.info?.Subject || null,
      creator: pdfData.info?.Creator || null,
      producer: pdfData.info?.Producer || null,
      creationDate: pdfData.info?.CreationDate || null,
      modDate: pdfData.info?.ModDate || null,
      pages: pdfData.numpages,
    }

    return NextResponse.json({
      success: true,
      text,
      metadata,
      fixedDeposits,
      // Raw PDF data for further processing
      raw: {
        numpages: pdfData.numpages,
        info: pdfData.info,
      },
    })
  } catch (error) {
    console.error("PDF parsing error:", error)
    return NextResponse.json(
      {
        error: "Failed to parse PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

