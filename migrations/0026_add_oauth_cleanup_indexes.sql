CREATE INDEX idx_oauth_client_created ON oauth_client(created_at);
CREATE INDEX idx_oauth_authorization_code_client ON oauth_authorization_code(client_id);
