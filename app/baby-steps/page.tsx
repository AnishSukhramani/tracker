"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getBabySteps,
  updateBabySteps,
  getLatestClosingBalance,
  getMonthlyExpenseAverage,
  getThisYearMonthlyExpenseAverage,
  getTotalIncome,
  getTotalInvestments,
} from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { BabyStepsStepper } from "@/components/baby-steps-stepper"
import { validateNumber } from "@/lib/validation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const EMERGENCY_FUND_TARGET = 100000 // ₹1,00,000

export default function BabyStepsPage() {
  const queryClient = useQueryClient()
  const [debtTotal, setDebtTotal] = useState<string>("")
  const [mortgageTotal, setMortgageTotal] = useState<string>("")
  const [debtError, setDebtError] = useState<string>("")
  const [mortgageError, setMortgageError] = useState<string>("")
  const [step4Checked, setStep4Checked] = useState(false)
  const [step5Checked, setStep5Checked] = useState(false)
  const [step7Checked, setStep7Checked] = useState(false)
  const step4UpdateRef = useRef(false)

  const { data: babySteps, isLoading } = useQuery({
    queryKey: ["baby-steps"],
    queryFn: async () => {
      const result = await getBabySteps()
      if (result.error) {
        throw result.error
      }
      return result.data
    },
  })

  const { data: latestBalance } = useQuery({
    queryKey: ["latest-balance"],
    queryFn: async () => {
      const result = await getLatestClosingBalance()
      if (result.error) {
        throw result.error
      }
      return result.data || 0
    },
  })

  const { data: avgMonthlyExpense } = useQuery({
    queryKey: ["monthly-expense-avg"],
    queryFn: async () => {
      const result = await getMonthlyExpenseAverage()
      if (result.error) {
        throw result.error
      }
      return result.average || 0
    },
  })

  const { data: thisYearAvgMonthlyExpense } = useQuery({
    queryKey: ["this-year-monthly-expense-avg"],
    queryFn: async () => {
      const result = await getThisYearMonthlyExpenseAverage()
      if (result.error) {
        throw result.error
      }
      return result.average || 0
    },
  })

  const { data: totalIncome } = useQuery({
    queryKey: ["total-income"],
    queryFn: async () => {
      const result = await getTotalIncome()
      if (result.error) {
        throw result.error
      }
      return result.total || 0
    },
  })

  const { data: totalInvestments } = useQuery({
    queryKey: ["total-investments"],
    queryFn: async () => {
      const result = await getTotalInvestments()
      if (result.error) {
        throw result.error
      }
      return result.total || 0
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: {
      step_current?: number
      emergency_fund_amt?: number
      debt_total?: number
      mortgage_total?: number
      step4_invest_15_complete?: boolean
      step5_college_fund_complete?: boolean
      step7_build_wealth_complete?: boolean
    }) => {
      const result = await updateBabySteps(updates)
      if (result.error) {
        throw result.error
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["baby-steps"] })
    },
  })

  useEffect(() => {
    if (babySteps) {
      setDebtTotal(babySteps.debt_total?.toString() || "")
      setMortgageTotal(babySteps.mortgage_total?.toString() || "")
      setStep5Checked(babySteps.step5_college_fund_complete || false)
      setStep7Checked(babySteps.step7_build_wealth_complete || false)
    }
  }, [babySteps])

  // Step 1: Emergency Fund
  const step1Complete = (latestBalance || 0) >= EMERGENCY_FUND_TARGET
  const step1Progress = Math.min(((latestBalance || 0) / EMERGENCY_FUND_TARGET) * 100, 100)

  // Step 2: Pay off debt
  const step2Complete = (babySteps?.debt_total || 0) <= 0

  // Step 3: 3-6 Months expenses
  // Use this year's average for progress calculation
  const step3Target3Months = (thisYearAvgMonthlyExpense || 0) * 3
  const step3Target6Months = (thisYearAvgMonthlyExpense || 0) * 6
  const step3Complete = (latestBalance || 0) >= step3Target6Months
  const step3Progress3Months = step3Target3Months > 0
    ? Math.min(((latestBalance || 0) / step3Target3Months) * 100, 100)
    : 0
  const step3Progress6Months = step3Target6Months > 0
    ? Math.min(((latestBalance || 0) / step3Target6Months) * 100, 100)
    : 0

  // Step 4: Invest 15%
  // Calculate investment percentage of income
  const investmentPercentage = (totalIncome || 0) > 0
    ? ((totalInvestments || 0) / (totalIncome || 1)) * 100
    : 0
  const step4AutoComplete = investmentPercentage >= 15

  // Auto-calculate Step 4 completion based on investment percentage
  // and sync with database when it changes
  useEffect(() => {
    if (totalIncome !== undefined && totalInvestments !== undefined && !updateMutation.isPending && !step4UpdateRef.current) {
      const shouldBeComplete = step4AutoComplete
      // Only update if the calculated value differs from current state
      if (shouldBeComplete !== step4Checked) {
        step4UpdateRef.current = true
        setStep4Checked(shouldBeComplete)
        // Update database to reflect auto-calculated status
        updateMutation.mutate(
          { step4_invest_15_complete: shouldBeComplete },
          {
            onSettled: () => {
              step4UpdateRef.current = false
            },
          }
        )
      }
    }
  }, [step4AutoComplete, totalIncome, totalInvestments, step4Checked])
  // Step 5: College Fund (from database)
  // Step 6: Pay off home
  const step6Complete = (babySteps?.mortgage_total || 0) <= 0

  // Step 7: Build Wealth & Give (from database)

  // Calculate current step
  const currentStep = useMemo(() => {
    if (!step1Complete) return 1
    if (!step2Complete) return 2
    if (!step3Complete) return 3
    if (!step4Checked) return 4
    if (!step5Checked) return 5
    if (!step6Complete) return 6
    if (!step7Checked) return 7
    return 7
  }, [step1Complete, step2Complete, step3Complete, step4Checked, step5Checked, step6Complete, step7Checked])

  const handleSaveDebt = () => {
    const validation = validateNumber(debtTotal)
    if (!validation.isValid) {
      setDebtError(validation.error || "")
      return
    }
    setDebtError("")
    updateMutation.mutate({ debt_total: validation.number || 0 })
  }

  const handleSaveMortgage = () => {
    const validation = validateNumber(mortgageTotal)
    if (!validation.isValid) {
      setMortgageError(validation.error || "")
      return
    }
    setMortgageError("")
    updateMutation.mutate({ mortgage_total: validation.number || 0 })
  }

  const handleStep4Change = (checked: boolean) => {
    setStep4Checked(checked)
    updateMutation.mutate({ step4_invest_15_complete: checked })
  }

  const handleStep5Change = (checked: boolean) => {
    setStep5Checked(checked)
    updateMutation.mutate({ step5_college_fund_complete: checked })
  }

  const handleStep7Change = (checked: boolean) => {
    setStep7Checked(checked)
    updateMutation.mutate({ step7_build_wealth_complete: checked })
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Baby Steps</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Follow Dave Ramsey's 7 Baby Steps to financial freedom
        </p>
      </div>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="inputs">Input Data</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <BabyStepsStepper
            currentStep={currentStep}
            step1Complete={step1Complete}
            step2Complete={step2Complete}
            step3Complete={step3Complete}
            step4Complete={step4Checked}
            step5Complete={step5Checked}
            step6Complete={step6Complete}
            step7Complete={step7Checked}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {/* Step 1: Emergency Fund */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 1: Emergency Fund
                  {step1Complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Save ₹1,00,000 for emergencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current Balance</span>
                    <span className="font-medium">{formatCurrency(latestBalance || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Target</span>
                    <span className="font-medium">{formatCurrency(EMERGENCY_FUND_TARGET)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${step1Progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {step1Complete
                      ? "✓ Emergency fund complete!"
                      : `Need ${formatCurrency(EMERGENCY_FUND_TARGET - (latestBalance || 0))} more`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Pay Off Debt */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 2: Pay Off Debt
                  {step2Complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Pay off all non-mortgage debt using the debt snowball method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current Debt</span>
                    <span className="font-medium">{formatCurrency(babySteps?.debt_total || 0)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {step2Complete
                      ? "✓ All debt paid off!"
                      : `Remaining debt: ${formatCurrency(babySteps?.debt_total || 0)}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: 3-6 Months Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 3: 3-6 Months Expenses
                  {step3Complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Build 3-6 months of expenses in savings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current Balance</span>
                    <span className="font-medium">{formatCurrency(latestBalance || 0)}</span>
                  </div>
                  
                  {/* 3 Months Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Target (3 months)</span>
                      <span className="font-medium">{formatCurrency(step3Target3Months)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${step3Progress3Months}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step3Progress3Months >= 100
                        ? "✓ 3 months expenses saved!"
                        : `Need ${formatCurrency(Math.max(0, step3Target3Months - (latestBalance || 0)))} more`}
                    </p>
                  </div>

                  {/* 6 Months Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Target (6 months)</span>
                      <span className="font-medium">{formatCurrency(step3Target6Months)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${step3Progress6Months}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step3Complete
                        ? "✓ 6 months expenses saved!"
                        : `Need ${formatCurrency(Math.max(0, step3Target6Months - (latestBalance || 0)))} more`}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    This year's avg monthly expense: {formatCurrency(thisYearAvgMonthlyExpense || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Overall avg monthly expense: {formatCurrency(avgMonthlyExpense || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Invest 15% */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 4: Invest 15%
                  {step4Checked ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Invest 15% of household income into retirement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Income</span>
                    <span className="font-medium">{formatCurrency(totalIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Investments</span>
                    <span className="font-medium">{formatCurrency(totalInvestments || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Investment Percentage</span>
                    <span className={`font-medium ${investmentPercentage >= 15 ? 'text-green-600' : ''}`}>
                      {investmentPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full transition-all ${investmentPercentage >= 15 ? 'bg-green-600' : 'bg-primary'}`}
                      style={{ width: `${Math.min(investmentPercentage / 15 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {step4Checked
                      ? `✓ Investing ${investmentPercentage.toFixed(2)}% of income (Target: 15%)`
                      : (() => {
                          const needed = (15 - investmentPercentage) / 100 * (totalIncome || 0)
                          return `Currently investing ${investmentPercentage.toFixed(2)}% of income. Need ${needed > 0 ? formatCurrency(needed) : '0'} more to reach 15%`
                        })()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 5: College Fund */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 5: College Fund
                  {step5Checked ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Save for children's college education
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {step5Checked ? (
                    <span className="text-sm text-green-600 font-medium">✓ Completed</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not started</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 6: Pay Off Home */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 6: Pay Off Home
                  {step6Complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Pay off your home early
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Remaining Mortgage</span>
                    <span className="font-medium">{formatCurrency(babySteps?.mortgage_total || 0)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {step6Complete
                      ? "✓ Home paid off!"
                      : `Remaining: ${formatCurrency(babySteps?.mortgage_total || 0)}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 7: Build Wealth & Give */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 7: Build Wealth & Give
                  {step7Checked ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Build wealth and give generously
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {step7Checked ? (
                    <span className="text-sm text-green-600 font-medium">✓ Completed</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not started</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inputs" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Step 1: Emergency Fund */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 1: Emergency Fund
                  {step1Complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Automatically calculated from your account balance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current Balance</span>
                    <span className="font-medium">{formatCurrency(latestBalance || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Target</span>
                    <span className="font-medium">{formatCurrency(EMERGENCY_FUND_TARGET)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {step1Complete
                      ? "✓ Emergency fund complete! You have ₹1,00,000 or more in your account."
                      : `Need ${formatCurrency(EMERGENCY_FUND_TARGET - (latestBalance || 0))} more to reach ₹1,00,000`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Pay Off Debt Input */}
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Pay Off Debt</CardTitle>
                <CardDescription>
                  Enter your total non-mortgage debt amount
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="debt-total">Total Debt (₹)</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <Input
                        id="debt-total"
                        type="number"
                        value={debtTotal}
                        onChange={(e) => {
                          setDebtTotal(e.target.value)
                          setDebtError("")
                        }}
                        placeholder="0"
                        className={debtError ? "border-destructive" : ""}
                      />
                      {debtError && (
                        <p className="text-xs text-destructive mt-1">{debtError}</p>
                      )}
                    </div>
                    <Button onClick={handleSaveDebt} size="sm" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Update your total debt amount to track progress
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 6: Pay Off Home Input */}
            <Card>
              <CardHeader>
                <CardTitle>Step 6: Pay Off Home</CardTitle>
                <CardDescription>
                  Enter your remaining mortgage/home loan balance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mortgage-total">Remaining Mortgage (₹)</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <Input
                        id="mortgage-total"
                        type="number"
                        value={mortgageTotal}
                        onChange={(e) => {
                          setMortgageTotal(e.target.value)
                          setMortgageError("")
                        }}
                        placeholder="0"
                        className={mortgageError ? "border-destructive" : ""}
                      />
                      {mortgageError && (
                        <p className="text-xs text-destructive mt-1">{mortgageError}</p>
                      )}
                    </div>
                    <Button onClick={handleSaveMortgage} size="sm" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Update your remaining mortgage balance to track progress
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: 3-6 Months Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 3: 3-6 Months Expenses
                  {step3Complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Automatically calculated from your account balance and expenses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current Balance</span>
                    <span className="font-medium">{formatCurrency(latestBalance || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>This Year's Avg Monthly Expense</span>
                    <span className="font-medium">{formatCurrency(thisYearAvgMonthlyExpense || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Avg Monthly Expense</span>
                    <span className="font-medium">{formatCurrency(avgMonthlyExpense || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Target (3 months)</span>
                    <span className="font-medium">{formatCurrency(step3Target3Months)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Target (6 months)</span>
                    <span className="font-medium">{formatCurrency(step3Target6Months)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Progress is calculated based on this year's average monthly expenses.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Invest 15% */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step 4: Invest 15%
                  {step4Checked ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Automatically calculated from your income and investments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Income</span>
                    <span className="font-medium">{formatCurrency(totalIncome || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Investments</span>
                    <span className="font-medium">{formatCurrency(totalInvestments || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Investment Percentage</span>
                    <span className={`font-medium ${investmentPercentage >= 15 ? 'text-green-600' : ''}`}>
                      {investmentPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Target</span>
                    <span className="font-medium">15%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full transition-all ${investmentPercentage >= 15 ? 'bg-green-600' : 'bg-primary'}`}
                      style={{ width: `${Math.min(investmentPercentage / 15 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {step4Checked
                      ? `✓ Investing ${investmentPercentage.toFixed(2)}% of income (Target: 15%)`
                      : (() => {
                          const needed = (15 - investmentPercentage) / 100 * (totalIncome || 0)
                          return `Currently investing ${investmentPercentage.toFixed(2)}% of income. Need ${needed > 0 ? formatCurrency(needed) : '0'} more to reach 15%`
                        })()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 5: College Fund Checkbox */}
            <Card>
              <CardHeader>
                <CardTitle>Step 5: College Fund</CardTitle>
                <CardDescription>
                  Mark this step as complete when you're saving for children's college education
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="step5"
                    checked={step5Checked}
                    onCheckedChange={(checked) => handleStep5Change(checked === true)}
                    disabled={updateMutation.isPending}
                  />
                  <Label htmlFor="step5" className="cursor-pointer">
                    I am saving for children's college education
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Step 7: Build Wealth & Give Checkbox */}
            <Card>
              <CardHeader>
                <CardTitle>Step 7: Build Wealth & Give</CardTitle>
                <CardDescription>
                  Mark this step as complete when you're building wealth and giving generously
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="step7"
                    checked={step7Checked}
                    onCheckedChange={(checked) => handleStep7Change(checked === true)}
                    disabled={updateMutation.isPending}
                  />
                  <Label htmlFor="step7" className="cursor-pointer">
                    I am building wealth and giving generously
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Steps 1 and 3 are automatically calculated from your transaction data. 
                Step 1 uses your latest closing balance, and Step 3 uses this year's average monthly expenses for progress calculation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
