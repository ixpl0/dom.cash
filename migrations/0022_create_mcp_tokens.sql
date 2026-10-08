CREATE TABLE mcp_token (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  CONSTRAINT ck_mcp_token_scopes_is_array CHECK (scopes GLOB '[[]*]')
);

CREATE INDEX idx_mcp_token_user ON mcp_token(user_id);
