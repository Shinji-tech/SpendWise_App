ALTER TABLE users
    ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0 CHECK (session_version >= 0);

CREATE TABLE password_reset_tokens (
    token_hash CHAR(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX password_reset_tokens_user_created_idx
    ON password_reset_tokens (user_id, created_at DESC);

CREATE INDEX password_reset_tokens_expiry_idx
    ON password_reset_tokens (expires_at)
    WHERE used_at IS NULL;
