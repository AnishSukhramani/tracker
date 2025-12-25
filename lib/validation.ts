/**
 * Validation utilities for forms
 */

export function validateNumber(value: string): {
  isValid: boolean
  error?: string
  number?: number
} {
  if (!value || value.trim() === "") {
    return { isValid: false, error: "This field is required" }
  }

  const num = parseFloat(value)
  if (isNaN(num)) {
    return { isValid: false, error: "Please enter a valid number" }
  }

  if (num < 0) {
    return { isValid: false, error: "Value cannot be negative" }
  }

  return { isValid: true, number: num }
}

export function validateRequired(value: string): {
  isValid: boolean
  error?: string
} {
  if (!value || value.trim() === "") {
    return { isValid: false, error: "This field is required" }
  }
  return { isValid: true }
}

export function validateFileType(
  file: File,
  allowedTypes: string[]
): { isValid: boolean; error?: string } {
  const fileExtension = file.name.split(".").pop()?.toLowerCase()
  const mimeType = file.type

  const isValidExtension = fileExtension && allowedTypes.includes(fileExtension)
  const isValidMimeType = mimeType && allowedTypes.some((type) => mimeType.includes(type))

  if (!isValidExtension && !isValidMimeType) {
    return {
      isValid: false,
      error: `File type not supported. Allowed types: ${allowedTypes.join(", ")}`,
    }
  }

  return { isValid: true }
}

export function validateFileSize(
  file: File,
  maxSizeMB: number = 10
): { isValid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    }
  }
  return { isValid: true }
}

