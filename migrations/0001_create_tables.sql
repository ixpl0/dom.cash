-- Drop existing tables if any (for clean install)
DROP TABLE IF EXISTS budget_share;
DROP TABLE IF EXISTS entry;
DROP TABLE IF EXISTS month;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS currency;
DROP TABLE IF EXISTS user;

-- Create user table
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  main_currency TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CONSTRAINT ck_user_currency_3_upper CHECK (main_currency GLOB '[A-Z][A-Z][A-Z]')
);

-- Create session table
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  CONSTRAINT ck_session_time_order CHECK (expires_at >= created_at)
);
CREATE INDEX idx_session_user ON session(user_id);
CREATE INDEX idx_session_expires ON session(expires_at);

-- Create currency table
CREATE TABLE currency (
  date TEXT PRIMARY KEY,
  rates TEXT NOT NULL,
  last_update_attempt INTEGER,
  CONSTRAINT ck_currency_date_format CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  CONSTRAINT ck_currency_rates_is_object CHECK (rates GLOB '{*}')
);

-- Create month table
CREATE TABLE month (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  CONSTRAINT ck_month_range CHECK (month BETWEEN 0 AND 11),
  UNIQUE(user_id, year, month)
);
CREATE INDEX idx_month_user ON month(user_id);

-- Create entry table
CREATE TABLE entry (
  id TEXT PRIMARY KEY,
  month_id TEXT NOT NULL REFERENCES month(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('balance', 'income', 'expense')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  date TEXT,
  CONSTRAINT ck_amount_nonneg CHECK (amount >= 0),
  CONSTRAINT ck_entry_currency_3_upper CHECK (currency GLOB '[A-Z][A-Z][A-Z]')
);
CREATE INDEX idx_entry_month ON entry(month_id);
CREATE INDEX idx_entry_date ON entry(date);

-- Create budget_share table
CREATE TABLE budget_share (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  shared_with_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  access TEXT NOT NULL CHECK(access IN ('read', 'write')),
  created_at INTEGER NOT NULL,
  CONSTRAINT ck_no_self_share CHECK (owner_id <> shared_with_id),
  UNIQUE(owner_id, shared_with_id)
);
CREATE INDEX idx_budget_share_owner ON budget_share(owner_id);
CREATE INDEX idx_budget_share_shared_with ON budget_share(shared_with_id);