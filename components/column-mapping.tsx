"use client"

import * as React from "react"
import { ParsedTransaction, detectColumnTypes } from "@/lib/csv-parser"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export type DatabaseColumn =
  | "date"
  | "narration"
  | "ref_no"
  | "value_date"
  | "withdrawal_amt"
  | "deposit_amt"
  | "closing_balance"
  | "skip"

export interface ColumnMapping {
  csvColumn: string
  dbColumn: DatabaseColumn | null
}

interface ColumnMappingProps {
  data: ParsedTransaction[]
  onMappingChange: (mapping: Record<string, DatabaseColumn>) => void
  initialMapping?: Record<string, DatabaseColumn>
}

const DB_COLUMNS: Array<{ value: DatabaseColumn; label: string; required: boolean }> = [
  { value: "date", label: "Date (Required)", required: true },
  { value: "narration", label: "Narration (Required)", required: true },
  { value: "ref_no", label: "Reference Number", required: false },
  { value: "value_date", label: "Value Date", required: false },
  { value: "withdrawal_amt", label: "Withdrawal Amount", required: false },
  { value: "deposit_amt", label: "Deposit Amount", required: false },
  { value: "closing_balance", label: "Closing Balance", required: false },
  { value: "skip", label: "Skip Column", required: false },
]

export function ColumnMapping({
  data,
  onMappingChange,
  initialMapping,
}: ColumnMappingProps) {
  // Get all CSV columns
  const csvColumns = React.useMemo(() => {
    if (data.length === 0) return []
    const columnSet = new Set<string>()
    data.forEach((row: ParsedTransaction) => {
      Object.keys(row).forEach((key: string) => columnSet.add(key))
    })
    return Array.from(columnSet).sort()
  }, [data])

  // Get suggested mappings
  const suggestions = React.useMemo(() => {
    if (data.length === 0) return {}
    return detectColumnTypes(data)
  }, [data])

  // Initialize mapping state
  const [mapping, setMapping] = React.useState<Record<string, DatabaseColumn>>(() => {
    if (initialMapping && Object.keys(initialMapping).length > 0) return initialMapping

    // Auto-map based on suggestions
    const autoMapping: Record<string, DatabaseColumn> = {}
    csvColumns.forEach((col) => {
      const suggestion = suggestions[col]
      if (suggestion === "date") {
        autoMapping[col] = "date"
      } else if (suggestion === "narration") {
        autoMapping[col] = "narration"
      } else if (suggestion === "ref_no") {
        autoMapping[col] = "ref_no"
      } else if (suggestion === "value_date") {
        autoMapping[col] = "value_date"
      } else if (suggestion === "withdrawal_amt") {
        autoMapping[col] = "withdrawal_amt"
      } else if (suggestion === "deposit_amt") {
        autoMapping[col] = "deposit_amt"
      } else if (suggestion === "closing_balance") {
        autoMapping[col] = "closing_balance"
      }
    })
    return autoMapping
  })
  
  // Validate mapping
  const validation = React.useMemo(() => {
    const mappedColumns = Object.values(mapping).filter((col) => col !== "skip" && col !== null)
    const hasDate = mappedColumns.includes("date")
    const hasNarration = mappedColumns.includes("narration")
    const isValid = hasDate && hasNarration

    return {
      isValid,
      hasDate,
      hasNarration,
      errors: [
        !hasDate && "Date column is required",
        !hasNarration && "Narration column is required",
      ].filter(Boolean) as string[],
    }
  }, [mapping])

  // Track if we've notified parent of initial mapping
  const hasNotifiedInitial = React.useRef(false)

  // Update mapping when user changes selection
  const handleMappingChange = (csvColumn: string, dbColumn: DatabaseColumn) => {
    const newMapping = { ...mapping, [csvColumn]: dbColumn }
    setMapping(newMapping)
    onMappingChange(newMapping)
    hasNotifiedInitial.current = true
  }

  // Notify parent of initial mapping only once when component mounts with data
  // Use a ref to store the initial mapping to avoid re-running the effect
  const initialMappingValue = React.useRef(mapping)
  React.useEffect(() => {
    if (!hasNotifiedInitial.current && Object.keys(initialMappingValue.current).length > 0 && csvColumns.length > 0) {
      hasNotifiedInitial.current = true
      onMappingChange(initialMappingValue.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  return (
    <Card>
      <CardHeader>
        <CardTitle>Column Mapping</CardTitle>
        <CardDescription>
          Map CSV columns to database columns. Date and Narration are required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {csvColumns.map((csvColumn: string) => {
          const suggestion = suggestions[csvColumn]
          const currentMapping = mapping[csvColumn] || null

          return (
            <div key={csvColumn} className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor={`mapping-${csvColumn}`} className="font-medium">
                  {csvColumn}
                </Label>
                {suggestion && (
                  <p className="text-xs text-muted-foreground">
                    Suggested: {suggestion}
                  </p>
                )}
              </div>
              <Select
                value={currentMapping || "skip"}
                onValueChange={(value) =>
                  handleMappingChange(csvColumn, value as DatabaseColumn)
                }
              >
                <SelectTrigger id={`mapping-${csvColumn}`} className="w-[250px]">
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  {DB_COLUMNS.map((dbCol: { value: DatabaseColumn; label: string; required: boolean }) => (
                    <SelectItem key={dbCol.value} value={dbCol.value}>
                      {dbCol.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}

        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Mapping validation errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.isValid && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All required columns are mapped. You can proceed with the upload.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

