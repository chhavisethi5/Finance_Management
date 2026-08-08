/**
 * OnboardingPage.tsx — /onboarding
 *
 * Shown immediately after sign-up (or on login, if a user never finished it).
 * Collects: Full Name, Monthly Income (INR), Budget Plan tier.
 * On submit: POST /onboarding/{user_id} saves the profile AND generates the
 * budget plan in one call, then redirects straight to /dashboard.
 */

import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { onboardUser, isOnboarded } from "../api";

const TIERS = [
    {
        value: "standard",
        label: "Standard",
        split: "50/30/20",
        icon: "⚖️",
        description: "Balanced 50/30/20 split for steady growth — half on needs, 30% on wants, 20% saved.",
    },
    {
        value: "aggressive",
        label: "Aggressive",
        split: "40/20/40",
        icon: "🚀",
        description: "Maximize savings and investments — reduce discretionary spending to save 40% of income.",
    },
    {
        value: "frugal",
        label: "Frugal",
        split: "30/20/50",
        icon: "🌱",
        description: "Minimal spending, maximum savings — ideal for early retirement or aggressive debt payoff.",
    },
    {
        value: "comfort",
        label: "Comfort",
        split: "50/40/10",
        icon: "🛋️",
        description: "Prioritize lifestyle and comfort now — a relaxed 10% savings pace with more room to spend.",
    },
];

export default function OnboardingPage() {
    const { currentUser, login } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [income, setIncome] = useState("");
    const [tier, setTier] = useState("standard");
    const [riskAppetite, setRiskAppetite] = useState<"Low" | "Medium" | "High">("Medium");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!currentUser) return <Navigate to="/auth" replace />;
    if (isOnboarded(currentUser)) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const result = await onboardUser(currentUser.id, {
                name: name.trim(),
                monthly_income: parseFloat(income),
                lifestyle_tier: tier,
                risk_appetite: riskAppetite,
            });
            login(result.user);
            navigate("/dashboard");
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: any } } };
            const detail = axiosErr?.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Could not complete onboarding. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#4f8ef7]/10 blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#a78bfa]/10 blur-[120px]" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="mb-8 text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f8ef7] to-[#6c63ff] text-3xl shadow-2xl shadow-[#4f8ef7]/40">
                        🎯
                    </div>
                    <h1 className="bg-gradient-to-r from-[#4f8ef7] to-[#a78bfa] bg-clip-text text-3xl font-bold text-transparent">
                        Let's set you up
                    </h1>
                    <p className="mt-2 text-sm text-[#475569]">
                        A few quick details so we can build your personalised budget.
                    </p>
                </div>

                <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-8 shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="onboarding-name">Full name</label>
                            <input
                                id="onboarding-name"
                                type="text"
                                placeholder="Jane Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Monthly Income (INR) */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="onboarding-income">Monthly income (₹)</label>
                            <input
                                id="onboarding-income"
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="50000.00"
                                value={income}
                                onChange={(e) => setIncome(e.target.value)}
                                required
                            />
                        </div>

                        {/* Risk Appetite */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Set Your Risk Appetite for Investments</label>
                            <p className="text-[10px] text-[#64748b] mb-2 leading-relaxed">
                                Helps MoneyMap AI evaluate if your asset allocation fits your tolerance for volatility.
                            </p>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                {[
                                    { value: "Low", label: "Low Risk", desc: "e.g. FDs, Bonds" },
                                    { value: "Medium", label: "Medium Risk", desc: "e.g. Mutual Funds" },
                                    { value: "High", label: "High Risk", desc: "e.g. Stocks, Growth" },
                                ].map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setRiskAppetite(r.value as "Low" | "Medium" | "High")}
                                        className={[
                                            "flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all text-center",
                                            riskAppetite === r.value
                                                ? "border-[#4f8ef7]/60 bg-[#4f8ef7]/10"
                                                : "border-[#2d3348] bg-[#22263a] hover:border-[#3d4466]",
                                        ].join(" ")}
                                    >
                                        <span className="text-xs font-semibold text-[#f1f5f9]">{r.label}</span>
                                        <span className="text-[9px] text-[#64748b] mt-0.5">{r.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Budget Plan tier */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Choose a budget plan</label>
                            <div className="space-y-2 mt-1">
                                {TIERS.map((t) => (
                                    <label
                                        key={t.value}
                                        className={[
                                            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                                            tier === t.value
                                                ? "border-[#4f8ef7]/60 bg-[#4f8ef7]/10"
                                                : "border-[#2d3348] bg-[#22263a] hover:border-[#3d4466]",
                                        ].join(" ")}
                                    >
                                        <input
                                            type="radio"
                                            name="tier"
                                            value={t.value}
                                            checked={tier === t.value}
                                            onChange={() => setTier(t.value)}
                                            className="sr-only"
                                        />
                                        <span className="text-xl leading-none">{t.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-[#f1f5f9]">{t.label}</span>
                                                <span className="text-xs text-[#475569]">{t.split}</span>
                                            </div>
                                            <p className="text-xs text-[#475569]">{t.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}

                        <button
                            id="onboarding-submit-btn"
                            className="btn btn-primary w-full"
                            type="submit"
                            disabled={loading}
                            style={{ marginTop: "0.5rem" }}
                        >
                            {loading ? <span className="spinner" /> : "Finish setup →"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}