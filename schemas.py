from datetime import date
from decimal import Decimal
from typing import Literal, Dict
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Budget-tier configuration
# ---------------------------------------------------------------------------
# Maps each lifestyle tier name to its (needs%, wants%, savings%) split.
# Add new tiers here without touching any endpoint logic.
# ---------------------------------------------------------------------------
LIFESTYLE_TIERS: Dict[str, Dict[str, Decimal]] = {
    "standard": {           # Classic 50/30/20 rule
        "needs":   Decimal("0.50"),
        "wants":   Decimal("0.30"),
        "savings": Decimal("0.20"),
    },
    "aggressive": {         # Savings-first 40/20/40 rule
        "needs":   Decimal("0.40"),
        "wants":   Decimal("0.20"),
        "savings": Decimal("0.40"),
    },
    "frugal": {             # Extreme-saving 30/20/50 rule
        "needs":   Decimal("0.30"),
        "wants":   Decimal("0.20"),
        "savings": Decimal("0.50"),
    },
    "comfort": {            # Lifestyle-first 50/40/10 rule
        "needs":   Decimal("0.50"),
        "wants":   Decimal("0.40"),
        "savings": Decimal("0.10"),
    },
}

# ---------------------------------------------------------------------------
# User Schemas
# ---------------------------------------------------------------------------

# Reusable email pattern (avoids requiring the external email-validator package).
EMAIL_PATTERN = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


class UserCreate(BaseModel):
    """
    Request body for POST /signup/.

    Deliberately minimal — name, monthly_income, and lifestyle_tier are
    collected afterwards in the onboarding step, not at signup time.
    """

    email: str = Field(..., pattern=EMAIL_PATTERN, description="User's email address")
    password: str = Field(
        ...,
        min_length=6,
        description="Plain-text password (min 6 characters). Stored as a bcrypt hash.",
    )
    


class UserLogin(BaseModel):
    """Request body for POST /login/ — email + password only."""

    email: str = Field(..., pattern=EMAIL_PATTERN, description="Registered email address")
    password: str = Field(..., description="Plain-text password to verify")


class UserResponse(BaseModel):
    """
    Safe user representation returned by the API.

    Deliberately does NOT inherit from UserCreate so that hashed_password
    (or any future sensitive field) can never accidentally be serialised
    into a response.

    name / monthly_income are Optional because a freshly-signed-up user
    hasn't completed onboarding yet. The frontend uses their absence to
    decide whether to route the user to /onboarding.
    """

    id: int
    email: str
    name: str | None = None
    monthly_income: Decimal | None = None

    class Config:
        from_attributes = True


# -------------------------
# Transaction Schemas
# -------------------------
class TransactionBase(BaseModel):
    amount: Decimal = Field(
        ..., 
        gt=0, 
        max_digits=10, 
        decimal_places=2, 
        description="Transaction amount (must be positive)"
    )
    category: str = Field(
        ..., 
        min_length=1, 
        max_length=100, 
        description="Transaction category, e.g., food, utilities"
    )
    type: Literal["income", "expense"] = Field(
        ..., 
        description="Transaction type: income or expense"
    )
    transaction_date: date = Field(
        ..., 
        description="Transaction date (YYYY-MM-DD)"
    )

class TransactionCreate(TransactionBase):
    user_id: int

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# -------------------------
# Summary Response Schema
# -------------------------
class FinancialSummary(BaseModel):
    user_id: int
    monthly_income: Decimal
    total_income: Decimal
    total_expenses: Decimal
    remaining_balance: Decimal


# ---------------------------------------------------------------------------
# Budget Plan Schemas                                                  Phase 2
# ---------------------------------------------------------------------------

# Dynamically build a Literal type from the configured tier names so that
# FastAPI will reject unknown tiers with a descriptive 422 Unprocessable Entity.
LifestyleTier = Literal["standard", "aggressive", "frugal", "comfort"]


class BudgetPlanCreate(BaseModel):
    """Request body for POST /budget-plan/."""

    user_id: int = Field(..., gt=0, description="ID of the user to assign the plan to")

    # Plain str (not the strict Literal) so casing differences like "Aggressive"
    # normalize instead of failing with a hard-to-read 422 array. The endpoint
    # validates membership in LIFESTYLE_TIERS after normalizing.
    lifestyle_tier: str = Field(
        ...,
        description=(
            "Budget allocation strategy: "
            "'standard' (50/30/20), 'aggressive' (40/20/40), "
            "'frugal' (30/20/50), 'comfort' (50/40/10). Case-insensitive."
        ),
    )

    @field_validator("lifestyle_tier", mode="before")
    @classmethod
    def _normalize_tier(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v
    


class BudgetPlanResponse(BaseModel):
    """Full representation of a saved BudgetPlan row."""

    id: int
    user_id: int
    lifestyle_tier: str
    needs_target: Decimal
    wants_target: Decimal
    savings_target: Decimal

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Onboarding Schemas
# ---------------------------------------------------------------------------

class OnboardingRequest(BaseModel):
    """Request body for POST /onboarding/{user_id}."""

    name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    monthly_income: Decimal = Field(
        ...,
        gt=0,
        max_digits=10,
        decimal_places=2,
        description="Monthly income in INR (must be positive)",
    )
    lifestyle_tier: LifestyleTier = Field(
        ...,
        description=(
            "Budget allocation strategy: "
            "'standard' (50/30/20), 'aggressive' (40/20/40), "
            "'frugal' (30/20/50), 'comfort' (50/40/10)"
        ),
    )

    @field_validator("lifestyle_tier", mode="before")
    @classmethod
    def _normalize_tier(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v


class OnboardingResponse(BaseModel):
    """Response body for POST /onboarding/{user_id} — the updated user plus their new budget plan."""

    user: UserResponse
    budget_plan: BudgetPlanResponse


# ---------------------------------------------------------------------------
# Budget Status Schemas                                                Phase 2
# ---------------------------------------------------------------------------

class CategoryBreakdown(BaseModel):
    """Spending breakdown for a single transaction category."""

    category: str
    total_spent: Decimal


class BudgetBucketStatus(BaseModel):
    """Comparison of a single budget bucket (needs / wants) vs. actual spend."""

    target: Decimal          # Dollar amount allocated for this bucket
    spent: Decimal           # Actual expenses logged in this bucket
    remaining: Decimal       # target - spent  (negative means over-budget)
    is_over_budget: bool     # Convenience flag for the client


class BudgetStatusResponse(BaseModel):
    """
    Full budget status for a user.

    The 'needs' bucket includes any transaction whose type is 'expense' and
    whose category is tagged as a need (by convention: 'rent', 'groceries',
    'utilities', 'transport', 'healthcare').  Everything else is counted as
    a 'want'.  Savings are inferred as income minus all expenses.
    """

    user_id: int
    monthly_income: Decimal
    lifestyle_tier: str

    # Per-bucket summary
    needs: BudgetBucketStatus
    wants: BudgetBucketStatus

    # Savings: how much is left after all expenses vs. the savings target
    savings_target: Decimal
    actual_savings: Decimal          # monthly_income - total_expenses
    savings_remaining: Decimal       # savings_target - (monthly_income - actual_savings)
    is_savings_on_track: bool        # True when actual_savings >= savings_target

    # Granular per-category breakdown for the front-end to render charts
    category_breakdown: list[CategoryBreakdown]
