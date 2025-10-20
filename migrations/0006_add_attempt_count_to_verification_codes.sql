-- Add attempt_count and last_sent_at to email_verification_codes table
ALTER TABLE email_verification_codes ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_verification_codes ADD COLUMN last_sent_at INTEGER;
