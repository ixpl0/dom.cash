CREATE TABLE push_subscription (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CONSTRAINT uq_push_subscription_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscription_user ON push_subscription(user_id);
CREATE INDEX idx_push_subscription_session ON push_subscription(session_id);

CREATE TABLE todo_digest_settings (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  digest_time INTEGER NOT NULL DEFAULT 540,
  weekdays TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  overdue_mode TEXT NOT NULL DEFAULT 'fading',
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en',
  last_sent_date TEXT,
  CONSTRAINT ck_todo_digest_time CHECK (digest_time BETWEEN 0 AND 1439),
  CONSTRAINT ck_todo_digest_weekdays_is_array CHECK (weekdays GLOB '[[]*]'),
  CONSTRAINT ck_todo_digest_overdue_mode CHECK (overdue_mode IN ('fading', 'daily', 'off'))
);
