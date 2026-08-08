from datetime import date
from decimal import Decimal
from typing import Literal, Dict, List
from pydantic import BaseModel, Field, field_validator, model_validator

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
    manual_savings_offset: Decimal = Decimal("0.00")
    risk_appetite: Literal["Low", "Medium", "High"] | None = None

    class Config:
        from_attributes = True


class UserSavingsUpdateRequest(BaseModel):
    """
    Request body for PUT /user/{user_id}/savings.

    Lets a user manually set the lifetime savings they had *before* they
    started using MoneyMap (e.g. money already sitting in a bank account).
    This is a full replace, not a delta — the client sends the new total.
    """

    manual_savings_offset: Decimal = Field(
        ...,
        ge=0,
        max_digits=14,
        decimal_places=2,
        description="Total pre-existing savings from before using MoneyMap, in INR.",
    )


class UserProfileUpdateRequest(BaseModel):
    """
    Request body for PUT /user/{user_id}/profile.

    Allows updating the core account information and baseline settings.
    """

    name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    monthly_income: Decimal = Field(
        ...,
        ge=0,
        max_digits=10,
        decimal_places=2,
        description="User's monthly income, in INR."
    )
    manual_savings_offset: Decimal = Field(
        ...,
        ge=0,
        max_digits=14,
        decimal_places=2,
        description="Total pre-existing savings from before using MoneyMap, in INR."
    )



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
    comment: str | None = Field(
        None,
        max_length=255,
        description="Optional free-text note about the transaction, e.g. 'Dinner with friends'",
    )

class TransactionCreate(TransactionBase):
    user_id: int

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):
    """
    Request body for PUT /transactions/{transaction_id}.

    Every field is optional so the client can send only what changed —
    e.g. editing just the comment shouldn't require resubmitting the amount.
    """

    amount: Decimal | None = Field(
        None, gt=0, max_digits=10, decimal_places=2, description="Transaction amount (must be positive)"
    )
    category: str | None = Field(None, min_length=1, max_length=100, description="Transaction category")
    type: Literal["income", "expense"] | None = Field(None, description="Transaction type: income or expense")
    transaction_date: date | None = Field(None, description="Transaction date (YYYY-MM-DD)")
    comment: str | None = Field(None, max_length=255, description="Optional free-text note about the transaction")


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
LifestyleTier = Literal["standard", "aggressive", "frugal", "comfort", "custom"]


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
            "'frugal' (30/20/50), 'comfort' (50/40/10), "
            "or 'custom' with your own split. Case-insensitive."
        ),
    )

    custom_needs_pct: Decimal | None = Field(
        None,
        ge=0,
        le=100,
        description="Custom allocation for needs, when lifestyle_tier is 'custom'",
    )
    custom_wants_pct: Decimal | None = Field(
        None,
        ge=0,
        le=100,
        description="Custom allocation for wants, when lifestyle_tier is 'custom'",
    )
    custom_savings_pct: Decimal | None = Field(
        None,
        ge=0,
        le=100,
        description="Custom allocation for savings, when lifestyle_tier is 'custom'",
    )

    @field_validator("lifestyle_tier", mode="before")
    @classmethod
    def _normalize_tier(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v

    @model_validator(mode="after")
    def _validate_custom_allocation(self):
        if self.lifestyle_tier == "custom":
            if self.custom_needs_pct is None or self.custom_wants_pct is None or self.custom_savings_pct is None:
                raise ValueError(
                    "Custom tier requires custom_needs_pct, custom_wants_pct, and custom_savings_pct to be provided."
                )
            total = self.custom_needs_pct + self.custom_wants_pct + self.custom_savings_pct
            if total != Decimal("100"):
                raise ValueError("Custom allocations must sum to exactly 100%.")
        return self


class BudgetPlanResponse(BaseModel):
    """Full representation of a saved BudgetPlan row."""

    id: int
    user_id: int
    lifestyle_tier: str
    needs_target: Decimal
    wants_target: Decimal
    savings_target: Decimal
    needs_pct: Decimal
    wants_pct: Decimal
    savings_pct: Decimal

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Onboarding Schemas
# ---------------------------------------------------------------------------

class RiskAppetiteUpdateRequest(BaseModel):
    """Request body for updating risk appetite."""
    risk_appetite: Literal["Low", "Medium", "High"]


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
    risk_appetite: Literal["Low", "Medium", "High"] = "Medium"
    lifestyle_tier: LifestyleTier = Field(
        ...,
        description=(
            "Budget allocation strategy: "
            "'standard' (50/30/20), 'aggressive' (40/20/40), "
            "'frugal' (30/20/50), 'comfort' (50/40/10), or 'custom'."
        ),
    )
    custom_needs_pct: Decimal | None = Field(
        None,
        ge=0,
        le=100,
        description="Custom allocation for needs, when lifestyle_tier is 'custom'",
    )
    custom_wants_pct: Decimal | None = Field(
        None,
        ge=0,
        le=100,
        description="Custom allocation for wants, when lifestyle_tier is 'custom'",
    )
    custom_savings_pct: Decimal | None = Field(
        None,
        ge=0,
        le=100,
        description="Custom allocation for savings, when lifestyle_tier is 'custom'",
    )

    @field_validator("lifestyle_tier", mode="before")
    @classmethod
    def _normalize_tier(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v

    @model_validator(mode="after")
    def _validate_custom_allocation(self):
        if self.lifestyle_tier == "custom":
            if self.custom_needs_pct is None or self.custom_wants_pct is None or self.custom_savings_pct is None:
                raise ValueError(
                    "Custom tier requires custom_needs_pct, custom_wants_pct, and custom_savings_pct to be provided."
                )
            total = self.custom_needs_pct + self.custom_wants_pct + self.custom_savings_pct
            if total != Decimal("100"):
                raise ValueError("Custom allocations must sum to exactly 100%.")
        return self


class OnboardingResponse(BaseModel):
    """Response body for POST /onboarding/{user_id} — the updated user plus their new budget plan."""

    user: UserResponse
    budget_plan: BudgetPlanResponse


class FinancialGoalCreate(BaseModel):
    goal_name: str = Field(..., min_length=1, max_length=255, description="Friendly name for the savings goal")
    category: str = Field(..., min_length=1, max_length=100, description="Goal category, e.g. Home, Vacation, Education")
    target_amount: Decimal = Field(..., gt=0, max_digits=14, decimal_places=2, description="Goal target amount")
    current_saved: Decimal = Field(..., ge=0, max_digits=14, decimal_places=2, description="Amount already saved toward the goal")
    target_date: date = Field(..., description="Goal completion date")
    priority: Literal["High", "Medium", "Low"] = Field("Medium", description="Goal priority level: High, Medium, Low")


class FinancialGoalUpdate(BaseModel):
    """
    Request body for PUT /financial-goals/{goal_id}.

    Every field is optional — send only what changed. Progress percentage,
    monthly pace, and status are recalculated server-side from whatever the
    final merged values end up being, so the client never computes them.
    """

    goal_name: str | None = Field(None, min_length=1, max_length=255, description="Friendly name for the savings goal")
    category: str | None = Field(None, min_length=1, max_length=100, description="Goal category, e.g. Home, Vacation")
    target_amount: Decimal | None = Field(None, gt=0, max_digits=14, decimal_places=2, description="Goal target amount")
    current_saved: Decimal | None = Field(None, ge=0, max_digits=14, decimal_places=2, description="Amount already saved")
    target_date: date | None = Field(None, description="Goal completion date")
    priority: Literal["High", "Medium", "Low"] | None = Field(None, description="Goal priority level")


class FinancialGoalResponse(BaseModel):
    id: int
    user_id: int
    goal_name: str
    category: str
    target_amount: Decimal
    current_saved: Decimal
    target_date: date
    priority: str = "Medium"
    monthly_target: Decimal
    progress_pct: Decimal
    months_remaining: int
    days_remaining: int
    remaining_amount: Decimal
    estimated_completion_date: date
    status_code: str  # "completed", "on_track", "behind", "overdue"
    status_label: str  # "Completed", "On Track", "Behind Schedule", "Overdue"
    horizon: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Budget Status Schemas                                                Phase 2
# ---------------------------------------------------------------------------

class CategoryBreakdown(BaseModel):
    """Spending breakdown for a single transaction category."""

    category: str
    total_spent: Decimal


class FinancialInsight(BaseModel):
    """Actionable insight observation derived from user's financial status."""
    type: Literal["positive", "warning", "info", "action"]
    title: str
    description: str


class BudgetBucketStatus(BaseModel):
    """Comparison of a single budget bucket (needs / wants) vs. actual spend."""

    target: Decimal          # Dollar amount allocated for this bucket
    spent: Decimal           # Actual expenses logged in this bucket
    remaining: Decimal       # target - spent  (negative means over-budget)
    is_over_budget: bool     # Convenience flag for the client


class BudgetStatusResponse(BaseModel):
    """
    Full budget status for a user.
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

    # Monthly rollover savings metrics
    monthly_savings: Decimal
    liquid_assets: Decimal
    manual_savings_offset: Decimal  # Pre-MoneyMap savings the user manually entered

    # Emergency fund progress — derived automatically from liquid_assets,
    # compared against a 6-month Needs-based safety-net target. There is no
    # separate manually-tracked emergency balance anymore.
    emergency_fund_saved: Decimal
    emergency_fund_target: Decimal
    emergency_fund_remaining: Decimal
    emergency_fund_status: str

    # Granular per-category breakdown for front-end charts
    category_breakdown: list[CategoryBreakdown]

    # Dynamic automated smart insights
    insights: list[FinancialInsight] = []

# ---------------------------------------------------------------------------
# Recurring / Fixed Expense Schemas
# ---------------------------------------------------------------------------

RecurringFrequency = Literal["monthly", "quarterly"]


class RecurringExpenseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=150, description="e.g. 'Rent', 'Netflix', 'Car EMI'")
    amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    category: str = Field(..., min_length=1, max_length=100)
    frequency: RecurringFrequency = Field(..., description="'monthly' or 'quarterly'")
    # Day-of-month (1-28) the deduction should occur on. Kept simple and
    # timezone-free — quarterly items are just charged every 3rd occurrence
    # of that day, starting from next_deduction_date.
    deduction_day: int = Field(..., ge=1, le=28, description="Day of the month the deduction runs on (1-28)")
    comment: str | None = Field(None, max_length=255)


class RecurringExpenseCreate(RecurringExpenseBase):
    user_id: int
    # Optional explicit first-run date; defaults to the next occurrence of
    # deduction_day (this month if it hasn't passed yet, else next month).
    start_date: date | None = None


class RecurringExpenseUpdate(BaseModel):
    """Every field optional — client sends only what changed."""

    title: str | None = Field(None, min_length=1, max_length=150)
    amount: Decimal | None = Field(None, gt=0, max_digits=10, decimal_places=2)
    category: str | None = Field(None, min_length=1, max_length=100)
    frequency: RecurringFrequency | None = None
    deduction_day: int | None = Field(None, ge=1, le=28)
    comment: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class RecurringExpenseResponse(RecurringExpenseBase):
    id: int
    user_id: int
    next_deduction_date: date
    is_active: bool

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Investment Schemas
# ---------------------------------------------------------------------------

InvestmentType = Literal[
    "Property", "Commodities", "Stocks", "Mutual Funds", "Bank FD", "Post Office"
]


class InvestmentBase(BaseModel):
    investment_type: InvestmentType
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    # Commodities     -> commodity name ('Gold'/'Silver'/'Diamond'/'Platinum' or custom name)
    # Property        -> property type (e.g. 'Residential', 'Commercial', 'Land')
    # Stocks / Mutual Funds / Bank FD / Post Office -> unused
    sub_type: str | None = Field(None, max_length=100)
    # Commodities     -> grams. Property -> number of properties. Others -> unused.
    quantity: Decimal | None = Field(None, ge=0, max_digits=12, decimal_places=3)
    investment_date: date
    comment: str | None = Field(None, max_length=255)
    is_past: bool = False

    @model_validator(mode="after")
    def _validate_type_specific_fields(self):
        if self.investment_type == "Commodities" and (self.quantity is None or self.quantity <= 0):
            raise ValueError("Commodities investments require a quantity in grams greater than 0.")
        if self.investment_type == "Commodities" and not self.sub_type:
            raise ValueError("Commodities investments require a commodity type (sub_type).")
        if self.investment_type == "Property" and not self.sub_type:
            raise ValueError("Property investments require a property type (sub_type).")
        return self


class InvestmentCreate(InvestmentBase):
    user_id: int


class InvestmentUpdate(BaseModel):
    """Every field optional — client sends only what changed."""

    investment_type: InvestmentType | None = None
    amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)
    sub_type: str | None = Field(None, max_length=100)
    quantity: Decimal | None = Field(None, ge=0, max_digits=12, decimal_places=3)
    investment_date: date | None = None
    comment: str | None = Field(None, max_length=255)
    is_past: bool | None = None


class InvestmentResponse(InvestmentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class PropertyItem(BaseModel):
    property_type: str = Field(..., min_length=1, max_length=100)
    amount: Decimal = Field(..., ge=0, max_digits=14, decimal_places=2)


class OtherCommodityItem(BaseModel):
    commodity_name: str = Field(..., min_length=1, max_length=100)
    weight_grams: Decimal = Field(..., ge=0, max_digits=12, decimal_places=3)


class InvestmentProfileUpdate(BaseModel):
    """Full replace payload for the 'Initial Past Investments Setup' summary."""

    properties: List[PropertyItem] = Field(default_factory=list)
    other_commodities: List[OtherCommodityItem] = Field(default_factory=list)
    gold_grams: Decimal = Field(Decimal("0"), ge=0, max_digits=12, decimal_places=3)
    silver_grams: Decimal = Field(Decimal("0"), ge=0, max_digits=12, decimal_places=3)
    diamond_grams: Decimal = Field(Decimal("0"), ge=0, max_digits=12, decimal_places=3)
    platinum_grams: Decimal = Field(Decimal("0"), ge=0, max_digits=12, decimal_places=3)
    stocks_value: Decimal = Field(Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    mutual_funds_value: Decimal = Field(Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    bank_fd_value: Decimal = Field(Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    post_office_value: Decimal = Field(Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    comment: str | None = Field(None, max_length=255)


class InvestmentProfileResponse(InvestmentProfileUpdate):
    id: int
    user_id: int
    property_count: int

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AI Advisor Schemas
# ---------------------------------------------------------------------------

class AIChatRequest(BaseModel):
    user_id: int
    message: str


class AIChatResponse(BaseModel):
    response: str