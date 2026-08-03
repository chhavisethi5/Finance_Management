"""
migrate_add_custom_budget_emergency_and_goals.py

Adds custom budget percentage support, emergency fund tracking, monthly savings snapshots,
and financial goals tables and columns.
"""

from sqlalchemy import text
from database import engine

CHECK_USER_COLUMN = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = :column_name;
"""

CHECK_BUDGET_COLUMN = """
SELECT COUNT(*) AS cnt
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'budget_plans'
  AND COLUMN_NAME = :column_name;
"""

CHECK_TABLE = """
SELECT COUNT(*) AS cnt
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = :table_name;
"""

with engine.connect() as conn:
    def column_exists(table_name: str, column_name: str) -> bool:
        result = conn.execute(text(CHECK_USER_COLUMN if table_name == 'users' else CHECK_BUDGET_COLUMN), {
            'column_name': column_name,
        })
        return bool(result.fetchone()[0])

    def table_exists(table_name: str) -> bool:
        result = conn.execute(text(CHECK_TABLE), {'table_name': table_name})
        return bool(result.fetchone()[0])

    if not column_exists('users', 'emergency_fund_saved'):
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN emergency_fund_saved DECIMAL(14, 2) NOT NULL DEFAULT 0 AFTER monthly_income"
        ))
        print("Added users.emergency_fund_saved")
    else:
        print("users.emergency_fund_saved already exists")

    if not column_exists('users', 'onboarded_at'):
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN onboarded_at DATE NULL AFTER emergency_fund_saved"
        ))
        print("Added users.onboarded_at")
    else:
        print("users.onboarded_at already exists")

    for column_name, definition in [
        ('needs_pct', 'DECIMAL(5, 2) NOT NULL DEFAULT 0'),
        ('wants_pct', 'DECIMAL(5, 2) NOT NULL DEFAULT 0'),
        ('savings_pct', 'DECIMAL(5, 2) NOT NULL DEFAULT 0'),
    ]:
        if not column_exists('budget_plans', column_name):
            conn.execute(text(f"ALTER TABLE budget_plans ADD COLUMN {column_name} {definition} AFTER savings_target"))
            print(f"Added budget_plans.{column_name}")
        else:
            print(f"budget_plans.{column_name} already exists")

    if not table_exists('monthly_savings'):
        conn.execute(text(
            "CREATE TABLE monthly_savings ("
            "id INT PRIMARY KEY AUTO_INCREMENT, "
            "user_id INT NOT NULL, "
            "year_month VARCHAR(7) NOT NULL, "
            "savings_amount DECIMAL(14, 2) NOT NULL, "
            "UNIQUE KEY uq_monthly_savings_user_month (user_id, year_month), "
            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
            ")"
        ))
        print("Created monthly_savings table")
    else:
        print("monthly_savings table already exists")

    if not table_exists('financial_goals'):
        conn.execute(text(
            "CREATE TABLE financial_goals ("
            "id INT PRIMARY KEY AUTO_INCREMENT, "
            "user_id INT NOT NULL, "
            "goal_name VARCHAR(255) NOT NULL, "
            "category VARCHAR(100) NOT NULL, "
            "target_amount DECIMAL(14, 2) NOT NULL, "
            "current_saved DECIMAL(14, 2) NOT NULL, "
            "target_date DATE NOT NULL, "
            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
            ")"
        ))
        print("Created financial_goals table")
    else:
        print("financial_goals table already exists")

    if column_exists('budget_plans', 'needs_pct') and column_exists('budget_plans', 'wants_pct') and column_exists('budget_plans', 'savings_pct'):
        conn.execute(text(
            "UPDATE budget_plans bp "
            "JOIN users u ON u.id = bp.user_id "
            "SET bp.needs_pct = ROUND((bp.needs_target / u.monthly_income) * 100, 2), "
            "    bp.wants_pct = ROUND((bp.wants_target / u.monthly_income) * 100, 2), "
            "    bp.savings_pct = ROUND((bp.savings_target / u.monthly_income) * 100, 2) "
            "WHERE u.monthly_income > 0"
        ))
        print("Populated budget_plans percentage columns for existing plans")

    conn.commit()
