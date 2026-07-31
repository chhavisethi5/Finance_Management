from decimal import Decimal
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas

# ---------------------------------------------------------------------------
# Password hashing — bcrypt via passlib
# ---------------------------------------------------------------------------
import bcrypt

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# Modern lifespan context manager replacing the deprecated startup event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create tables in MySQL database upon application start
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Financial Backend API",
    description="Smart personal-finance tracker – Phase 1 (users & transactions) + Phase 2 (smart budget allocation)",
    version="2.0.0",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# CORS — allow all origins so the React dev server (e.g. localhost:5173)
# can call this API without browser preflight failures.
# Tighten allow_origins to specific domains before going to production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # permit every origin
    allow_credentials=True,
    allow_methods=["*"],       # GET, POST, PUT, DELETE, OPTIONS …
    allow_headers=["*"],       # Content-Type, Authorization …
)

@app.post("/signup/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def signup(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new user.

    - Rejects the request if the email is already in use.
    - The plain-text password is hashed with bcrypt before being stored;
      it is **never** persisted in plain form.
    """
    # 1. Guard against duplicate emails
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # 2. Hash the password
    new_user = models.User(
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login/", response_model=schemas.UserResponse, tags=["Auth"])
def login(
    credentials: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    """
    Authenticate an existing user.

    Returns the user record on success.  Raises **401 Unauthorized** if the
    email is not found or the password does not match, using the same vague
    error message in both cases to prevent user-enumeration attacks.
    """
    db_user = db.query(models.User).filter(models.User.email == credentials.email).first()

    # Deliberately identical message for "not found" and "wrong password"
    _auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

    if not db_user:
        raise _auth_error

    # Guard: user was created before passwords were introduced
    if not db_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has no password set. Please re-register via /signup/.",
        )

    if not verify_password(credentials.password, db_user.hashed_password):
        raise _auth_error

    return db_user


@app.post("/transactions/", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    """
    Log a new transaction (income or expense) for a specific user.
    Rejects the request if the user_id does not exist.
    """
    # Verify the associated user exists first
    db_user = db.query(models.User).filter(models.User.id == transaction.user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {transaction.user_id} not found"
        )
    
    new_transaction = models.Transaction(
        user_id=transaction.user_id,
        amount=transaction.amount,
        category=transaction.category,
        type=transaction.type,
        transaction_date=transaction.transaction_date
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction


@app.get(
    "/transactions/{user_id}",
    response_model=list[schemas.TransactionResponse],
    summary="Get full transaction history for a user",
    tags=["Transactions"],
)
def get_transactions(user_id: int, db: Session = Depends(get_db)):
    """
    Return every transaction ever logged for this user, newest first.

    Ordered by transaction_date desc, then id desc as a tiebreaker so same-day
    entries still come back in the order they were created.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    return (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == user_id)
        .order_by(models.Transaction.transaction_date.desc(), models.Transaction.id.desc())
        .all()
    )


@app.get("/summary/{user_id}", response_model=schemas.FinancialSummary)
def get_financial_summary(user_id: int, db: Session = Depends(get_db)):
    """
    Retrieve the financial summary for a user.
    Calculates total income, total expenses, and the remaining monthly balance.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Retrieve all transactions for the user
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    
    # Calculate sum of income and expenses
    total_income = sum((t.amount for t in transactions if t.type == "income"), Decimal("0.00"))
    total_expenses = sum((t.amount for t in transactions if t.type == "expense"), Decimal("0.00"))
    
    # Remaining balance = monthly_income + total_income - total_expenses
    remaining_balance = db_user.monthly_income + total_income - total_expenses
    
    return schemas.FinancialSummary(
        user_id=user_id,
        monthly_income=db_user.monthly_income,
        total_income=total_income,
        total_expenses=total_expenses,
        remaining_balance=remaining_balance
    )


# ===========================================================================
# Phase 2 – Smart Budget Allocation
# ===========================================================================

# Categories treated as 'needs' (essential living expenses).
# Anything not in this set is classified as a 'want'.
NEEDS_CATEGORIES = {"rent", "groceries", "utilities", "transport", "healthcare"}


def _upsert_budget_plan(db: Session, db_user: models.User, lifestyle_tier: str) -> models.BudgetPlan:
    """
    Shared logic: calculate and persist a budget plan for db_user.

    1. Resolve the percentage splits from `schemas.LIFESTYLE_TIERS`.
    2. Multiply the user's monthly_income by each split to produce dollar/rupee targets.
    3. Upsert the plan row (create on first call, replace on subsequent calls).

    Used by both POST /budget-plan/ (change tier later) and
    POST /onboarding/{user_id} (set tier for the first time).
    """
    # Defensive normalization: even though the request schemas already
    # lowercase/strip this value, re-normalizing here means this helper is
    # safe to call from anywhere, not just from a validated Pydantic model.
    lifestyle_tier = lifestyle_tier.strip().lower()
    if lifestyle_tier not in schemas.LIFESTYLE_TIERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid lifestyle_tier '{lifestyle_tier}'. "
                f"Must be one of: {', '.join(schemas.LIFESTYLE_TIERS.keys())}"
            ),
        )

    tier = schemas.LIFESTYLE_TIERS[lifestyle_tier]
    
    income = db_user.monthly_income  # Decimal from DB

    needs_target   = (income * tier["needs"]).quantize(Decimal("0.01"))
    wants_target   = (income * tier["wants"]).quantize(Decimal("0.01"))
    savings_target = (income * tier["savings"]).quantize(Decimal("0.01"))

    existing_plan = (
        db.query(models.BudgetPlan)
        .filter(models.BudgetPlan.user_id == db_user.id)
        .first()
    )

    if existing_plan:
        existing_plan.lifestyle_tier = lifestyle_tier
        existing_plan.needs_target   = needs_target
        existing_plan.wants_target   = wants_target
        existing_plan.savings_target = savings_target
        db.commit()
        db.refresh(existing_plan)
        return existing_plan

    new_plan = models.BudgetPlan(
        user_id=db_user.id,
        lifestyle_tier=lifestyle_tier,
        needs_target=needs_target,
        wants_target=wants_target,
        savings_target=savings_target,
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan


@app.post(
    "/budget-plan/",
    response_model=schemas.BudgetPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or replace a budget plan",
    tags=["Budget"],
)
def create_budget_plan(
    plan_in: schemas.BudgetPlanCreate,
    db: Session = Depends(get_db),
):
    """Calculate and persist a budget plan for the given user (requires monthly_income to already be set)."""
    db_user = db.query(models.User).filter(models.User.id == plan_in.user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {plan_in.user_id} not found",
        )
    if db_user.monthly_income is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not completed onboarding yet (no monthly_income set).",
        )

    return _upsert_budget_plan(db, db_user, plan_in.lifestyle_tier)


@app.get(
    "/budget-plan/{user_id}",
    response_model=schemas.BudgetPlanResponse,
    summary="Get a user's currently saved budget plan",
    tags=["Budget"],
)
def get_budget_plan(user_id: int, db: Session = Depends(get_db)):
    """Return the user's saved budget plan, or 404 if they haven't created one yet."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    plan = db.query(models.BudgetPlan).filter(models.BudgetPlan.user_id == user_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No budget plan found for user {user_id}",
        )
    return plan


@app.post(
    "/onboarding/{user_id}",
    response_model=schemas.OnboardingResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete onboarding: set name, income, and generate the initial budget plan",
    tags=["Auth"],
)
def complete_onboarding(
    user_id: int,
    onboarding_in: schemas.OnboardingRequest,
    db: Session = Depends(get_db),
):
    """
    Runs once, right after signup.

    1. Look up the user.
    2. Save their name and monthly_income.
    3. Generate their budget plan from the chosen lifestyle tier.
    4. Return the updated user + their new budget plan together, so the
       frontend can go straight to the dashboard without a second round trip.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    db_user.name = onboarding_in.name
    db_user.monthly_income = onboarding_in.monthly_income
    db.commit()
    db.refresh(db_user)

    plan = _upsert_budget_plan(db, db_user, onboarding_in.lifestyle_tier)

    return schemas.OnboardingResponse(user=db_user, budget_plan=plan)


@app.get(
    "/budget-status/{user_id}",
    response_model=schemas.BudgetStatusResponse,
    summary="Get budget vs. actual spending status",
    tags=["Budget"],
)
def get_budget_status(user_id: int, db: Session = Depends(get_db)):
    """
    Compare a user's actual expenses against their saved budget plan.

    Categorisation logic:
    - Expenses whose `category` (case-insensitive) is in NEEDS_CATEGORIES
      count toward the 'needs' bucket.
    - All other expenses count toward the 'wants' bucket.
    - Savings are derived as: monthly_income − total_expenses.

    Returns target vs. spent for each bucket plus a per-category breakdown.
    """
    # --- 1. Validate user existence ---
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # --- 2. Ensure a budget plan exists ---
    plan = (
        db.query(models.BudgetPlan)
        .filter(models.BudgetPlan.user_id == user_id)
        .first()
    )
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No budget plan found for user {user_id}. "
                "Create one first via POST /budget-plan/"
            ),
        )

    # --- 3. Load all expense transactions for this user ---
    expenses = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
        )
        .all()
    )

    # --- 4. Aggregate spend per category and bucket ---
    category_totals: dict[str, Decimal] = defaultdict(Decimal)
    needs_spent = Decimal("0.00")
    wants_spent = Decimal("0.00")

    for txn in expenses:
        category_key = txn.category.lower().strip()
        category_totals[txn.category] += txn.amount   # preserve original casing for display

        if category_key in NEEDS_CATEGORIES:
            needs_spent += txn.amount
        else:
            wants_spent += txn.amount

    total_expenses = needs_spent + wants_spent

    # --- 5. Calculate savings status ---
    actual_savings   = db_user.monthly_income - total_expenses
    savings_remaining = plan.savings_target - actual_savings

    # --- 6. Build the response ---
    def _bucket(target: Decimal, spent: Decimal) -> schemas.BudgetBucketStatus:
        """Helper: produce a BudgetBucketStatus from target and spent amounts."""
        remaining = target - spent
        return schemas.BudgetBucketStatus(
            target=target,
            spent=spent,
            remaining=remaining,
            is_over_budget=spent > target,
        )

    category_breakdown = [
        schemas.CategoryBreakdown(category=cat, total_spent=total)
        for cat, total in sorted(category_totals.items())
    ]

    return schemas.BudgetStatusResponse(
        user_id=user_id,
        monthly_income=db_user.monthly_income,
        lifestyle_tier=plan.lifestyle_tier,
        needs=_bucket(plan.needs_target, needs_spent),
        wants=_bucket(plan.wants_target, wants_spent),
        savings_target=plan.savings_target,
        actual_savings=actual_savings,
        savings_remaining=savings_remaining,
        is_savings_on_track=actual_savings >= plan.savings_target,
        category_breakdown=category_breakdown,
    )
