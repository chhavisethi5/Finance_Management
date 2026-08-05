import os
from datetime import date, datetime, timedelta
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
_origins = [
    "https://explore-moneymap.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
if os.environ.get("FRONTEND_URL"):
    _origins.append(os.environ["FRONTEND_URL"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://finance-management-[a-z0-9]+-chhavis005-9494s-projects\.vercel\.app",
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
        transaction_date=transaction.transaction_date,
        comment=transaction.comment.strip() if transaction.comment else None,
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


@app.put(
    "/transactions/{transaction_id}",
    response_model=schemas.TransactionResponse,
    summary="Update an existing transaction",
    tags=["Transactions"],
)
def update_transaction(
    transaction_id: int,
    update: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
):
    """
    Partially update a transaction's amount, category, type, date, or comment.

    Only fields explicitly present in the request body are changed
    (`exclude_unset=True`) — omitted fields keep their current value.
    Because /summary and /budget-status compute totals live from the
    transactions table, editing here is immediately reflected everywhere.
    The one place with *cached* state is the monthly_savings snapshot table,
    so if the edit touches a month that's already been finalized there,
    we recalculate that snapshot too.
    """
    db_txn = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID {transaction_id} not found",
        )

    update_data = update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided to update.")

    original_date = db_txn.transaction_date

    if "comment" in update_data and update_data["comment"] is not None:
        update_data["comment"] = update_data["comment"].strip() or None

    for field, value in update_data.items():
        setattr(db_txn, field, value)

    db.commit()
    db.refresh(db_txn)

    # Keep finalized monthly-savings snapshots in sync with the edited transaction.
    db_user = db.query(models.User).filter(models.User.id == db_txn.user_id).first()
    if db_user:
        for year_month in {_month_key(original_date), _month_key(db_txn.transaction_date)}:
            _resync_monthly_savings_snapshot(db_user, year_month, db)

    return db_txn


@app.delete(
    "/transactions/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a transaction",
    tags=["Transactions"],
)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """
    Permanently remove a transaction. Since account balances and budget
    status are always computed live from the transactions table, deleting
    a row here immediately updates /summary and /budget-status. The
    finalized monthly_savings snapshot for the deleted transaction's month
    (if one exists) is recalculated so historical rollups stay accurate.
    """
    db_txn = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID {transaction_id} not found",
        )

    user_id = db_txn.user_id
    affected_month = _month_key(db_txn.transaction_date)

    db.delete(db_txn)
    db.commit()

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        _resync_monthly_savings_snapshot(db_user, affected_month, db)

    return None


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
    
    # Catch up on any recurring/fixed expenses that are now due before summing.
    _process_due_recurring_expenses(db_user, db)

    # Retrieve all transactions for the user
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    
    # Calculate sum of income and expenses
    total_income = sum((t.amount for t in transactions if t.type == "income"), Decimal("0.00"))
    total_expenses = sum((t.amount for t in transactions if t.type == "expense"), Decimal("0.00"))
    
    user_income = db_user.monthly_income or Decimal("0.00")
    remaining_balance = user_income + total_income - total_expenses
    
    return schemas.FinancialSummary(
        user_id=user_id,
        monthly_income=user_income,
        total_income=total_income,
        total_expenses=total_expenses,
        remaining_balance=remaining_balance
    )


# ===========================================================================
# Phase 2 – Smart Budget Allocation
# ===========================================================================

# Categories treated as 'needs' (essential living expenses), normalised to lowercase.
# Matches the exact category strings defined in the frontend TransactionsPage.
NEEDS_CATEGORIES = {
    # Exact lowercase versions of the UI category labels
    "rent & housing",
    "groceries",
    "utilities & bills",
    "transport",
    "healthcare",
    "debt & emi",
    # Legacy short-form aliases kept for backward compatibility
    "rent",
    "utilities",
}


def _first_of_month(value: date) -> date:
    return date(value.year, value.month, 1)


def _next_month(value: date) -> date:
    if value.month == 12:
        return date(value.year + 1, 1, 1)
    return date(value.year, value.month + 1, 1)


def _month_key(value: date) -> str:
    return value.strftime("%Y-%m")


def _iterate_months(start: date, stop_exclusive: date):
    cursor = start
    while cursor < stop_exclusive:
        yield cursor
        cursor = _next_month(cursor)


def _months_remaining(target_date: date) -> int:
    today = date.today()
    month_delta = (target_date.year - today.year) * 12 + (target_date.month - today.month)
    if target_date.day > today.day:
        month_delta += 1
    return max(1, month_delta)


def _goal_horizon(target_date: date) -> str:
    days = (target_date - date.today()).days
    if days < 365:
        return "Short-Term"
    if days < 365 * 3:
        return "Medium-Term"
    return "Long-Term"


def _calculate_emergency_fund_target(db_user: models.User, db: Session) -> Decimal:
    plan = db.query(models.BudgetPlan).filter(models.BudgetPlan.user_id == db_user.id).first()
    income = db_user.monthly_income or Decimal("0.00")
    baseline = plan.needs_target if plan else (income * Decimal("0.50"))
    return (baseline * Decimal("6")).quantize(Decimal("0.01"))


def _refresh_monthly_savings_snapshots(db_user: models.User, db: Session) -> None:
    if db_user.monthly_income is None:
        return

    today = date.today()
    current_month = _first_of_month(today)
    if db_user.onboarded_at:
        start_month = _first_of_month(db_user.onboarded_at)
    else:
        earliest_txn = (
            db.query(models.Transaction)
            .filter(models.Transaction.user_id == db_user.id)
            .order_by(models.Transaction.transaction_date.asc())
            .first()
        )
        start_month = _first_of_month(earliest_txn.transaction_date) if earliest_txn else current_month

    if start_month >= current_month:
        return

    existing_months = {
        row.year_month
        for row in db.query(models.MonthlySavings.year_month)
        .filter(models.MonthlySavings.user_id == db_user.id)
        .all()
    }

    added = False
    for month_start in _iterate_months(start_month, current_month):
        month_key = _month_key(month_start)
        if month_key in existing_months:
            continue

        month_end = _next_month(month_start)
        expenses = sum(
            txn.amount
            for txn in db.query(models.Transaction)
            .filter(
                models.Transaction.user_id == db_user.id,
                models.Transaction.type == "expense",
                models.Transaction.transaction_date >= month_start,
                models.Transaction.transaction_date < month_end,
            )
            .all()
        )
        # Any extra Income transactions logged in-app (on top of the user's
        # base monthly_income) flow straight into that month's savings and,
        # in turn, Liquid Assets.
        extra_income = sum(
            txn.amount
            for txn in db.query(models.Transaction)
            .filter(
                models.Transaction.user_id == db_user.id,
                models.Transaction.type == "income",
                models.Transaction.transaction_date >= month_start,
                models.Transaction.transaction_date < month_end,
            )
            .all()
        )
        savings_amount = (db_user.monthly_income + extra_income - expenses).quantize(Decimal("0.01"))
        db.add(
            models.MonthlySavings(
                user_id=db_user.id,
                year_month=month_key,
                savings_amount=savings_amount,
            )
        )
        added = True

    if added:
        db.commit()


def _resync_monthly_savings_snapshot(db_user: models.User, year_month: str, db: Session) -> None:
    """
    Recalculate one already-finalized monthly_savings row after a past
    transaction in that month was edited or deleted.

    _refresh_monthly_savings_snapshots() only ever *adds* missing months —
    it never revisits a month once it has a row, since normally those are
    immutable history. Editing/deleting breaks that assumption, so this
    targeted recalculation keeps the snapshot (used for savings-history
    charts) consistent with the live transactions table. If no snapshot
    exists yet for this month (e.g. it's the current, still-open month),
    there's nothing to fix — /summary and /budget-status already compute
    that month live.
    """
    if db_user.monthly_income is None:
        return

    row = (
        db.query(models.MonthlySavings)
        .filter(
            models.MonthlySavings.user_id == db_user.id,
            models.MonthlySavings.year_month == year_month,
        )
        .first()
    )
    if not row:
        return

    month_start = date(int(year_month[:4]), int(year_month[5:7]), 1)
    month_end = _next_month(month_start)
    expenses = sum(
        txn.amount
        for txn in db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == db_user.id,
            models.Transaction.type == "expense",
            models.Transaction.transaction_date >= month_start,
            models.Transaction.transaction_date < month_end,
        )
        .all()
    )
    extra_income = sum(
        txn.amount
        for txn in db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == db_user.id,
            models.Transaction.type == "income",
            models.Transaction.transaction_date >= month_start,
            models.Transaction.transaction_date < month_end,
        )
        .all()
    )
    row.savings_amount = (db_user.monthly_income + extra_income - expenses).quantize(Decimal("0.01"))
    db.commit()

# ===========================================================================
# Recurring / Fixed Expenses
# ===========================================================================

def _advance_deduction_date(current: date, frequency: str) -> date:
    """Push a recurring expense's next_deduction_date forward by one cycle."""
    months_to_add = 1 if frequency == "monthly" else 3
    month_index = current.month - 1 + months_to_add
    year = current.year + month_index // 12
    month = month_index % 12 + 1
    day = min(current.day, 28)  # deduction_day is always <= 28, so this is exact
    return date(year, month, day)


def _process_due_recurring_expenses(db_user: models.User, db: Session) -> bool:
    """
    Auto-generate expense transactions for any active recurring expense whose
    `next_deduction_date` has arrived (today or earlier), then roll each one
    forward to its next occurrence. Runs lazily whenever budget-status or the
    financial summary is requested, rather than needing a background worker.

    The generated transaction is a normal 'expense' row, so it's automatically
    picked up by the existing Needs/Wants + Monthly Savings + Liquid Assets
    calculations — a monthly item reduces that month's savings, a quarterly
    item reduces whichever month it lands in, and both roll into cumulative
    Liquid Assets exactly like any other logged expense.

    Returns True if at least one deduction was made (so callers know to
    re-read any already-fetched transaction lists).
    """
    today = date.today()
    due_items = (
        db.query(models.RecurringExpense)
        .filter(
            models.RecurringExpense.user_id == db_user.id,
            models.RecurringExpense.is_active.is_(True),
            models.RecurringExpense.next_deduction_date <= today,
        )
        .all()
    )
    if not due_items:
        return False

    touched_months: set[str] = set()
    for item in due_items:
        # An expense can be "overdue" by more than one cycle (e.g. the user
        # hasn't opened the app in a while) — catch up fully, one cycle at a
        # time, rather than only firing once.
        while item.next_deduction_date <= today:
            db.add(
                models.Transaction(
                    user_id=db_user.id,
                    amount=item.amount,
                    category=item.category,
                    type="expense",
                    transaction_date=item.next_deduction_date,
                    comment=(item.comment.strip() if item.comment else None) or f"Auto-deducted: {item.title}",
                )
            )
            touched_months.add(_month_key(_first_of_month(item.next_deduction_date)))
            item.next_deduction_date = _advance_deduction_date(item.next_deduction_date, item.frequency)

    db.commit()

    # Any month we just backfilled that already has a finalized snapshot
    # needs to be recalculated so historical rollups stay accurate.
    for year_month in touched_months:
        _resync_monthly_savings_snapshot(db_user, year_month, db)

    return True


def _next_occurrence_of_day(day: int, start: date) -> date:
    """First calendar date >= start whose day-of-month equals `day`."""
    candidate = date(start.year, start.month, day)
    if candidate < start:
        candidate = _advance_deduction_date(candidate, "monthly")
    return candidate


def _serialize_recurring_expense(item: models.RecurringExpense) -> schemas.RecurringExpenseResponse:
    return schemas.RecurringExpenseResponse(
        id=item.id,
        user_id=item.user_id,
        title=item.title,
        amount=item.amount,
        category=item.category,
        frequency=item.frequency,
        deduction_day=item.deduction_day,
        next_deduction_date=item.next_deduction_date,
        comment=item.comment,
        is_active=item.is_active,
    )


@app.post(
    "/recurring-expenses/",
    response_model=schemas.RecurringExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a recurring/fixed expense",
    tags=["Recurring Expenses"],
)
def create_recurring_expense(payload: schemas.RecurringExpenseCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {payload.user_id} not found")

    start = payload.start_date or date.today()
    next_date = _next_occurrence_of_day(payload.deduction_day, start)

    item = models.RecurringExpense(
        user_id=payload.user_id,
        title=payload.title.strip(),
        amount=payload.amount,
        category=payload.category,
        frequency=payload.frequency,
        deduction_day=payload.deduction_day,
        next_deduction_date=next_date,
        comment=payload.comment.strip() if payload.comment else None,
        is_active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_recurring_expense(item)


@app.get(
    "/recurring-expenses/{user_id}",
    response_model=list[schemas.RecurringExpenseResponse],
    summary="List a user's recurring/fixed expenses",
    tags=["Recurring Expenses"],
)
def list_recurring_expenses(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")

    # Catch up on anything due before returning the list, so the UI always
    # shows accurate "next deduction" dates.
    _process_due_recurring_expenses(db_user, db)

    items = (
        db.query(models.RecurringExpense)
        .filter(models.RecurringExpense.user_id == user_id)
        .order_by(models.RecurringExpense.next_deduction_date.asc())
        .all()
    )
    return [_serialize_recurring_expense(i) for i in items]


@app.put(
    "/recurring-expenses/{expense_id}",
    response_model=schemas.RecurringExpenseResponse,
    summary="Update a recurring/fixed expense",
    tags=["Recurring Expenses"],
)
def update_recurring_expense(expense_id: int, update: schemas.RecurringExpenseUpdate, db: Session = Depends(get_db)):
    item = db.query(models.RecurringExpense).filter(models.RecurringExpense.id == expense_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recurring expense {expense_id} not found")

    update_data = update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided to update.")

    if "title" in update_data and update_data["title"] is not None:
        update_data["title"] = update_data["title"].strip()
    if "comment" in update_data and update_data["comment"] is not None:
        update_data["comment"] = update_data["comment"].strip() or None

    # If the schedule itself changed, recompute next_deduction_date from today.
    reschedule = "deduction_day" in update_data or "frequency" in update_data
    for field, value in update_data.items():
        setattr(item, field, value)
    if reschedule:
        item.next_deduction_date = _next_occurrence_of_day(item.deduction_day, date.today())

    db.commit()
    db.refresh(item)
    return _serialize_recurring_expense(item)


@app.delete(
    "/recurring-expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a recurring/fixed expense",
    tags=["Recurring Expenses"],
)
def delete_recurring_expense(expense_id: int, db: Session = Depends(get_db)):
    item = db.query(models.RecurringExpense).filter(models.RecurringExpense.id == expense_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recurring expense {expense_id} not found")
    db.delete(item)
    db.commit()
    return None

def _serialize_financial_goal(goal: models.FinancialGoal) -> schemas.FinancialGoalResponse:
    today = date.today()
    priority = getattr(goal, "priority", "Medium") or "Medium"
    days_remaining = (goal.target_date - today).days
    months_remaining = _months_remaining(goal.target_date)
    remaining_amount = max(Decimal("0.00"), goal.target_amount - goal.current_saved)
    
    monthly_target = (remaining_amount / Decimal(max(1, months_remaining))).quantize(Decimal("0.01"))
    progress_pct = (
        min(Decimal("100"), (goal.current_saved / goal.target_amount) * Decimal("100"))
        if goal.target_amount > 0 else Decimal("100")
    ).quantize(Decimal("0.01"))

    # Forecasting & status determinations
    if goal.current_saved >= goal.target_amount:
        status_code = "completed"
        status_label = "Completed"
        estimated_completion_date = today
    elif days_remaining < 0:
        status_code = "overdue"
        status_label = "Overdue"
        estimated_completion_date = goal.target_date
    else:
        estimated_completion_date = goal.target_date
        if progress_pct >= Decimal("50") or days_remaining > 90:
            status_code = "on_track"
            status_label = "On Track"
        else:
            status_code = "behind"
            status_label = "Behind Schedule"

    return schemas.FinancialGoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        goal_name=goal.goal_name,
        category=goal.category,
        target_amount=goal.target_amount,
        current_saved=goal.current_saved,
        target_date=goal.target_date,
        priority=priority,
        monthly_target=monthly_target,
        progress_pct=progress_pct,
        months_remaining=max(0, months_remaining),
        days_remaining=days_remaining,
        remaining_amount=remaining_amount,
        estimated_completion_date=estimated_completion_date,
        status_code=status_code,
        status_label=status_label,
        horizon=_goal_horizon(goal.target_date),
    )


def _upsert_budget_plan(
    db: Session,
    db_user: models.User,
    lifestyle_tier: str,
    custom_needs_pct: Decimal | None = None,
    custom_wants_pct: Decimal | None = None,
    custom_savings_pct: Decimal | None = None,
) -> models.BudgetPlan:
    """
    Shared logic: calculate and persist a budget plan for db_user.

    1. Resolve the percentage splits from `schemas.LIFESTYLE_TIERS`.
    2. Multiply the user's monthly_income by each split to produce dollar/rupee targets.
    3. Upsert the plan row (create on first call, replace on subsequent calls).

    Used by both POST /budget-plan/ (change tier later) and
    POST /onboarding/{user_id} (set tier for the first time).
    """
    lifestyle_tier = lifestyle_tier.strip().lower()

    if lifestyle_tier == "custom":
        if custom_needs_pct is None or custom_wants_pct is None or custom_savings_pct is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom tier requires all three allocation percentages."
            )

        needs_pct = custom_needs_pct.quantize(Decimal("0.01"))
        wants_pct = custom_wants_pct.quantize(Decimal("0.01"))
        savings_pct = custom_savings_pct.quantize(Decimal("0.01"))
        total_pct = needs_pct + wants_pct + savings_pct
        if total_pct != Decimal("100"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom allocations must sum to exactly 100%."
            )

        needs_frac = needs_pct / Decimal("100")
        wants_frac = wants_pct / Decimal("100")
        savings_frac = savings_pct / Decimal("100")
    else:
        if lifestyle_tier not in schemas.LIFESTYLE_TIERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid lifestyle_tier '{lifestyle_tier}'. "
                    f"Must be one of: {', '.join(list(schemas.LIFESTYLE_TIERS.keys()) + ['custom'])}"
                ),
            )

        tier = schemas.LIFESTYLE_TIERS[lifestyle_tier]
        needs_frac = tier["needs"]
        wants_frac = tier["wants"]
        savings_frac = tier["savings"]
        needs_pct = (needs_frac * Decimal("100")).quantize(Decimal("0.01"))
        wants_pct = (wants_frac * Decimal("100")).quantize(Decimal("0.01"))
        savings_pct = (savings_frac * Decimal("100")).quantize(Decimal("0.01"))

    income = db_user.monthly_income
    needs_target = (income * needs_frac).quantize(Decimal("0.01"))
    wants_target = (income * wants_frac).quantize(Decimal("0.01"))
    savings_target = (income * savings_frac).quantize(Decimal("0.01"))

    existing_plan = (
        db.query(models.BudgetPlan)
        .filter(models.BudgetPlan.user_id == db_user.id)
        .first()
    )

    if existing_plan:
        existing_plan.lifestyle_tier = lifestyle_tier
        existing_plan.needs_target = needs_target
        existing_plan.wants_target = wants_target
        existing_plan.savings_target = savings_target
        existing_plan.needs_pct = needs_pct
        existing_plan.wants_pct = wants_pct
        existing_plan.savings_pct = savings_pct
        db.commit()
        db.refresh(existing_plan)
        return existing_plan

    new_plan = models.BudgetPlan(
        user_id=db_user.id,
        lifestyle_tier=lifestyle_tier,
        needs_target=needs_target,
        wants_target=wants_target,
        savings_target=savings_target,
        needs_pct=needs_pct,
        wants_pct=wants_pct,
        savings_pct=savings_pct,
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

    return _upsert_budget_plan(
        db,
        db_user,
        plan_in.lifestyle_tier,
        plan_in.custom_needs_pct,
        plan_in.custom_wants_pct,
        plan_in.custom_savings_pct,
    )


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
    db_user.onboarded_at = db_user.onboarded_at or date.today()
    db.commit()
    db.refresh(db_user)

    plan = _upsert_budget_plan(
        db,
        db_user,
        onboarding_in.lifestyle_tier,
        onboarding_in.custom_needs_pct,
        onboarding_in.custom_wants_pct,
        onboarding_in.custom_savings_pct,
    )

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

    current_month = _first_of_month(date.today())
 
    # --- 3. Load current-month expense transactions for this user ---
    expenses = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.transaction_date >= current_month,
            models.Transaction.transaction_date < _next_month(current_month),
        )
        .all()
    )

    # --- 3b. Auto-generate any recurring/fixed expenses that are now due,
    # then re-pull this month's expenses so they're reflected below. ---
    if _process_due_recurring_expenses(db_user, db):
        expenses = (
            db.query(models.Transaction)
            .filter(
                models.Transaction.user_id == user_id,
                models.Transaction.type == "expense",
                models.Transaction.transaction_date >= current_month,
                models.Transaction.transaction_date < _next_month(current_month),
            )
            .all()
        )

    # Extra Income transactions logged this month (on top of base monthly_income)
    # — these flow straight into this month's savings and Liquid Assets.
    extra_income_this_month = sum(
        txn.amount
        for txn in db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "income",
            models.Transaction.transaction_date >= current_month,
            models.Transaction.transaction_date < _next_month(current_month),
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
 
    # --- 5. Finalize past monthly savings snapshots and compute rollover metrics ---
    _refresh_monthly_savings_snapshots(db_user, db)
 
    current_month_expenses = total_expenses

    user_income = db_user.monthly_income or Decimal("0.00")
    monthly_savings = (user_income + extra_income_this_month - current_month_expenses).quantize(Decimal("0.01"))
    
    past_savings = sum(
        row.savings_amount
        for row in db.query(models.MonthlySavings)
        .filter(
            models.MonthlySavings.user_id == user_id,
            models.MonthlySavings.year_month < _month_key(current_month),
        )
        .all()
    )
    actual_savings = (user_income + extra_income_this_month - total_expenses).quantize(Decimal("0.01"))
    liquid_assets = (
        db_user.manual_savings_offset
        + past_savings
        + (actual_savings if actual_savings > Decimal("0.00") else Decimal("0.00"))
    ).quantize(Decimal("0.01"))
 
    savings_remaining = (plan.savings_target - actual_savings).quantize(Decimal("0.01"))

    # --- Emergency Fund: derived automatically from liquid_assets, no manual entry ---
 
    emergency_target = _calculate_emergency_fund_target(db_user, db)
    emergency_remaining = max(Decimal("0.00"), emergency_target - liquid_assets)

    if liquid_assets >= emergency_target:
        emergency_status = "Fully Funded"
    elif liquid_assets >= (emergency_target * Decimal("0.70")):
        emergency_status = "Healthy"
    else:
        emergency_status = "Building Buffer"
 
    # --- 6. Generate Automated MoneyMap Insights ---
    insights: list[schemas.FinancialInsight] = []

    # Insight 1: Savings Performance
    if actual_savings >= plan.savings_target:
        insights.append(schemas.FinancialInsight(
            type="positive",
            title="Savings Target Achieved",
            description=f"Your monthly savings of ₹{actual_savings:,.2f} has reached your target of ₹{plan.savings_target:,.2f}."
        ))
    else:
        insights.append(schemas.FinancialInsight(
            type="warning",
            title="Savings Gap Warning",
            description=f"You are ₹{savings_remaining:,.2f} short of your monthly savings target of ₹{plan.savings_target:,.2f}."
        ))

    # Insight 2: Essential Needs Spending
    if needs_spent > plan.needs_target:
        insights.append(schemas.FinancialInsight(
            type="warning",
            title="Needs Budget Exceeded",
            description=f"Essential spending is ₹{(needs_spent - plan.needs_target):,.2f} over your standard needs target."
        ))
    else:
        insights.append(schemas.FinancialInsight(
            type="positive",
            title="Needs Budget Under Control",
            description=f"You have ₹{(plan.needs_target - needs_spent):,.2f} remaining in your essential needs budget."
        ))

    # Insight 3: Emergency Fund Coverage (derived automatically from liquid_assets)
    if liquid_assets < emergency_target:
        fund_pct = int((liquid_assets / emergency_target) * 100) if emergency_target > 0 else 100
        insights.append(schemas.FinancialInsight(
            type="action",
            title="Emergency Fund Progress",
            description=f"Your savings cover {fund_pct}% of your 6-month safety net. Save ₹{emergency_remaining:,.2f} more to complete it."
        ))
    else:
        insights.append(schemas.FinancialInsight(
            type="positive",
            title="Emergency Fund Fully Funded",
            description="Your savings already cover your full 6-month safety reserve."
        ))

    # --- 7. Build the response ---
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
        monthly_income=user_income,
        lifestyle_tier=plan.lifestyle_tier,
        needs=_bucket(plan.needs_target, needs_spent),
        wants=_bucket(plan.wants_target, wants_spent),
        savings_target=plan.savings_target,
        actual_savings=actual_savings,
        savings_remaining=savings_remaining,
        is_savings_on_track=actual_savings >= plan.savings_target,
        monthly_savings=monthly_savings,
        liquid_assets=liquid_assets,
        manual_savings_offset=db_user.manual_savings_offset,
        emergency_fund_saved=liquid_assets,
        emergency_fund_target=emergency_target,
        emergency_fund_remaining=emergency_remaining,
        emergency_fund_status=emergency_status,
        category_breakdown=category_breakdown,
        insights=insights,
    )


@app.put(
    "/user/{user_id}/savings",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Manually set the user's pre-existing (pre-MoneyMap) savings",
    tags=["User"],
)
def update_manual_savings(
    user_id: int,
    update: schemas.UserSavingsUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Lets a user record lifetime savings they already had before joining
    MoneyMap (e.g. money sitting in a bank account). This value is folded
    into liquid_assets on every /budget-status call, which in turn is what
    the automated Emergency Fund calculation compares against its 6-month
    target — there is no separate manual emergency-fund entry anymore.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    db_user.manual_savings_offset = update.manual_savings_offset.quantize(Decimal("0.01"))
    db.commit()
    db.refresh(db_user)

    return db_user


@app.post(
    "/financial-goals/{user_id}",
    response_model=schemas.FinancialGoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new financial goal",
    tags=["Goals"],
)
def create_financial_goal(
    user_id: int,
    goal_in: schemas.FinancialGoalCreate,
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    priority = getattr(goal_in, "priority", "Medium") or "Medium"
    new_goal = models.FinancialGoal(
        user_id=user_id,
        goal_name=goal_in.goal_name.strip(),
        category=goal_in.category.strip(),
        target_amount=goal_in.target_amount.quantize(Decimal("0.01")),
        current_saved=goal_in.current_saved.quantize(Decimal("0.01")),
        target_date=goal_in.target_date,
        priority=priority,
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return _serialize_financial_goal(new_goal)


@app.get(
    "/financial-goals/{user_id}",
    response_model=list[schemas.FinancialGoalResponse],
    summary="List all financial goals for a user",
    tags=["Goals"],
)
def list_financial_goals(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    goals = (
        db.query(models.FinancialGoal)
        .filter(models.FinancialGoal.user_id == user_id)
        .order_by(models.FinancialGoal.target_date.asc())
        .all()
    )

    return [_serialize_financial_goal(goal) for goal in goals]

@app.put(
    "/financial-goals/{goal_id}",
    response_model=schemas.FinancialGoalResponse,
    summary="Update an existing financial goal",
    tags=["Goals"],
)
def update_financial_goal(
    goal_id: int,
    goal_in: schemas.FinancialGoalUpdate,
    db: Session = Depends(get_db),
):
    """
    Partially update a goal's name, category, target amount, saved amount,
    target date, or priority. Only fields present in the request body are
    changed. progress_pct, monthly_target, status, and every other derived
    field are recalculated from the merged values via _serialize_financial_goal
    — the client never has to redo that math itself.
    """
    db_goal = db.query(models.FinancialGoal).filter(models.FinancialGoal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial goal with ID {goal_id} not found",
        )

    update_data = goal_in.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided to update.")

    if "goal_name" in update_data:
        db_goal.goal_name = update_data["goal_name"].strip()
    if "category" in update_data:
        db_goal.category = update_data["category"].strip()
    if "target_amount" in update_data:
        db_goal.target_amount = update_data["target_amount"].quantize(Decimal("0.01"))
    if "current_saved" in update_data:
        db_goal.current_saved = update_data["current_saved"].quantize(Decimal("0.01"))
    if "target_date" in update_data:
        db_goal.target_date = update_data["target_date"]
    if "priority" in update_data:
        db_goal.priority = update_data["priority"]

    db.commit()
    db.refresh(db_goal)

    return _serialize_financial_goal(db_goal)