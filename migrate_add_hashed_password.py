"""
migrate_add_hashed_password.py
Adds the `hashed_password` column to the existing `users` table.
Safe to run multiple times — skips if the column already exists.
"""
from sqlalchemy import text
from database import engine

ADD_COLUMN_SQL = """
ALTER TABLE users
ADD COLUMN hashed_password VARCHAR(255) NULL
AFTER email;
"""

CHECK_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'users'
  AND COLUMN_NAME  = 'hashed_password';
"""

with engine.connect() as conn:
    result = conn.execute(text(CHECK_SQL))
    row = result.fetchone()
    if row and row[0] > 0:
        print("Column 'hashed_password' already exists — nothing to do.")
    else:
        conn.execute(text(ADD_COLUMN_SQL))
        conn.commit()
        print("Column 'hashed_password' added successfully to 'users'.")
