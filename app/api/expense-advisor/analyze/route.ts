import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"
import { analyzeExpenses } from "@/lib/expense-advisor/analyze-expenses"
import type { TransactionRow } from "@/lib/expense-advisor/types"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { dateFrom, dateTo, skipResearch } = body as {
      dateFrom?: string
      dateTo?: string
      skipResearch?: boolean
    }

    const client = createServerSupabase()
    const { data, error } = await client
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })

    if (error) {
      console.error("Expense advisor fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      )
    }

    const transactions = (data ?? []) as TransactionRow[]

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions found. Upload transaction data first." },
        { status: 400 }
      )
    }

    const report = await analyzeExpenses(transactions, {
      dateFrom,
      dateTo,
      skipResearch: skipResearch ?? false,
    })

    if (report.dataAnalysis.summary.transactionCount === 0) {
      return NextResponse.json(
        {
          error:
            "No expense transactions in the selected period (withdrawals excluding investment/IPO).",
        },
        { status: 400 }
      )
    }

    return NextResponse.json(report)
  } catch (err) {
    console.error("Expense advisor analyze error:", err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate expense report",
      },
      { status: 500 }
    )
  }
}
