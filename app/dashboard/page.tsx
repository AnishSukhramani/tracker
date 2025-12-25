"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTotalIncome, getTotalExpenses, getTotalInvestments, getTransactions } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DashboardPage() {
  const queryClient = useQueryClient()

  // Fetch needs/wants tags from JSON file
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ["needs-wants-tags"],
    queryFn: async () => {
      const response = await fetch("/api/needs-wants-tags")
      if (!response.ok) {
        throw new Error("Failed to fetch tags")
      }
      const data = await response.json()
      return { needsTags: data.needsTags || [], wantsTags: data.wantsTags || [] }
    },
  })

  const needsTags = tagsData?.needsTags || []
  const wantsTags = tagsData?.wantsTags || []

  // Mutation to save tags to JSON file
  const saveTagsMutation = useMutation({
    mutationFn: async ({ needsTags, wantsTags }: { needsTags: string[]; wantsTags: string[] }) => {
      const response = await fetch("/api/needs-wants-tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ needsTags, wantsTags }),
      })
      if (!response.ok) {
        throw new Error("Failed to save tags")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["needs-wants-tags"] })
    },
  })

  const { data: netIncome, isLoading: incomeLoading } = useQuery({
    queryKey: ["net-income"],
    queryFn: async () => {
      const result = await getTotalIncome()
      if (result.error) {
        throw result.error
      }
      return result.total || 0
    },
  })

  const { data: netExpense, isLoading: expenseLoading } = useQuery({
    queryKey: ["net-expense"],
    queryFn: async () => {
      const result = await getTotalExpenses()
      if (result.error) {
        throw result.error
      }
      return result.total || 0
    },
  })

  const { data: investments, isLoading: investmentsLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const result = await getTotalInvestments()
      if (result.error) {
        throw result.error
      }
      return result.total || 0
    },
  })

  const { data: allTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["all-transactions-for-charts"],
    queryFn: async () => {
      const result = await getTransactions()
      if (result.error) {
        throw result.error
      }
      return result.data || []
    },
  })

  // Monthly Analysis state
  const [selectedMonth, setSelectedMonth] = React.useState<string>("")
  const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null } | "all">("all")

  // Get available months from transactions
  const availableMonths = React.useMemo(() => {
    if (!allTransactions) return []
    
    const monthSet = new Set<string>()
    allTransactions.forEach((txn) => {
      if (txn.date) {
        try {
          const date = new Date(txn.date)
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear().toString().slice(-2)}`
            monthSet.add(monthKey)
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    })
    
    return Array.from(monthSet).sort((a, b) => {
      // Sort by date (newest first)
      try {
        const [monthA, yearA] = a.split(' ')
        const [monthB, yearB] = b.split(' ')
        const dateA = new Date(`${monthA} 1, 20${yearA}`)
        const dateB = new Date(`${monthB} 1, 20${yearB}`)
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
        return dateB.getTime() - dateA.getTime()
      } catch (e) {
        return 0
      }
    })
  }, [allTransactions])

  // Set default selected month to the most recent month
  React.useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0])
    }
  }, [availableMonths, selectedMonth])

  // Calculate monthly expenses and investments for line chart
  const monthlyTrendData = React.useMemo(() => {
    if (!allTransactions) return []

    // Group transactions by month
    const monthMap = new Map<string, { expenses: number; investments: number }>()

    allTransactions.forEach((txn) => {
      if (!txn.date) return
      
      try {
        const txnDate = new Date(txn.date)
        if (isNaN(txnDate.getTime())) return

        // Apply date range filter
        if (dateRange !== "all") {
          if (dateRange.from && txnDate < dateRange.from) return
          if (dateRange.to) {
            const toDate = new Date(dateRange.to)
            toDate.setHours(23, 59, 59, 999) // End of day
            if (txnDate > toDate) return
          }
        }

        const monthKey = `${txnDate.toLocaleString('default', { month: 'short' })} ${txnDate.getFullYear()}`
        const tags = txn.tags || []
        const hasInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
        const hasIPO = tags.some((tag: string) => tag.toLowerCase().includes('ipo'))

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { expenses: 0, investments: 0 })
        }

        const monthData = monthMap.get(monthKey)!

        // Expenses: withdrawals excluding Investment and IPO tags
        if (txn.withdrawal_amt > 0 && !hasInvestment && !hasIPO) {
          monthData.expenses += Number(txn.withdrawal_amt || 0)
        }

        // Investments: withdrawals with Investment tag (not IPO)
        if (txn.withdrawal_amt > 0 && hasInvestment && !hasIPO) {
          monthData.investments += Number(txn.withdrawal_amt || 0)
        }
      } catch (e) {
        // Skip invalid dates
      }
    })

    // Convert to array and sort by date
    return Array.from(monthMap.entries())
      .map(([month, data]) => {
        // Parse month string to date for sorting
        const [monthStr, yearStr] = month.split(' ')
        const date = new Date(`${monthStr} 1, ${yearStr}`)
        return {
          month,
          date: date.getTime(),
          expenses: data.expenses,
          investments: data.investments,
        }
      })
      .sort((a, b) => a.date - b.date)
      .map(({ month, expenses, investments }) => ({ month, expenses, investments }))
  }, [allTransactions, dateRange])

  // Calculate monthly expenses by tag
  const monthlyExpensesByTag = React.useMemo(() => {
    if (!allTransactions || !selectedMonth) return []

    // Parse selected month (e.g., "Nov 25")
    try {
      const [monthStr, yearStr] = selectedMonth.split(' ')
      const selectedDate = new Date(`${monthStr} 1, 20${yearStr}`)
      if (isNaN(selectedDate.getTime())) return []
      
      const year = selectedDate.getFullYear()
      const month = selectedDate.getMonth()

      // Filter transactions for the selected month
      const monthTransactions = allTransactions.filter((txn) => {
        if (!txn.date) return false
        try {
          const txnDate = new Date(txn.date)
          if (isNaN(txnDate.getTime())) return false
          
          const tags = txn.tags || []
          const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
          
          // Include only expenses (withdrawals) and exclude investments
          return (
            txnDate.getFullYear() === year &&
            txnDate.getMonth() === month &&
            txn.withdrawal_amt > 0 &&
            !isInvestment
          )
        } catch (e) {
          return false
        }
      })

      // Group by tags
      const tagTotals = new Map<string, number>()

      monthTransactions.forEach((txn) => {
        const tags = txn.tags || []
        if (tags.length === 0) {
          const untagged = "Untagged"
          tagTotals.set(untagged, (tagTotals.get(untagged) || 0) + txn.withdrawal_amt)
        } else {
          tags.forEach((tag: string) => {
            // Skip investment tag if somehow it got through
            if (tag.toLowerCase() !== 'investment') {
              tagTotals.set(tag, (tagTotals.get(tag) || 0) + txn.withdrawal_amt)
            }
          })
        }
      })

      return Array.from(tagTotals.entries())
        .map(([tag, expense]) => ({ tag, expense }))
        .sort((a, b) => b.expense - a.expense)
    } catch (e) {
      return []
    }
  }, [allTransactions, selectedMonth])

  // Calculate expense distribution by tags
  const expenseChartData = React.useMemo(() => {
    if (!allTransactions) return []

    const tagTotals = new Map<string, number>()

    allTransactions.forEach((txn) => {
      const tags = txn.tags || []
      // Exclude transactions with "Investment" tag
      const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
      
      if (txn.withdrawal_amt > 0 && !isInvestment) {
        if (tags.length === 0) {
          const untagged = "Untagged"
          tagTotals.set(untagged, (tagTotals.get(untagged) || 0) + txn.withdrawal_amt)
        } else {
          tags.forEach((tag: string) => {
            tagTotals.set(tag, (tagTotals.get(tag) || 0) + txn.withdrawal_amt)
          })
        }
      }
    })

    return Array.from(tagTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [allTransactions])

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

  // Get all available tags (excluding Investment and already assigned tags)
  const availableTags = React.useMemo(() => {
    if (!allTransactions) return []
    
    const tagSet = new Set<string>()
    allTransactions.forEach((txn) => {
      const tags = txn.tags || []
      tags.forEach((tag: string) => {
        const lowerTag = tag.toLowerCase()
        if (lowerTag !== 'investment' && tag !== 'Untagged') {
          tagSet.add(tag)
        }
      })
    })
    
    // Also include "Untagged" if there are untagged transactions
    const hasUntagged = allTransactions.some((txn) => {
      const tags = txn.tags || []
      const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
      return txn.withdrawal_amt > 0 && !isInvestment && tags.length === 0
    })
    if (hasUntagged) {
      tagSet.add('Untagged')
    }
    
    return Array.from(tagSet).sort()
  }, [allTransactions])

  // Filter out already assigned tags
  const unassignedTags = React.useMemo(() => {
    const assigned = new Set([...needsTags, ...wantsTags])
    return availableTags.filter(tag => !assigned.has(tag))
  }, [availableTags, needsTags, wantsTags])

  // Calculate needs and wants totals
  const { needsTotal, wantsTotal } = React.useMemo(() => {
    if (!allTransactions) return { needsTotal: 0, wantsTotal: 0 }

    let needs = 0
    let wants = 0

    allTransactions.forEach((txn) => {
      const tags = txn.tags || []
      const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
      
      if (txn.withdrawal_amt > 0 && !isInvestment) {
        const hasNeedsTag = needsTags.some((needTag: string) => {
          if (needTag === 'Untagged') {
            return tags.length === 0
          }
          return tags.includes(needTag)
        })
        
        const hasWantsTag = wantsTags.some((wantTag: string) => {
          if (wantTag === 'Untagged') {
            return tags.length === 0
          }
          return tags.includes(wantTag)
        })

        if (hasNeedsTag) {
          needs += txn.withdrawal_amt
        } else if (hasWantsTag) {
          wants += txn.withdrawal_amt
        }
      }
    })

    return { needsTotal: needs, wantsTotal: wants }
  }, [allTransactions, needsTags, wantsTags])

  // Calculate percentages and ratio
  const needsPercentage = netExpense && netExpense > 0 ? ((needsTotal / netExpense) * 100).toFixed(1) : '0'
  const wantsPercentage = netExpense && netExpense > 0 ? ((wantsTotal / netExpense) * 100).toFixed(1) : '0'
  const needsWantsRatio = wantsTotal > 0 ? (needsTotal / wantsTotal).toFixed(2) : '0'

  const handleAddNeed = (tag: string) => {
    if (tag && !needsTags.includes(tag) && !wantsTags.includes(tag)) {
      saveTagsMutation.mutate({
        needsTags: [...needsTags, tag],
        wantsTags,
      })
    }
  }

  const handleAddWant = (tag: string) => {
    if (tag && !wantsTags.includes(tag) && !needsTags.includes(tag)) {
      saveTagsMutation.mutate({
        needsTags,
        wantsTags: [...wantsTags, tag],
      })
    }
  }

  const handleRemoveNeed = (tag: string) => {
    saveTagsMutation.mutate({
      needsTags: needsTags.filter((t: string) => t !== tag),
      wantsTags,
    })
  }

  const handleRemoveWant = (tag: string) => {
    saveTagsMutation.mutate({
      needsTags,
      wantsTags: wantsTags.filter((t: string) => t !== tag),
    })
  }

  const barChartData = [
    {
      name: 'Needs',
      value: needsTotal,
      fill: '#3b82f6', // blue
    },
    {
      name: 'Wants',
      value: wantsTotal,
      fill: '#a855f7', // purple
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your financial health, spending patterns, and progress
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <p className="text-3xl font-bold text-green-600">
                {netIncome !== undefined ? formatCurrency(netIncome) : "—"}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Sum of all deposits from transactions table
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Net Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <p className="text-3xl font-bold text-red-600">
                {netExpense !== undefined ? formatCurrency(netExpense) : "—"}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Sum of withdrawals excluding transactions with "Investment" tag
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-blue-600" />
              Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {investmentsLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <p className="text-3xl font-bold text-blue-600">
                {investments !== undefined ? formatCurrency(investments) : "—"}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Sum of withdrawals from transactions with "Investment" tag
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeLoading || expenseLoading || investmentsLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <p className="text-3xl font-bold text-purple-600">
                {netIncome !== undefined && netExpense !== undefined && investments !== undefined
                  ? formatCurrency(netIncome - netExpense - investments)
                  : "—"}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Net Income - Net Expense - Investments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : expenseChartData.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No expense data available
            </div>
          ) : (
            <div className="flex flex-row gap-6 items-start">
              <div className="flex-1 min-w-0">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      label={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseChartData.map((entry, index) => (
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-[400px]">
                <div 
                  className="grid gap-x-4 gap-y-2"
                  style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
                >
                  {expenseChartData.map((entry, index) => {
                    const total = expenseChartData.reduce((sum, item) => sum + item.value, 0)
                    const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0'
                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm whitespace-nowrap">
                          {entry.name} ({percentage}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Need/Want Ratio</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 rounded-md">
                Needs: {needsPercentage}%
              </div>
              <div className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900 rounded-md">
                Wants: {wantsPercentage}%
              </div>
              <div className="px-3 py-1.5 bg-muted rounded-md font-semibold">
                Ratio: {needsWantsRatio}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side: Needs and Wants tag selection */}
            <div className="space-y-6">
              {/* Needs Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Needs</Label>
                <Select onValueChange={handleAddNeed} disabled={tagsLoading || unassignedTags.length === 0 || saveTagsMutation.isPending}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tagsLoading ? "Loading..." : unassignedTags.length === 0 ? "No available tags" : "Select a tag to add to Needs..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedTags.map((tag: string) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                  {needsTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tags selected</p>
                  ) : (
                    needsTags.map((tag: string) => (
                      <div
                        key={tag}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 rounded-md"
                      >
                        <span className="text-sm">{tag}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-blue-200 dark:hover:bg-blue-800"
                          onClick={() => handleRemoveNeed(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Wants Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Wants</Label>
                <Select onValueChange={handleAddWant} disabled={tagsLoading || unassignedTags.length === 0 || saveTagsMutation.isPending}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tagsLoading ? "Loading..." : unassignedTags.length === 0 ? "No available tags" : "Select a tag to add to Wants..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedTags.map((tag: string) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                  {wantsTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tags selected</p>
                  ) : (
                    wantsTags.map((tag: string) => (
                      <div
                        key={tag}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900 rounded-md"
                      >
                        <span className="text-sm">{tag}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-purple-200 dark:hover:bg-purple-800"
                          onClick={() => handleRemoveWant(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Bar chart */}
            <div className="w-full">
              {transactionsLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
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
                    <Bar dataKey="value">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Monthly Trend Line Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-semibold">Monthly Trend</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={dateRange === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("all")}
                  >
                    All Time
                  </Button>
                  {dateRange !== "all" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="date-from" className="text-xs whitespace-nowrap">
                          From:
                        </Label>
                        <input
                          id="date-from"
                          type="date"
                          value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setDateRange({
                                from: new Date(e.target.value),
                                to: dateRange.to || new Date(e.target.value),
                              })
                            }
                          }}
                          className="px-2 py-1 text-sm border rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="date-to" className="text-xs whitespace-nowrap">
                          To:
                        </Label>
                        <input
                          id="date-to"
                          type="date"
                          value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setDateRange({
                                from: dateRange.from || new Date(e.target.value),
                                to: new Date(e.target.value),
                              })
                            }
                          }}
                          className="px-2 py-1 text-sm border rounded"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {transactionsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : monthlyTrendData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No data available for the selected range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
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
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Expenses"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="investments"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Investments"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Label htmlFor="month-select" className="text-sm font-medium">
                Select Month:
              </Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month-select" className="w-[180px]">
                  <SelectValue placeholder="Select a month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month: string) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {transactionsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : monthlyExpensesByTag.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                {selectedMonth ? `No expense data available for ${selectedMonth}` : "Please select a month"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead className="text-right">Net Expense</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyExpensesByTag.map((item: { tag: string; expense: number }) => (
                      <TableRow key={item.tag}>
                        <TableCell className="font-medium">{item.tag}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.expense)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          monthlyExpensesByTag.reduce((sum: number, item: { tag: string; expense: number }) => sum + item.expense, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
