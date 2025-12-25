"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

interface NetWorthTickerProps {
  latestBalance: number | null | undefined
  fixedDeposits: Array<{ principal_amt: number | null }>
  totalInvestments: number
  isLoading: boolean
}

export function NetWorthTicker({
  latestBalance,
  fixedDeposits,
  totalInvestments,
  isLoading,
}: NetWorthTickerProps) {
  const netWorth = React.useMemo(() => {
    if (isLoading || latestBalance === undefined) return null
    
    const balance = latestBalance || 0
    const fdTotal = fixedDeposits.reduce(
      (sum, fd) => sum + (fd.principal_amt || 0),
      0
    )
    const investments = totalInvestments || 0
    
    // Net worth = Bank balance + Investments + FD Principal
    return balance + investments + fdTotal
  }, [latestBalance, fixedDeposits, totalInvestments, isLoading])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-12 w-48" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
          <p className="text-3xl font-bold">
            {netWorth !== null ? formatCurrency(netWorth) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Bank: {formatCurrency(latestBalance || 0)} + Investments:{" "}
            {formatCurrency(totalInvestments || 0)} + FD:{" "}
            {formatCurrency(
              fixedDeposits.reduce((sum, fd) => sum + (fd.principal_amt || 0), 0)
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

