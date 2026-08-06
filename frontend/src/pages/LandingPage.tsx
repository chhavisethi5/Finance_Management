/**
 * LandingPage.tsx — "/"
 *
 * Public marketing page shown before login. Signed-in users are bounced
 * straight to their dashboard (or onboarding, if incomplete).
 */

import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isOnboarded } from "../api";
import {
    PiggyBank,
    ShieldCheck,
    Target,
    Tags,
    Sparkles,
    ArrowRight,
    UserPlus,
    SlidersHorizontal,
    ListChecks,
    Rocket,
    TrendingUp,
    Wallet,
} from "lucide-react";

const FEATURES = [
    {
        icon: PiggyBank,
        title: "Smart Budget Planning",
        description:
            "Set a monthly income and let MoneyMap split it into a budget plan that actually fits how you spend.",
        accent: "from-[#4f8ef7] to-[#6c63ff]",
    },
    {
        icon: ShieldCheck,
        title: "Emergency Fund Tracking",
        description:
            "Build a safety net alongside your regular budget and watch it grow toward a target you set.",
        accent: "from-[#34d399] to-[#059669]",
    },
    {
        icon: Target,
        title: "Goal-Based Milestones",
        description:
            "Turn big purchases and savings targets into milestones with progress bars that keep you honest.",
        accent: "from-[#a78bfa] to-[#7c3aed]",
    },
    {
        icon: Tags,
        title: "Dynamic Category Tracking",
        description:
            "Log income and expenses under custom categories, and see exactly where every rupee goes.",
        accent: "from-[#fbbf24] to-[#d97706]",
    },
    {
        icon: TrendingUp,
        title: "Investments Portfolio Tracker",
        description:
            "Log and track your portfolio across property, precious metals, stocks, and mutual funds, with a clear history view.",
        accent: "from-[#ec4899] to-[#be185d]",
    },
    {
        icon: Sparkles,
        title: "Automated Insights",
        description:
            "MoneyMap reads your transaction history and surfaces the patterns worth acting on, automatically.",
        accent: "from-[#f87171] to-[#dc2626]",
    },
];

const STEPS = [
    {
        icon: UserPlus,
        label: "Step 1",
        title: "Sign Up & Set Income",
        description: "Create your account and define your recurring monthly income.",
    },
    {
        icon: SlidersHorizontal,
        label: "Step 2",
        title: "Choose Budget Split",
        description: "Pick a standard or customized allocation rule for your needs and wants.",
    },
    {
        icon: ListChecks,
        label: "Step 3",
        title: "Map Assets & Track Investments",
        description: "Log past portfolios and new investments to map your liquid assets accurately.",
    },
    {
        icon: Rocket,
        label: "Step 4",
        title: "Grow Your Wealth",
        description: "Analyze combined asset metrics and execute goals using automated savings insights.",
    },
];

export default function LandingPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    if (currentUser) {
        return <Navigate to={isOnboarded(currentUser) ? "/dashboard" : "/onboarding"} replace />;
    }

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#0f1117] text-[#f1f5f9]">
            {/* ── Ambient background glow ── */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#4f8ef7]/10 blur-[120px]" />
                <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-[#a78bfa]/10 blur-[120px]" />
                <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-[#34d399]/5 blur-[120px]" />
            </div>

            {/* ── Top Nav ── */}
            <header className="relative z-10 border-b border-[#2d3348]/60 bg-[#0f1117]/80 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8ef7] to-[#6c63ff] text-lg shadow-lg shadow-[#4f8ef7]/30">
                            💼
                        </div>
                        <span className="bg-gradient-to-r from-[#4f8ef7] to-[#a78bfa] bg-clip-text text-xl font-bold text-transparent">
                            MoneyMap
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/auth?mode=signin")}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#94a3b8] transition-colors hover:text-[#f1f5f9]"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate("/auth?mode=signup")}
                            className="rounded-lg bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#4f8ef7]/25 transition-transform hover:scale-[1.03]"
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Hero ── */}
            <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
                <div className="animate-fade-in-up">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2d3348] bg-[#1a1d27] px-3 py-1 text-xs font-medium text-[#94a3b8]">
                        <Sparkles size={14} className="text-[#a78bfa]" />
                        Personal finance, minus the spreadsheet
                    </div>

                    <h1 className="bg-gradient-to-r from-[#4f8ef7] via-[#a78bfa] to-[#4f8ef7] bg-[length:200%_auto] bg-clip-text text-4xl font-extrabold leading-tight text-transparent animate-gradient-pan sm:text-5xl lg:text-6xl">
                        Track smarter.
                        <br />
                        Spend better.
                    </h1>

                    <p className="mt-6 max-w-lg text-base leading-relaxed text-[#94a3b8] sm:text-lg">
                        A personal finance platform that helps you budget, save, analyze
                        spending, and achieve financial goals with intelligent insights.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <button
                            onClick={() => navigate("/auth?mode=signup")}
                            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4f8ef7]/30 transition-transform hover:scale-[1.03]"
                        >
                            Start Tracking Free
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </button>
                        <button
                            onClick={() => navigate("/auth?mode=signin")}
                            className="rounded-xl border border-[#2d3348] px-6 py-3 text-sm font-semibold text-[#f1f5f9] transition-colors hover:bg-[#1a1d27]"
                        >
                            I already have an account
                        </button>
                    </div>
                </div>

                {/* Floating dashboard mockup cards */}
                <div className="relative mx-auto hidden h-[420px] w-full max-w-md animate-fade-in-up [animation-delay:150ms] lg:block">
                    <div
                        className="absolute left-4 top-6 w-64 animate-float rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-2xl shadow-black/40"
                        style={{ ["--tilt" as string]: "-3deg" }}
                    >
                        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                            <span>Total Balance</span>
                            <Wallet size={14} className="text-[#4f8ef7]" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[#f1f5f9]">₹1,24,500</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-[#34d399]">
                            <TrendingUp size={12} /> +12.4% this month
                        </div>
                    </div>

                    <div
                        className="absolute right-2 top-40 w-56 animate-float-slow rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-2xl shadow-black/40"
                        style={{ ["--tilt" as string]: "2deg" }}
                    >
                        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                            <span>Emergency Fund</span>
                            <ShieldCheck size={14} className="text-[#34d399]" />
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0f1117]">
                            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#34d399] to-[#059669]" />
                        </div>
                        <div className="mt-2 text-xs text-[#94a3b8]">₹68,000 of ₹1,00,000</div>
                    </div>

                    <div
                        className="absolute bottom-4 left-10 w-60 animate-float rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-2xl shadow-black/40 [animation-delay:1.2s]"
                        style={{ ["--tilt" as string]: "3deg" }}
                    >
                        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                            <span>Goal: New Laptop</span>
                            <Target size={14} className="text-[#a78bfa]" />
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0f1117]">
                            <div className="h-full w-[40%] rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed]" />
                        </div>
                        <div className="mt-2 text-xs text-[#94a3b8]">₹40,000 of ₹1,00,000</div>
                    </div>
                </div>
            </section>

            {/* ── Features Grid ── */}
            <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-bold text-[#f1f5f9] sm:text-4xl">
                        Everything you need to stay on top of your money
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-[#94a3b8] sm:text-base">
                        Five focused tools, one dashboard. No clutter, no guesswork.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="group rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-[#4f8ef7]/50 hover:shadow-glow"
                        >
                            <div
                                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} shadow-md transition-transform duration-300 group-hover:scale-110`}
                            >
                                <feature.icon size={20} className="text-white" />
                            </div>
                            <h3 className="mb-2 text-base font-semibold text-[#f1f5f9]">{feature.title}</h3>
                            <p className="text-sm leading-relaxed text-[#94a3b8]">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Step-by-Step User Flow ── */}
            <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
                <div className="mb-14 text-center">
                    <h2 className="text-3xl font-bold text-[#f1f5f9] sm:text-4xl">How MoneyMap works</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-[#94a3b8] sm:text-base">
                        Four steps between "just signed up" and "in control of my money."
                    </p>
                </div>

                <div className="relative grid grid-cols-1 gap-8 md:grid-cols-4">
                    {/* connecting line, desktop only */}
                    <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-[#2d3348] to-transparent md:block" />

                    {STEPS.map((step) => (
                        <div key={step.title} className="relative flex flex-col items-center text-center">
                            <div className="relative z-10 mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[#2d3348] bg-[#1e2235] shadow-card">
                                <step.icon size={26} className="text-[#4f8ef7]" />
                            </div>
                            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#4f8ef7]">
                                {step.label}
                            </span>
                            <h3 className="mb-2 text-sm font-semibold text-[#f1f5f9]">{step.title}</h3>
                            <p className="max-w-[220px] text-xs leading-relaxed text-[#94a3b8]">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Footer / CTA ── */}
            <footer className="relative z-10 border-t border-[#2d3348]/60">
                <div className="mx-auto max-w-4xl px-6 py-20 text-center">
                    <h2 className="text-2xl font-bold text-[#f1f5f9] sm:text-3xl">
                        Ready to take control of your money?
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm text-[#94a3b8]">
                        Set up your first budget in under two minutes. No credit card required.
                    </p>
                    <button
                        onClick={() => navigate("/auth?mode=signup")}
                        className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4f8ef7]/30 transition-transform hover:scale-[1.03]"
                    >
                        Create Your Free Account
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </button>

                    <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#2d3348]/60 pt-8 text-xs text-[#475569] sm:flex-row">
                        <span>© {new Date().getFullYear()} MoneyMap. All rights reserved.</span>
                        <span>Track smarter. Spend better.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}