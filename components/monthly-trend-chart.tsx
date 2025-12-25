"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { format, parseISO, startOfMonth } from "date-fns"

interface MonthlyTrendChartProps {
  transactions: Array<{
    date: string
    withdrawal_amt: number
    deposit_amt: number
    tags?: string[]
  }>
  isLoading: boolean
}

export function MonthlyTrendChart({
  transactions,
  isLoading,
}: MonthlyTrendChartProps) {
  const data = React.useMemo(() => {
    const monthlyData = new Map<string, { income: number; expense: number }>()

    transactions.forEach((txn) => {
      const monthKey = format(startOfMonth(parseISO(txn.date)), "MMM yyyy")
      const current = monthlyData.get(monthKey) || { income: 0, expense: 0 }
      
      // Check if transaction is an investment
      const tags = txn.tags || []
      const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
      
      if (txn.deposit_amt > 0) {
        current.income += txn.deposit_amt
      }
      // Only count withdrawals as expenses if they're not investments
      if (txn.withdrawal_amt > 0 && !isInvestment) {
        current.expense += txn.withdrawal_amt
      }
      
      monthlyData.set(monthKey, current)
    })

    return Array.from(monthlyData.entries())
      .map(([month, values]) => ({
        month,
        income: values.income,
        expense: values.expense,
      }))
      .sort((a, b) => {
        const dateA = parseISO(`01 ${a.month}`)
        const dateB = parseISO(`01 ${b.month}`)
        return dateA.getTime() - dateB.getTime()
      })
  }, [transactions])

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No transaction data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-IN", {
              notation: "compact",
              style: "currency",
              currency: "INR",
            }).format(value)
          }
        />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(value)
          }
        />
        <Legend />
        <Bar dataKey="income" fill="#82ca9d" name="Income" />
        <Bar dataKey="expense" fill="#ff8042" name="Expense" />
      </BarChart>
    </ResponsiveContainer>
  )
}

