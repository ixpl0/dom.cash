-- Migration number: 0008 	 2025-11-25T00:00:00.000Z
-- Add is_admin column to user table

ALTER TABLE user ADD COLUMN is_admin INTEGER DEFAULT 0 NOT NULL;
