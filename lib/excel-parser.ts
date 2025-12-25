/**
 * Excel parser utilities using xlsx library
 * Handles .xlsx and .xls files
 */

import * as XLSX from "xlsx"
import Papa from "papaparse"
import { stripHDFCHeaders } from "./hdfc-parser"
import type { ParsedTransaction, ParseResult } from "./csv-parser"

/**
 * Parses an Excel file (.xlsx or .xls) and extracts transaction data
 * Converts the first sheet to CSV format, then processes it like a CSV
 * 
 * @param file - File object (Excel)
 * @returns Promise with parsed data
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        if (!arrayBuffer) {
          reject(new Error("Failed to read file"))
          return
        }

        // Parse Excel file
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          reject(new Error("Excel file has no sheets"))
          return
        }

        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert sheet to JSON - more reliable than CSV conversion
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Convert all values to strings
          defval: "", // Default value for empty cells
        }) as Record<string, any>[]
        
        if (jsonData.length === 0) {
          resolve({
            data: [],
            errors: [],
            meta: {
              fields: [],
              delimiter: ",",
              linebreak: "\n",
              aborted: false,
              truncated: false,
              cursor: 0,
            },
          })
          return
        }

        // Get headers from first row and normalize them
        const firstRow = jsonData[0]
        const originalHeaders = Object.keys(firstRow)
        const headers = originalHeaders.map((h: string) =>
          h.trim().toLowerCase().replace(/\s+/g, "_")
        )

        // Create a mapping from normalized headers to original headers
        const headerMap = new Map<string, string>()
        originalHeaders.forEach((orig, index) => {
          headerMap.set(headers[index], orig)
        })

        // Transform data to use normalized headers
        const data: ParsedTransaction[] = []
        const errors: Array<{ message: string; row?: number }> = []

        jsonData.forEach((row, index) => {
          try {
            const normalizedRow: ParsedTransaction = {}
            
            headers.forEach((normalizedHeader) => {
              const originalHeader = headerMap.get(normalizedHeader) || normalizedHeader
              const value = row[originalHeader]
              normalizedRow[normalizedHeader] = value !== undefined && value !== null 
                ? String(value).trim() 
                : ""
            })

            // Only add rows that have at least one non-empty value
            if (Object.values(normalizedRow).some((v: unknown) => v && String(v).trim())) {
              data.push(normalizedRow)
            }
          } catch (error) {
            errors.push({
              message: error instanceof Error ? error.message : `Error parsing row ${index + 1}`,
              row: index + 1,
            })
          }
        })

        resolve({
          data,
          errors: errors.map((e: { message: string; row?: number }) => ({
            type: "Quotes",
            code: "MissingQuotes",
            message: e.message,
            row: e.row || 0,
          })) as Papa.ParseError[],
          meta: {
            fields: headers,
            delimiter: ",",
            linebreak: "\n",
            aborted: false,
            truncated: false,
            cursor: 0,
          } as Papa.ParseMeta,
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    // Read as ArrayBuffer for binary Excel files
    reader.readAsArrayBuffer(file)
  })
}


