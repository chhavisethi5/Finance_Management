"""
migrate_add_investments.py
Creates the `investments` and `investment_profiles` tables used by the
Investments sidebar section:
  - `investments` — individual "+ Add New Investment" history entries.
    Creating/editing/deleting a row auto-adjusts `users.manual_savings_offset`
    (see create_investment / update_investment / delete_investment in main.py),
    which is what Liquid Assets is derived from.
  - `investment_profiles` — one row per user holding the "Initial Past
    Investments Setup" summary entered once and editable thereafter. Purely
    informational; does not affect Liquid Assets.
Safe to run multiple times.
"""
from sqlalchemy import text
from database import engine

CREATE_INVESTMENTS_SQL = """
CREATE TABLE investments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    investment_type VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    sub_type VARCHAR(100) NULL,
    quantity NUMERIC(12, 3) NULL,
    date DATE NOT NULL,
    comment VARCHAR(255) NULL,
    CONSTRAINT fk_investments_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_investment_type
        CHECK (investment_type IN ('Property','Precious Metals','Stocks','Mutual Funds','Bank FD','Post Office')),
    CONSTRAINT check_investment_amount_positive
        CHECK (amount > 0)
);
"""

CREATE_INVESTMENT_PROFILES_SQL = """
CREATE TABLE investment_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    properties JSON NOT NULL,
    gold_grams NUMERIC(12, 3) NOT NULL DEFAULT 0,
    silver_grams NUMERIC(12, 3) NOT NULL DEFAULT 0,
    diamond_grams NUMERIC(12, 3) NOT NULL DEFAULT 0,
    platinum_grams NUMERIC(12, 3) NOT NULL DEFAULT 0,
    stocks_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    mutual_funds_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    bank_fd_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    post_office_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    comment VARCHAR(255) NULL,
    CONSTRAINT fk_investment_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_investment_profile_user
        UNIQUE (user_id)
);
"""

CHECK_TABLE_SQL = """
SELECT COUNT(*) AS cnt
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = :table_name;
"""

def _create_if_missing(conn, table_name: str, create_sql: str):
    result = conn.execute(text(CHECK_TABLE_SQL), {"table_name": table_name})
    row = result.fetchone()
    if row and row[0] > 0:
        print(f"Table '{table_name}' already exists — skipping.")
    else:
        conn.execute(text(create_sql))
        conn.commit()
        print(f"Table '{table_name}' created successfully.")

with engine.connect() as conn:
    _create_if_missing(conn, "investments", CREATE_INVESTMENTS_SQL)
    _create_if_missing(conn, "investment_profiles", CREATE_INVESTMENT_PROFILES_SQL)