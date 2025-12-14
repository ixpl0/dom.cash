-- Migration number: 0013 	 2025-12-14T00:27:55.025Z

-- Remove type field from memo table
-- SQLite 3.35+ supports ALTER TABLE DROP COLUMN

DROP INDEX IF EXISTS idx_memo_type;
ALTER TABLE memo DROP COLUMN type;
