"""
migrate_add_risk_appetite_to_users.py
Adds the `risk_appetite` column to the `users` table.
"""
from sqlalchemy import text
from database import engine

CHECK_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'users'
  AND COLUMN_NAME  = 'risk_appetite';
"""

ADD_COLUMN_SQL = """
ALTER TABLE users
ADD COLUMN risk_appetite VARCHAR(50) NULL DEFAULT 'Medium';
"""

UPDATE_EXISTING_SQL = """
UPDATE users
SET risk_appetite = 'Medium'
WHERE risk_appetite IS NULL;
"""

def main():
    print("Checking if 'risk_appetite' column exists in 'users' table...")
    with engine.connect() as conn:
        result = conn.execute(text(CHECK_SQL))
        row = result.fetchone()
        if row and row[0] > 0:
            print("Column 'risk_appetite' already exists. Nothing to do.")
        else:
            print("Adding column 'risk_appetite' to 'users' table...")
            conn.execute(text(ADD_COLUMN_SQL))
            conn.commit()
            print("Column added successfully.")
            
            print("Defaulting existing users to 'Medium' risk appetite...")
            conn.execute(text(UPDATE_EXISTING_SQL))
            conn.commit()
            print("Existing users updated.")

if __name__ == "__main__":
    main()
