"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, PiggyBank, Wallet, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { getTotalExpenses } from "@/lib/supabase"
import { useQuery } from "@tanstack/react-query"

interface FinancialMetricsProps {
  totalIncome: number | null
  totalExpenses: number | null
  totalInvestments: number | null
  bankBalance: number | null
  isLoading: boolean
}

// Move MetricRow outside component to avoid recreating on every render
const MetricRow = ({
  icon: Icon,
  label,
  value,
  color,
  formula,
  breakdown,
  isExpanded,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | null
  color: string
  formula?: string
  breakdown?: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
}) => {
  const hasBreakdown = !!breakdown || !!formula

  return (
    <div className="space-y-2">
      <Collapsible
        open={isExpanded}
        onOpenChange={onToggle}
        disabled={!hasBreakdown}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-semibold ${color}`}>
              {value !== null ? formatCurrency(value) : "—"}
            </span>
            {hasBreakdown && (
              <CollapsibleTrigger asChild>
                <button className="ml-2 p-1 hover:bg-muted rounded">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>
        {hasBreakdown && (
          <CollapsibleContent className="pt-2 pl-6">
            <div className="text-xs text-muted-foreground space-y-1 border-l-2 border-muted pl-3">
              {formula && (
                <div className="font-mono">
                  <div className="font-semibold mb-1">Formula:</div>
                  <div>{formula}</div>
                </div>
              )}
              {breakdown && <div className="mt-2">{breakdown}</div>}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

export function FinancialMetrics({
  totalIncome,
  totalExpenses,
  totalInvestments,
  bankBalance,
  isLoading,
}: FinancialMetricsProps) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

  const { data: expenseBreakdown } = useQuery({
    queryKey: ["expense-breakdown"],
    queryFn: async () => {
      const result = await getTotalExpenses()
      if (result.error) {
        throw result.error
      }
      return result
    },
    enabled: !isLoading,
  })

  const toggleExpanded = (item: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(item)) {
        next.delete(item)
      } else {
        next.add(item)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MetricRow
            icon={Wallet}
            label="Amount in Bank"
            value={bankBalance}
            isExpanded={expandedItems.has("Amount in Bank")}
            onToggle={() => toggleExpanded("Amount in Bank")}
            color="text-purple-600"
            formula="Latest closing balance from transactions"
          />

          <MetricRow
            icon={TrendingUp}
            label="Total Income"
            value={totalIncome}
            isExpanded={expandedItems.has("Total Income")}
            onToggle={() => toggleExpanded("Total Income")}
            color="text-green-600"
            formula="Sum of all deposit_amt from all transactions"
            breakdown={
              totalIncome !== null && (
                <div>
                  <div>All deposits: {formatCurrency(totalIncome)}</div>
                  <div className="text-xs mt-1 opacity-75">
                    Includes: Salary, transfers in, interest, etc.
                  </div>
                </div>
              )
            }
          />

          <MetricRow
            icon={TrendingDown}
            label="Net Expense"
            value={totalExpenses}
            isExpanded={expandedItems.has("Net Expense")}
            onToggle={() => toggleExpanded("Net Expense")}
            color="text-red-600"
            formula="All withdrawals - Investments"
            breakdown={
              expenseBreakdown && (
                <div className="space-y-1">
                  <div>Total withdrawals: {formatCurrency(expenseBreakdown.totalWithdrawals || 0)}</div>
                  <div className="text-green-600">
                    - Excluded investments: {formatCurrency(expenseBreakdown.excludedInvestments || 0)}
                  </div>
                  <div className="font-semibold mt-1 pt-1 border-t border-muted">
                    = Net Expense: {formatCurrency(expenseBreakdown.total || 0)}
                  </div>
                </div>
              )
            }
          />

          <MetricRow
            icon={PiggyBank}
            label="Total Investment"
            value={totalInvestments}
            isExpanded={expandedItems.has("Total Investment")}
            onToggle={() => toggleExpanded("Total Investment")}
            color="text-blue-600"
            formula="Sum of Investment withdrawals"
            breakdown={
              totalInvestments !== null && (
                <div>
                  <div>Investment withdrawals: {formatCurrency(totalInvestments)}</div>
                  <div className="text-xs mt-1 opacity-75">
                    All transactions tagged with "Investment"
                  </div>
                </div>
              )
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
