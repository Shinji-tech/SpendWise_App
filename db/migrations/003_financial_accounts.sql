CREATE TABLE financial_accounts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id VARCHAR(40) NOT NULL,
    name VARCHAR(60) NOT NULL,
    type VARCHAR(12) NOT NULL CHECK (type IN ('cash', 'wallet', 'bank')),
    opening_balance BIGINT NOT NULL CHECK (opening_balance >= 0),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

INSERT INTO financial_accounts (user_id, id, name, type, opening_balance)
SELECT users.id, defaults.id, defaults.name, defaults.type, 0
FROM users
CROSS JOIN (
    VALUES ('cash', 'Cash', 'cash'), ('momo', 'MoMo', 'wallet'), ('vietcombank', 'Vietcombank', 'bank')
) AS defaults(id, name, type)
ON CONFLICT (user_id, id) DO NOTHING;

ALTER TABLE transactions
    ADD CONSTRAINT transactions_account_fk
    FOREIGN KEY (user_id, account) REFERENCES financial_accounts(user_id, id);

CREATE INDEX financial_accounts_user_archived_idx ON financial_accounts (user_id, archived, created_at);
