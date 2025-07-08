-- Add missing 'os' column to clicks table
-- This column should store the operating system name from the user agent parsing

-- Check if the column already exists before adding it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'os') THEN
        ALTER TABLE clicks ADD COLUMN os VARCHAR(100);
    END IF;
END $$;

-- Update existing records to set os to 'Unknown' if we have data
UPDATE clicks SET os = 'Unknown' WHERE os IS NULL;

-- Create an index on the os column for better query performance
CREATE INDEX IF NOT EXISTS idx_clicks_os ON clicks(os);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clicks' AND column_name = 'os';
