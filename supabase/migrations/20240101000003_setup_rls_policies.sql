-- Enable Row Level Security (RLS) on all tables
-- This ensures data privacy and security

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on fixed_deposits table
ALTER TABLE fixed_deposits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on baby_steps table
ALTER TABLE baby_steps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for transactions table
-- ============================================

-- Policy: Allow all operations for now (personal use app)
-- TODO: Update these policies when authentication is implemented
-- Example: Add user_id column and restrict to auth.uid() = user_id

CREATE POLICY "Allow all operations on transactions"
  ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- RLS Policies for fixed_deposits table
-- ============================================

-- Policy: Allow all operations for now (personal use app)
-- TODO: Update these policies when authentication is implemented

CREATE POLICY "Allow all operations on fixed_deposits"
  ON fixed_deposits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- RLS Policies for baby_steps table
-- ============================================

-- Policy: Allow all operations for now (personal use app)
-- TODO: Update these policies when authentication is implemented

CREATE POLICY "Allow all operations on baby_steps"
  ON baby_steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Notes for future authentication implementation:
-- ============================================
-- When adding authentication, you should:
-- 1. Add a user_id column to each table (or use auth.uid() if using Supabase Auth)
-- 2. Update policies to restrict access:
--    Example for transactions:
--    CREATE POLICY "Users can only see their own transactions"
--      ON transactions
--      FOR SELECT
--      USING (auth.uid() = user_id);
--
--    CREATE POLICY "Users can only insert their own transactions"
--      ON transactions
--      FOR INSERT
--      WITH CHECK (auth.uid() = user_id);
--
--    CREATE POLICY "Users can only update their own transactions"
--      ON transactions
--      FOR UPDATE
--      USING (auth.uid() = user_id)
--      WITH CHECK (auth.uid() = user_id);
--
--    CREATE POLICY "Users can only delete their own transactions"
--      ON transactions
--      FOR DELETE
--      USING (auth.uid() = user_id);

