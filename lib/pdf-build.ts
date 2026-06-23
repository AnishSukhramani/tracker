import type { jsPDF } from "jspdf"
import {
  getPdfBackgroundColor,
  inlineComputedStylesRecursive,
  injectPdfSafeBaseStyles,
  stripUnsupportedStylesheets,
} from "./pdf-export-utils"

const PDF_MARGIN_MM = 14
const SECTION_GAP_MM = 5

export interface PdfBuildOptions {
  root: HTMLElement
  isDark: boolean
  filename: string
}

async function captureSection(
  element: HTMLElement,
  isDark: boolean
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default

  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: getPdfBackgroundColor(isDark),
    foreignObjectRendering: false,
    onclone: (clonedDoc, clonedElement) => {
      stripUnsupportedStylesheets(clonedDoc)
      injectPdfSafeBaseStyles(clonedDoc, isDark)
      if (clonedElement instanceof HTMLElement) {
        inlineComputedStylesRecursive(element, clonedElement, clonedDoc)
      }
    },
  })
}

function addPageFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  const w = pdf.internal.pageSize.getWidth()
  const h = pdf.internal.pageSize.getHeight()
  pdf.setFontSize(8)
  pdf.setTextColor(120, 120, 120)
  pdf.text("Expense Advisor Report — session only, not saved", PDF_MARGIN_MM, h - 6)
  pdf.text(`Page ${pageNum} of ${totalPages}`, w - PDF_MARGIN_MM, h - 6, {
    align: "right",
  })
}

function addTallSectionToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  contentWidthMm: number,
  maxHeightMm: number,
  initialY: number
): number {
  const pageHeight = pdf.internal.pageSize.getHeight()
  const fullHeightMm = (canvas.height / canvas.width) * contentWidthMm
  const sliceHeightPx = Math.floor((maxHeightMm / fullHeightMm) * canvas.height)

  let offsetY = 0
  let y = initialY

  while (offsetY < canvas.height) {
    const sliceH = Math.min(sliceHeightPx, canvas.height - offsetY)
    const sliceCanvas = document.createElement("canvas")
    sliceCanvas.width = canvas.width
    sliceCanvas.height = sliceH
    const ctx = sliceCanvas.getContext("2d")
    if (!ctx) break

    ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    const sliceHeightMm = (sliceH / canvas.width) * contentWidthMm

    if (y + sliceHeightMm > pageHeight - PDF_MARGIN_MM) {
      pdf.addPage()
      y = PDF_MARGIN_MM
    }

    pdf.addImage(
      sliceCanvas.toDataURL("image/png"),
      "PNG",
      PDF_MARGIN_MM,
      y,
      contentWidthMm,
      sliceHeightMm
    )

    y += sliceHeightMm + SECTION_GAP_MM
    offsetY += sliceH
  }

  return y
}

export async function buildSectionedPdf(options: PdfBuildOptions): Promise<void> {
  const { root, isDark, filename } = options

  const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-section]"))
  if (sections.length === 0) {
    throw new Error("No PDF sections found in report")
  }

  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PDF_MARGIN_MM * 2
  const maxContentHeight = pageHeight - PDF_MARGIN_MM * 2

  let y = PDF_MARGIN_MM

  for (const section of sections) {
    const canvas = await captureSection(section, isDark)
    const sectionHeightMm = (canvas.height / canvas.width) * contentWidth

    if (sectionHeightMm <= maxContentHeight) {
      if (y + sectionHeightMm > pageHeight - PDF_MARGIN_MM) {
        pdf.addPage()
        y = PDF_MARGIN_MM
      }

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        PDF_MARGIN_MM,
        y,
        contentWidth,
        sectionHeightMm
      )
      y += sectionHeightMm + SECTION_GAP_MM
    } else {
      if (y > PDF_MARGIN_MM + 2) {
        pdf.addPage()
        y = PDF_MARGIN_MM
      }
      y = addTallSectionToPdf(pdf, canvas, contentWidth, maxContentHeight, y)
    }
  }

  const totalPages = pdf.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    addPageFooter(pdf, p, totalPages)
  }

  const date = new Date().toISOString().split("T")[0]
  pdf.save(`${filename}-${date}.pdf`)
}
