"use client"

import * as React from "react"
import { ParsedTransaction } from "@/lib/csv-parser"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FilePreviewProps {
  data: ParsedTransaction[]
  errors?: Array<{ message: string; row?: number }>
  maxRows?: number
}

export function FilePreview({
  data,
  errors = [],
  maxRows = 5,
}: FilePreviewProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Preview</CardTitle>
          <CardDescription>No data to preview</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Get the first N rows
  const previewData = data.slice(0, maxRows)
  
  // Get all unique column names from the data
  const columns = React.useMemo(() => {
    const columnSet = new Set<string>()
    previewData.forEach((row: ParsedTransaction) => {
      Object.keys(row).forEach((key: string) => columnSet.add(key))
    })
    return Array.from(columnSet).sort()
  }, [previewData])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>File Preview</CardTitle>
          <CardDescription>
            Showing first {previewData.length} of {data.length} rows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="font-medium">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => (
                      <TableCell key={column} className="max-w-[200px] truncate">
                        {row[column] !== null && row[column] !== undefined
                          ? String(row[column])
                          : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">
              {errors.length} error{errors.length > 1 ? "s" : ""} found during parsing:
            </div>
            <ul className="list-disc list-inside space-y-1">
              {errors.slice(0, 5).map((error, index) => (
                <li key={index} className="text-sm">
                  {error.row !== undefined
                    ? `Row ${error.row + 1}: ${error.message}`
                    : error.message}
                </li>
              ))}
              {errors.length > 5 && (
                <li className="text-sm text-muted-foreground">
                  ... and {errors.length - 5} more error{errors.length - 5 > 1 ? "s" : ""}
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

