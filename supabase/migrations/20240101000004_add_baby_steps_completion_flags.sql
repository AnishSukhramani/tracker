-- Add completion flags for steps 4, 5, and 7 to baby_steps table
-- These steps are manual checkboxes that need to be persisted

ALTER TABLE baby_steps
ADD COLUMN IF NOT EXISTS step4_invest_15_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS step5_college_fund_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS step7_build_wealth_complete BOOLEAN DEFAULT false;

-- Add comments to new columns
COMMENT ON COLUMN baby_steps.step4_invest_15_complete IS 'Step 4: Invest 15% of income in retirement - completion flag';
COMMENT ON COLUMN baby_steps.step5_college_fund_complete IS 'Step 5: Save for children''s college education - completion flag';
COMMENT ON COLUMN baby_steps.step7_build_wealth_complete IS 'Step 7: Build wealth and give generously - completion flag';

