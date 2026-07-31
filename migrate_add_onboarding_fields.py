"""
migrate_add_onboarding_fields.py
Adds the `name` column to `users` and makes `monthly_income` nullable,
since both are now set during the post-signup onboarding step instead
of at signup time. Safe to run multiple times.
"""
from sqlalchemy import text
from database import engine

ADD_NAME_COLUMN_SQL = """
ALTER TABLE users
ADD COLUMN name VARCHAR(255) NULL
AFTER hashed_password;
"""

CHECK_NAME_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'users'
  AND COLUMN_NAME  = 'name';
"""

MAKE_INCOME_NULLABLE_SQL = """
ALTER TABLE users
MODIFY COLUMN monthly_income NUMERIC(10, 2) NULL;
"""

with engine.connect() as conn:
    result = conn.execute(text(CHECK_NAME_SQL))
    row = result.fetchone()
    if row and row[0] > 0:
        print("Column 'name' already exists — skipping.")
    else:
        conn.execute(text(ADD_NAME_COLUMN_SQL))
        conn.commit()
        print("Column 'name' added successfully to 'users'.")

    # MODIFY is idempotent — safe to run even if already nullable.
    conn.execute(text(MAKE_INCOME_NULLABLE_SQL))
    conn.commit()
    print("Column 'monthly_income' is now nullable.")