import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Client-side Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createClientSupabase = (): SupabaseClient<any, 'public', any> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We're not using auth for this app
    },
  })
}

// Server-side Supabase client (for API routes and server components)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createServerSupabase = (): SupabaseClient<any, 'public', any> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Default client instance for client-side usage
export const supabase = createClientSupabase()

// Helper function to get transactions
export async function getTransactions(filters?: {
  limit?: number
  offset?: number
  search?: string
  dateFrom?: string
  dateTo?: string
  tagFilter?: string
  searchTagFilter?: string // For searching within tags (e.g., "ipo" to find "ipo in" and "ipo out")
  untaggedOnly?: boolean // Filter for transactions with no tags
}) {
  const client = createClientSupabase()
  
  // Build base query for counting
  let countQuery = client.from('transactions').select('*', { count: 'exact', head: true })
  
  if (filters?.dateFrom) {
    countQuery = countQuery.gte('date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    countQuery = countQuery.lte('date', filters.dateTo)
  }
  if (filters?.tagFilter) {
    countQuery = countQuery.contains('tags', [filters.tagFilter])
  }
  if (filters?.searchTagFilter) {
    // Filter for transactions with tags containing the search term
    // For "ipo", this will find transactions with "ipo in" or "ipo out" tags
    // We use array overlap operator (&&) to check if any tag contains the search term
    // Since Supabase doesn't have a direct "contains substring" for arrays, we'll filter client-side
    // But for now, we'll fetch all and filter - or use a more specific approach
    // For IPO specifically, we can check for both "ipo in" and "ipo out"
    if (filters.searchTagFilter.toLowerCase() === 'ipo') {
      countQuery = countQuery.or('tags.cs.{ipo in},tags.cs.{IPO in},tags.cs.{Ipo in},tags.cs.{ipo out},tags.cs.{IPO out},tags.cs.{Ipo out}')
    } else {
      countQuery = countQuery.or(`tags.cs.{${filters.searchTagFilter}},tags.cs.{${filters.searchTagFilter.toLowerCase()}},tags.cs.{${filters.searchTagFilter.toUpperCase()}}`)
    }
  }
  if (filters?.search) {
    countQuery = countQuery.or(`narration.ilike.%${filters.search}%,tags.cs.{${filters.search}}`)
  }
  // Note: untaggedOnly filter is applied client-side after fetching
  // because PostgREST doesn't have a reliable way to filter for empty arrays
  
  // Get count
  const countResult = await countQuery
  let totalCount = countResult.count || 0
  
  // Build data query
  let dataQuery = client.from('transactions').select('*')

  if (filters?.dateFrom) {
    dataQuery = dataQuery.gte('date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    dataQuery = dataQuery.lte('date', filters.dateTo)
  }
  if (filters?.tagFilter) {
    dataQuery = dataQuery.contains('tags', [filters.tagFilter])
  }
  if (filters?.searchTagFilter) {
    // Filter for transactions with tags containing the search term
    if (filters.searchTagFilter.toLowerCase() === 'ipo') {
      dataQuery = dataQuery.or('tags.cs.{ipo in},tags.cs.{IPO in},tags.cs.{Ipo in},tags.cs.{ipo out},tags.cs.{IPO out},tags.cs.{Ipo out}')
    } else {
      dataQuery = dataQuery.or(`tags.cs.{${filters.searchTagFilter}},tags.cs.{${filters.searchTagFilter.toLowerCase()}},tags.cs.{${filters.searchTagFilter.toUpperCase()}}`)
    }
  }
  if (filters?.search) {
    dataQuery = dataQuery.or(`narration.ilike.%${filters.search}%,tags.cs.{${filters.search}}`)
  }
  // Note: untaggedOnly filter is applied client-side after fetching

  dataQuery = dataQuery.order('date', { ascending: false })

  // For untaggedOnly, we need to fetch more data to filter client-side
  // So we'll fetch without limit/offset first, then filter and apply pagination
  let dataResult
  if (filters?.untaggedOnly) {
    // Fetch all data (or a large chunk) to filter client-side
    const allDataResult = await dataQuery
    if (allDataResult.error) {
      return {
        ...allDataResult,
        count: totalCount,
      }
    }
    
    // Filter for untagged entries (null or empty array)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredData = (allDataResult.data || []).filter((txn: any) => {
      const tags = txn.tags
      return !tags || tags.length === 0
    })
    
    // Update total count
    totalCount = filteredData.length
    
    // Apply pagination
    const start = filters.offset || 0
    const end = start + (filters.limit || 20)
    const paginatedData = filteredData.slice(start, end)
    
    dataResult = {
      ...allDataResult,
      data: paginatedData,
    }
  } else {
    // Normal query with limit/offset
    if (filters?.limit) {
      dataQuery = dataQuery.limit(filters.limit)
    }
    if (filters?.offset) {
      dataQuery = dataQuery.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }
    dataResult = await dataQuery
  }
  
  return {
    ...dataResult,
    count: totalCount,
  }
}

// Helper function to insert/update transactions (upsert)
// Since ref_no doesn't have a unique constraint, we'll use a simpler approach:
// Just insert all transactions (duplicate checking is done client-side via removeDuplicates)
export async function upsertTransactions(transactions: Database['public']['Tables']['transactions']['Insert'][]) {
  const client = createClientSupabase()
  
  if (transactions.length === 0) {
    return { data: [], error: null }
  }
  
  // Since duplicate detection is handled client-side before calling this function,
  // we can just insert all transactions
  // For better performance with large batches, insert in chunks
  const chunkSize = 1000
  const chunks: Database['public']['Tables']['transactions']['Insert'][][] = []
  
  for (let i = 0; i < transactions.length; i += chunkSize) {
    chunks.push(transactions.slice(i, i + chunkSize))
  }
  
  const insertedIds: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastError: any = null
  
  // Insert in chunks
  for (const chunk of chunks) {
    const { data, error } = await client
      .from('transactions')
      .insert(chunk)
      .select('id')
    
    if (error) {
      lastError = error
      // Continue with other chunks even if one fails
      console.error("Error inserting chunk:", error)
    } else if (data) {
      insertedIds.push(...data.map(t => t.id))
    }
  }
  
  if (lastError) {
    return {
      data: insertedIds.length > 0 ? insertedIds : null,
      error: lastError,
    }
  }
  
  return {
    data: insertedIds,
    error: null,
  }
}

// Helper function to get fixed deposits
export async function getFixedDeposits() {
  const client = createClientSupabase()
  return await client.from('fixed_deposits').select('*').order('maturity_date', { ascending: true })
}

// Helper function to upsert fixed deposits
export async function upsertFixedDeposits(fixedDeposits: Database['public']['Tables']['fixed_deposits']['Insert'][]) {
  const client = createClientSupabase()
  return await client.from('fixed_deposits').upsert(fixedDeposits, {
    onConflict: 'fd_number',
    ignoreDuplicates: false,
  })
}

// Helper function to get baby steps data
export async function getBabySteps() {
  const client = createClientSupabase()
  const { data, error } = await client
    .from('baby_steps')
    .select('*')
    .single()
  
  if (error && error.code === 'PGRST116') {
    // No row exists, return default values
    return {
      data: {
        step_current: 1,
        emergency_fund_amt: 0,
        debt_total: 0,
        mortgage_total: 0,
        step4_invest_15_complete: false,
        step5_college_fund_complete: false,
        step7_build_wealth_complete: false,
      },
      error: null,
    }
  }
  
  return { data, error }
}

// Helper function to update baby steps
export async function updateBabySteps(updates: {
  step_current?: number
  emergency_fund_amt?: number
  debt_total?: number
  mortgage_total?: number
  step4_invest_15_complete?: boolean
  step5_college_fund_complete?: boolean
  step7_build_wealth_complete?: boolean
}) {
  const client = createClientSupabase()
  // Try to update first, if no row exists, insert
  const { data: existing } = await client.from('baby_steps').select('*').limit(1).maybeSingle()
  
  const updatesWithTimestamp = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  
  if (existing) {
    // Update all rows (should only be one)
    return await client.from('baby_steps').update(updatesWithTimestamp)
  } else {
    return await client.from('baby_steps').insert([updatesWithTimestamp])
  }
}

// Helper function to update transaction tags
export async function updateTransactionTags(transactionId: string, tags: string[]) {
  const client = createClientSupabase()
  return await client
    .from('transactions')
    .update({ tags })
    .eq('id', transactionId)
}

// Helper function to bulk update transaction tags
export async function bulkUpdateTransactionTags(transactionIds: string[], tags: string[]) {
  const client = createClientSupabase()
  return await client
    .from('transactions')
    .update({ tags })
    .in('id', transactionIds)
}

// Helper function to get latest closing balance
export async function getLatestClosingBalance() {
  const client = createClientSupabase()
  const { data, error } = await client
    .from('transactions')
    .select('closing_balance')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  return { data: data?.closing_balance || 0, error }
}

// Helper function to get monthly expense average
// Excludes transactions tagged with "Investment"
export async function getMonthlyExpenseAverage(months: number = 6) {
  const client = createClientSupabase()
  const dateFrom = new Date()
  dateFrom.setMonth(dateFrom.getMonth() - months)
  
  const { data, error } = await client
    .from('transactions')
    .select('withdrawal_amt, tags')
    .gte('date', dateFrom.toISOString().split('T')[0])
  
  if (error || !data) {
    return { average: 0, error }
  }
  
  // Filter out investments (transactions with "Investment" tag)
  const expenses = data.filter((txn) => {
    const tags = txn.tags || []
    return !tags.some((tag: string) => tag.toLowerCase() === 'investment')
  })
  
  const total = expenses.reduce((sum, txn) => sum + Number(txn.withdrawal_amt || 0), 0)
  const average = total / months
  
  return { average, error: null }
}

// Helper function to get this year's average monthly expenses
// Excludes transactions tagged with "Investment"
export async function getThisYearMonthlyExpenseAverage() {
  const client = createClientSupabase()
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1) // January 1st of current year
  
  const { data, error } = await client
    .from('transactions')
    .select('withdrawal_amt, tags')
    .gte('date', yearStart.toISOString().split('T')[0])
    .lte('date', now.toISOString().split('T')[0])
  
  if (error || !data) {
    return { average: 0, error }
  }
  
  // Filter out investments (transactions with "Investment" tag)
  const expenses = data.filter((txn) => {
    const tags = txn.tags || []
    return !tags.some((tag: string) => tag.toLowerCase() === 'investment')
  })
  
  const total = expenses.reduce((sum, txn) => sum + Number(txn.withdrawal_amt || 0), 0)
  
  // Calculate number of months from year start to now
  const monthsDiff = (now.getFullYear() - yearStart.getFullYear()) * 12 + (now.getMonth() - yearStart.getMonth()) + 1
  const average = monthsDiff > 0 ? total / monthsDiff : 0
  
  return { average, error: null }
}

// Helper function to get net IPO value
// Calculates: IPO in (deposits) - IPO out (withdrawals)
export async function getNetIPOValue() {
  const client = createClientSupabase()
  
  const { data, error } = await client
    .from('transactions')
    .select('withdrawal_amt, deposit_amt, tags')
  
  if (error || !data) {
    return { netValue: 0, error }
  }
  
  let ipoOut = 0 // Money going out (investments)
  let ipoIn = 0  // Money coming in (cashouts with profit)
  
  data.forEach((txn) => {
    const tags = txn.tags || []
    const hasIpoOut = tags.some((tag: string) => tag.toLowerCase() === 'ipo out')
    const hasIpoIn = tags.some((tag: string) => tag.toLowerCase() === 'ipo in')
    
    if (hasIpoOut && txn.withdrawal_amt > 0) {
      ipoOut += Number(txn.withdrawal_amt || 0)
    }
    if (hasIpoIn && txn.deposit_amt > 0) {
      ipoIn += Number(txn.deposit_amt || 0)
    }
  })
  
  const netValue = ipoIn - ipoOut
  
  return { netValue, ipoIn, ipoOut, error: null }
}

// Helper function to get total income (sum of all deposits)
export async function getTotalIncome() {
  const client = createClientSupabase()
  
  const { data, error } = await client
    .from('transactions')
    .select('deposit_amt')
  
  if (error || !data) {
    return { total: 0, error }
  }
  
  const total = data.reduce((sum, txn) => sum + Number(txn.deposit_amt || 0), 0)
  
  return { total, error: null }
}

// Helper function to get total expenses (sum of all withdrawals excluding investments)
export async function getTotalExpenses() {
  const client = createClientSupabase()
  
  const { data, error } = await client
    .from('transactions')
    .select('withdrawal_amt, tags')
  
  if (error || !data) {
    return { total: 0, excludedInvestments: 0, totalWithdrawals: 0, error }
  }
  
  let totalWithdrawals = 0
  let excludedInvestments = 0
  
  // Filter out investments only
  const expenses = data.filter((txn) => {
    const withdrawalAmt = Number(txn.withdrawal_amt || 0)
    totalWithdrawals += withdrawalAmt
    
    const tags = txn.tags || []
    const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
    
    if (isInvestment && withdrawalAmt > 0) {
      excludedInvestments += withdrawalAmt
    }
    
    return !isInvestment
  })
  
  const total = expenses.reduce((sum, txn) => sum + Number(txn.withdrawal_amt || 0), 0)
  
  return { total, excludedInvestments, totalWithdrawals, error: null }
}

// Helper function to get total investment amount
// Sums all withdrawal amounts from transactions tagged with "Investment"
export async function getTotalInvestments() {
  const client = createClientSupabase()
  
  const { data, error } = await client
    .from('transactions')
    .select('withdrawal_amt, tags')
    .contains('tags', ['Investment'])
  
  if (error || !data) {
    return { total: 0, error }
  }
  
  const total = data.reduce((sum, txn) => {
    const tags = txn.tags || []
    const isInvestment = tags.some((tag: string) => tag.toLowerCase() === 'investment')
    
    if (isInvestment && txn.withdrawal_amt > 0) {
      return sum + Number(txn.withdrawal_amt || 0)
    }
    return sum
  }, 0)
  
  return { total, error: null }
}

