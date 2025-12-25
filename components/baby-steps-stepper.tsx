"use client"

import * as React from "react"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BabyStepsStepperProps {
  currentStep: number
  step1Complete: boolean
  step2Complete: boolean
  step3Complete: boolean
  step4Complete: boolean
  step5Complete: boolean
  step6Complete: boolean
  step7Complete: boolean
}

const STEPS = [
  { number: 1, title: "Emergency Fund", description: "Save ₹1,00,000" },
  { number: 2, title: "Pay Off Debt", description: "Debt snowball" },
  { number: 3, title: "3-6 Months Expenses", description: "Build savings" },
  { number: 4, title: "Invest 15%", description: "Retirement investing" },
  { number: 5, title: "College Fund", description: "Children's education" },
  { number: 6, title: "Pay Off Home", description: "Mortgage free" },
  { number: 7, title: "Build Wealth & Give", description: "Live and give" },
]

export function BabyStepsStepper({
  currentStep,
  step1Complete,
  step2Complete,
  step3Complete,
  step4Complete,
  step5Complete,
  step6Complete,
  step7Complete,
}: BabyStepsStepperProps) {
  const stepStatuses = [
    step1Complete,
    step2Complete,
    step3Complete,
    step4Complete,
    step5Complete,
    step6Complete,
    step7Complete,
  ]

  return (
    <div className="space-y-4">
      {STEPS.map((step, index) => {
        const isComplete = stepStatuses[index]
        const isCurrent = currentStep === step.number
        const isPast = currentStep > step.number

        return (
          <div
            key={step.number}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border transition-colors",
              isCurrent && "bg-primary/5 border-primary",
              isPast && "bg-muted/50",
              isComplete && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
            )}
          >
            <div className="flex-shrink-0">
              {isComplete ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Circle
                  className={cn(
                    "h-6 w-6",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Step {step.number}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {step.title}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
            {isCurrent && (
              <span className="text-xs font-medium text-primary">Current</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

