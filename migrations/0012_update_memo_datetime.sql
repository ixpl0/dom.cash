-- Migration number: 0012 	 2025-12-13
-- Update memo table to support datetime format for planned_date
-- Remove date format CHECK constraint (validation is done at API level)

-- SQLite doesn't support ALTER CONSTRAINT, so we need to recreate the table

-- 1. Create new table without date format constraint
CREATE TABLE memo_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('todo', 'memo', 'plan')),
  content TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0 CHECK(is_completed IN (0, 1)),
  planned_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 2. Copy data (convert existing dates to datetime format)
INSERT INTO memo_new (id, user_id, type, content, is_completed, planned_date, created_at, updated_at)
SELECT id, user_id, type, content, is_completed,
  CASE WHEN planned_date IS NOT NULL THEN planned_date || 'T12:00' ELSE NULL END,
  created_at, updated_at
FROM memo;

-- 3. Drop old table
DROP TABLE memo;

-- 4. Rename new table
ALTER TABLE memo_new RENAME TO memo;

-- 5. Recreate indexes
CREATE INDEX idx_memo_user ON memo(user_id);
CREATE INDEX idx_memo_type ON memo(type);
