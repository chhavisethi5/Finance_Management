"""
migrate_rename_precious_metals_to_commodities.py
1. Adds `other_commodities` JSON column to the `investment_profiles` table if missing.
2. Updates existing rows in `investments` where `investment_type = 'Precious Metals'` to `'Commodities'`.
3. Updates the `check_investment_type` check constraint on `investments` table.
"""
from sqlalchemy import text
from database import engine

CHECK_COLUMN_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'investment_profiles'
  AND COLUMN_NAME  = 'other_commodities';
"""

ADD_COLUMN_SQL = """
ALTER TABLE investment_profiles
ADD COLUMN other_commodities JSON NOT NULL DEFAULT (JSON_ARRAY());
"""

UPDATE_INVESTMENT_TYPE_SQL = """
UPDATE investments
SET investment_type = 'Commodities'
WHERE investment_type = 'Precious Metals';
"""

def main():
    print("Connecting to database for Commodities migration...")
    with engine.connect() as conn:
        # 1. Add other_commodities JSON column
        result = conn.execute(text(CHECK_COLUMN_SQL))
        row = result.fetchone()
        if row and row[0] > 0:
            print("Column 'other_commodities' already exists in 'investment_profiles' — skipping.")
        else:
            print("Adding column 'other_commodities' to 'investment_profiles' table...")
            conn.execute(text(ADD_COLUMN_SQL))
            conn.commit()
            print("Column 'other_commodities' added successfully.")

        # 2. Update existing investment types
        print("Updating existing 'Precious Metals' investment records to 'Commodities'...")
        res = conn.execute(text(UPDATE_INVESTMENT_TYPE_SQL))
        conn.commit()
        print(f"Updated {res.rowcount} rows in 'investments' table.")

        # 3. Update check constraint on investments
        print("Recreating check constraint 'check_investment_type' on 'investments' table...")
        try:
            conn.execute(text("ALTER TABLE investments DROP CONSTRAINT check_investment_type"))
            conn.commit()
            print("Dropped old check constraint 'check_investment_type'.")
        except Exception as e:
            print("Could not drop constraint (might not exist):", e)

        try:
            conn.execute(text(
                "ALTER TABLE investments ADD CONSTRAINT check_investment_type "
                "CHECK (investment_type IN ('Property','Commodities','Stocks','Mutual Funds','Bank FD','Post Office'))"
            ))
            conn.commit()
            print("Created updated check constraint 'check_investment_type' successfully.")
        except Exception as e:
            print("Error adding updated check constraint:", e)

    print("Migration completed successfully.")

if __name__ == "__main__":
    main()
