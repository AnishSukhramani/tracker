"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { ExpenseAdvisorReport } from "@/lib/expense-advisor/types"

const NEEDS_COLOR = "#3b82f6"
const WANTS_COLOR = "#a855f7"
const MUTED_COLOR = "#737373"
const CHART_HEIGHT = 240

interface ReportChartsProps {
  report: ExpenseAdvisorReport
  forExport?: boolean
}

export function ReportCharts({ report, forExport = false }: ReportChartsProps) {
  const { dataAnalysis } = report
  const animation = !forExport

  const needsWantsData = [
    { name: "Needs", value: dataAnalysis.needsVsWants.needs, fill: NEEDS_COLOR },
    { name: "Wants", value: dataAnalysis.needsVsWants.wants, fill: WANTS_COLOR },
    {
      name: "Unclassified",
      value: dataAnalysis.needsVsWants.unclassified,
      fill: MUTED_COLOR,
    },
  ].filter((d) => d.value > 0)

  const tagBarData = dataAnalysis.tagBreakdown.slice(0, 10).map((t) => ({
    name: t.tag.length > 14 ? t.tag.slice(0, 14) + "…" : t.tag,
    fullName: t.tag,
    amount: t.amount,
  }))

  return (
    <div className={forExport ? "pdf-charts-stack space-y-0" : "space-y-4"}>
      <div data-pdf-section className="pdf-section">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Needs vs Wants</CardTitle>
          </CardHeader>
          <CardContent>
            {needsWantsData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <PieChart>
                  <Pie
                    data={needsWantsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    isAnimationActive={animation}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {needsWantsData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div data-pdf-section className="pdf-section">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Tags by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {tagBarData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={tagBarData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName ?? ""
                    }
                  />
                  <Bar dataKey="amount" fill={NEEDS_COLOR} isAnimationActive={animation} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div data-pdf-section className="pdf-section">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Expense Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {dataAnalysis.monthlyTrend.length === 0 ? (
              <p className="text-muted-foreground text-sm">No monthly data</p>
            ) : (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart data={dataAnalysis.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    name="Expenses"
                    strokeWidth={2}
                    isAnimationActive={animation}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    name="Deposits (all)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    isAnimationActive={animation}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {dataAnalysis.recurringSubscriptions.length > 0 && (
        <div data-pdf-section className="pdf-section">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detected Recurring Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Months</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Conf.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataAnalysis.recurringSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>{formatCurrency(sub.monthlyAmount)}</TableCell>
                      <TableCell>{sub.monthsActive}</TableCell>
                      <TableCell>{formatCurrency(sub.totalPaid)}</TableCell>
                      <TableCell className="capitalize">{sub.confidence}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <div data-pdf-section className="pdf-section">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tag Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataAnalysis.tagBreakdown.map((row) => (
                  <TableRow key={row.tag}>
                    <TableCell>{row.tag}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                    <TableCell className="text-right">{row.percent}%</TableCell>
                    <TableCell className="text-right">{row.transactionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
