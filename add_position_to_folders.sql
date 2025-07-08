-- Add position column to folders table
ALTER TABLE folders ADD COLUMN position INTEGER DEFAULT 0;

-- Initially set position for existing folders based on their name
-- This will ensure that existing folders have unique positions
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn
  FROM folders
)
UPDATE folders
SET position = numbered.rn
FROM numbered
WHERE folders.id = numbered.id AND folders.position = 0;

-- Create an index on position field for faster sorting
CREATE INDEX idx_folders_position ON folders(position);
