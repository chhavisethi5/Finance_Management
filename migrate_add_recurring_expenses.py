"""
migrate_add_recurring_expenses.py
Creates the `recurring_expenses` table used for automated fixed/recurring
expenses (rent, EMIs, subscriptions, utilities, etc.). Each row is processed
lazily by `_process_due_recurring_expenses()` in main.py whenever its
`next_deduction_date` arrives — a matching row is written into `transactions`
and the schedule is rolled forward.
Safe to run multiple times.
"""
from sqlalchemy import text
from database import engine

CREATE_TABLE_SQL = """
CREATE TABLE recurring_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    deduction_day INT NOT NULL,
    next_deduction_date DATE NOT NULL,
    comment VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_recurring_expenses_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_recurring_frequency
        CHECK (frequency IN ('monthly', 'quarterly')),
    CONSTRAINT check_recurring_amount_positive
        CHECK (amount > 0),
    CONSTRAINT check_recurring_day_range
        CHECK (deduction_day >= 1 AND deduction_day <= 28)
);
"""

CHECK_TABLE_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'recurring_expenses';
"""

with engine.connect() as conn:
    result = conn.execute(text(CHECK_TABLE_SQL))
    row = result.fetchone()
    if row and row[0] > 0:
        print("Table 'recurring_expenses' already exists — skipping.")
    else:
        conn.execute(text(CREATE_TABLE_SQL))
        conn.commit()
        print("Table 'recurring_expenses' created successfully.")