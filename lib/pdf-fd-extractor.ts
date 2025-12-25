/**
 * Utility functions for extracting Fixed Deposit (FD) information from PDF text
 */

export interface FixedDepositData {
  fd_number: string
  principal_amt: number | null
  interest_rate: number | null
  maturity_date: string | null
  maturity_amt: number | null
  status: string | null
}

/**
 * Extracts Fixed Deposit information from PDF text
 * Uses regex patterns to find FD tables in HDFC bank statements
 * 
 * @param pdfText - Extracted text from PDF
 * @returns Array of Fixed Deposit data
 */
export function extractFixedDeposits(pdfText: string): FixedDepositData[] {
  const fds: FixedDepositData[] = []
  
  // Normalize text: replace multiple spaces with single space, normalize line breaks
  const normalizedText = pdfText
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .toUpperCase()

  // Pattern 1: Look for FD number patterns
  // HDFC FD numbers are typically in formats like: FD123456789, 1234567890, etc.
  const fdNumberPattern = /(?:FD\s*)?(\d{8,15})/gi
  
  // Pattern 2: Look for FD table sections
  // Common keywords: "FIXED DEPOSIT", "FD DETAILS", "DEPOSIT ACCOUNT", etc.
  const fdSectionPattern = /(?:FIXED\s*DEPOSIT|FD\s*DETAILS|DEPOSIT\s*ACCOUNT|TERM\s*DEPOSIT)[\s\S]{0,500}/gi
  
  // Pattern 3: Look for amount patterns (Principal, Maturity Amount)
  const amountPattern = /(?:₹|RS\.?|INR)\s*([\d,]+\.?\d*)/gi
  
  // Pattern 4: Look for interest rate patterns
  const interestRatePattern = /(?:RATE|INTEREST|ROI)[\s:]*(\d+\.?\d*)\s*%/gi
  
  // Pattern 5: Look for date patterns (Maturity Date)
  const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g
  
  // Pattern 6: Look for status (Active, Closed, Matured)
  const statusPattern = /(?:STATUS|STAT)[\s:]*?(ACTIVE|CLOSED|MATURED|PENDING)/gi

  // Try to find FD sections
  const sections = normalizedText.match(fdSectionPattern)
  
  if (sections) {
    sections.forEach((section) => {
      const fd: Partial<FixedDepositData> = {}
      
      // Extract FD number
      const fdNumberMatch = section.match(fdNumberPattern)
      if (fdNumberMatch && fdNumberMatch.length > 0) {
        // Take the longest number as it's likely the FD number
        const fdNumber = fdNumberMatch
          .map((m) => m.replace(/FD\s*/gi, "").trim())
          .sort((a, b) => b.length - a.length)[0]
        fd.fd_number = fdNumber
      }
      
      // Extract amounts (Principal and Maturity)
      const amounts: number[] = []
      let amountMatch
      while ((amountMatch = amountPattern.exec(section)) !== null) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ""))
        if (!isNaN(amount)) {
          amounts.push(amount)
        }
      }
      // Typically first amount is principal, last or largest is maturity
      if (amounts.length > 0) {
        fd.principal_amt = amounts[0]
        if (amounts.length > 1) {
          fd.maturity_amt = Math.max(...amounts)
        }
      }
      
      // Extract interest rate
      const rateMatch = section.match(interestRatePattern)
      if (rateMatch && rateMatch.length > 0) {
        const rate = parseFloat(rateMatch[0].replace(/[^\d.]/g, ""))
        if (!isNaN(rate)) {
          fd.interest_rate = rate
        }
      }
      
      // Extract dates (Maturity Date)
      const dates = section.match(datePattern)
      if (dates && dates.length > 0) {
        // Normalize date to YYYY-MM-DD format
        const normalizedDate = normalizeDate(dates[dates.length - 1]) // Take last date as maturity
        fd.maturity_date = normalizedDate
      }
      
      // Extract status
      const statusMatch = section.match(statusPattern)
      if (statusMatch && statusMatch.length > 0) {
        fd.status = statusMatch[0].replace(/STATUS|STAT/gi, "").trim()
      } else {
        // Infer status from maturity date
        if (fd.maturity_date) {
          const maturityDate = new Date(fd.maturity_date)
          const today = new Date()
          fd.status = maturityDate < today ? "Closed" : "Active"
        } else {
          fd.status = "Active" // Default
        }
      }
      
      // Only add if we have at least an FD number
      if (fd.fd_number && typeof fd.fd_number === "string") {
        fds.push({
          fd_number: fd.fd_number,
          principal_amt: fd.principal_amt || null,
          interest_rate: fd.interest_rate || null,
          maturity_date: fd.maturity_date || null,
          maturity_amt: fd.maturity_amt || null,
          status: fd.status || null,
        })
      }
    })
  } else {
    // Fallback: Try to find FD numbers directly in the text
    const fdNumbers = normalizedText.match(fdNumberPattern)
    if (fdNumbers) {
      const uniqueFdNumbers = [...new Set(fdNumbers.map((n) => n.replace(/FD\s*/gi, "").trim()))]
      
      uniqueFdNumbers.forEach((fdNumber) => {
        // Try to find related information near the FD number
        const fdIndex = normalizedText.indexOf(fdNumber)
        if (fdIndex !== -1) {
          const context = normalizedText.substring(
            Math.max(0, fdIndex - 200),
            Math.min(normalizedText.length, fdIndex + 500)
          )
          
          const fd: Partial<FixedDepositData> = { fd_number: fdNumber }
          
          // Extract amounts from context
          const amounts: number[] = []
          let amountMatch
          const contextAmountPattern = /(?:₹|RS\.?|INR)\s*([\d,]+\.?\d*)/gi
          while ((amountMatch = contextAmountPattern.exec(context)) !== null) {
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""))
            if (!isNaN(amount) && amount > 1000) {
              amounts.push(amount)
            }
          }
          if (amounts.length > 0) {
            fd.principal_amt = Math.min(...amounts)
            fd.maturity_amt = Math.max(...amounts)
          }
          
          // Extract interest rate from context
          const rateMatch = context.match(/(\d+\.?\d*)\s*%/g)
          if (rateMatch && rateMatch.length > 0) {
            const rate = parseFloat(rateMatch[0].replace(/%/g, ""))
            if (!isNaN(rate) && rate > 0 && rate < 20) {
              fd.interest_rate = rate
            }
          }
          
          // Extract dates from context
          const dates = context.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g)
          if (dates && dates.length > 0) {
            fd.maturity_date = normalizeDate(dates[dates.length - 1])
          }
          
          fd.status = fd.maturity_date
            ? new Date(fd.maturity_date) < new Date()
              ? "Closed"
              : "Active"
            : "Active"
          
          if (fd.fd_number && typeof fd.fd_number === "string") {
            fds.push({
              fd_number: fd.fd_number,
              principal_amt: fd.principal_amt || null,
              interest_rate: fd.interest_rate || null,
              maturity_date: fd.maturity_date || null,
              maturity_amt: fd.maturity_amt || null,
              status: fd.status || null,
            })
          }
        }
      })
    }
  }

  // Remove duplicates based on FD number
  const uniqueFDs = fds.filter(
    (fd, index, self) => index === self.findIndex((f) => f.fd_number === fd.fd_number)
  )

  return uniqueFDs
}

/**
 * Normalizes a date string to YYYY-MM-DD format
 * Handles various date formats common in Indian bank statements
 * 
 * @param dateStr - Date string in various formats
 * @returns Normalized date string or null
 */
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null

  const str = String(dateStr).trim()
  if (!str) return null

  // Try to parse various date formats
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

