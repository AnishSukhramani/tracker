"use client"

import { useState, useEffect } from "react"
import { TransactionsTable, type GroupingMode } from "@/components/transactions-table"
import { PaginationControls } from "@/components/pagination-controls"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function InvestmentsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined)
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("none")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(1) // Reset to first page when search changes
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchInput])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset to first page when page size changes
  }

  const handleClearSearch = () => {
    setSearchInput("")
    setSearchTerm("")
    setPage(1)
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
        <p className="text-muted-foreground">
          View and manage your investment transactions. Only transactions tagged with 'Investment' are shown here.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Card className="flex-1 p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by narration or tags..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  onClick={handleClearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="grouping-mode" className="whitespace-nowrap">
              Group by:
            </Label>
            <Select
              value={groupingMode}
              onValueChange={(value) => {
                setGroupingMode(value as GroupingMode)
                setPage(1) // Reset to first page when grouping changes
              }}
            >
              <SelectTrigger id="grouping-mode" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="date">Group by Date</SelectItem>
                <SelectItem value="narration">Group by Narration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>
      
      <TransactionsTable
        limit={pageSize}
        offset={(page - 1) * pageSize}
        search={searchTerm || undefined}
        groupingMode={groupingMode}
        onTotalCountChange={setTotalCount}
        tagFilter="Investment"
      />
      
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        totalItems={totalCount}
      />
    </div>
  )
}
