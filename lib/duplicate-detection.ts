/**
 * Duplicate detection utilities for transactions
 */

import crypto from "crypto"

export interface TransactionInput {
  date: string
  narration: string
  ref_no?: string | null
  withdrawal_amt?: number | null
  deposit_amt?: number | null
}

/**
 * Generates a unique hash for a transaction based on date, narration, and amount
 * Used for duplicate detection when ref_no is not available
 * 
 * @param transaction - Transaction data
 * @returns Hash string
 */
export function generateTransactionHash(transaction: TransactionInput): string {
  const date = transaction.date || ""
  const narration = (transaction.narration || "").trim().toLowerCase()
  const amount = String(transaction.withdrawal_amt || transaction.deposit_amt || 0)
  
  // Create a normalized string for hashing
  const hashString = `${date}|${narration}|${amount}`
  
  // Generate SHA-256 hash
  return crypto.createHash("sha256").update(hashString).digest("hex")
}

/**
 * Generates a unique identifier for a transaction
 * Uses ref_no if available, otherwise falls back to hash
 * 
 * @param transaction - Transaction data
 * @returns Unique identifier string
 */
export function getTransactionIdentifier(transaction: TransactionInput): string {
  // Prefer ref_no if available and not empty
  if (transaction.ref_no && transaction.ref_no.trim() !== "") {
    return `ref:${transaction.ref_no.trim()}`
  }
  
  // Fall back to hash
  return `hash:${generateTransactionHash(transaction)}`
}

/**
 * Checks if two transactions are duplicates
 * 
 * @param txn1 - First transaction
 * @param txn2 - Second transaction
 * @returns true if transactions are duplicates
 */
export function areTransactionsDuplicate(
  txn1: TransactionInput,
  txn2: TransactionInput
): boolean {
  // If both have ref_no, compare them
  if (txn1.ref_no && txn2.ref_no) {
    return txn1.ref_no.trim() === txn2.ref_no.trim()
  }
  
  // Otherwise, compare using hash
  return generateTransactionHash(txn1) === generateTransactionHash(txn2)
}

/**
 * Removes duplicate transactions from an array
 * Keeps the first occurrence of each unique transaction
 * 
 * @param transactions - Array of transactions
 * @returns Array with duplicates removed
 */
export function removeDuplicates<T extends TransactionInput>(
  transactions: T[]
): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  
  for (const txn of transactions) {
    const identifier = getTransactionIdentifier(txn)
    if (!seen.has(identifier)) {
      seen.add(identifier)
      unique.push(txn)
    }
  }
  
  return unique
}

/**
 * Groups transactions by their unique identifier
 * Useful for batch processing and duplicate detection
 * 
 * @param transactions - Array of transactions
 * @returns Map of identifier to transactions
 */
export function groupTransactionsByIdentifier<T extends TransactionInput>(
  transactions: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  
  for (const txn of transactions) {
    const identifier = getTransactionIdentifier(txn)
    if (!groups.has(identifier)) {
      groups.set(identifier, [])
    }
    groups.get(identifier)!.push(txn)
  }
  
  return groups
}

/**
 * Prepares transaction data for upsert with duplicate detection
 * Adds a unique identifier field that can be used for upsert operations
 * 
 * @param transaction - Transaction data
 * @returns Transaction with identifier field
 */
export function prepareTransactionForUpsert(
  transaction: TransactionInput
): TransactionInput & { _identifier?: string } {
  return {
    ...transaction,
    _identifier: getTransactionIdentifier(transaction),
  }
}

