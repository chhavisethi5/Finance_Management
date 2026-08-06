"""
migrate_add_is_past_to_investments.py
Adds the `is_past` column to the existing `investments` table.
Safe to run multiple times — skips if the column already exists.
"""
from sqlalchemy import text
from database import engine

ADD_COLUMN_SQL = """
ALTER TABLE investments
ADD COLUMN is_past TINYINT(1) NOT NULL DEFAULT 0;
"""

CHECK_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'investments'
  AND COLUMN_NAME  = 'is_past';
"""

def main():
    print("Connecting to database to check for 'is_past' column in 'investments' table...")
    with engine.connect() as conn:
        result = conn.execute(text(CHECK_SQL))
        row = result.fetchone()
        if row and row[0] > 0:
            print("Column 'is_past' already exists — nothing to do.")
        else:
            print("Adding column 'is_past' to 'investments' table...")
            conn.execute(text(ADD_COLUMN_SQL))
            conn.commit()
            print("Column 'is_past' added successfully to 'investments' table.")

if __name__ == "__main__":
    main()
