/**
 * api.ts — Centralised API service layer.
 *
 * All HTTP calls go through this module so that endpoint URLs and
 * Axios configuration are maintained in a single place.
 */

import axios from "axios";

// ─── Base client ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

// ─── Request / Response types (mirror the FastAPI Pydantic schemas) ──────────

export interface User {
  id: number;
  email: string;
  name: string | null;
  monthly_income: number | null;
  manual_savings_offset: number;
  risk_appetite: "Low" | "Medium" | "High" | null;
}

/** True once the user has completed the onboarding step. */
export const isOnboarded = (user: User | null): boolean =>
  !!user && !!user.name && user.monthly_income !== null;

export interface OnboardingPayload {
  name: string;
  monthly_income: number;
  lifestyle_tier: string;
  risk_appetite: "Low" | "Medium" | "High";
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
  comment: string | null;
}

/** Partial update payload for PUT /transactions/{id} — every field optional. */
export interface TransactionUpdatePayload {
  amount?: number;
  category?: string;
  type?: "income" | "expense";
  transaction_date?: string;
  comment?: string | null;
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
  liquid_assets: number;
  manual_savings_offset: number;
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

/** Partial update payload for PUT /financial-goals/{goal_id} — every field optional. */
export interface FinancialGoalUpdatePayload {
  goal_name?: string;
  category?: string;
  target_amount?: number;
  current_saved?: number;
  target_date?: string;
  priority?: "High" | "Medium" | "Low";
}

export interface UserSavingsUpdatePayload {
  manual_savings_offset: number;
}

export interface UserProfileUpdatePayload {
  name: string;
  monthly_income: number;
  manual_savings_offset: number;
}

export interface RecurringExpense {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  category: string;
  frequency: "monthly" | "quarterly";
  deduction_day: number;
  next_deduction_date: string;
  comment: string | null;
  is_active: boolean;
}

export interface RecurringExpenseCreatePayload {
  user_id: number;
  title: string;
  amount: number;
  category: string;
  frequency: "monthly" | "quarterly";
  deduction_day: number;
  comment?: string;
  start_date?: string;
}

/** Partial update payload for PUT /recurring-expenses/{id} — every field optional. */
export interface RecurringExpenseUpdatePayload {
  title?: string;
  amount?: number;
  category?: string;
  frequency?: "monthly" | "quarterly";
  deduction_day?: number;
  comment?: string | null;
  is_active?: boolean;
}

// ─── Investments ──────────────────────────────────────────────────────────

export type InvestmentType =
  | "Property"
  | "Commodities"
  | "Stocks"
  | "Mutual Funds"
  | "Bank FD"
  | "Post Office";

export interface Investment {
  id: number;
  user_id: number;
  investment_type: InvestmentType;
  amount: number;
  // Commodities -> commodity name (Gold/Silver/Diamond/Platinum/Other). Property -> property type.
  sub_type: string | null;
  // Commodities -> grams. Property -> number of properties.
  quantity: number | null;
  investment_date: string | null;
  comment: string | null;
  is_past?: boolean;
}

export interface InvestmentCreatePayload {
  user_id: number;
  investment_type: InvestmentType;
  amount: number;
  sub_type?: string;
  quantity?: number;
  investment_date?: string | null;
  comment?: string;
  is_past?: boolean;
}

/** Partial update payload for PUT /investments/{id} — every field optional. */
export interface InvestmentUpdatePayload {
  investment_type?: InvestmentType;
  amount?: number;
  sub_type?: string;
  quantity?: number;
  investment_date?: string | null;
  comment?: string | null;
  is_past?: boolean;
}

export interface PropertyItem {
  property_type: string;
  amount: number;
}

export interface OtherCommodityItem {
  commodity_name: string;
  weight_grams: number;
}

/** The "Initial Past Investments Setup" summary — one per user. */
export interface InvestmentProfile {
  id: number;
  user_id: number;
  properties: PropertyItem[];
  property_count: number;
  other_commodities: OtherCommodityItem[];
  gold_grams: number;
  silver_grams: number;
  diamond_grams: number;
  platinum_grams: number;
  stocks_value: number;
  mutual_funds_value: number;
  bank_fd_value: number;
  post_office_value: number;
  comment: string | null;
}

/** Full-replace payload for PUT /investment-profile/{user_id}. */
export interface InvestmentProfilePayload {
  properties: PropertyItem[];
  other_commodities: OtherCommodityItem[];
  gold_grams: number;
  silver_grams: number;
  diamond_grams: number;
  platinum_grams: number;
  stocks_value: number;
  mutual_funds_value: number;
  bank_fd_value: number;
  post_office_value: number;
  comment?: string | null;
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

/** Update user's risk appetite setting dynamically. */
export const updateRiskAppetite = (user_id: number, riskAppetite: "Low" | "Medium" | "High") =>
  api
    .put<{ status: string; risk_appetite: string }>(`/user/${user_id}/risk-appetite`, { risk_appetite: riskAppetite })
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
  comment?: string;
}) => api.post<Transaction>("/transactions/", payload).then((r) => r.data);

/** Update an existing transaction's amount, category, type, date, or comment. */
export const updateTransaction = (transaction_id: number, payload: TransactionUpdatePayload) =>
  api.put<Transaction>(`/transactions/${transaction_id}`, payload).then((r) => r.data);

/** Permanently delete a transaction. */
export const deleteTransaction = (transaction_id: number) =>
  api.delete<void>(`/transactions/${transaction_id}`).then(() => undefined);


/** Fetch the budget vs. actuals status for a user. */
export const getBudgetStatus = (user_id: number) =>
  api.get<BudgetStatus>(`/budget-status/${user_id}`).then((r) => r.data);

/** Fetch a user's currently saved budget plan (404 if none exists yet). */
export const getBudgetPlan = (user_id: number) =>
  api.get<BudgetPlan>(`/budget-plan/${user_id}`).then((r) => r.data);

/** Manually set the user's pre-existing (pre-MoneyMap) savings. Folded into liquid_assets and, in turn, the automated Emergency Fund calculation. */
export const updateSavingsOffset = (user_id: number, manual_savings_offset: number) =>
  api
    .put<User>(`/user/${user_id}/savings`, { manual_savings_offset })
    .then((r) => r.data);

/** Update user's profile information (name, monthly income, and pre-existing savings baseline). */
export const updateUserProfile = (user_id: number, payload: UserProfileUpdatePayload) =>
  api
    .put<User>(`/user/${user_id}/profile`, payload)
    .then((r) => r.data);

/** Create a new financial goal for the user. */
export const createFinancialGoal = (user_id: number, payload: FinancialGoalCreatePayload) =>
  api
    .post<FinancialGoal>(`/financial-goals/${user_id}`, payload)
    .then((r) => r.data);

/** Fetch every financial goal for a user. */
export const getFinancialGoals = (user_id: number) =>
  api.get<FinancialGoal[]>(`/financial-goals/${user_id}`).then((r) => r.data);

/** Update an existing financial goal's details or progress. */
export const updateFinancialGoal = (goal_id: number, payload: FinancialGoalUpdatePayload) =>
  api.put<FinancialGoal>(`/financial-goals/${goal_id}`, payload).then((r) => r.data);

/** Fetch every transaction ever logged for a user, newest first. */
export const getTransactions = (user_id: number) =>
  api.get<Transaction[]>(`/transactions/${user_id}`).then((r) => r.data);

// ─── Recurring / Fixed Expenses ──────────────────────────────────────────────

/** Create a new recurring/fixed expense (rent, EMI, subscription, etc.). */
export const createRecurringExpense = (payload: RecurringExpenseCreatePayload) =>
  api.post<RecurringExpense>("/recurring-expenses/", payload).then((r) => r.data);

/** List every recurring/fixed expense configured for a user. */
export const getRecurringExpenses = (user_id: number) =>
  api.get<RecurringExpense[]>(`/recurring-expenses/${user_id}`).then((r) => r.data);

/** Update a recurring/fixed expense's amount, schedule, category, or active state. */
export const updateRecurringExpense = (expense_id: number, payload: RecurringExpenseUpdatePayload) =>
  api.put<RecurringExpense>(`/recurring-expenses/${expense_id}`, payload).then((r) => r.data);

/** Permanently delete a recurring/fixed expense. */
export const deleteRecurringExpense = (expense_id: number) =>
  api.delete<void>(`/recurring-expenses/${expense_id}`).then(() => undefined);

// ─── Investments ──────────────────────────────────────────────────────────

/** Log a new investment. Auto-deducts the amount from the user's Liquid Assets. */
export const createInvestment = (payload: InvestmentCreatePayload) =>
  api.post<Investment>("/investments/", payload).then((r) => r.data);

/** List a user's investment history, optionally filtered by exact type and/or free-text search. */
export const getInvestments = (user_id: number, filters?: { investment_type?: string; search?: string }) =>
  api
    .get<Investment[]>(`/investments/${user_id}`, { params: filters })
    .then((r) => r.data);

/** Update an investment. If the amount changed, Liquid Assets is re-adjusted by the delta. */
export const updateInvestment = (investment_id: number, payload: InvestmentUpdatePayload) =>
  api.put<Investment>(`/investments/${investment_id}`, payload).then((r) => r.data);

/** Delete an investment. Refunds its amount back into the user's Liquid Assets. */
export const deleteInvestment = (investment_id: number) =>
  api.delete<void>(`/investments/${investment_id}`).then(() => undefined);

/** Fetch a user's "Initial Past Investments Setup" summary (zeroed defaults if never saved). */
export const getInvestmentProfile = (user_id: number) =>
  api.get<InvestmentProfile>(`/investment-profile/${user_id}`).then((r) => r.data);

/** Create or replace a user's "Initial Past Investments Setup" summary. */
export const updateInvestmentProfile = (user_id: number, payload: InvestmentProfilePayload) =>
  api.put<InvestmentProfile>(`/investment-profile/${user_id}`, payload).then((r) => r.data);


// ─── AI Advisor (Chatbot) ───────────────────────────────────────────────────

export interface AIChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AIChatPayload {
  user_id: number;
  message: string;
}

export interface AIChatResponse {
  response: string;
}

/** Get AI financial co-pilot advice based on user profile and query. */
export const getAIChatResponse = (userId: number, message: string) =>
  api.post<AIChatResponse>("/ai/chat", { user_id: userId, message }).then((r) => r.data);