"use client"

import { useState, useEffect, useCallback } from "react"
import { TransactionsTable, type GroupingMode } from "@/components/transactions-table"
import { PaginationControls } from "@/components/pagination-controls"
import { Input } from "@/components/ui/input"
import { Search, X, Upload, FileText, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/file-upload"
import { FilePreview } from "@/components/file-preview"
import { ColumnMapping, type DatabaseColumn } from "@/components/column-mapping"
import { parseCSVFile, type ParsedTransaction } from "@/lib/csv-parser"
import { parseExcelFile } from "@/lib/excel-parser"
import Papa from "papaparse"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type TabType = "view" | "upload"

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("view")
  
  // View transactions state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined)
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("none")
  const [untaggedOnly, setUntaggedOnly] = useState(false)

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([])
  const [parsing, setParsing] = useState(false)
  const [mapping, setMapping] = useState<Record<string, DatabaseColumn>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    uploaded?: number
    duplicates?: number
  } | null>(null)
  const [parseErrors, setParseErrors] = useState<Array<{ message: string; row?: number }>>([])

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

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setParsedData([])
    setMapping({})
    setUploadResult(null)
    setParseErrors([])

    // Check file type
    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx')

    if (isCSV || isExcel) {
      setParsing(true)
      try {
        let result
        if (isExcel) {
          // Use Excel parser for .xls and .xlsx files
          result = await parseExcelFile(file)
        } else {
          // Use CSV parser for .csv files
          result = await parseCSVFile(file)
        }
        
        setParsedData(result.data)
        setParseErrors(
          result.errors.map((err: Papa.ParseError) => ({
            message: err.message,
            row: err.row,
          }))
        )
      } catch (error) {
        setParseErrors([
          {
            message: error instanceof Error ? error.message : "Failed to parse file. Make sure it's a valid Excel or CSV file. Note: Numbers (.numbers) files need to be exported as Excel first.",
          },
        ])
      } finally {
        setParsing(false)
      }
    } else if (fileName.endsWith('.numbers')) {
      // Numbers files are not directly supported
      setParseErrors([
        {
          message: "Numbers (.numbers) files are not supported. Please export your file as Excel (.xlsx) or CSV (.csv) format first.",
        },
      ])
    }
  }

  const handleMappingChange = useCallback((newMapping: Record<string, DatabaseColumn>) => {
    setMapping(newMapping)
  }, [])

  const handleUpload = async () => {
    if (parsedData.length === 0 || Object.keys(mapping).length === 0) {
      setUploadResult({
        success: false,
        message: "Please parse a file and map columns before uploading",
      })
      return
    }

    // Validate required mappings
    const hasDate = Object.values(mapping).includes("date")
    const hasNarration = Object.values(mapping).includes("narration")

    if (!hasDate || !hasNarration) {
      setUploadResult({
        success: false,
        message: "Date and Narration columns are required",
      })
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      const response = await fetch("/api/upload-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactions: parsedData,
          mapping,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setUploadResult({
          success: true,
          message: `Successfully uploaded ${result.uploaded} transaction${result.uploaded !== 1 ? "s" : ""}${
            result.duplicates ? ` (${result.duplicates} duplicate${result.duplicates !== 1 ? "s" : ""} skipped)` : ""
          }`,
          uploaded: result.uploaded,
          duplicates: result.duplicates,
        })
        // Reset after successful upload
        setSelectedFile(null)
        setParsedData([])
        setMapping({})
        // Switch to view tab after successful upload
        setTimeout(() => {
          setActiveTab("view")
        }, 2000)
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Failed to upload transactions",
        })
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload transactions",
      })
    } finally {
      setUploading(false)
    }
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage your bank transactions, or upload new statements to import transactions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("view")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            "border-b-2 -mb-[1px]",
            activeTab === "view"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            View Transactions
          </div>
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            "border-b-2 -mb-[1px]",
            activeTab === "upload"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Data
          </div>
        </button>
      </div>

      {/* View Transactions Tab */}
      {activeTab === "view" && (
        <div className="flex flex-col gap-4">
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

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={untaggedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUntaggedOnly(!untaggedOnly)
                    setPage(1) // Reset to first page when filter changes
                  }}
                  className="whitespace-nowrap"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  {untaggedOnly ? "Show All" : "Untagged Only"}
                </Button>
              </div>
            </Card>
          </div>
          
          <TransactionsTable
            limit={pageSize}
            offset={(page - 1) * pageSize}
            search={searchTerm || undefined}
            groupingMode={groupingMode}
            untaggedOnly={untaggedOnly}
            onTotalCountChange={setTotalCount}
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
      )}

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="flex flex-col gap-6">
          <FileUpload onFileSelect={handleFileSelect} />

          {parsing && (
            <Card>
              <CardContent className="flex items-center gap-2 p-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Parsing file...</span>
              </CardContent>
            </Card>
          )}

          {parsedData.length > 0 && (
            <>
              <FilePreview data={parsedData} errors={parseErrors} />
              <ColumnMapping
                data={parsedData}
                onMappingChange={handleMappingChange}
                initialMapping={mapping}
              />
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || Object.keys(mapping).length === 0}
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload to Database"
                  )}
                </Button>
                {parsedData.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {parsedData.length} transaction{parsedData.length !== 1 ? "s" : ""} ready to upload
                  </span>
                )}
              </div>
            </>
          )}

          {uploadResult && (
            <Alert variant={uploadResult.success ? "default" : "destructive"}>
              {uploadResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{uploadResult.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
