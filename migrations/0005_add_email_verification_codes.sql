-- Create email_verification_codes table
CREATE TABLE email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_verification_email ON email_verification_codes(email);
CREATE INDEX idx_verification_expires ON email_verification_codes(expires_at);
