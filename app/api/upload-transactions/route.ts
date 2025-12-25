import { NextRequest, NextResponse } from "next/server"
import { upsertTransactions } from "@/lib/supabase"
import { removeDuplicates, prepareTransactionForUpsert } from "@/lib/duplicate-detection"
import { normalizeDate, normalizeAmount } from "@/lib/csv-parser"
import type { Database } from "@/lib/database.types"
import type { ColumnMapping, DatabaseColumn } from "@/components/column-mapping"

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactions, mapping } = body as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transactions: Record<string, any>[]
      mapping: Record<string, DatabaseColumn>
    }

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Invalid transactions data" },
        { status: 400 }
      )
    }

    if (!mapping || typeof mapping !== "object") {
      return NextResponse.json(
        { error: "Invalid column mapping" },
        { status: 400 }
      )
    }

    // Validate required mappings
    // Mapping object has CSV column names as keys and DB column names as values
    const mappedDbColumns = Object.values(mapping).filter((col) => col !== "skip" && col !== null)
    const hasDate = mappedDbColumns.includes("date")
    const hasNarration = mappedDbColumns.includes("narration")
    
    if (!hasDate || !hasNarration) {
      return NextResponse.json(
        { error: "Date and Narration columns are required. Please map at least one CSV column to 'date' and one to 'narration'." },
        { status: 400 }
      )
    }

    // Transform transactions using the mapping
    const transformedTransactions: TransactionInsert[] = transactions
      .map((row, index) => {
        const transaction: Partial<TransactionInsert> = {}

        // Map each database column
        Object.entries(mapping).forEach(([csvColumn, dbColumn]) => {
          if (dbColumn === "skip" || !dbColumn) return

          // Try to get value - handle case where column name might not match exactly
          let value = row[csvColumn]
          
          // If value is undefined, try case-insensitive match
          if (value === undefined) {
            const matchingKey = Object.keys(row).find(
              key => key.toLowerCase() === csvColumn.toLowerCase()
            )
            if (matchingKey) {
              value = row[matchingKey]
            }
          }

          switch (dbColumn) {
            case "date":
              transaction.date = normalizeDate(value) || undefined
              break
            case "value_date":
              transaction.value_date = normalizeDate(value) || null
              break
            case "narration":
              transaction.narration = String(value || "").trim()
              break
            case "ref_no":
              transaction.ref_no = value ? String(value).trim() : null
              break
            case "withdrawal_amt":
              transaction.withdrawal_amt = normalizeAmount(value)
              break
            case "deposit_amt":
              transaction.deposit_amt = normalizeAmount(value)
              break
            case "closing_balance":
              transaction.closing_balance = normalizeAmount(value) || null
              break
          }
        })

        // Set defaults
        transaction.withdrawal_amt = transaction.withdrawal_amt ?? 0
        transaction.deposit_amt = transaction.deposit_amt ?? 0
        transaction.category = transaction.category || "Uncategorized"
        transaction.tags = transaction.tags || []

        // Validate required fields
        if (!transaction.date || !transaction.narration) {
          console.warn(`Skipping invalid transaction at index ${index}:`, {
            hasDate: !!transaction.date,
            hasNarration: !!transaction.narration,
            rowKeys: Object.keys(row),
            mapping,
          })
          return null // Skip invalid transactions
        }

        return transaction as TransactionInsert
      })
      .filter((txn): txn is TransactionInsert => txn !== null)

    if (transformedTransactions.length === 0) {
      return NextResponse.json(
        { error: "No valid transactions to upload" },
        { status: 400 }
      )
    }

    // Remove duplicates before uploading
    const uniqueTransactions = removeDuplicates(transformedTransactions)

    // Upload to database
    try {
      const result = await upsertTransactions(uniqueTransactions)

      if (result.error) {
        console.error("Supabase error:", result.error)
        return NextResponse.json(
          {
            error: "Failed to upload transactions",
            message: result.error.message || "Database error occurred",
            details: result.error,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        uploaded: uniqueTransactions.length,
        total: transformedTransactions.length,
        duplicates: transformedTransactions.length - uniqueTransactions.length,
      })
    } catch (dbError) {
      console.error("Database upload error:", dbError)
      return NextResponse.json(
        {
          error: "Failed to upload transactions to database",
          message: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        error: "Failed to process upload",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

