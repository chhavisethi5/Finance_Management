/**
 * OverviewPage.tsx — /dashboard
 *
 * Professional Financial Dashboard with compact summary cards, Lucide icons,
 * Indian currency formatting, interactive Recharts, Smart Insights Panel,
 * Emergency Fund status tracker, and Goal Forecasting with Priority support.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getBudgetStatus,
  getFinancialGoals,
  createFinancialGoal,
  getRecurringExpenses,
  formatINR,
  getErrorMessage,
} from "../api";
import type { BudgetStatus, FinancialGoal, RecurringExpense, User } from "../api";
import { useAuth } from "../context/AuthContext";
import ProgressBar from "../components/ProgressBar";
import {
  Wallet,
  PiggyBank,
  Target,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Sparkles,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Pencil,
  Repeat,
} from "lucide-react";
import EditGoalModal from "../components/EditGoalModal";
import InitialSavingsModal from "../components/InitialSavingsModal";
import RecurringExpensesModal from "../components/RecurringExpensesModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

// ─── Stat Card Component ───
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  badge?: string;
  /** Optional sleek edit affordance rendered in the top-right corner, with a hover tooltip. */
  onEdit?: () => void;
  editTooltip?: string;
}

function StatCard({ label, value, sub, icon, accent = "text-[#f1f5f9]", badge, onEdit, editTooltip }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[#2d3348] bg-[#1e2235] p-4 shadow-card hover:border-[#3d4466] transition-all">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
          {icon}
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="rounded-full bg-[#4f8ef7]/10 px-2 py-0.5 text-[10px] font-bold text-[#4f8ef7] border border-[#4f8ef7]/20">
              {badge}
            </span>
          )}
          {onEdit && (
            <div className="relative">
              <button
                type="button"
                onClick={onEdit}
                aria-label={editTooltip ?? "Edit"}
                className="peer flex h-6 w-6 items-center justify-center rounded-md text-[#64748b] opacity-0 transition-all duration-150 hover:bg-white/[0.06] hover:text-[#4f8ef7] group-hover:opacity-100"
              >
                <Pencil className="h-3 w-3" />
              </button>
              {editTooltip && (
                <div className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 w-44 origin-top-right scale-95 rounded-lg border border-[#2d3348] bg-[#0d0f18] px-2.5 py-1.5 text-[10px] leading-snug text-[#cbd5e1] opacity-0 shadow-xl transition-all duration-150 peer-hover:scale-100 peer-hover:opacity-100">
                  {editTooltip}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">{label}</p>
        <p className={`mt-0.5 text-xl font-bold ${accent}`}>{value}</p>
        {sub && <p className="mt-1 text-[11px] text-[#64748b]">{sub}</p>}
      </div>
    </div>
  );
}

const PIE_COLORS = ["#34d399", "#a78bfa", "#4f8ef7", "#fbbf24", "#f87171", "#38bdf8", "#f97316"];

export default function OverviewPage() {
  const { currentUser, login } = useAuth();
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [goalLoading, setGoalLoading] = useState(false);
  const [error, setError] = useState("");
  const [goalError, setGoalError] = useState("");
  const [goalSuccess, setGoalSuccess] = useState("");
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Goal Form Fields
  const [goalName, setGoalName] = useState("");
  const [goalCategory, setGoalCategory] = useState("Vacation");
  const [goalPriority, setGoalPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  // Initial Savings (pre-MoneyMap) — now edited via a sleek edit icon on the
  // Liquid Assets card instead of a standalone form/card.
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [savingsOffsetSuccess, setSavingsOffsetSuccess] = useState("");

  // Recurring / Fixed Expenses
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!currentUser) return;
    setError("");
    setLoading(true);
    try {
      const data = await getBudgetStatus(currentUser.id);
      setStatus(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not load budget status."));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchGoals = useCallback(async () => {
    if (!currentUser) return;
    setGoalLoading(true);
    try {
      const data = await getFinancialGoals(currentUser.id);
      setGoals(data);
    } catch (err: unknown) {
      setGoalError(getErrorMessage(err, "Could not load your financial goals."));
    } finally {
      setGoalLoading(false);
    }
  }, [currentUser]);

  const fetchRecurringExpenses = useCallback(async () => {
    if (!currentUser) return;
    setRecurringLoading(true);
    try {
      const data = await getRecurringExpenses(currentUser.id);
      setRecurringExpenses(data);
    } catch {
      // Non-critical for the main dashboard load — fail quietly here and
      // let the modal itself surface any error if the user opens it.
    } finally {
      setRecurringLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void fetchStatus();
    void fetchGoals();
    void fetchRecurringExpenses();
  }, [fetchStatus, fetchGoals, fetchRecurringExpenses]);

  const handleSavingsOffsetSaved = async (updatedUser: User) => {
    login(updatedUser); // keep AuthContext / localStorage in sync
    setShowSavingsModal(false);
    setSavingsOffsetSuccess("Initial savings updated successfully!");
    await fetchStatus();
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setGoalError("");
    setGoalSuccess("");

    if (!goalName.trim() || !goalTarget || !goalDate) {
      setGoalError("Please fill out all required goal fields.");
      return;
    }

    const numTarget = Number(goalTarget);
    const numSaved = Number(goalSaved || 0);

    if (numTarget <= 0) {
      setGoalError("Goal target amount must be greater than ₹0.");
      return;
    }
    if (numSaved < 0) {
      setGoalError("Saved amount cannot be negative.");
      return;
    }

    try {
      await createFinancialGoal(currentUser.id, {
        goal_name: goalName.trim(),
        category: goalCategory.trim(),
        target_amount: numTarget,
        current_saved: numSaved,
        target_date: goalDate,
        priority: goalPriority,
      });
      setGoalSuccess("Goal created successfully!");
      setTimeout(() => setGoalSuccess(""), 4000);
      setGoalName("");
      setGoalTarget("");
      setGoalSaved("");
      setGoalDate("");
      setGoalPriority("Medium");
      setShowGoalModal(false);
      await fetchGoals();
    } catch (err: unknown) {
      setGoalError(getErrorMessage(err, "Could not create goal."));
    }
  };

  const handleGoalUpdated = (updated: FinancialGoal) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setEditingGoal(null);
    setGoalSuccess("Goal updated successfully!");
    setTimeout(() => setGoalSuccess(""), 4000);
  };

  const formatDate = (value: string) => {
    if (!value) return "N/A";
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(value),
    );
  };

  // Chart Data Preparation
  const overviewBarData = status
    ? [
      { name: "Income", amount: Number(status.monthly_income), fill: "#34d399" },
      { name: "Needs", amount: Number(status.needs.spent), fill: "#38bdf8" },
      { name: "Wants", amount: Number(status.wants.spent), fill: "#a78bfa" },
      { name: "Savings", amount: Math.max(0, Number(status.actual_savings)), fill: "#4f8ef7" },
    ]
    : [];

  const categoryPieData = status?.category_breakdown.map((c) => ({
    name: c.category,
    value: Number(c.total_spent),
  })) || [];


  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "High":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "Medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusBadge = (code: string, _label: string) => {
    switch (code) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "on_track":
        return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "behind":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "overdue":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#f1f5f9]">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-[#4f8ef7] to-[#a78bfa] bg-clip-text text-transparent">
              {currentUser?.name || currentUser?.email.split("@")[0]}
            </span>{" "}
            👋
          </h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">Here's your financial snapshot for today.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="overview-create-goal-btn"
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#4f8ef7]/20 hover:opacity-95 transition-all"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add Goal
          </button>

          <button
            id="overview-refresh-btn"
            onClick={() => {
              void fetchStatus();
              void fetchGoals();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[#2d3348] bg-[#1a1d27] px-3 py-1.5 text-xs font-medium text-[#94a3b8] hover:border-[#4f8ef7]/50 hover:text-[#4f8ef7] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Top Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {savingsOffsetSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{savingsOffsetSuccess}</span>
        </div>
      )}

      {/* ── 1. Summary Cards (Compact, Lucide Icons, Indian Currency) ── */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            label="Monthly Income"
            value={formatINR(status.monthly_income)}
            sub="Gross monthly inflow"
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            label="Monthly Savings"
            value={formatINR(status.monthly_savings)}
            sub="Resets monthly"
            icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
            accent={status.monthly_savings >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <StatCard
            label="Liquid Assets"
            value={formatINR(status.liquid_assets)}
            sub={`Incl. ${formatINR(status.manual_savings_offset, true)} initial`}
            icon={<PiggyBank className="h-4 w-4 text-blue-400" />}
            badge="Rollover"
            onEdit={() => setShowSavingsModal(true)}
            editTooltip="Had savings before joining MoneyMap? Add them here"
          />
          <StatCard
            label="Savings Target"
            value={formatINR(status.savings_target)}
            sub={`${status.lifestyle_tier.toUpperCase()} tier`}
            icon={<Target className="h-4 w-4 text-amber-400" />}
          />
        </div>
      )}

      {/* ── 2. Smart Insights Panel ── */}
      {status && status.insights.length > 0 && (
        <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3.5">
            <Sparkles className="h-4 w-4 text-[#4f8ef7]" />
            <h4 className="text-sm font-bold text-[#f1f5f9]">MoneyMap Insights</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {status.insights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-[#2d3348] bg-[#151827] p-3.5 transition-all hover:border-[#3d4466]"
              >
                <div className="mt-0.5 shrink-0">
                  {insight.type === "positive" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {insight.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  {insight.type === "action" && <AlertCircle className="h-4 w-4 text-[#4f8ef7]" />}
                  {insight.type === "info" && <Sparkles className="h-4 w-4 text-purple-400" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#f1f5f9]">{insight.title}</p>
                  <p className="mt-1 text-[11px] text-[#94a3b8] leading-relaxed">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Visual Charts Section (Recharts) ── */}
      {status && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Income vs Expenses vs Savings Bar Chart */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#4f8ef7]" />
                <h4 className="text-xs font-bold text-[#f1f5f9] uppercase tracking-wider">Cashflow Breakdown</h4>
              </div>
              <span className="text-[10px] text-[#64748b]">Monthly Overview</span>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    formatter={(val: any, _name, props: { payload?: { name?: string } }) => [
                      formatINR(Number(val ?? 0)),
                      props?.payload?.name ?? "Amount",
                    ]}
                    contentStyle={{ backgroundColor: "#151827", borderColor: "#2d3348", borderRadius: "8px", color: "#f1f5f9", fontSize: "12px" }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {overviewBarData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Category Breakdown Doughnut Chart */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold text-[#f1f5f9] uppercase tracking-wider">Category Allocation</h4>
              </div>
              <span className="text-[10px] text-[#64748b]">{categoryPieData.length} categories</span>
            </div>
            <div className="h-52 w-full">
              {categoryPieData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-[#64748b]">
                  <p>No transactions logged this month.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                      {categoryPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any, _name, props: { payload?: { name?: string } }) => [
                        formatINR(Number(val ?? 0)),
                        props?.payload?.name ?? "Category",
                      ]}
                      labelFormatter={() => ""}
                      contentStyle={{ backgroundColor: "#151827", borderColor: "#2d3348", borderRadius: "8px", color: "#f1f5f9", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Budget Buckets & Emergency Fund Section ── */}
      {status && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Budget Bucket Progress Bars */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Needs & Wants Budget Buckets</h4>
              <span className="text-xs text-[#4f8ef7] font-semibold">{status.lifestyle_tier.toUpperCase()} Tier</span>
            </div>
            <div className="space-y-3">
              <ProgressBar
                label="🏠 Essential Needs"
                target={Number(status.needs.target)}
                current={Number(status.needs.spent)}
                isOverBudget={status.needs.is_over_budget}
                status={status.needs.is_over_budget ? "red" : "blue"}
                mode="spent"
              />
              <ProgressBar
                label="🎉 Discretionary Wants"
                target={Number(status.wants.target)}
                current={Number(status.wants.spent)}
                isOverBudget={status.wants.is_over_budget}
                status={status.wants.is_over_budget ? "red" : "purple"}
                mode="spent"
              />
              <ProgressBar
                label="💰 Savings Allocation"
                target={Number(status.savings_target)}
                current={Number(status.actual_savings)}
                isOverBudget={false}
                status={status.is_savings_on_track ? "green" : "orange"}
                mode="saved"
              />
            </div>
          </div>

          {/* Upgraded Emergency Fund Card */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Emergency Safety Fund</h4>
                <p className="mt-0.5 text-xs text-[#f1f5f9]">6-Month Living Reserve Safety Net</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold border ${status.emergency_fund_status === "Fully Funded"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : status.emergency_fund_status === "Healthy"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
              >
                {status.emergency_fund_status}
              </span>
            </div>

            <ProgressBar
              label="Emergency Reserve"
              target={Number(status.emergency_fund_target)}
              current={Number(status.emergency_fund_saved)}
              status={
                status.emergency_fund_saved >= status.emergency_fund_target
                  ? "green"
                  : status.emergency_fund_saved >= status.emergency_fund_target * 0.7
                    ? "blue"
                    : "orange"
              }
              mode="saved"
            />

            <p className="text-xs leading-relaxed text-[#64748b]">
              {status.emergency_fund_saved >= status.emergency_fund_target ? (
                <>
                  Your <span className="font-semibold text-[#f1f5f9]">Liquid Assets</span> of{" "}
                  {formatINR(status.emergency_fund_saved)} fully cover your 6-month buffer target of{" "}
                  {formatINR(status.emergency_fund_target)}.
                </>
              ) : (
                <>
                  Calculated automatically from your{" "}
                  <span className="font-semibold text-[#f1f5f9]">Liquid Assets</span>. You need{" "}
                  {formatINR(status.emergency_fund_target - status.emergency_fund_saved)} more to
                  reach your 6-month buffer target of {formatINR(status.emergency_fund_target)}.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── 4b. Recurring / Fixed Expenses ── */}
      <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Recurring Fixed Expenses</h4>
              <p className="mt-0.5 text-xs text-[#64748b]">Rent, EMIs, subscriptions — auto-deducted on schedule</p>
            </div>
          </div>
          <button
            onClick={() => setShowRecurringModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4f8ef7] hover:text-[#6c63ff] transition-colors"
          >
            Manage
          </button>
        </div>

        {recurringLoading ? (
          <div className="py-6 text-center text-xs text-[#64748b]">Loading recurring expenses…</div>
        ) : recurringExpenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2d3348] bg-[#151827] p-6 text-center text-xs text-[#94a3b8]">
            No recurring expenses configured yet.{" "}
            <button onClick={() => setShowRecurringModal(true)} className="font-semibold text-[#4f8ef7] hover:underline">
              Add one
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recurringExpenses.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-xl border border-[#2d3348] bg-[#151827] p-3 ${item.is_active ? "" : "opacity-50"
                  }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#f1f5f9]">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#64748b] capitalize">
                    {item.frequency} · Next {new Date(item.next_deduction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <p className="shrink-0 pl-2 text-sm font-bold text-[#f1f5f9]">{formatINR(item.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Financial Goals with Forecasting & Priority ── */}
      <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-[#f1f5f9]">Financial Goals & Forecasting</h4>
            <p className="text-xs text-[#94a3b8]">Track required monthly pace, priority levels, and completion timelines.</p>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4f8ef7] hover:text-[#6c63ff] transition-colors"
          >
            + New Goal
          </button>
        </div>

        {goalSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {goalSuccess}
          </div>
        )}

        {goalLoading ? (
          <div className="py-8 text-center text-xs text-[#64748b]">Loading financial goals…</div>
        ) : goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2d3348] bg-[#151827] p-8 text-center text-xs text-[#94a3b8]">
            <Target className="mx-auto h-8 w-8 text-[#4f8ef7] mb-2" />
            <p className="font-semibold text-[#f1f5f9]">No goals defined yet.</p>
            <p className="mt-1">Add your first savings goal to get pacing forecasts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-3 rounded-xl border border-[#2d3348] bg-[#151827] p-4 shadow-sm hover:border-[#3d4466] transition-all">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-[#f1f5f9] text-sm">{goal.goal_name}</h5>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getPriorityBadge(goal.priority)}`}>
                        {goal.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">{goal.category} · {goal.horizon}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(goal.status_code, goal.status_label)}`}>
                      {goal.status_label}
                    </span>
                    <button
                      type="button"
                      aria-label="Edit goal"
                      onClick={() => setEditingGoal(goal)}
                      className="text-[#64748b] hover:text-[#4f8ef7] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {/* Goal Progress Bar */}
                <ProgressBar
                  label="Goal Progress"
                  target={Number(goal.target_amount)}
                  current={Number(goal.current_saved)}
                  status={goal.status_code === "completed" ? "green" : goal.status_code === "on_track" ? "blue" : "orange"}
                  mode="saved"
                />

                {/* Forecasting Stats Footer */}
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#1a1d27] p-2.5 text-[11px] text-[#94a3b8]">
                  <div>
                    <span className="text-[#64748b]">Monthly Pace:</span>{" "}
                    <strong className="text-[#f1f5f9]">{formatINR(goal.monthly_target)}/mo</strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Remaining:</span>{" "}
                    <strong className="text-[#f1f5f9]">{formatINR(goal.remaining_amount)}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Target Date:</span>{" "}
                    <span className="text-[#f1f5f9]">{formatDate(goal.target_date)}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b]">Est. Finish:</span>{" "}
                    <span className="text-[#4f8ef7]">{formatDate(goal.estimated_completion_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Goal Creation Modal ── */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2d3348] pb-3">
              <h4 className="text-sm font-bold text-[#f1f5f9]">Create New Savings Goal</h4>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-xs text-[#94a3b8] hover:text-[#f1f5f9]"
              >
                ✕
              </button>
            </div>

            {goalError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {goalError}
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-[#94a3b8]">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dream House Deposit"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-[#94a3b8]">Category</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                  >
                    <option>Vacation</option>
                    <option>Home</option>
                    <option>Education</option>
                    <option>Retirement</option>
                    <option>Health</option>
                    <option>Vehicle</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-[#94a3b8]">Priority Level</label>
                  <select
                    value={goalPriority}
                    onChange={(e) => setGoalPriority(e.target.value as "High" | "Medium" | "Low")}
                    className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                  >
                    <option value="High">🔥 High</option>
                    <option value="Medium">⚡ Medium</option>
                    <option value="Low">🌱 Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-[#94a3b8]">Target Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="150000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-[#94a3b8]">Already Saved (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="25000"
                    value={goalSaved}
                    onChange={(e) => setGoalSaved(e.target.value)}
                    className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-[#94a3b8]">Target Completion Date</label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 rounded-xl border border-[#2d3348] py-2 text-xs font-semibold text-[#94a3b8] hover:bg-[#1a1d27]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] py-2 text-xs font-semibold text-white shadow-md hover:opacity-95"
                >
                  {goalLoading ? "Creating…" : "Save Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSaved={handleGoalUpdated}
        />
      )}

      {showSavingsModal && currentUser && status && (
        <InitialSavingsModal
          userId={currentUser.id}
          currentValue={Number(status.manual_savings_offset)}
          onClose={() => setShowSavingsModal(false)}
          onSaved={handleSavingsOffsetSaved}
        />
      )}

      {showRecurringModal && currentUser && (
        <RecurringExpensesModal
          userId={currentUser.id}
          items={recurringExpenses}
          onClose={() => setShowRecurringModal(false)}
          onChanged={() => {
            void fetchRecurringExpenses();
            void fetchStatus();
          }}
        />
      )}
    </div>
  );
}