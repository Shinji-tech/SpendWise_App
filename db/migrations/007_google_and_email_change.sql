ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL,
    ADD COLUMN google_subject VARCHAR(255) UNIQUE;

CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));

CREATE TABLE email_change_tokens (
    token_hash CHAR(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_email VARCHAR(254) NOT NULL CHECK (new_email = LOWER(new_email)),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_change_tokens_user_created_idx
    ON email_change_tokens (user_id, created_at DESC);

CREATE INDEX email_change_tokens_expiry_idx
    ON email_change_tokens (expires_at)
    WHERE used_at IS NULL;
