"use client"

import { Loader2, CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  "Fetching transactions",
  "Analyzing expenses",
  "Planning research",
  "Searching the web",
  "Synthesizing report",
]

interface AnalysisProgressProps {
  currentStep: number
  isRunning: boolean
}

export function AnalysisProgress({ currentStep, isRunning }: AnalysisProgressProps) {
  if (!isRunning) return null

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Generating report…</p>
      <p className="text-xs text-muted-foreground">
        This may take 30–90 seconds. The report is not saved anywhere.
      </p>
      <ul className="space-y-2">
        {STEPS.map((step, index) => {
          const done = index < currentStep
          const active = index === currentStep
          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-2 text-sm",
                done && "text-muted-foreground",
                active && "text-foreground font-medium"
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : active ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {step}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { STEPS as ANALYSIS_STEPS }
