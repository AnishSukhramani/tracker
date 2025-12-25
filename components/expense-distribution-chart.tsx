"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getTransactions } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"

interface ExpenseDistributionChartProps {
  transactions: Array<{
    withdrawal_amt: number
    tags?: string[]
  }>
  isLoading: boolean
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00ff00",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#8884d8",
]

export function ExpenseDistributionChart({
  transactions,
  isLoading,
}: ExpenseDistributionChartProps) {
  const [showAllTime, setShowAllTime] = React.useState(false)

  // Fetch all-time transactions when "All time" is toggled
  const { data: allTimeTransactions, isLoading: allTimeLoading } = useQuery({
    queryKey: ["all-time-expenses"],
    queryFn: async () => {
      const result = await getTransactions()
      if (result.error) {
        throw result.error
      }
      return result.data || []
    },
    enabled: showAllTime, // Only fetch when toggle is on
  })

  // Use all-time data if toggle is on, otherwise use passed transactions
  const displayTransactions = showAllTime ? (allTimeTransactions || []) : transactions
  const displayLoading = showAllTime ? allTimeLoading : isLoading

  const { data, totalExpenses } = React.useMemo(() => {
    const tagTotals = new Map<string, number>()
    let total = 0

    displayTransactions.forEach((txn) => {
      // Skip investments - exclude transactions with "Investment" tag
      const tags = txn.tags || []
      const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
      
      if (txn.withdrawal_amt > 0 && !isInvestment) {
        total += txn.withdrawal_amt
        if (tags.length === 0) {
          const untagged = "Untagged"
          tagTotals.set(untagged, (tagTotals.get(untagged) || 0) + txn.withdrawal_amt)
        } else {
          tags.forEach((tag) => {
            tagTotals.set(tag, (tagTotals.get(tag) || 0) + txn.withdrawal_amt)
          })
        }
      }
    })

    const chartData = Array.from(tagTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 tags

    return { data: chartData, totalExpenses: total }
  }, [displayTransactions])

  if (displayLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No expense data available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Total Expenses: <span className="text-lg">{formatCurrency(totalExpenses)}</span>
        </div>
        <Button
          variant={showAllTime ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAllTime(!showAllTime)}
        >
          {showAllTime ? "Selected Range" : "All Time"}
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(value)
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
    </div>
  )
}

