Product Requirements Document: Personal Finance & Wealth Tracker

1. Project Overview

Goal: Build a personal finance web application that parses HDFC bank statements (PDF/Excel), stores transaction data in a Supabase database, and provides advanced analytics, grouping capabilities, and financial health tools based on Dave Ramsey and Robert Kiyosaki's principles.

Target Audience: Personal use, privacy-focused, specifically tailored for HDFC Bank India formats.

2. Tech Stack & Architecture

Framework: Next.js 14+ (App Router, TypeScript).

Styling: Tailwind CSS + shadcn/ui (for consistent, accessible components).

Database: Supabase (PostgreSQL).

Icons: Lucide React.

Charts: Recharts.

State Management: React Query (TanStack Query) for server state, Zustand for local app state.

File Parsing: * papaparse (CSV/Excel).

pdf-parse (Server-side parsing via Next.js API route) or react-pdf (Client-side).

3. Database Schema (Supabase)

Table: transactions

Stores individual bank transactions.

Column Name

Type

Constraint

Description

id

UUID

PK, Default: gen_random_uuid()

Unique ID

date

DATE

Not Null

Transaction date

narration

TEXT

Not Null

Raw description from bank

ref_no

TEXT



Reference number (Chq/Ref)

value_date

DATE



Value date

withdrawal_amt

NUMERIC

Default: 0

Debit amount

deposit_amt

NUMERIC

Default: 0

Credit amount

closing_balance

NUMERIC



Balance after transaction

tags

TEXT[]

Default: []

Array of tags (e.g., 'food', 'utilities')

category

TEXT

Default: 'Uncategorized'

Main category

created_at

TIMESTAMP

Default: now()



Table: fixed_deposits

Stores FD details parsed from PDF.

Column Name

Type

Constraint

Description

id

UUID

PK

Unique ID

fd_number

TEXT

Unique

Account/FD Number

principal_amt

NUMERIC



Initial investment

interest_rate

NUMERIC



% Rate

maturity_date

DATE





maturity_amt

NUMERIC





status

TEXT



Active/Closed

Table: baby_steps (Optional/Single Row)

Stores progress on the 7 steps.

Column Name

Type

Description

step_current

INTEGER

1 to 7

emergency_fund_amt

NUMERIC

Current saved amount

debt_total

NUMERIC

Total non-mortgage debt

mortgage_total

NUMERIC

Remaining home loan

4. Page Specifications

Global Layout

Sidebar: Fixed left sidebar with navigation links:

Upload Data

Transactions

Dashboard

Labs (Beta)

Baby Steps

Affordability

Cashflow Quadrant

Top Bar: Breadcrumbs and Theme Toggle (Dark/Light mode).

Page 1: Data Upload (/upload)

Functionality:

Drag-and-drop zone for .csv, .xls, .pdf.

Mapping Interface: On file drop, show a preview of the first 5 rows. Allow user to map CSV columns to DB columns (date, narration, withdrawal_amt, etc.).

Parsers:

Excel/CSV: Use papaparse. Logic must handle HDFC's ~22 lines of header text before the actual table starts.

PDF: Upload file to a Next.js API route -> Parse text -> Extract FD tables using Regex/Positioning.

Action: "Upload to Database" button that performs an upsert (based on ref_no or date+narration+amount hash to prevent duplicates).

Page 2: Transactions Explorer (/transactions)

Table View:

Columns: Date, Narration, Tags (Editable Badge), Withdrawal (Red), Deposit (Green), Balance.

Pagination: Server-side pagination (20/50/100 rows).

Search: Text input filtering narration or tags.

"Group By" Feature (Critical):

UI: A toggle or dropdown: "Group by Date" | "Group by Narration" | "None".

Logic:

By Date: Collapse all txns of 2023-11-12 into one row. Columns show "Sum of Withdrawal", "Sum of Deposit". Expandable row to see details.

By Narration: Fuzzy match similar narrations (e.g., "Uber Trip...", "Uber Ride...") and group them.

Bulk Actions: Select multiple rows -> "Add Tag".

Page 3: Dashboard (/dashboard)

Visuals:

Expense Distribution: Pie Chart (Recharts) grouped by tags or category.

Monthly Trend: Bar chart showing Total Income vs Total Expense per month.

Net Worth Ticker: Sum of (Latest Closing Balance + All FD Principal Amounts).

Filters: Global date range picker (Last 30 days, YTD, Custom).

Page 4: Labs (/labs)

Placeholder: Simple UI card saying "AI Insights coming soon."

Future Scope: Prediction algorithms for next month's spend.

Page 5: Baby Steps (/baby-steps)

UI: A vertical stepper or progress tracker for Dave Ramsey’s 7 Steps.

Logic:

Step 1: $1,000 (or ₹50,000) Emergency Fund. (Check: Is savings_balance >= 50000?)

Step 2: Pay off all debt (Snowball). (Input field for manual debt tracking).

Step 3: 3-6 Months expenses. (Calc: avg_monthly_expense * 6 vs savings_balance).

Step 4: Invest 15%. (Manual Checkbox).

Step 5: College Fund. (Manual Checkbox).

Step 6: Pay off Home. (Input field for Mortgage balance).

Step 7: Build Wealth & Give.

Page 6: Affordability Calculator (/affordability)

Input:

Item Name (e.g., "iPhone 15")

Cost (e.g., ₹80,000)

Logic (The Decision Engine):

Rule 1: Can you pay cash? (Check latest_closing_balance > Cost).

Rule 2: Will buying this dip you below Baby Step 1 (Emergency Fund)?

Rule 3 (Needs vs Wants): If "Want", is it < 30% of monthly disposable income?

Output: Green "Yes" or Red "No" card with reasons.

Page 7: Cashflow Quadrant (/cashflow)

Concept: Rich Dad Poor Dad (E, S, B, I).

UI: A 2x2 Matrix visual.

Functionality:

Map Income sources to quadrants.

E (Employee): Salary credits (detect via tag "Salary").

S (Self-Employed): Freelance income.

B (Business): Business profits.

I (Investor): FD Interest, Dividends, Stock gains.

Goal: Show a percentage breakdown of where user's income flows from.

5. Implementation Guide (Cursor Prompts)

Phase 1: Setup

"Initialize a Next.js 14 app with TypeScript, Tailwind, and Shadcn UI. Set up Supabase client helper functions in lib/supabase.ts."

Phase 2: Database

"Create a Supabase migration file for the transactions and fixed_deposits tables as defined in the Schema section of the PRD."

Phase 3: Upload & Parse

"Create the /upload page. Implement papaparse to handle HDFC CSV files. Note that HDFC CSVs have ~22 lines of metadata headers before the actual column headers (Date, Narration...). Create a utility function to strip these lines before parsing."

Phase 4: Grouping Logic

"On /transactions, implement a useMemo hook that aggregates the transaction list based on the selected Grouping mode (Date or Tag). Ensure the table renders the aggregated view with a 'Click to Expand' feature."

Phase 5: Financial Health Pages

"Create /baby-steps and /affordability. Use the data from the transactions table (like avg_monthly_expenses) to dynamically update the progress of Baby Step 3 (3-6 months emergency fund)."