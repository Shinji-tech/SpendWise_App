CREATE TABLE transactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id VARCHAR(80) NOT NULL,
    type VARCHAR(8) NOT NULL CHECK (type IN ('income', 'expense')),
    title VARCHAR(60) NOT NULL,
    note VARCHAR(120) NOT NULL DEFAULT '',
    amount BIGINT NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    category VARCHAR(16) NOT NULL CHECK (
        category IN ('housing', 'utilities', 'shopping', 'food', 'transport', 'other', 'income')
    ),
    account VARCHAR(40) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('confirmed', 'needs_review', 'processing')),
    receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
    receipt_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, id),
    CHECK ((type = 'income' AND category = 'income') OR (type = 'expense' AND category <> 'income')),
    CHECK (receipt_metadata IS NULL OR jsonb_typeof(receipt_metadata) = 'object')
);

CREATE INDEX transactions_user_date_idx ON transactions (user_id, date DESC, created_at DESC);
