"""
migrate_add_manual_savings_offset.py
Adds the `manual_savings_offset` column to `users`, letting a user manually
record lifetime savings they had *before* they started using MoneyMap. This
value is folded into the total_savings figure returned by /budget-status
and, as of this migration, also drives the automated Emergency Fund
calculation instead of the old manual emergency_fund_saved input.
Safe to run multiple times.
"""
from sqlalchemy import text
from database import engine

ADD_COLUMN_SQL = """
ALTER TABLE users
ADD COLUMN manual_savings_offset NUMERIC(14, 2) NOT NULL DEFAULT 0
AFTER emergency_fund_saved;
"""

CHECK_COLUMN_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'users'
  AND COLUMN_NAME  = 'manual_savings_offset';
"""

with engine.connect() as conn:
    result = conn.execute(text(CHECK_COLUMN_SQL))
    row = result.fetchone()
    if row and row[0] > 0:
        print("Column 'manual_savings_offset' already exists — skipping.")
    else:
        conn.execute(text(ADD_COLUMN_SQL))
        conn.commit()
        print("Column 'manual_savings_offset' added successfully to 'users'.")