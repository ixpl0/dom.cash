ALTER TABLE email_verification_codes ADD COLUMN verify_attempt_count INTEGER NOT NULL DEFAULT 0;
