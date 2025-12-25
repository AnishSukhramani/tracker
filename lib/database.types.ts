// Database types will be generated from Supabase once the database is set up
// For now, we'll define basic types based on the PRD schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          date: string
          narration: string
          ref_no: string | null
          value_date: string | null
          withdrawal_amt: number
          deposit_amt: number
          closing_balance: number | null
          tags: string[]
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          narration: string
          ref_no?: string | null
          value_date?: string | null
          withdrawal_amt?: number
          deposit_amt?: number
          closing_balance?: number | null
          tags?: string[]
          category?: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          narration?: string
          ref_no?: string | null
          value_date?: string | null
          withdrawal_amt?: number
          deposit_amt?: number
          closing_balance?: number | null
          tags?: string[]
          category?: string
          created_at?: string
        }
      }
      fixed_deposits: {
        Row: {
          id: string
          fd_number: string
          principal_amt: number | null
          interest_rate: number | null
          maturity_date: string | null
          maturity_amt: number | null
          status: string | null
        }
        Insert: {
          id?: string
          fd_number: string
          principal_amt?: number | null
          interest_rate?: number | null
          maturity_date?: string | null
          maturity_amt?: number | null
          status?: string | null
        }
        Update: {
          id?: string
          fd_number?: string
          principal_amt?: number | null
          interest_rate?: number | null
          maturity_date?: string | null
          maturity_amt?: number | null
          status?: string | null
        }
      }
      baby_steps: {
        Row: {
          id: number
          step_current: number
          emergency_fund_amt: number
          debt_total: number
          mortgage_total: number
          step4_invest_15_complete: boolean
          step5_college_fund_complete: boolean
          step7_build_wealth_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          step_current?: number
          emergency_fund_amt?: number
          debt_total?: number
          mortgage_total?: number
          step4_invest_15_complete?: boolean
          step5_college_fund_complete?: boolean
          step7_build_wealth_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          step_current?: number
          emergency_fund_amt?: number
          debt_total?: number
          mortgage_total?: number
          step4_invest_15_complete?: boolean
          step5_college_fund_complete?: boolean
          step7_build_wealth_complete?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

