/**
 * BudgetPlannerPage.tsx — /dashboard/budget-planner
 *
 * Left: tier selector form + save
 * Right: tier breakdown info cards
 */

import { useEffect, useState } from "react";
import { createBudgetPlan, getBudgetPlan, getErrorMessage, formatINR } from "../api";
import { useAuth } from "../context/AuthContext";
import { Lock, LockOpen } from "lucide-react";

interface TierInfo {
  value: string;
  label: string;
  needs: number;
  wants: number;
  savings: number;
  icon: string;
  description: string;
  accentClass: string;
  gradientFrom: string;
  gradientTo: string;
}

const TIERS: TierInfo[] = [
  {
    value: "standard",
    label: "Standard",
    needs: 50,
    wants: 30,
    savings: 20,
    icon: "⚖️",
    description: "The classic 50/30/20 rule. Balanced for most people.",
    accentClass: "text-[#4f8ef7]",
    gradientFrom: "#4f8ef7",
    gradientTo: "#6c63ff",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    needs: 40,
    wants: 20,
    savings: 40,
    icon: "🚀",
    description: "Maximise savings. Sacrifice wants for financial growth.",
    accentClass: "text-[#34d399]",
    gradientFrom: "#34d399",
    gradientTo: "#059669",
  },
  {
    value: "frugal",
    label: "Frugal",
    needs: 30,
    wants: 20,
    savings: 50,
    icon: "🌱",
    description: "Extreme savings focus. Best for early retirement goals.",
    accentClass: "text-[#fbbf24]",
    gradientFrom: "#fbbf24",
    gradientTo: "#d97706",
  },
  {
    value: "comfort",
    label: "Comfort",
    needs: 50,
    wants: 40,
    savings: 10,
    icon: "🛋️",
    description: "Enjoy life now. Low savings rate, high lifestyle spend.",
    accentClass: "text-[#a78bfa]",
    gradientFrom: "#a78bfa",
    gradientTo: "#7c3aed",
  },
  {
    value: "custom",
    label: "Custom",
    needs: 50,
    wants: 30,
    savings: 20,
    icon: "🛠️",
    description: "Build your own split with live sliders and save your tailored plan.",
    accentClass: "text-[#f97316]",
    gradientFrom: "#f97316",
    gradientTo: "#f59e0b",
  },
];

function AllocationBar({
  needs,
  wants,
  savings,
}: {
  needs: number;
  wants: number;
  savings: number;
}) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      <div style={{ width: `${needs}%`, background: "#34d399" }} />
      <div style={{ width: `${wants}%`, background: "#a78bfa" }} />
      <div style={{ width: `${savings}%`, background: "#4f8ef7" }} />
    </div>
  );
}

const usd = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

export default function BudgetPlannerPage() {
  const { currentUser } = useAuth();
  const [selectedTier, setSelectedTier] = useState("standard");
  const [customAllocation, setCustomAllocation] = useState({ needs: 50, wants: 30, savings: 20 });
  const [lockedBuckets, setLockedBuckets] = useState<Record<string, boolean>>({ needs: false, wants: false, savings: false });
  const [loading, setLoading] = useState(false);
  const [loadingSavedPlan, setLoadingSavedPlan] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // On mount: fetch the user's already-saved budget plan (if any) and
  // pre-select its tier instead of always resetting to "standard".
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      try {
        const plan = await getBudgetPlan(currentUser.id);
        if (!cancelled) {
          setSelectedTier(plan.lifestyle_tier);
          if (plan.lifestyle_tier === "custom") {
            setCustomAllocation({
              needs: Number(plan.needs_pct),
              wants: Number(plan.wants_pct),
              savings: Number(plan.savings_pct),
            });
          }
        }
      } catch {
        // 404 just means the user hasn't saved a plan yet — keep the "standard" default.
      } finally {
        if (!cancelled) setLoadingSavedPlan(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const activeTier =
    selectedTier === "custom"
      ? {
        value: "custom",
        label: "Custom",
        needs: customAllocation.needs,
        wants: customAllocation.wants,
        savings: customAllocation.savings,
        icon: "🛠️",
        description: "Build your own split with live sliders and save your tailored plan.",
        accentClass: "text-[#f97316]",
        gradientFrom: "#f97316",
        gradientTo: "#f59e0b",
      }
      : TIERS.find((t) => t.value === selectedTier)!;

  const updateCustomAllocation = (bucket: keyof typeof customAllocation, value: number) => {
    const nextValue = Math.max(0, Math.min(100, Math.round(value)));
    const otherKeys = (Object.keys(customAllocation) as Array<keyof typeof customAllocation>).filter(
      (key) => key !== bucket,
    );
    const remaining = 100 - nextValue;

    const next = { ...customAllocation, [bucket]: nextValue };

    // Separate locked and unlocked buckets among the others
    const locked = otherKeys.filter((k) => lockedBuckets[k]);
    const unlocked = otherKeys.filter((k) => !lockedBuckets[k]);

    if (unlocked.length === 0) {
      // All others are locked — can't adjust, snap the dragged bucket back
      return;
    }

    // Sum of values that are locked (must stay fixed)
    const lockedSum = locked.reduce((sum, k) => sum + customAllocation[k], 0);
    const availableForUnlocked = remaining - lockedSum;

    if (availableForUnlocked < 0) {
      // Not enough room — don't update
      return;
    }

    // Distribute availableForUnlocked proportionally among unlocked buckets
    const unlockedSum = unlocked.reduce((sum, k) => sum + customAllocation[k], 0);

    if (unlockedSum <= 0) {
      // Spread evenly
      const share = Math.floor(availableForUnlocked / unlocked.length);
      unlocked.forEach((k, i) => {
        next[k] = i === unlocked.length - 1
          ? availableForUnlocked - share * (unlocked.length - 1)
          : share;
      });
    } else {
      let distributed = 0;
      unlocked.forEach((k, i) => {
        if (i === unlocked.length - 1) {
          // Last unlocked bucket absorbs rounding remainder
          next[k] = Math.max(0, availableForUnlocked - distributed);
        } else {
          const share = Math.round((customAllocation[k] / unlockedSum) * availableForUnlocked);
          next[k] = share;
          distributed += share;
        }
      });
    }

    setCustomAllocation(next);
  };

  const toggleLock = (bucket: keyof typeof lockedBuckets) => {
    // At most 1 bucket can be locked at a time to keep UX sane
    setLockedBuckets((prev) => ({
      needs: false,
      wants: false,
      savings: false,
      [bucket]: !prev[bucket],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { setError("No user session."); return; }
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const plan = await createBudgetPlan(
        currentUser.id,
        selectedTier,
        selectedTier === "custom"
          ? {
            custom_needs_pct: customAllocation.needs,
            custom_wants_pct: customAllocation.wants,
            custom_savings_pct: customAllocation.savings,
          }
          : undefined
      );
      setSuccess(
        `✓ Plan saved! Needs: ${formatINR(Number(plan.needs_target))} · Wants: ${formatINR(Number(plan.wants_target))} · Savings: ${formatINR(Number(plan.savings_target))}`
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save plan."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h3 className="text-xl font-bold text-[#f1f5f9]">Budget Planner</h3>
        <p className="text-sm text-[#475569] mt-0.5">
          Choose a lifestyle tier to automatically set your Needs / Wants / Savings targets.
          {loadingSavedPlan && <span className="ml-2 text-[#4f8ef7]">Loading your saved plan…</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Tier selector ── */}
        <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
          <p className="card-title">🎯 Select Lifestyle Tier</p>

          <form onSubmit={handleSave} className="space-y-3">
            {TIERS.map((tier) => (
              <label
                key={tier.value}
                className="flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all border-[#2d3348] bg-[#22263a] hover:border-[#3d4466]"
                style={
                  selectedTier === tier.value
                    ? { borderColor: `${tier.gradientFrom}99`, backgroundColor: `${tier.gradientFrom}1A` }
                    : undefined
                }
              >
                <input
                  type="radio"
                  name="tier"
                  value={tier.value}
                  checked={selectedTier === tier.value}
                  onChange={() => setSelectedTier(tier.value)}
                  className="sr-only"
                />
                {/* Custom radio circle */}
                <div
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selectedTier === tier.value
                      ? "border-[#4f8ef7] bg-[#4f8ef7]"
                      : "border-[#475569]",
                  ].join(" ")}
                >
                  {selectedTier === tier.value && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>

                <span className="text-2xl leading-none">{tier.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#f1f5f9]">{tier.label}</span>
                    <span className="text-xs text-[#475569]">
                      {tier.needs}/{tier.wants}/{tier.savings}
                    </span>
                  </div>
                  <AllocationBar needs={tier.needs} wants={tier.wants} savings={tier.savings} />
                </div>
              </label>
            ))}

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button
              id="budget-save-btn"
              className="btn btn-amber"
              type="submit"
              disabled={loading}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? <span className="spinner" /> : "Save Budget Plan"}
            </button>
          </form>
        </div>

        {/* ── Selected tier details ── */}
        <div className="space-y-4">
          {/* Description card */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{activeTier.icon}</span>
              <div>
                <p className={`text-lg font-bold ${activeTier.accentClass}`}>{activeTier.label}</p>
                <p className="text-xs text-[#475569]">Allocation: {activeTier.needs}/{activeTier.wants}/{activeTier.savings}</p>
              </div>
            </div>
            <p className="text-sm text-[#94a3b8]">{activeTier.description}</p>
          </div>

          {selectedTier === "custom" && (
            <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]">Custom allocation editor</p>
                <p className="text-[10px] text-[#64748b]">Total: {customAllocation.needs + customAllocation.wants + customAllocation.savings}%</p>
              </div>
              <AllocationBar
                needs={customAllocation.needs}
                wants={customAllocation.wants}
                savings={customAllocation.savings}
              />

              {([
                { key: "needs", label: "🏠 Needs", color: "#34d399" },
                { key: "wants", label: "🎉 Wants", color: "#a78bfa" },
                { key: "savings", label: "💰 Savings", color: "#4f8ef7" },
              ] as const).map((item) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-[#f1f5f9]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title={lockedBuckets[item.key] ? `Unlock ${item.label}` : `Lock ${item.label} at ${customAllocation[item.key]}%`}
                        onClick={() => toggleLock(item.key)}
                        className={[
                          "flex h-6 w-6 items-center justify-center rounded-md border transition-all",
                          lockedBuckets[item.key]
                            ? "border-[#4f8ef7]/60 bg-[#4f8ef7]/10 text-[#4f8ef7]"
                            : "border-[#2d3348] bg-[#151827] text-[#475569] hover:border-[#3d4466] hover:text-[#94a3b8]",
                        ].join(" ")}
                      >
                        {lockedBuckets[item.key]
                          ? <Lock className="h-3 w-3" />
                          : <LockOpen className="h-3 w-3" />}
                      </button>
                      <span>{item.label}</span>
                      {lockedBuckets[item.key] && (
                        <span className="rounded-full bg-[#4f8ef7]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#4f8ef7] border border-[#4f8ef7]/30">
                          Locked
                        </span>
                      )}
                    </div>
                    <span className="font-semibold" style={{ color: item.color }}>
                      {customAllocation[item.key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={customAllocation[item.key]}
                    disabled={lockedBuckets[item.key]}
                    onChange={(event) => updateCustomAllocation(item.key, Number(event.target.value))}
                    className={"w-full accent-current" + (lockedBuckets[item.key] ? " opacity-40 cursor-not-allowed" : "")}
                    style={{ accentColor: item.color }}
                  />
                </div>
              ))}
              <p className="text-xs text-[#94a3b8]">
                <span className="text-[#4f8ef7] font-semibold">Tip:</span> Lock any bucket to keep it fixed while the other two adjust automatically.
              </p>
            </div>
          )}

          {/* Allocation breakdown */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]">Allocation Breakdown</p>
            {[
              { label: "🏠 Needs", pct: activeTier.needs, color: "#34d399", bg: "rgba(52,211,153,0.12)" },
              { label: "🎉 Wants", pct: activeTier.wants, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
              { label: "💰 Savings", pct: activeTier.savings, color: "#4f8ef7", bg: "rgba(79,142,247,0.12)" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-[#f1f5f9]">{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>
                    {item.pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#22263a] overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Projected amounts (if income available) */}
          {currentUser && (
            <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4">
                Projected Monthly Targets
              </p>
              <div className="space-y-2">
                {[
                  { label: "🏠 Needs", pct: activeTier.needs },
                  { label: "🎉 Wants", pct: activeTier.wants },
                  { label: "💰 Savings", pct: activeTier.savings },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#2d3348] last:border-0">
                    <span className="text-sm text-[#94a3b8]">{item.label}</span>
                    <span className="text-sm font-semibold text-[#f1f5f9]">
                      {usd((Number(currentUser.monthly_income) * item.pct) / 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tier comparison table */}
      <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4">All Tiers Comparison</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2d3348] text-[#475569]">
                <th className="pb-3 text-left font-medium">Tier</th>
                <th className="pb-3 text-center font-medium">Needs</th>
                <th className="pb-3 text-center font-medium">Wants</th>
                <th className="pb-3 text-center font-medium">Savings</th>
                <th className="pb-3 text-left font-medium hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier) => (
                <tr
                  key={tier.value}
                  onClick={() => setSelectedTier(tier.value)}
                  className={[
                    "cursor-pointer border-b border-[#2d3348] transition-colors last:border-0",
                    selectedTier === tier.value
                      ? "bg-[#4f8ef7]/10"
                      : "hover:bg-[#22263a]",
                  ].join(" ")}
                >
                  <td className="py-3 font-semibold text-[#f1f5f9]">
                    {tier.icon} {tier.label}
                  </td>
                  <td className="py-3 text-center text-[#34d399]">{tier.needs}%</td>
                  <td className="py-3 text-center text-[#a78bfa]">{tier.wants}%</td>
                  <td className="py-3 text-center text-[#4f8ef7]">{tier.savings}%</td>
                  <td className="py-3 text-[#475569] text-xs hidden sm:table-cell">{tier.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
