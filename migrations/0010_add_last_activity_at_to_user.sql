-- Migration number: 0010 	 2025-12-01T00:00:00.000Z
-- Add last_activity_at column to user table

ALTER TABLE user ADD COLUMN last_activity_at INTEGER;
