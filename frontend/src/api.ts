/**
 * api.ts — Centralised API service layer.
 *
 * All HTTP calls go through this module so that endpoint URLs and
 * Axios configuration are maintained in a single place.
 */

import axios from "axios";

// ─── Base client ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

// ─── Request / Response types (mirror the FastAPI Pydantic schemas) ──────────

export interface User {
  id: number;
  email: string;
  name: string | null;
  monthly_income: number | null;
}

/** True once the user has completed the onboarding step. */
export const isOnboarded = (user: User | null): boolean =>
  !!user && !!user.name && user.monthly_income !== null;

export interface OnboardingPayload {
  name: string;
  monthly_income: number;
  lifestyle_tier: string;
}

export interface OnboardingResult {
  user: User;
  budget_plan: BudgetPlan;
}

/**
 * Safely extract a human-readable message from any Axios/FastAPI error.
 * FastAPI's `detail` is a plain string for HTTPException, but an ARRAY of
 * {msg, loc, ...} objects for Pydantic validation (422) errors — rendering
 * that array directly in JSX crashes React. This normalizes both shapes.
 */
export const getErrorMessage = (err: unknown, fallback = "Something went wrong."): string => {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d) => (typeof d === "string" ? d : d?.msg ?? JSON.stringify(d)))
      .join("; ");
  }
  return fallback;
};

/** Format a number into Indian Rupees using standard Indian numbering system (e.g. ₹1,56,000.00) */
export const formatINR = (val: number | string | null | undefined, hideDecimalsIfZero = false): string => {
  const num = typeof val === "string" ? parseFloat(val) : Number(val ?? 0);
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: hideDecimalsIfZero && num % 1 === 0 ? 0 : 2,
    minimumFractionDigits: hideDecimalsIfZero && num % 1 === 0 ? 0 : 2,
  }).format(num);
};

export interface BudgetPlan {
  id: number;
  user_id: number;
  lifestyle_tier: string;
  needs_target: number;
  wants_target: number;
  savings_target: number;
  needs_pct: number;
  wants_pct: number;
  savings_pct: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  category: string;
  type: "income" | "expense";
  transaction_date: string;
}

export interface BudgetBucketStatus {
  target: number;
  spent: number;
  remaining: number;
  is_over_budget: boolean;
}

export interface CategoryBreakdown {
  category: string;
  total_spent: number;
}

export interface FinancialInsight {
  type: "positive" | "warning" | "info" | "action";
  title: string;
  description: string;
}

export interface BudgetStatus {
  user_id: number;
  monthly_income: number;
  lifestyle_tier: string;
  needs: BudgetBucketStatus;
  wants: BudgetBucketStatus;
  savings_target: number;
  actual_savings: number;
  savings_remaining: number;
  is_savings_on_track: boolean;
  monthly_savings: number;
  total_savings: number;
  emergency_fund_saved: number;
  emergency_fund_target: number;
  emergency_fund_remaining: number;
  emergency_fund_status: string;
  category_breakdown: CategoryBreakdown[];
  insights: FinancialInsight[];
}

export interface FinancialGoal {
  id: number;
  user_id: number;
  goal_name: string;
  category: string;
  target_amount: number;
  current_saved: number;
  target_date: string;
  priority: "High" | "Medium" | "Low";
  monthly_target: number;
  progress_pct: number;
  months_remaining: number;
  days_remaining: number;
  remaining_amount: number;
  estimated_completion_date: string;
  status_code: "completed" | "on_track" | "behind" | "overdue";
  status_label: string;
  horizon: string;
}

export interface FinancialGoalCreatePayload {
  goal_name: string;
  category: string;
  target_amount: number;
  current_saved: number;
  target_date: string;
  priority?: "High" | "Medium" | "Low";
}

export interface EmergencyFundResponse {
  user_id: number;
  current_saved: number;
  target_amount: number;
  progress_pct: number;
  status: string;
}

export interface EmergencyFundUpdatePayload {
  amount: number;
}

// ─── Auth API functions ──────────────────────────────────────────────────────

/** Register a new user with just email + password. Name/income are set in onboarding. */
export const signUp = (email: string, password: string) =>
  api.post<User>("/signup/", { email, password }).then((r) => r.data);

/** Log in with email and password; returns the user record on success. */
export const logIn = (email: string, password: string) =>
  api.post<User>("/login/", { email, password }).then((r) => r.data);

/** Complete onboarding: save name + monthly income and generate the initial budget plan. */
export const onboardUser = (user_id: number, payload: OnboardingPayload) =>
  api
    .post<OnboardingResult>(`/onboarding/${user_id}`, payload)
    .then((r) => r.data);

// ─── Domain API functions ────────────────────────────────────────────────────

/** Create or replace a budget plan for a user. */
export const createBudgetPlan = (
  user_id: number,
  lifestyle_tier: string,
  customAllocation?: {
    custom_needs_pct: number;
    custom_wants_pct: number;
    custom_savings_pct: number;
  }
) =>
  api
    .post<BudgetPlan>("/budget-plan/", {
      user_id,
      lifestyle_tier: lifestyle_tier.trim().toLowerCase(),
      ...customAllocation,
    })
    .then((r) => r.data);

/** Log a new income or expense transaction. */
export const createTransaction = (payload: {
  user_id: number;
  amount: number;
  category: string;
  type: "income" | "expense";
  transaction_date: string;
}) => api.post<Transaction>("/transactions/", payload).then((r) => r.data);


/** Fetch the budget vs. actuals status for a user. */
export const getBudgetStatus = (user_id: number) =>
  api.get<BudgetStatus>(`/budget-status/${user_id}`).then((r) => r.data);

/** Fetch a user's currently saved budget plan (404 if none exists yet). */
export const getBudgetPlan = (user_id: number) =>
  api.get<BudgetPlan>(`/budget-plan/${user_id}`).then((r) => r.data);

/** Update the user's current emergency fund amount. */
export const updateEmergencyFund = (user_id: number, amount: number) =>
  api
    .post<EmergencyFundResponse>(`/emergency-fund/${user_id}`, {
      amount,
    })
    .then((r) => r.data);

/** Create a new financial goal for the user. */
export const createFinancialGoal = (user_id: number, payload: FinancialGoalCreatePayload) =>
  api
    .post<FinancialGoal>(`/financial-goals/${user_id}`, payload)
    .then((r) => r.data);

/** Fetch every financial goal for a user. */
export const getFinancialGoals = (user_id: number) =>
  api.get<FinancialGoal[]>(`/financial-goals/${user_id}`).then((r) => r.data);

/** Fetch every transaction ever logged for a user, newest first. */
export const getTransactions = (user_id: number) =>
  api.get<Transaction[]>(`/transactions/${user_id}`).then((r) => r.data);