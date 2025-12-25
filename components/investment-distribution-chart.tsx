"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getTransactions } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"

interface InvestmentDistributionChartProps {
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
  "#a4de6c",
  "#d0ed57",
  "#ffc1cc",
  "#ffb347",
  "#87ceeb",
  "#dda0dd",
  "#f0e68c",
  "#98d8c8",
  "#f7dc6f",
  "#bb8fce",
  "#85c1e2",
]

export function InvestmentDistributionChart({
  transactions,
  isLoading,
}: InvestmentDistributionChartProps) {
  const [showAllTime, setShowAllTime] = React.useState(false)

  // Fetch all-time transactions when "All time" is toggled
  const { data: allTimeTransactions, isLoading: allTimeLoading } = useQuery({
    queryKey: ["all-time-investments"],
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

  const { data, totalInvestments } = React.useMemo(() => {
    const tagTotals = new Map<string, number>()
    const tagDisplayNames = new Map<string, string>() // Store original case for display
    let total = 0

    displayTransactions.forEach((txn) => {
      const tags = txn.tags || []
      // Only process transactions with "Investment" tag
      const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
      
      if (txn.withdrawal_amt > 0 && isInvestment) {
        total += txn.withdrawal_amt
        
        // Get all tags except "Investment"
        const otherTags = tags.filter((tag: string) => tag.toLowerCase() !== 'investment')
        
        if (otherTags.length === 0) {
          // If only "Investment" tag exists, mark as "Uncategorized"
          const uncategorized = "Uncategorized"
          tagTotals.set(uncategorized, (tagTotals.get(uncategorized) || 0) + txn.withdrawal_amt)
          tagDisplayNames.set(uncategorized, "Uncategorized")
        } else {
          // Group by other tags (fd, etc.) - case-insensitive grouping
          otherTags.forEach((tag) => {
            const normalizedTag = tag.toLowerCase()
            // Use first occurrence's original case for display
            if (!tagDisplayNames.has(normalizedTag)) {
              tagDisplayNames.set(normalizedTag, tag)
            }
            tagTotals.set(normalizedTag, (tagTotals.get(normalizedTag) || 0) + txn.withdrawal_amt)
          })
        }
      }
    })

    const chartData = Array.from(tagTotals.entries())
      .map(([normalizedName, value]) => ({ 
        name: tagDisplayNames.get(normalizedName) || normalizedName, 
        value 
      }))
      .sort((a, b) => b.value - a.value)

    return { data: chartData, totalInvestments: total }
  }, [displayTransactions])

  if (displayLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No investment data available. Tag transactions with "Investment" to see distribution.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Total Investments: <span className="text-lg">{formatCurrency(totalInvestments)}</span>
        </div>
        <Button
          variant={showAllTime ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAllTime(!showAllTime)}
        >
          {showAllTime ? "Selected Range" : "All Time"}
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => {
            // Show label if slice is large enough (> 1%) or always show in legend
            if ((percent || 0) > 0.01) {
              return `${name} ${((percent || 0) * 100).toFixed(0)}%`
            }
            return ""
          }}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(value),
            name,
          ]}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          wrapperStyle={{ paddingTop: "20px" }}
          formatter={(value: string) => value}
        />
      </PieChart>
    </ResponsiveContainer>
    </div>
  )
}

