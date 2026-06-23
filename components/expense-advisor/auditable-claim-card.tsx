"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { AuditableClaim } from "@/lib/expense-advisor/types"
import { cn } from "@/lib/utils"

function severityVariant(
  severity: AuditableClaim["severity"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "eliminate":
    case "cut":
      return "destructive"
    case "trim":
      return "default"
    default:
      return "secondary"
  }
}

function confidenceLabel(confidence: AuditableClaim["confidence"]) {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1)
}

interface AuditableClaimCardProps {
  claim: AuditableClaim
  defaultOpen?: boolean
  forceExpanded?: boolean
}

export function AuditableClaimCard({
  claim,
  defaultOpen = false,
  forceExpanded = false,
}: AuditableClaimCardProps) {
  const [open, setOpen] = React.useState(defaultOpen || forceExpanded)
  const isOpen = forceExpanded || open

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={forceExpanded ? undefined : setOpen}>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-snug pr-2">
              {claim.finding}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              <Badge variant={severityVariant(claim.severity)}>{claim.severity}</Badge>
              <Badge variant="outline">{confidenceLabel(claim.confidence)} confidence</Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                {claim.id}
              </Badge>
            </div>
          </div>
          {!forceExpanded && (
            <CollapsibleTrigger
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
              data-pdf-hide
            >
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {isOpen ? "Hide" : "Show"} reasoning & calculations
            </CollapsibleTrigger>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground mb-1">Confidence reason</p>
              <p>{claim.confidenceReason}</p>
            </div>

            {claim.reasoning.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground mb-1">Reasoning</p>
                <ul className="list-disc pl-5 space-y-1">
                  {claim.reasoning.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {claim.calculations.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground mb-1">Calculations</p>
                <div className="space-y-2">
                  {claim.calculations.map((calc, i) => (
                    <div key={i} className="rounded-md border bg-muted/50 p-3 font-mono text-xs">
                      <p className="font-sans font-medium text-sm mb-1">{calc.label}</p>
                      <p className="text-muted-foreground">{calc.formula}</p>
                      <p className="mt-1">
                        Inputs:{" "}
                        {Object.entries(calc.inputs)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(", ")}
                      </p>
                      <p className={cn("mt-1 font-semibold")}>
                        Result: {calc.result}
                        {calc.unit ? ` ${calc.unit}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(claim.evidence.transactionIds?.length ||
              claim.evidence.rowCount !== undefined) && (
              <div>
                <p className="font-medium text-muted-foreground mb-1">Evidence</p>
                {claim.evidence.rowCount !== undefined && (
                  <p>Rows: {claim.evidence.rowCount}</p>
                )}
                {claim.evidence.tagsUsed?.length ? (
                  <p>Tags: {claim.evidence.tagsUsed.join(", ")}</p>
                ) : null}
                {claim.evidence.filtersApplied?.length ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Filters: {claim.evidence.filtersApplied.join("; ")}
                  </p>
                ) : null}
                {claim.evidence.transactionIds?.length ? (
                  <p className="font-mono text-xs mt-1 break-all">
                    Transaction IDs (sample):{" "}
                    {claim.evidence.transactionIds.slice(0, 10).join(", ")}
                    {claim.evidence.transactionIds.length > 10
                      ? ` … +${claim.evidence.transactionIds.length - 10} more`
                      : ""}
                  </p>
                ) : null}
              </div>
            )}

            {claim.researchSources && claim.researchSources.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground mb-1">Sources</p>
                <ul className="space-y-1">
                  {claim.researchSources.map((s, i) => (
                    <li key={i}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline text-xs"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {claim.limitations.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground mb-1">Limitations</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  {claim.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
