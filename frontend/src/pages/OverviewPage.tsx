/**
 * OverviewPage.tsx — /dashboard
 *
 * Shows quick stats, budget bucket progress, savings indicator,
 * and per-category spending breakdown.
 * Auto-fetches on mount; refresh button triggers a re-fetch.
 */

import { useState, useEffect, useCallback } from "react";
import { getBudgetStatus } from "../api";
import type { BudgetStatus } from "../api";
import { useAuth } from "../context/AuthContext";
import ProgressBar from "../components/ProgressBar";

const usd = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card hover:border-[#3d4466] transition-colors">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-[#f1f5f9]"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[#475569]">{sub}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    if (!currentUser) return;
    setError("");
    setLoading(true);
    try {
      const data = await getBudgetStatus(currentUser.id);
      setStatus(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? "Could not load budget status.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#f1f5f9]">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-[#4f8ef7] to-[#a78bfa] bg-clip-text text-transparent">
              {currentUser?.email.split("@")[0]}
            </span>{" "}
            👋
          </h3>
          <p className="text-sm text-[#475569] mt-0.5">Here's your financial overview for this month.</p>
        </div>
        <button
          id="overview-refresh-btn"
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[#2d3348] bg-[#1a1d27] px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#4f8ef7]/50 hover:text-[#4f8ef7] transition-all disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* ── Empty state ── */}
      {!status && !error && !loading && (
        <div className="rounded-2xl border border-dashed border-[#2d3348] bg-[#1a1d27] p-12 text-center">
          <div className="text-4xl mb-3">📈</div>
          <p className="text-[#94a3b8] font-medium">No budget data yet.</p>
          <p className="text-sm text-[#475569] mt-1">
            Go to <span className="text-[#4f8ef7]">Budget Planner</span> to set up your lifestyle tier, then log some transactions.
          </p>
        </div>
      )}

      {/* ── Status content ── */}
      {status && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Monthly Income"
              value={usd(Number(status.monthly_income))}
              sub="Total gross income"
            />
            <StatCard
              label="Actual Savings"
              value={usd(Number(status.actual_savings))}
              sub={status.is_savings_on_track ? "✓ On track" : "⚠ Behind target"}
              accent={status.is_savings_on_track ? "text-[#34d399]" : "text-[#f87171]"}
            />
            <StatCard
              label="Savings Target"
              value={usd(Number(status.savings_target))}
              sub="Based on your tier"
            />
            <div className="rounded-xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card hover:border-[#3d4466] transition-colors flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-2">Lifestyle Tier</p>
              <span className="tier-badge self-start text-sm">{status.lifestyle_tier}</span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]">Budget Buckets</p>
            <ProgressBar
              label="🏠 Needs"
              target={Number(status.needs.target)}
              spent={Number(status.needs.spent)}
              isOverBudget={status.needs.is_over_budget}
              colorClass="green"
            />
            <ProgressBar
              label="🎉 Wants"
              target={Number(status.wants.target)}
              spent={Number(status.wants.spent)}
              isOverBudget={status.wants.is_over_budget}
              colorClass="purple"
            />
          </div>

          {/* Savings indicator */}
          <div className={`alert ${status.is_savings_on_track ? "alert-success" : "alert-error"}`}>
            {status.is_savings_on_track
              ? `💰 Savings on track! You're ${usd(Number(status.actual_savings) - Number(status.savings_target))} ahead of your goal.`
              : `📉 Savings behind by ${usd(Math.abs(Number(status.savings_remaining)))} — cut some wants to catch up.`}
          </div>

          {/* Category breakdown */}
          {status.category_breakdown.length > 0 && (
            <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4">
                🗂 Spending by Category
              </p>
              <ul className="category-list">
                {status.category_breakdown.map((c) => (
                  <li className="category-item" key={c.category}>
                    <span style={{ textTransform: "capitalize" }}>{c.category}</span>
                    <span>{usd(Number(c.total_spent))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
