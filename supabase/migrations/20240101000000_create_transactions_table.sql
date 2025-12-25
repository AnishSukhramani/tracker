-- Create transactions table
-- This table stores individual bank transactions

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

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- Create index on ref_no for duplicate detection
CREATE INDEX IF NOT EXISTS idx_transactions_ref_no ON transactions(ref_no) WHERE ref_no IS NOT NULL;

-- Create index on narration for search functionality
CREATE INDEX IF NOT EXISTS idx_transactions_narration ON transactions USING gin(to_tsvector('english', narration));

-- Create index on tags for tag-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_tags ON transactions USING gin(tags);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Add comment to table
COMMENT ON TABLE transactions IS 'Stores individual bank transactions from HDFC bank statements';

