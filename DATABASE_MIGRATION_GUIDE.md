# Database Migration Guide - Add OS Column to Clicks Table

## Issue
The application is trying to insert data into a column called `os` in the `clicks` table, but this column doesn't exist in the database schema, causing deployment errors.

## Solution
You need to add the missing `os` column to the `clicks` table.

## Steps to Fix

### Method 1: Using Vercel Postgres Dashboard
1. Go to your Vercel dashboard
2. Navigate to your project
3. Go to the "Storage" tab
4. Click on your Postgres database
5. Go to the "Query" tab
6. Copy and paste the SQL from `add_os_column_to_clicks.sql`
7. Execute the query

### Method 2: Using psql command line (if you have access)
```bash
psql "your-database-connection-string" -f add_os_column_to_clicks.sql
```

### Method 3: Using any PostgreSQL client
1. Connect to your database using your preferred PostgreSQL client
2. Run the SQL commands from `add_os_column_to_clicks.sql`

## SQL Script Content
The script (`add_os_column_to_clicks.sql`) will:
1. Add the `os` column as VARCHAR(100) to the `clicks` table
2. Set existing records to have `os = 'Unknown'` as default
3. Create an index on the `os` column for better performance

## After Running the Script
1. The deployment error should be resolved
2. The application will be able to track operating system information for clicks
3. Analytics will include OS data in future click tracking

## Verification
After running the script, you can verify it worked by running:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clicks' AND column_name = 'os';
```

This should return a row showing the `os` column exists with `character varying` data type.
