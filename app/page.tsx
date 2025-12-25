import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  LayoutDashboard,
  Baby,
  ArrowRight,
} from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Your Finance Tracker</h1>
        <p className="text-lg text-muted-foreground">
          Track your finances, analyze spending, and follow Dave Ramsey's Baby Steps to financial freedom
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Transactions</CardTitle>
            </div>
            <CardDescription>
              View, search, and manage transactions or upload new bank statements (CSV, Excel, or PDF)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/transactions">
                View Transactions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <CardTitle>Dashboard</CardTitle>
            </div>
            <CardDescription>
              Get insights into your spending patterns and financial health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">
                View Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary" />
              <CardTitle>Baby Steps</CardTitle>
            </div>
            <CardDescription>
              Follow Dave Ramsey's 7 Baby Steps to financial freedom
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/baby-steps">
                Track Progress
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            New to the app? Here's how to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              <strong>Upload and review transactions:</strong> Go to{" "}
              <Link href="/transactions" className="text-primary hover:underline">
                Transactions
              </Link>{" "}
              to upload your HDFC bank statements (CSV, Excel, or PDF) and manage your transactions
            </li>
            <li>
              <strong>Explore your dashboard:</strong> View your financial insights in the{" "}
              <Link href="/dashboard" className="text-primary hover:underline">
                Dashboard
              </Link>
            </li>
            <li>
              <strong>Track your progress:</strong> Follow your financial journey with{" "}
              <Link href="/baby-steps" className="text-primary hover:underline">
                Baby Steps
              </Link>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
