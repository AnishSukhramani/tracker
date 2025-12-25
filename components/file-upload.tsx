"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Upload, File, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number // in MB
}

const DEFAULT_ACCEPTED_TYPES = [".csv", ".xls", ".xlsx", ".pdf"]
const DEFAULT_MAX_SIZE = 10 // 10 MB

export function FileUpload({
  onFileSelect,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = DEFAULT_MAX_SIZE,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    
    // Special check for Numbers files
    if (fileExtension === ".numbers") {
      return "Numbers (.numbers) files are not supported. Please export your file as Excel (.xlsx) or CSV (.csv) format first."
    }
    
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `File type not supported. Please upload: ${acceptedFileTypes.join(", ")}. Note: Numbers files must be exported as Excel or CSV first.`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxFileSize) {
      return `File size exceeds ${maxFileSize}MB limit`
    }

    return null
  }

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setSelectedFile(file)
      onFileSelect(file)
    },
    [onFileSelect, acceptedFileTypes, maxFileSize]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    return <File className="h-8 w-8 text-muted-foreground" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB"
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  return (
    <div className="w-full">
      <Card>
        <CardContent className="p-6">
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input
                type="file"
                accept={acceptedFileTypes.join(",")}
                onChange={handleFileInput}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                id="file-upload"
              />
              <Upload
                className={cn(
                  "mb-4 h-12 w-12 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="text-center">
                <p className="text-lg font-medium">
                  {isDragging ? "Drop file here" : "Drag and drop your file here"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supported formats: {acceptedFileTypes.join(", ")} (max {maxFileSize}MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.name)}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemove}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

