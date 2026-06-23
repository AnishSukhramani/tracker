"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildSectionedPdf } from "@/lib/pdf-build"

interface ReportPdfExportProps {
  targetId: string
  disabled?: boolean
  filename?: string
}

export function ReportPdfExport({
  targetId,
  disabled = false,
  filename = "expense-advisor-report",
}: ReportPdfExportProps) {
  const [exporting, setExporting] = React.useState(false)

  const handleExport = async () => {
    const element = document.getElementById(targetId)
    if (!element) return

    setExporting(true)
    element.classList.add("pdf-export-layout")
    document.documentElement.classList.add("pdf-export-capture")

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    await new Promise((r) => setTimeout(r, 400))

    try {
      const isDark = document.documentElement.classList.contains("dark")

      await buildSectionedPdf({
        root: element,
        isDark,
        filename,
      })
    } catch (err) {
      console.error("PDF export failed:", err)
      alert("PDF export failed. Try again or use browser Print → Save as PDF.")
    } finally {
      element.classList.remove("pdf-export-layout")
      document.documentElement.classList.remove("pdf-export-capture")
      setExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || exporting}
    >
      {exporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {exporting ? "Building PDF…" : "Download PDF"}
    </Button>
  )
}
