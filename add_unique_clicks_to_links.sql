-- Add unique click count column to links table
ALTER TABLE links ADD COLUMN unique_click_count INTEGER DEFAULT 0;

-- Initially set unique_click_count for existing links based on clicks data
-- The subquery counts distinct user fingerprints per link
UPDATE links AS l
SET unique_click_count = COALESCE(c.unique_count, 0)
FROM (
    SELECT link_id, COUNT(DISTINCT user_fingerprint) as unique_count
    FROM clicks
    GROUP BY link_id
) AS c
WHERE l.id = c.link_id;

-- Create an index for faster queries
CREATE INDEX idx_links_unique_click_count ON links(unique_click_count);
