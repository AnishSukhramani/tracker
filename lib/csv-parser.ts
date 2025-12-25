/**
 * CSV/Excel parser utilities using papaparse
 */

import Papa from "papaparse"
import { stripHDFCHeaders } from "./hdfc-parser"

export interface ParsedTransaction {
  [key: string]: string | number | null
}

export interface ParseResult {
  data: ParsedTransaction[]
  errors: Papa.ParseError[]
  meta: Papa.ParseMeta
}

/**
 * Parses a CSV file and extracts transaction data
 * Handles HDFC CSV format with header stripping
 * 
 * @param file - File object (CSV)
 * @returns Promise with parsed data
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        if (!csvText) {
          reject(new Error("Failed to read file"))
          return
        }
        
        // Strip HDFC headers
        const cleanedCSV: string = stripHDFCHeaders(csvText)
        
        // Parse CSV with papaparse
        // @ts-expect-error - papaparse type definitions have an issue with string overload
        Papa.parse(cleanedCSV, {
          header: true, // First row as headers
          skipEmptyLines: true,
          transformHeader: (header) => {
            // Clean up headers: trim whitespace, normalize
            return header.trim().toLowerCase().replace(/\s+/g, "_")
          },
          transform: (value) => {
            // Trim whitespace from values
            return value.trim()
          },
          // Better handling of malformed quotes
          quotes: true,
          quoteChar: '"',
          escapeChar: '"',
          // More lenient parsing for bank statements
          delimitersToGuess: [',', '\t', '|', ';'],
          complete: (results) => {
            resolve({
              data: results.data as ParsedTransaction[],
              errors: results.errors,
              meta: results.meta,
            })
          },
          error: (error: Error) => {
            reject(error)
          },
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsText(file, "UTF-8")
  })
}

/**
 * Parses CSV text directly (useful for testing or server-side)
 * 
 * @param csvText - CSV text content
 * @returns Parsed data
 */
export function parseCSVText(csvText: string): ParseResult {
  // Strip HDFC headers
  const cleanedCSV: string = stripHDFCHeaders(csvText)
  
  const results = Papa.parse(cleanedCSV, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      return header.trim().toLowerCase().replace(/\s+/g, "_")
    },
    transform: (value) => {
      return value.trim()
    },
  })

  return {
    data: results.data as ParsedTransaction[],
    errors: results.errors,
    meta: results.meta,
  }
}

/**
 * Detects column types and suggests mappings
 * Analyzes the parsed data to identify which columns might be dates, amounts, etc.
 * 
 * @param data - Parsed transaction data
 * @returns Suggested column mappings
 */
export function detectColumnTypes(data: ParsedTransaction[]): Record<string, string> {
  if (data.length === 0) return {}

  const sample = data.slice(0, Math.min(10, data.length))
  const columns = Object.keys(sample[0])
  const suggestions: Record<string, string> = {}

  columns.forEach((col) => {
    const colLower = col.toLowerCase()
    
    // Check for common patterns
    if (colLower.includes("date") || colLower.includes("dt")) {
      suggestions[col] = "date"
    } else if (colLower.includes("narration") || colLower.includes("description") || colLower.includes("particulars")) {
      suggestions[col] = "narration"
    } else if (colLower.includes("ref") || colLower.includes("reference") || colLower.includes("chq")) {
      suggestions[col] = "ref_no"
    } else if (colLower.includes("value") && colLower.includes("date")) {
      suggestions[col] = "value_date"
    } else if (colLower.includes("withdrawal") || colLower.includes("debit") || colLower.includes("dr")) {
      suggestions[col] = "withdrawal_amt"
    } else if (colLower.includes("deposit") || colLower.includes("credit") || colLower.includes("cr")) {
      suggestions[col] = "deposit_amt"
    } else if (colLower.includes("balance") || colLower.includes("closing")) {
      suggestions[col] = "closing_balance"
    } else {
      // Try to infer from data
      const sampleValues = sample.map((row) => row[col]).filter(Boolean)
      if (sampleValues.length > 0) {
        const firstValue = String(sampleValues[0])
        
        // Check if it looks like a date
        if (/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(firstValue)) {
          suggestions[col] = "date"
        }
        // Check if it looks like an amount (contains numbers and possibly currency symbols)
        else if (/[\d,]+\.?\d*/.test(firstValue) && (firstValue.includes(".") || firstValue.includes(","))) {
          suggestions[col] = "amount"
        }
      }
    }
  })

  return suggestions
}

/**
 * Normalizes a date string to YYYY-MM-DD format
 * Handles various date formats common in Indian bank statements
 * 
 * @param dateStr - Date string in various formats
 * @returns Normalized date string or null
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  const str = String(dateStr).trim()
  if (!str) return null

  // Try to parse various date formats
  // DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
  const patterns = [
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})/, // DD-MM-YY or DD/MM/YY
  ]

  for (const pattern of patterns) {
    const match = str.match(pattern)
    if (match) {
      let day: string, month: string, year: string

      if (match[3].length === 4) {
        // Full year
        if (pattern === patterns[0]) {
          // DD-MM-YYYY
          day = match[1].padStart(2, "0")
          month = match[2].padStart(2, "0")
          year = match[3]
        } else {
          // YYYY-MM-DD
          year = match[1]
          month = match[2].padStart(2, "0")
          day = match[3].padStart(2, "0")
        }
      } else {
        // 2-digit year
        day = match[1].padStart(2, "0")
        month = match[2].padStart(2, "0")
        const yearNum = parseInt(match[3], 10)
        // Assume years 00-30 are 2000-2030, 31-99 are 1931-1999
        year = yearNum <= 30 ? `20${match[3]}` : `19${match[3]}`
      }

      return `${year}-${month}-${day}`
    }
  }

  return null
}

/**
 * Normalizes an amount string to a number
 * Removes currency symbols, commas, and converts to number
 * 
 * @param amountStr - Amount string
 * @returns Normalized number or 0
 */
export function normalizeAmount(amountStr: string | null | undefined): number {
  if (!amountStr) return 0

  const str = String(amountStr).trim()
  if (!str || str === "-" || str === "") return 0

  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleaned = str.replace(/[₹,\s]/g, "").replace(/[^\d.-]/g, "")
  
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

