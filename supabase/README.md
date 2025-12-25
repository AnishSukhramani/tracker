# Supabase Migrations

This directory contains SQL migration files for setting up the database schema.

## Running Migrations

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file in order
4. Execute the SQL

### Option 2: Using Supabase CLI
If you have the Supabase CLI installed:

```bash
# Link your project (first time only)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Using Supabase Migration Tool
You can also use the Supabase migration tool in the dashboard:
1. Go to Database > Migrations
2. Click "New Migration"
3. Paste the SQL content
4. Apply the migration

## Migration Files

- `20240101000000_create_transactions_table.sql` - Creates the transactions table
- Additional migrations will be added as the project progresses

## Important Notes

- Run migrations in chronological order (by filename timestamp)
- Always backup your database before running migrations in production
- Test migrations in a development environment first

