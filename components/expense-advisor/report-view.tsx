"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ExpenseAdvisorReport } from "@/lib/expense-advisor/types"
import { ReportCharts } from "./report-charts"
import { AuditableClaimCard } from "./auditable-claim-card"
import { formatCurrency } from "@/lib/utils"
import { TrendingDown, AlertTriangle, Shield, BookOpen } from "lucide-react"

interface ReportViewProps {
  report: ExpenseAdvisorReport
  forExport?: boolean
}

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return null
  const paragraphs = content.split(/\n\n+/).filter(Boolean)
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => {
        const lines = p.split("\n")
        if (lines[0]?.startsWith("**") || lines.some((l) => l.startsWith("- "))) {
          return (
            <div key={i} className="text-sm space-y-1">
              {lines.map((line, j) =>
                line.startsWith("- ") ? (
                  <li key={j} className="ml-4 list-disc">
                    {line.slice(2)}
                  </li>
                ) : (
                  <p key={j}>{line.replace(/\*\*/g, "")}</p>
                )
              )}
            </div>
          )
        }
        return (
          <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap">
            {p}
          </p>
        )
      })}
    </div>
  )
}

function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={`text-lg font-semibold pdf-section-title ${className}`.trim()}>
      {children}
    </h2>
  )
}

export function ReportView({ report, forExport = false }: ReportViewProps) {
  const { dataAnalysis, playbook, narrative, auditTrail, meta, research } = report
  const bc = dataAnalysis.bracketCreepSignals

  return (
    <div className="space-y-4">
      {/* Cover */}
      <div data-pdf-section data-pdf-cover className="pdf-section pdf-cover">
        <h1 className="text-2xl font-bold tracking-tight">Expense Advisor Report</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Period: {meta.period.from} → {meta.period.to}
        </p>
        <p className="text-sm text-muted-foreground">
          Generated: {new Date(meta.generatedAt).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-4">{meta.disclaimer}</p>
      </div>

      {/* KPI summary */}
      <div data-pdf-section className="pdf-section">
        <SectionTitle>Summary</SectionTitle>
        <div className="grid gap-3 pdf-kpi-grid md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(dataAnalysis.summary.totalExpenses)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {dataAnalysis.summary.transactionCount} txns ·{" "}
                {dataAnalysis.summary.monthCount} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Average</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(dataAnalysis.summary.monthlyAverage)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Wants Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(dataAnalysis.needsVsWants.wants)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Needs: {formatCurrency(dataAnalysis.needsVsWants.needs)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Bracket Creep Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold capitalize">{bc.riskLevel}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                {bc.narrative || "See audit trail."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {narrative.executiveSummary && (
        <div data-pdf-section className="pdf-section">
          <SectionTitle>Executive Summary</SectionTitle>
          <Card>
            <CardContent className="pt-6">
              <MarkdownBlock content={narrative.executiveSummary} />
            </CardContent>
          </Card>
        </div>
      )}

      <div data-pdf-section className="pdf-section">
        <SectionTitle>Part 1 — Data Analysis</SectionTitle>
        {narrative.dataHalf && (
          <Card className="mb-3">
            <CardContent className="pt-6">
              <MarkdownBlock content={narrative.dataHalf} />
            </CardContent>
          </Card>
        )}
      </div>

      <ReportCharts report={report} forExport={forExport} />

      <div data-pdf-section className="pdf-section">
        <SectionTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Part 2 — Research Playbook
        </SectionTitle>
        {narrative.researchHalf && (
          <Card className="mb-3">
            <CardContent className="pt-6">
              <MarkdownBlock content={narrative.researchHalf} />
            </CardContent>
          </Card>
        )}
      </div>

      {playbook.frameworkInsights.length > 0 && (
        <div data-pdf-section className="pdf-section">
          <SectionTitle>Advisor Framework Insights</SectionTitle>
          <Card>
            <CardContent className="pt-6 space-y-3">
              {playbook.frameworkInsights.map((fi, i) => (
                <div key={i} className="border-b pb-3 last:border-0">
                  <p className="font-medium text-sm">{fi.framework}</p>
                  <p className="text-sm text-muted-foreground">{fi.principle}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Applied to: {fi.appliedTo.join(", ")} · Claims:{" "}
                    {fi.relatedClaimIds.join(", ")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {playbook.cutCandidates.length > 0 && (
        <div data-pdf-section className="pdf-section">
          <SectionTitle>Cut Candidates</SectionTitle>
          <Card>
            <CardContent className="pt-6 space-y-3">
              {playbook.cutCandidates.map((cut, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="destructive">{cut.severity}</Badge>
                    <span className="font-medium text-sm">{cut.tag}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(cut.amount)}
                    </span>
                  </div>
                  <p className="text-sm">{cut.action}</p>
                  <p className="text-xs text-muted-foreground">{cut.bracketCreepNote}</p>
                  <p className="text-xs">{cut.researchBasis}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {playbook.subscriptionOptimizations.length > 0 && (
        <div data-pdf-section className="pdf-section">
          <SectionTitle>Subscription Optimizations</SectionTitle>
          <Card>
            <CardContent className="pt-6 space-y-3">
              {playbook.subscriptionOptimizations.map((sub, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1">
                  <p className="font-medium text-sm">
                    {sub.name} — {formatCurrency(sub.currentCost)}
                  </p>
                  <p className="text-sm">{sub.recommendation}</p>
                  <p className="text-sm text-green-600">
                    Potential savings: {formatCurrency(sub.savings)}
                  </p>
                  <p className="text-xs text-muted-foreground">{sub.usageCaveat}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {playbook.behavioralTactics.length > 0 && (
        <div data-pdf-section className="pdf-section">
          <SectionTitle>Behavioral Tactics</SectionTitle>
          <Card>
            <CardContent className="pt-6">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {playbook.behavioralTactics.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {playbook.lockInStrategies.length > 0 && (
        <div data-pdf-section className="pdf-section">
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Lock-In Strategies (anti bracket creep)
            </span>
          </SectionTitle>
          <Card>
            <CardContent className="pt-6">
              <ul className="list-disc pl-5 text-sm space-y-1">
                {playbook.lockInStrategies.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {research.sources.length > 0 && (
        <div data-pdf-section className="pdf-section">
          <SectionTitle>Research Sources</SectionTitle>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{research.queriesRun.length} queries run</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {research.sources.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.title}</span>
                    <span className="text-muted-foreground text-xs block break-all">
                      {s.url}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <div data-pdf-section className="pdf-section">
        <SectionTitle>Audit Trail — Data Scope</SectionTitle>
        <Card>
          <CardContent className="pt-6 text-sm space-y-1">
            <p>
              Fetched: {auditTrail.dataScope.totalTransactionsFetched} · Included:{" "}
              {auditTrail.dataScope.expensesIncluded} · Excluded:{" "}
              {auditTrail.dataScope.expensesExcluded}
            </p>
            <p className="text-muted-foreground text-xs">
              Exclusion rules: {auditTrail.dataScope.exclusionRules.join("; ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {auditTrail.claims.map((claim) => (
        <div key={claim.id} data-pdf-section className="pdf-section">
          <AuditableClaimCard claim={claim} forceExpanded />
        </div>
      ))}
    </div>
  )
}
