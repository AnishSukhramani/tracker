-- ============================================
-- Personal Finance & Wealth Tracker
-- Complete Database Setup Script
-- ============================================
-- Run this entire script in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Create transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  narration TEXT NOT NULL,
  ref_no TEXT,
  value_date DATE,
  withdrawal_amt NUMERIC DEFAULT 0,
  deposit_amt NUMERIC DEFAULT 0,
  closing_balance NUMERIC,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'Uncategorized',
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ref_no ON transactions(ref_no) WHERE ref_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_narration ON transactions USING gin(to_tsvector('english', narration));
CREATE INDEX IF NOT EXISTS idx_transactions_tags ON transactions USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

COMMENT ON TABLE transactions IS 'Stores individual bank transactions from HDFC bank statements';

-- ============================================
-- 2. Create fixed_deposits table
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fd_number TEXT UNIQUE NOT NULL,
  principal_amt NUMERIC,
  interest_rate NUMERIC,
  maturity_date DATE,
  maturity_amt NUMERIC,
  status TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for fixed_deposits table
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_fd_number ON fixed_deposits(fd_number);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_status ON fixed_deposits(status);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_maturity_date ON fixed_deposits(maturity_date);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_created_at ON fixed_deposits(created_at DESC);

COMMENT ON TABLE fixed_deposits IS 'Stores Fixed Deposit details parsed from HDFC bank PDF statements';
COMMENT ON COLUMN fixed_deposits.fd_number IS 'Account/FD Number - must be unique';
COMMENT ON COLUMN fixed_deposits.principal_amt IS 'Initial investment amount';
COMMENT ON COLUMN fixed_deposits.interest_rate IS 'Interest rate percentage';
COMMENT ON COLUMN fixed_deposits.maturity_date IS 'Date when FD matures';
COMMENT ON COLUMN fixed_deposits.maturity_amt IS 'Total amount at maturity';
COMMENT ON COLUMN fixed_deposits.status IS 'Status: Active or Closed';

-- ============================================
-- 3. Create baby_steps table
-- ============================================
CREATE TABLE IF NOT EXISTS baby_steps (
  id INTEGER PRIMARY KEY DEFAULT 1,
  step_current INTEGER DEFAULT 1 CHECK (step_current >= 1 AND step_current <= 7),
  emergency_fund_amt NUMERIC DEFAULT 0,
  debt_total NUMERIC DEFAULT 0,
  mortgage_total NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE baby_steps IS 'Stores progress on Dave Ramsey''s 7 Baby Steps. This table should contain only one row.';
COMMENT ON COLUMN baby_steps.step_current IS 'Current step (1-7) in the Baby Steps program';
COMMENT ON COLUMN baby_steps.emergency_fund_amt IS 'Current saved amount for emergency fund';
COMMENT ON COLUMN baby_steps.debt_total IS 'Total non-mortgage debt amount';
COMMENT ON COLUMN baby_steps.mortgage_total IS 'Remaining home loan/mortgage balance';

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE baby_steps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS Policies
-- ============================================
-- Note: These policies allow all operations for personal use
-- Update these when implementing authentication

-- Transactions policies
CREATE POLICY "Allow all operations on transactions"
  ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Fixed deposits policies
CREATE POLICY "Allow all operations on fixed_deposits"
  ON fixed_deposits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Baby steps policies
CREATE POLICY "Allow all operations on baby_steps"
  ON baby_steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Setup Complete!
-- ============================================
-- Your database is now ready to use.
-- 
-- Next steps:
-- 1. Copy your Supabase project URL and anon key
-- 2. Add them to your .env.local file:
--    NEXT_PUBLIC_SUPABASE_URL=your_project_url
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
-- 3. Start using the application!
-- ============================================

