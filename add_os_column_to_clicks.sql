-- Add missing 'os' column to clicks table
-- This column should store the operating system name from the user agent parsing

ALTER TABLE clicks ADD COLUMN os VARCHAR(100);

-- Update existing records to set os to 'Unknown' if we have data
UPDATE clicks SET os = 'Unknown' WHERE os IS NULL;

-- Create an index on the os column for better query performance
CREATE INDEX IF NOT EXISTS idx_clicks_os ON clicks(os);
