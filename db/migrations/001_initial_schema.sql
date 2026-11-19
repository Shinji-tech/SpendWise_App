CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE receipts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(32) NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'application/pdf')),
    file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX receipts_user_created_idx ON receipts (user_id, created_at DESC);
