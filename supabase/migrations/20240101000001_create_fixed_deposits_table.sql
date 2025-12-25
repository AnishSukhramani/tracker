-- Create fixed_deposits table
-- This table stores Fixed Deposit details parsed from PDF statements

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

-- Create index on fd_number for faster lookups (already unique, but explicit index helps)
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_fd_number ON fixed_deposits(fd_number);

-- Create index on status for filtering active/closed FDs
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_status ON fixed_deposits(status);

-- Create index on maturity_date for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_maturity_date ON fixed_deposits(maturity_date);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_created_at ON fixed_deposits(created_at DESC);

-- Add comment to table
COMMENT ON TABLE fixed_deposits IS 'Stores Fixed Deposit details parsed from HDFC bank PDF statements';

-- Add comments to columns
COMMENT ON COLUMN fixed_deposits.fd_number IS 'Account/FD Number - must be unique';
COMMENT ON COLUMN fixed_deposits.principal_amt IS 'Initial investment amount';
COMMENT ON COLUMN fixed_deposits.interest_rate IS 'Interest rate percentage';
COMMENT ON COLUMN fixed_deposits.maturity_date IS 'Date when FD matures';
COMMENT ON COLUMN fixed_deposits.maturity_amt IS 'Total amount at maturity';
COMMENT ON COLUMN fixed_deposits.status IS 'Status: Active or Closed';

