"use client"

import { useState, useCallback } from "react"
import { FileUpload } from "@/components/file-upload"
import { FilePreview } from "@/components/file-preview"
import { ColumnMapping, type DatabaseColumn } from "@/components/column-mapping"
import { parseCSVFile, type ParsedTransaction } from "@/lib/csv-parser"
import { parseExcelFile } from "@/lib/excel-parser"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UploadPage() {
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
    // PDF files will be handled separately in future tasks
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload Data</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Upload your HDFC bank statements (CSV, Excel, or PDF) to import transactions and fixed deposits.
        </p>
      </div>

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
  )
}

