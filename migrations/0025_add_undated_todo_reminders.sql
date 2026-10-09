ALTER TABLE todo_digest_settings ADD COLUMN undated_mode TEXT NOT NULL DEFAULT 'off' CHECK (undated_mode IN ('off', 'weekly', 'monthly'));
ALTER TABLE todo_digest_settings ADD COLUMN last_undated_date TEXT;
