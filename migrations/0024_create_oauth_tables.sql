CREATE TABLE oauth_client (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CONSTRAINT ck_oauth_client_redirect_uris_is_array CHECK (redirect_uris GLOB '[[]*]')
);

CREATE TABLE oauth_authorization_code (
  code_hash TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_client(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  scopes TEXT NOT NULL,
  resource TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  CONSTRAINT ck_oauth_authorization_code_scopes_is_array CHECK (scopes GLOB '[[]*]')
);

CREATE INDEX idx_oauth_authorization_code_expires ON oauth_authorization_code(expires_at);

CREATE TABLE oauth_grant (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES oauth_client(id) ON DELETE CASCADE,
  scopes TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  CONSTRAINT ck_oauth_grant_scopes_is_array CHECK (scopes GLOB '[[]*]')
);

CREATE INDEX idx_oauth_grant_user ON oauth_grant(user_id);
CREATE INDEX idx_oauth_grant_client ON oauth_grant(client_id);

CREATE TABLE oauth_token (
  token_hash TEXT PRIMARY KEY NOT NULL,
  grant_id TEXT NOT NULL REFERENCES oauth_grant(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  CONSTRAINT ck_oauth_token_kind CHECK (kind IN ('access', 'refresh'))
);

CREATE INDEX idx_oauth_token_grant ON oauth_token(grant_id);
CREATE INDEX idx_oauth_token_expires ON oauth_token(expires_at);
