from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    """
    User model containing base financial settings.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    # Bcrypt hash of the user's password.
    # nullable=True allows existing DB rows (created before this migration) to
    # remain valid; set nullable=False after a full data migration if desired.
    hashed_password = Column(String(255), nullable=True)
    # Full name — collected during onboarding, not at signup.
    name = Column(String(255), nullable=True)
    # Nullable because it is now set during the post-signup onboarding step,
    # not at signup time.
    monthly_income = Column(Numeric(10, 2), nullable=False)

    # Relationship to transactions with cascade deletes to maintain database integrity
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")

    # One-to-one relationship to the user's budget plan
    budget_plan = relationship("BudgetPlan", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Transaction(Base):
    """
    Transaction model tracking individual income and expense items.
    """
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # 'income' or 'expense'
    transaction_date = Column("date", Date, nullable=False)

    # Relationship back to the User model
    user = relationship("User", back_populates="transactions")

    # Table constraints to ensure domain integrity at the database layer
    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_transaction_type"),
        CheckConstraint("amount >= 0", name="check_transaction_amount_non_negative"),
    )


class BudgetPlan(Base):
    """
    BudgetPlan model storing a user's personalised budget targets.

    Each user can have at most one active budget plan.  The three target
    columns store absolute dollar amounts (not percentages) so that the
    /budget-status endpoint can compare them directly against raw expense
    totals without any extra arithmetic at query time.
    """
    __tablename__ = "budget_plans"

    id = Column(Integer, primary_key=True, index=True)

    # FK to the owning user – deleting the user cascades to the plan
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Lifestyle tier label used when the plan was created (e.g. 'standard', 'aggressive')
    lifestyle_tier = Column(String(50), nullable=False)

    # Calculated dollar targets derived from the user's monthly_income
    needs_target   = Column(Numeric(10, 2), nullable=False)   # e.g. 50 % of income
    wants_target   = Column(Numeric(10, 2), nullable=False)   # e.g. 30 % of income
    savings_target = Column(Numeric(10, 2), nullable=False)   # e.g. 20 % of income

    # Relationship back to User
    user = relationship("User", back_populates="budget_plan")

    __table_args__ = (
        # Enforce one active plan per user at the DB level
        UniqueConstraint("user_id", name="uq_budget_plan_user"),
        CheckConstraint("needs_target   >= 0", name="check_needs_target_non_negative"),
        CheckConstraint("wants_target   >= 0", name="check_wants_target_non_negative"),
        CheckConstraint("savings_target >= 0", name="check_savings_target_non_negative"),
    )
