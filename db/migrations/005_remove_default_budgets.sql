DELETE FROM monthly_budgets
WHERE (category, monthly_limit) IN (
    ('housing', 3000000),
    ('utilities', 700000),
    ('shopping', 400000),
    ('food', 200000),
    ('transport', 200000)
);
