-- Create baby_steps table
-- This table stores progress on Dave Ramsey's 7 Baby Steps
-- It is designed to hold a single row of user progress data
-- Application logic ensures only one row exists

CREATE TABLE IF NOT EXISTS baby_steps (
  id INTEGER PRIMARY KEY DEFAULT 1,
  step_current INTEGER DEFAULT 1 CHECK (step_current >= 1 AND step_current <= 7),
  emergency_fund_amt NUMERIC DEFAULT 0,
  debt_total NUMERIC DEFAULT 0,
  mortgage_total NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add comment to table
COMMENT ON TABLE baby_steps IS 'Stores progress on Dave Ramsey''s 7 Baby Steps. This table should contain only one row.';

-- Add comments to columns
COMMENT ON COLUMN baby_steps.step_current IS 'Current step (1-7) in the Baby Steps program';
COMMENT ON COLUMN baby_steps.emergency_fund_amt IS 'Current saved amount for emergency fund';
COMMENT ON COLUMN baby_steps.debt_total IS 'Total non-mortgage debt amount';
COMMENT ON COLUMN baby_steps.mortgage_total IS 'Remaining home loan/mortgage balance';

