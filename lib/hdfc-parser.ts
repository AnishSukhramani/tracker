/**
 * Utility functions for parsing HDFC bank statement files
 */

/**
 * Strips HDFC CSV header lines (~22 lines of metadata)
 * HDFC CSV files typically have metadata headers before the actual transaction table
 * 
 * @param csvText - Raw CSV text content
 * @returns CSV text with header lines removed
 */
export function stripHDFCHeaders(csvText: string): string {
  const lines = csvText.split('\n')
  
  // Look for common HDFC CSV patterns to identify where the actual data starts
  // Common indicators:
  // 1. Line containing "Date" or "Transaction Date"
  // 2. Line containing "Narration" or "Description"
  // 3. Line containing "Withdrawal" or "Debit"
  // 4. Line containing "Deposit" or "Credit"
  
  let dataStartIndex = -1
  
  // Search for the header row (usually contains Date, Narration, etc.)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    
    // Check if this line looks like a header row
    const hasDate = line.includes('date')
    const hasNarration = line.includes('narration') || line.includes('description') || line.includes('particulars')
    const hasAmount = line.includes('withdrawal') || line.includes('deposit') || line.includes('debit') || line.includes('credit') || line.includes('amount')
    const hasBalance = line.includes('balance')
    
    // If we find a line with multiple expected headers, it's likely the data header
    if ((hasDate && hasNarration) || (hasDate && hasAmount) || (hasDate && hasBalance)) {
      dataStartIndex = i
      break
    }
  }
  
  // If we couldn't find a clear header, try a fallback approach
  // Look for lines that are mostly empty or contain only metadata
  if (dataStartIndex === -1) {
    // Try to find the first line that looks like a data row (has a date pattern)
    const datePattern = /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/
    
    for (let i = 0; i < Math.min(30, lines.length); i++) {
      const line = lines[i]
      // Check if line contains a date pattern and has multiple comma-separated values
      if (datePattern.test(line) && line.split(',').length >= 3) {
        // Look backwards to find the header row
        for (let j = Math.max(0, i - 2); j < i; j++) {
          const headerLine = lines[j].toLowerCase()
          if (headerLine.includes('date') || headerLine.includes('narration')) {
            dataStartIndex = j
            break
          }
        }
        if (dataStartIndex !== -1) break
        
        // If no clear header found, assume the line before the first data row is the header
        dataStartIndex = Math.max(0, i - 1)
        break
      }
    }
  }
  
  // If still not found, default to removing first 22 lines (as per PRD)
  if (dataStartIndex === -1) {
    dataStartIndex = 22
  }
  
  // Return the CSV starting from the data header row
  return lines.slice(dataStartIndex).join('\n')
}

/**
 * Validates if a CSV text appears to be from HDFC bank
 * 
 * @param csvText - CSV text content
 * @returns true if it appears to be an HDFC CSV
 */
export function isHDFCCSV(csvText: string): boolean {
  const upperText = csvText.toUpperCase()
  
  // Check for HDFC-specific keywords
  const hdfcIndicators = [
    'HDFC',
    'HDFC BANK',
    'HDFC BANK LIMITED',
    'HDFC BANK LTD',
  ]
  
  // Check first 500 characters for HDFC indicators
  const preview = upperText.substring(0, 500)
  
  return hdfcIndicators.some(indicator => preview.includes(indicator))
}

/**
 * Estimates the number of header lines in a CSV
 * Useful for debugging and validation
 * 
 * @param csvText - CSV text content
 * @returns estimated number of header lines
 */
export function estimateHeaderLines(csvText: string): number {
  const lines = csvText.split('\n')
  const stripped = stripHDFCHeaders(csvText)
  const strippedLines = stripped.split('\n')
  
  return lines.length - strippedLines.length
}

