CREATE TABLE monthly_budgets (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('housing', 'utilities', 'shopping', 'food', 'transport', 'other')),
    monthly_limit BIGINT NOT NULL CHECK (monthly_limit >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, category)
);

CREATE TABLE saving_goals (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id VARCHAR(40) NOT NULL,
    name VARCHAR(60) NOT NULL,
    saved BIGINT NOT NULL CHECK (saved >= 0),
    target BIGINT NOT NULL CHECK (target > 0),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);
