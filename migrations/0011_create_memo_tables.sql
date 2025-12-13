-- Migration number: 0011 	 2025-12-13T16:42:13.632Z

-- Create memo table
CREATE TABLE memo (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('todo', 'memo', 'plan')),
  content TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0 CHECK(is_completed IN (0, 1)),
  planned_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CONSTRAINT ck_memo_date_format CHECK (planned_date IS NULL OR planned_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]')
);
CREATE INDEX idx_memo_user ON memo(user_id);
CREATE INDEX idx_memo_type ON memo(type);

-- Create memo_share table
CREATE TABLE memo_share (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL REFERENCES memo(id) ON DELETE CASCADE,
  shared_with_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(memo_id, shared_with_id)
);
CREATE INDEX idx_memo_share_memo ON memo_share(memo_id);
CREATE INDEX idx_memo_share_user ON memo_share(shared_with_id);
