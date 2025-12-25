"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTransactions, updateTransactionTags, bulkUpdateTransactionTags } from "@/lib/supabase"
import { EditableTags } from "@/components/editable-tag"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import {
  groupTransactions,
  type DisplayTransaction,
  type GroupedTransaction,
} from "@/lib/transaction-grouping"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type GroupingMode = "none" | "date" | "narration"

interface TransactionsTableProps {
  limit?: number
  offset?: number
  search?: string
  dateFrom?: string
  dateTo?: string
  groupingMode?: GroupingMode
  onTotalCountChange?: (count: number) => void
  tagFilter?: string
  searchTagFilter?: string
  untaggedOnly?: boolean
}

export function TransactionsTable({
  limit = 20,
  offset = 0,
  search,
  dateFrom,
  dateTo,
  groupingMode = "none",
  onTotalCountChange,
  tagFilter,
  searchTagFilter,
  untaggedOnly,
}: TransactionsTableProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = React.useState(false)
  const [bulkTagValue, setBulkTagValue] = React.useState("")
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", limit, offset, search, dateFrom, dateTo, tagFilter, searchTagFilter, untaggedOnly],
    queryFn: async () => {
      const result = await getTransactions({
        limit,
        offset,
        search,
        dateFrom,
        dateTo,
        tagFilter,
        searchTagFilter,
        untaggedOnly,
      })
      if (result.error) {
        throw result.error
      }
      
      // Notify parent of total count
      if (onTotalCountChange && result.count !== undefined) {
        onTotalCountChange(result.count)
      }
      
      return result.data || []
    },
  })
  
  const updateTagsMutation = useMutation({
    mutationFn: async ({ transactionId, tags }: { transactionId: string; tags: string[] }) => {
      const result = await updateTransactionTags(transactionId, tags)
      if (result.error) {
        throw result.error
      }
      return result
    },
    onSuccess: () => {
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
  
  const handleTagsChange = (transactionId: string, newTags: string[]) => {
    updateTagsMutation.mutate({ transactionId, tags: newTags })
  }
  
  const bulkUpdateTagsMutation = useMutation({
    mutationFn: async ({ transactionIds, tags }: { transactionIds: string[]; tags: string[] }) => {
      const result = await bulkUpdateTransactionTags(transactionIds, tags)
      if (result.error) {
        throw result.error
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      setSelectedRows(new Set())
      setBulkTagDialogOpen(false)
      setBulkTagValue("")
    },
  })
  
  // Apply grouping
  const groupedData = React.useMemo(() => {
    if (!data) return []
    return groupTransactions(data, groupingMode)
  }, [data, groupingMode])
  
  // Get all transaction IDs from grouped data (flatten groups)
  const allTransactionIds = React.useMemo(() => {
    const ids: string[] = []
    groupedData.forEach((item) => {
      if ("isGroup" in item && item.isGroup) {
        item.transactions.forEach((txn) => ids.push(txn.id))
      } else {
        ids.push(item.id)
      }
    })
    return ids
  }, [groupedData])
  
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  const toggleSelectRow = (transactionId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }
  
  const toggleSelectAll = () => {
    if (selectedRows.size === allTransactionIds.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(allTransactionIds))
    }
  }
  
  const handleBulkAddTag = () => {
    const trimmed = bulkTagValue.trim()
    if (trimmed && selectedRows.size > 0) {
      // Get current tags for all selected transactions
      const selectedTransactions = data?.filter((txn) => selectedRows.has(txn.id)) || []
      const transactionIds = Array.from(selectedRows)
      
      // For each transaction, add the new tag if it doesn't exist
      const updates = selectedTransactions.map((txn) => {
        const currentTags = txn.tags || []
        const newTags = currentTags.includes(trimmed)
          ? currentTags
          : [...currentTags, trimmed]
        return { id: txn.id, tags: newTags }
      })
      
      // Update each transaction individually (bulk update adds tags to all, but we want to preserve existing)
      Promise.all(
        updates.map((update) =>
          updateTransactionTags(update.id, update.tags)
        )
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ["transactions"] })
        setSelectedRows(new Set())
        setBulkTagDialogOpen(false)
        setBulkTagValue("")
      })
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Date</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Withdrawal</TableHead>
              <TableHead className="text-right">Deposit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load transactions: {error instanceof Error ? error.message : "Unknown error"}
        </AlertDescription>
      </Alert>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    )
  }

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "—"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "—"
    try {
      return format(new Date(dateString), "dd MMM yyyy")
    } catch {
      return dateString
    }
  }
  
  const isGrouped = (item: DisplayTransaction): item is GroupedTransaction => {
    return "isGroup" in item && item.isGroup === true
  }
  
  const renderTransactionRow = (transaction: DisplayTransaction, isNested = false) => {
    const isGroup = isGrouped(transaction)
    const isExpanded = expandedRows.has(transaction.id)
    const transactionId = isGroup ? transaction.id : transaction.id
    const isSelected = !isGroup && selectedRows.has(transactionId)
    
    return (
      <React.Fragment key={transaction.id}>
        <TableRow 
          className={isNested ? "bg-muted/30" : ""}
          onClick={() => isGroup && toggleRow(transaction.id)}
          style={isGroup ? { cursor: "pointer" } : undefined}
        >
          {!isNested && (
            <TableCell className="w-12">
              {!isGroup && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelectRow(transactionId)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </TableCell>
          )}
          {isNested && <TableCell className="w-12" />}
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              {isGroup && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleRow(transaction.id)
                  }}
                  className="p-0 hover:bg-transparent"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!isGroup && isNested && <span className="w-6" />}
              {formatDate(transaction.date)}
            </div>
          </TableCell>
          <TableCell className={isNested ? "pl-8" : ""}>
            <div className={`max-w-[200px] sm:max-w-[300px] ${isNested ? "" : "truncate"}`}>
              {transaction.narration}
            </div>
          </TableCell>
          <TableCell>
            {!isGroup ? (
              <EditableTags
                tags={transaction.tags || []}
                onTagsChange={(newTags) => handleTagsChange(transaction.id, newTags)}
                transactionId={transaction.id}
              />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="text-right">
            {transaction.withdrawal_amt > 0 ? (
              <span className="text-red-600 font-medium">
                {formatCurrency(transaction.withdrawal_amt)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="text-right">
            {transaction.deposit_amt > 0 ? (
              <span className="text-green-600 font-medium">
                {formatCurrency(transaction.deposit_amt)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="text-right font-medium">
            {formatCurrency(transaction.closing_balance)}
          </TableCell>
        </TableRow>
        {isGroup && isExpanded && transaction.transactions.map((txn) =>
          renderTransactionRow(txn, true)
        )}
      </React.Fragment>
    )
  }

  const allSelected = allTransactionIds.length > 0 && selectedRows.size === allTransactionIds.length
  const someSelected = selectedRows.size > 0 && selectedRows.size < allTransactionIds.length

  return (
    <div className="flex flex-col gap-4">
      {selectedRows.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border bg-muted/50 p-3 sm:p-4">
          <span className="text-sm font-medium">
            {selectedRows.size} transaction{selectedRows.size !== 1 ? "s" : ""} selected
          </span>
          <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Add Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Tag to Selected Transactions</DialogTitle>
                <DialogDescription>
                  Add a tag to {selectedRows.size} selected transaction{selectedRows.size !== 1 ? "s" : ""}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Enter tag name..."
                  value={bulkTagValue}
                  onChange={(e) => setBulkTagValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleBulkAddTag()
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkTagDialogOpen(false)
                    setBulkTagValue("")
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleBulkAddTag} disabled={!bulkTagValue.trim()}>
                  Add Tag
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[100px]">Date</TableHead>
              <TableHead className="min-w-[200px]">Narration</TableHead>
              <TableHead className="min-w-[150px]">Tags</TableHead>
              <TableHead className="text-right min-w-[120px]">Withdrawal</TableHead>
              <TableHead className="text-right min-w-[120px]">Deposit</TableHead>
              <TableHead className="text-right min-w-[120px]">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedData.map((item) => renderTransactionRow(item))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

