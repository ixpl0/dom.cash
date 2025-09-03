-- Add is_optional column to entry table
-- This column indicates whether the entry is optional (can be not spent)
ALTER TABLE entry ADD COLUMN is_optional INTEGER DEFAULT 0;
