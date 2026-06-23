"use client"

import * as React from "react"
import { Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ExpenseAdvisorReport } from "@/lib/expense-advisor/types"
import { AnalysisProgress, ANALYSIS_STEPS } from "@/components/expense-advisor/analysis-progress"
import { ReportView } from "@/components/expense-advisor/report-view"
import { ReportPdfExport } from "@/components/expense-advisor/report-pdf-export"
import "./report-pdf.css"

export default function ExpenseAdvisorPage() {
  const [report, setReport] = React.useState<ExpenseAdvisorReport | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isRunning, setIsRunning] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const runAnalysis = async () => {
    setError(null)
    setReport(null)
    setIsRunning(true)
    setCurrentStep(0)

    const stepInterval = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1))
    }, 8000)

    try {
      const body: Record<string, string> = {}
      if (dateFrom) body.dateFrom = dateFrom
      if (dateTo) body.dateTo = dateTo

      const response = await fetch("/api/expense-advisor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed")
      }

      setCurrentStep(ANALYSIS_STEPS.length)
      setReport(data as ExpenseAdvisorReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      clearInterval(stepInterval)
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Expense Advisor
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            One-shot expense analysis with research-backed cut recommendations. Reports are
            not saved — download PDF to keep a copy.
          </p>
        </div>
        {report && (
          <ReportPdfExport targetId="expense-advisor-report" disabled={isRunning} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Analysis</CardTitle>
          <CardDescription>
            Analyzes withdrawals only (excludes investment and IPO tags). Requires{" "}
            <code className="text-xs">OPENAI_API_KEY</code> and{" "}
            <code className="text-xs">TAVILY_API_KEY</code> in .env.local for the full
            research playbook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From (optional)</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To (optional)</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isRunning}
              />
            </div>
          </div>

          <Button onClick={runAnalysis} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AnalysisProgress currentStep={currentStep} isRunning={isRunning} />

      {report && (
        <div id="expense-advisor-report">
          <ReportView report={report} />
        </div>
      )}
    </div>
  )
}
