"use client"

import { useQuery } from "@tanstack/react-query"
import { getTotalIncome, getTransactions } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CashFlowPage() {
  const { data: totalIncome, isLoading: incomeLoading } = useQuery({
    queryKey: ["total-income"],
    queryFn: async () => {
      const result = await getTotalIncome()
      if (result.error) {
        throw result.error
      }
      return result.total || 0
    },
  })

  const { data: totalExpenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["total-expenses-excluding-investment-ipo"],
    queryFn: async () => {
      const result = await getTransactions()
      if (result.error) {
        throw result.error
      }
      
      const transactions = result.data || []
      const total = transactions
        .filter((txn) => {
          const tags = txn.tags || []
          const hasInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
          const hasIPO = tags.some((tag: string) => tag.toLowerCase().includes('ipo'))
          return !hasInvestment && !hasIPO && txn.withdrawal_amt > 0
        })
        .reduce((sum, txn) => sum + Number(txn.withdrawal_amt || 0), 0)
      
      return total
    },
  })

  const { data: totalInvestments, isLoading: investmentsLoading } = useQuery({
    queryKey: ["total-investments"],
    queryFn: async () => {
      const result = await getTransactions()
      if (result.error) {
        throw result.error
      }
      
      const transactions = result.data || []
      const total = transactions
        .filter((txn) => {
          const tags = txn.tags || []
          const hasInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
          return hasInvestment && txn.withdrawal_amt > 0
        })
        .reduce((sum, txn) => sum + Number(txn.withdrawal_amt || 0), 0)
      
      return total
    },
  })
  return (
    <div className="flex flex-col gap-4 sm:gap-6 relative" style={{ isolation: 'isolate' }}>
      <div>
        {/* <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cash Flow</h1> */}
      </div>

      <div className="w-full sm:w-3/4 md:w-1/2 mx-auto relative" style={{ zIndex: 1 }}>
        <div className="text-sm text-muted-foreground text-center mb-2">Income Statement</div>
        <Card className="h-[30vh] sm:h-[40vh] flex flex-col p-0 relative" style={{ zIndex: 1 }}>
          {/* Green arrow from left extending into Income section */}
          <div className="absolute left-0 top-[10vh] -translate-x-[80%] -translate-y-1/2 flex items-center z-10">
            <span className="text-sm font-medium mr-2 whitespace-nowrap">Salary</span>
            <svg
              width="200"
              height="40"
              viewBox="0 0 200 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-green-500"
            >
              <path
                d="M0 20 L180 20 M180 20 L165 10 M180 20 L165 30"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Red arrow from right extending out of Expense section */}
          <div className="absolute right-0 top-[30vh] translate-x-[80%] -translate-y-1/2 flex items-center z-10">
            <svg
              width="200"
              height="40"
              viewBox="0 0 200 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-red-500"
            >
              <path
                d="M20 20 L200 20 M200 20 L185 10 M200 20 L185 30"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Upper part - Income */}
          <div className="flex-1 flex flex-col border-b relative">
            <CardHeader className="px-6 py-6">
              <CardTitle>Income</CardTitle>
            </CardHeader>
            <div className="flex-1">
              {/* Empty space for layout */}
            </div>
            {/* Text positioned inline with arrow (center of entire Income section) */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-center px-6 pointer-events-none">
              {incomeLoading ? (
                <div className="text-green-500 text-2xl font-semibold">Loading...</div>
              ) : (
                <div className="text-green-500 text-2xl font-semibold">
                  {formatCurrency(totalIncome)}
                </div>
              )}
            </div>
          </div>

          {/* Lower part - Expense */}
          <div className="flex-1 flex flex-col relative">
            <CardHeader className="px-6 py-6">
              <CardTitle>Expense</CardTitle>
            </CardHeader>
            <div className="flex-1">
              {/* Empty space for layout */}
            </div>
            {/* Text positioned inline (center of entire Expense section) */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-center px-6 pointer-events-none">
              {expensesLoading ? (
                <div className="text-red-500 text-2xl font-semibold">Loading...</div>
              ) : (
                <div className="text-red-500 text-2xl font-semibold">
                  {formatCurrency(totalExpenses)}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="w-full sm:w-3/4 md:w-1/2 mx-auto relative" style={{ zIndex: 1 }}>
        <div className="text-sm text-muted-foreground text-center mb-2">Balance Sheet</div>
        <Card className="h-[30vh] sm:h-[40vh] flex flex-col sm:flex-row p-0 relative" style={{ zIndex: 1 }}>
          {/* Left part - Assets */}
          <div className="flex-1 flex flex-col border-b sm:border-b-0 sm:border-r relative">
            <CardHeader className="px-6 py-6">
              <CardTitle>Assets</CardTitle>
            </CardHeader>
            <div className="flex-1">
              {/* Empty space for layout */}
            </div>
            {/* Investment total positioned in center */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center px-6 pointer-events-none">
              <div className="text-sm text-muted-foreground mb-2">Invested Value</div>
              {investmentsLoading ? (
                <div className="text-green-500 text-2xl font-semibold">Loading...</div>
              ) : (
                <div className="text-green-500 text-2xl font-semibold">
                  {formatCurrency(totalInvestments)}
                </div>
              )}
            </div>
          </div>

          {/* Right part - Liabilities */}
          <div className="flex-1 flex flex-col relative">
            <CardHeader className="px-6 py-6">
              <CardTitle>Liabilities</CardTitle>
            </CardHeader>
            <div className="flex-1 px-6 py-4">
              <ul className="list-disc list-inside space-y-2">
                <li>Macbook EMI</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Curved green arrow from Assets to Income */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
        <svg
          className="absolute text-green-500"
          style={{
            left: '25%',
            top: 'calc(40vh + 1.5rem + 20vh)',
            width: '200px',
            height: 'calc(40vh + 1.5rem + 40vh)',
            transform: 'translateX(-100%) translateY(calc(-50% - 10vh - 0.75rem))',
          }}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="greenArrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="6"
            refY="6"
            orient="auto"
          >
            <path
              d="M 12 6 L 0 0 M 12 6 L 0 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </marker>
        </defs>
        <path
          d="M 200 200 Q 0 -150 180 -150"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd="url(#greenArrowhead)"
        />
        </svg>
      </div>

      {/* Curved red line from Liabilities to Expense */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
        <svg
          className="absolute text-red-500"
          style={{
            right: '25%',
            top: 'calc(40vh + 1.5rem + 20vh)',
            width: '200px',
            height: 'calc(40vh + 1.5rem + 40vh)',
            transform: 'translateX(100%) translateY(calc(-50% - 10vh - 0.75rem))',
          }}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="6"
            refY="6"
            orient="auto"
          >
            <path
              d="M 12 6 L 0 0 M 12 6 L 0 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </marker>
        </defs>
        <path
          d="M 0 200 Q 100 0 15 0"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd="url(#arrowhead)"
        />
        </svg>
      </div>
    </div>
  )
}

