/**
 * LandingPage.tsx — "/"
 *
 * Public marketing page shown before login. Signed-in users are bounced
 * straight to their dashboard (or onboarding, if incomplete).
 */

import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isOnboarded } from "../api";
import { useEffect, useRef, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
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
    Building2,
    Briefcase,
    Gem,
    Calendar,
    MessageSquare,
    Check,
    ChevronRight,
} from "lucide-react";

// Types for components
interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: string;
}

// ── Scroll-Triggered Animation Wrapper ──
function ScrollReveal({ children, className = "", delay = "0ms" }: ScrollRevealProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) {
            observer.observe(ref.current);
        }
        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-out transform ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            } ${className}`}
            style={{ transitionDelay: delay }}
        >
            {children}
        </div>
    );
}

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

// Helper to format currency
const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(val);
};

export default function LandingPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // ── Calculator States ──
    const [monthlySavings, setMonthlySavings] = useState(15000);
    const [expectedReturn, setExpectedReturn] = useState(12);
    const [timeHorizon, setTimeHorizon] = useState(10);

    // ── 3D Dashboard Mockup States ──
    const mockupRef = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);
    const [mockTimeframe, setMockTimeframe] = useState<"1M" | "6M" | "1Y">("6M");

    // ── Feature Spotlight States ──
    const [activeTab, setActiveTab] = useState(0);

    // ── Spotlight Tab 1: Liquid Assets Input ──
    const [mockIncome, setMockIncome] = useState(80000);

    // ── Spotlight Tab 3: Recurring Fixed Expenses Checkboxes ──
    const [expenses, setExpenses] = useState([
        { id: 1, label: "Rent & Housing", amount: 25000, checked: true },
        { id: 2, label: "Broadband & Utilities", amount: 3500, checked: true },
        { id: 3, label: "OTT Subscriptions", amount: 650, checked: true },
        { id: 4, label: "Gym & Health Club", amount: 1500, checked: false },
    ]);

    // ── Spotlight Tab 4: AI chat flow simulation ──
    const [chatStep, setChatStep] = useState(0);
    const [chatTypewriter, setChatTypewriter] = useState("");

    // Restart AI typing simulation when Tab 4 becomes active
    useEffect(() => {
        if (activeTab === 3) {
            setChatStep(0);
            setChatTypewriter("");
            let index = 0;
            const fullText = "I noticed you spent ₹4,200 on dining out this week, which is 15% over your category budget. Let's transfer ₹2,000 to your Emergency Fund to keep you on track.";
            const interval = setInterval(() => {
                setChatTypewriter((prev) => prev + fullText.charAt(index));
                index++;
                if (index >= fullText.length) {
                    clearInterval(interval);
                    setChatStep(1);
                }
            }, 12);
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    if (currentUser) {
        return <Navigate to={isOnboarded(currentUser) ? "/dashboard" : "/onboarding"} replace />;
    }

    // ── Calculation logic for Growth Calculator ──
    const calculateGrowthData = () => {
        const data = [];
        const monthlySavingsNum = Number(monthlySavings);
        const r = expectedReturn / 12 / 100;

        for (let year = 1; year <= timeHorizon; year++) {
            const months = year * 12;
            const principal = monthlySavingsNum * months;
            const futureValue = r === 0 
                ? principal 
                : monthlySavingsNum * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);

            data.push({
                year: `Year ${year}`,
                "Total Saved": Math.round(principal),
                "Future Wealth": Math.round(futureValue),
                "Interest Earned": Math.round(futureValue - principal),
            });
        }
        return data;
    };

    const growthData = calculateGrowthData();
    const finalDataPoint = growthData[growthData.length - 1] || {
        "Total Saved": 0,
        "Future Wealth": 0,
        "Interest Earned": 0,
    };

    // ── Simulated Mockup Chart Data ──
    const getMockupChartData = () => {
        switch (mockTimeframe) {
            case "1M":
                return [
                    { name: "Wk 1", value: 785000 },
                    { name: "Wk 2", value: 799000 },
                    { name: "Wk 3", value: 818000 },
                    { name: "Wk 4", value: 845200 },
                ];
            case "1Y":
                return [
                    { name: "Aug '25", value: 510000 },
                    { name: "Nov '25", value: 600000 },
                    { name: "Feb '26", value: 690000 },
                    { name: "May '26", value: 770000 },
                    { name: "Aug '26", value: 845200 },
                ];
            case "6M":
            default:
                return [
                    { name: "Mar", value: 680000 },
                    { name: "Apr", value: 715000 },
                    { name: "May", value: 752000 },
                    { name: "Jun", value: 801000 },
                    { name: "Jul", value: 845200 },
                ];
        }
    };

    // ── Mouse Move for 3D Tilt Mockup ──
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mockupRef.current) return;
        const rect = mockupRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        // Limit tilt to max 8 degrees
        setRotateX(-(y / (rect.height / 2)) * 8);
        setRotateY((x / (rect.width / 2)) * 8);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#0f1117] text-[#f1f5f9]">
            {/* ── Ambient animated mesh background glow ── */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#4f8ef7]/15 to-[#a78bfa]/5 blur-[130px] animate-mesh-1" />
                <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#7c3aed]/10 to-[#ec4899]/5 blur-[130px] animate-mesh-2" />
                <div className="absolute bottom-10 left-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#34d399]/8 to-[#4f8ef7]/5 blur-[130px] animate-mesh-3" />
            </div>

            {/* ── Top Nav ── */}
            <header className="relative z-50 border-b border-[#2d3348]/60 bg-[#0f1117]/85 backdrop-blur-md">
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
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2d3348] bg-[#1a1d27]/80 px-3.5 py-1 text-xs font-medium text-[#94a3b8] backdrop-blur-sm">
                        <Sparkles size={14} className="text-[#a78bfa]" />
                        Personal finance, minus the spreadsheet
                    </div>

                    <h1 className="bg-gradient-to-r from-[#4f8ef7] via-[#a78bfa] to-[#6c63ff] bg-[length:200%_auto] bg-clip-text text-4xl font-extrabold leading-tight text-transparent animate-gradient-pan sm:text-5xl lg:text-6xl">
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
                            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4f8ef7]/30 transition-transform hover:scale-[1.03]"
                        >
                            Start Tracking Free
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </button>
                        <button
                            onClick={() => navigate("/auth?mode=signin")}
                            className="rounded-xl border border-[#2d3348] px-6 py-3.5 text-sm font-semibold text-[#f1f5f9] transition-colors hover:bg-[#1a1d27]"
                        >
                            I already have an account
                        </button>
                    </div>
                </div>

                {/* ── Interactive 3D Perspective Dashboard Mockup Container ── */}
                <div className="relative z-10 flex items-center justify-center lg:block">
                    <div className="perspective-1000 w-full max-w-xl">
                        <div
                            ref={mockupRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`,
                                transition: "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)",
                            }}
                            className="preserve-3d border border-[#2d3348]/80 bg-[#1e2235]/90 rounded-2xl p-5 shadow-2xl shadow-black/60 relative overflow-hidden backdrop-blur-md"
                        >
                            {/* Glassmorphism ambient sheen */}
                            <div className="absolute -inset-y-12 -inset-x-6 bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-12 translate-x-1/2 pointer-events-none" />

                            {/* Mock Header */}
                            <div className="flex items-center justify-between border-b border-[#2d3348]/60 pb-3.5 mb-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
                                    <span className="ml-2 font-semibold text-[#94a3b8]">MoneyMap Studio v1.2</span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg bg-[#0f1117] p-0.5 border border-[#2d3348]/40">
                                    {(["1M", "6M", "1Y"] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setMockTimeframe(t)}
                                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                                mockTimeframe === t
                                                    ? "bg-[#4f8ef7] text-white"
                                                    : "text-[#475569] hover:text-[#94a3b8]"
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mock Sidebar + Main Content Grid */}
                            <div className="grid grid-cols-12 gap-3.5">
                                {/* Mini Sidebar Mock */}
                                <div className="col-span-2 flex flex-col gap-3.5 border-r border-[#2d3348]/40 pr-3 text-[#475569]">
                                    <div className="h-7 w-7 rounded-lg bg-[#4f8ef7]/10 flex items-center justify-center text-[#4f8ef7]">
                                        <Wallet size={15} />
                                    </div>
                                    <div className="h-7 w-7 rounded-lg bg-[#1a1d27] flex items-center justify-center">
                                        <TrendingUp size={15} />
                                    </div>
                                    <div className="h-7 w-7 rounded-lg bg-[#1a1d27] flex items-center justify-center">
                                        <Target size={15} />
                                    </div>
                                    <div className="h-7 w-7 rounded-lg bg-[#1a1d27] flex items-center justify-center">
                                        <Calendar size={15} />
                                    </div>
                                </div>

                                {/* Mock Content Area */}
                                <div className="col-span-10 flex flex-col gap-3.5">
                                    {/* Widgets Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#0f1117]/80 rounded-xl border border-[#2d3348]/60 p-3 shadow-sm">
                                            <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Net Worth</span>
                                            <div className="text-base font-bold text-white mt-0.5">₹8,45,200</div>
                                            <div className="text-[9px] text-[#34d399] flex items-center gap-0.5 mt-0.5 font-medium">
                                                <TrendingUp size={10} /> +12.4% this month
                                            </div>
                                        </div>
                                        <div className="bg-[#0f1117]/80 rounded-xl border border-[#2d3348]/60 p-3 shadow-sm">
                                            <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Investments</span>
                                            <div className="text-base font-bold text-[#a78bfa] mt-0.5">₹6,35,200</div>
                                            <div className="text-[9px] text-[#a78bfa]/80 flex items-center gap-0.5 mt-0.5">
                                                Active Portfolio
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mock Chart displaying live selectable timeframe */}
                                    <div className="bg-[#0f1117]/80 rounded-xl border border-[#2d3348]/60 p-3 flex-1 flex flex-col min-h-[140px]">
                                        <span className="text-[10px] text-[#94a3b8] font-medium mb-1">Asset Value Over Time</span>
                                        <div className="w-full flex-1">
                                            <ResponsiveContainer width="100%" height={110}>
                                                <AreaChart data={getMockupChartData()}>
                                                    <defs>
                                                        <linearGradient id="mockupChartGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.25} />
                                                            <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Tooltip
                                                        contentStyle={{
                                                            background: "#1e2235",
                                                            border: "1px solid #2d3348",
                                                            borderRadius: "6px",
                                                            fontSize: "10px",
                                                        }}
                                                        formatter={(value: any) => [formatINR(Number(value)), "Value"]}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke="#4f8ef7"
                                                        strokeWidth={2}
                                                        fillOpacity={1}
                                                        fill="url(#mockupChartGrad)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Mock Goal Progress */}
                                    <div className="bg-[#0f1117]/80 rounded-xl border border-[#2d3348]/60 p-3">
                                        <div className="flex items-center justify-between text-[10px] text-[#94a3b8] mb-1">
                                            <span>Emergency Fund Target</span>
                                            <span className="font-semibold text-white">68% Achieved</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#1e2235] rounded-full overflow-hidden">
                                            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#34d399] to-[#059669]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Interactive ROI / Savings Growth Calculator Widget ── */}
            <section className="relative z-10 border-t border-[#2d3348]/40 bg-[#161925]/60 py-24 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-6">
                    <ScrollReveal>
                        <div className="text-center mb-16">
                            <span className="bg-gradient-to-r from-[#4f8ef7] to-[#a78bfa] bg-clip-text text-xs font-bold uppercase tracking-wider text-transparent">
                                Live Interactive Forecast
                            </span>
                            <h2 className="mt-2 text-3xl font-extrabold text-[#f1f5f9] sm:text-4xl">
                                Visualize your money grow
                            </h2>
                            <p className="mx-auto mt-4 max-w-xl text-sm text-[#94a3b8]">
                                Adjust the parameters to see the compounding effect of automated savings and intelligent investment strategies in real-time.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-stretch">
                        {/* Sliders Card */}
                        <ScrollReveal className="lg:col-span-5 flex" delay="150ms">
                            <div className="w-full bg-[#1e2235]/80 border border-[#2d3348]/70 rounded-2xl p-6 flex flex-col justify-between shadow-card">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <SlidersHorizontal size={18} className="text-[#4f8ef7]" />
                                        Interactive Controls
                                    </h3>

                                    {/* Monthly Savings */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm font-semibold mb-2">
                                            <span className="text-[#94a3b8]">Monthly Savings</span>
                                            <span className="text-[#4f8ef7]">{formatINR(monthlySavings)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="150000"
                                            step="1000"
                                            value={monthlySavings}
                                            onChange={(e) => setMonthlySavings(Number(e.target.value))}
                                            className="w-full h-1.5 bg-[#0f1117] rounded-lg appearance-none cursor-pointer accent-[#4f8ef7]"
                                        />
                                        <div className="flex justify-between text-[10px] text-[#475569] mt-1 font-medium">
                                            <span>₹1k</span>
                                            <span>₹75k</span>
                                            <span>₹1.5L</span>
                                        </div>
                                    </div>

                                    {/* Expected Return Rate */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm font-semibold mb-2">
                                            <span className="text-[#94a3b8]">Expected Return Rate</span>
                                            <span className="text-[#34d399]">{expectedReturn}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="2"
                                            max="25"
                                            step="0.5"
                                            value={expectedReturn}
                                            onChange={(e) => setExpectedReturn(Number(e.target.value))}
                                            className="w-full h-1.5 bg-[#0f1117] rounded-lg appearance-none cursor-pointer accent-[#34d399]"
                                        />
                                        <div className="flex justify-between text-[10px] text-[#475569] mt-1 font-medium">
                                            <span>2% (Savings Account)</span>
                                            <span>12% (Index Fund)</span>
                                            <span>25% (High Growth)</span>
                                        </div>
                                    </div>

                                    {/* Time Horizon */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm font-semibold mb-2">
                                            <span className="text-[#94a3b8]">Time Horizon</span>
                                            <span className="text-[#a78bfa]">{timeHorizon} Years</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="30"
                                            step="1"
                                            value={timeHorizon}
                                            onChange={(e) => setTimeHorizon(Number(e.target.value))}
                                            className="w-full h-1.5 bg-[#0f1117] rounded-lg appearance-none cursor-pointer accent-[#a78bfa]"
                                        />
                                        <div className="flex justify-between text-[10px] text-[#475569] mt-1 font-medium">
                                            <span>1 Year</span>
                                            <span>15 Years</span>
                                            <span>30 Years</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#2d3348]/60 pt-5 mt-4">
                                    <span className="text-[11px] text-[#475569] block leading-relaxed">
                                        *Calculations compounded monthly based on monthly contributions. Historical indices return rate averages 12-15% annually.
                                    </span>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Chart & Results Cards */}
                        <ScrollReveal className="lg:col-span-7 flex flex-col gap-6" delay="300ms">
                            {/* Growth Visual Chart */}
                            <div className="bg-[#1e2235]/80 border border-[#2d3348]/70 rounded-2xl p-5 flex-1 flex flex-col shadow-card">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">Compound Growth Curve</h4>
                                    <div className="flex gap-4 text-xs font-semibold text-[#94a3b8]">
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#4f8ef7]" /> Principal</span>
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#a78bfa]" /> Compound Wealth</span>
                                    </div>
                                </div>

                                <div className="w-full h-[240px] md:h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.0} />
                                                </linearGradient>
                                                <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} />
                                            <YAxis stroke="#475569" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                                            <Tooltip
                                                contentStyle={{
                                                    background: "#1e2235",
                                                    border: "1px solid #2d3348",
                                                    borderRadius: "10px",
                                                    fontSize: "12px",
                                                }}
                                                formatter={(value: any) => [formatINR(Number(value)), ""]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="Total Saved"
                                                stroke="#4f8ef7"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#savedGrad)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="Future Wealth"
                                                stroke="#a78bfa"
                                                strokeWidth={2.5}
                                                fillOpacity={1}
                                                fill="url(#wealthGrad)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Summary Metrics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#1e2235]/60 border border-[#2d3348]/60 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                                    <span className="text-xs text-[#94a3b8] font-medium">Total Saved</span>
                                    <div className="text-xl font-bold text-white mt-1">
                                        {formatINR(finalDataPoint["Total Saved"])}
                                    </div>
                                    <span className="text-[10px] text-[#475569] block mt-0.5">Your contributions</span>
                                </div>
                                <div className="bg-[#1e2235]/60 border border-[#2d3348]/60 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                                    <span className="text-xs text-[#94a3b8] font-medium">Interest Gained</span>
                                    <div className="text-xl font-bold text-[#34d399] mt-1">
                                        {formatINR(finalDataPoint["Interest Earned"])}
                                    </div>
                                    <span className="text-[10px] text-[#34d399]/85 block mt-0.5">Wealth generated</span>
                                </div>
                                <div className="bg-[#1e2235]/60 border border-[#2d3348]/60 rounded-xl p-4 shadow-sm backdrop-blur-sm ring-1 ring-[#a78bfa]/20">
                                    <span className="text-xs text-[#a78bfa] font-medium">Future Value</span>
                                    <div className="text-xl font-extrabold text-transparent bg-gradient-to-r from-white to-[#a78bfa] bg-clip-text mt-1">
                                        {formatINR(finalDataPoint["Future Wealth"])}
                                    </div>
                                    <span className="text-[10px] text-[#a78bfa]/85 block mt-0.5">With MoneyMap</span>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* ── Feature Spotlight Tabs (Interactive Showcase) ── */}
            <section className="relative z-10 py-24 mx-auto max-w-7xl px-6">
                <ScrollReveal>
                    <div className="text-center mb-16">
                        <span className="bg-gradient-to-r from-[#34d399] to-[#4f8ef7] bg-clip-text text-xs font-bold uppercase tracking-wider text-transparent">
                            Platform Tour
                        </span>
                        <h2 className="mt-2 text-3xl font-extrabold text-[#f1f5f9] sm:text-4xl">
                            Core pillars of the dashboard
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-sm text-[#94a3b8]">
                            MoneyMap combines assets tracking, budget rules, auto-deductions and AI advisor actions in a unified feed. Explore the showcase below.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
                    {/* Tabs Selector list */}
                    <ScrollReveal className="lg:col-span-5 flex flex-col gap-4" delay="150ms">
                        {[
                            {
                                index: 0,
                                title: "Liquid Assets & Initial Savings",
                                desc: "Setup emergency targets, log liquid cash deposits, and balance core checking accounts instantly.",
                                badge: "Budget Setup",
                            },
                            {
                                index: 1,
                                title: "Investment Portfolio",
                                desc: "Log property portfolios, stock tickets, mutual funds and gold. Visual distribution tracks your risk diversity.",
                                badge: "Multi-Asset",
                            },
                            {
                                index: 2,
                                title: "Recurring Fixed Expenses",
                                desc: "List automatic subscriptions, bills and recurring debts to compute your exact Safe-to-Spend balance.",
                                badge: "Cash Flow",
                            },
                            {
                                index: 3,
                                title: "MoneyMap AI Advisor",
                                desc: "Receive automated alerts, category anomalies, and recommendation triggers to auto-invest spare change.",
                                badge: "AI Powered",
                            },
                        ].map((t) => (
                            <button
                                key={t.index}
                                onClick={() => setActiveTab(t.index)}
                                className={`text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-1.5 ${
                                    activeTab === t.index
                                        ? "bg-[#1e2235] border-[#4f8ef7]/60 shadow-glow"
                                        : "bg-[#1a1d27]/40 border-[#2d3348]/60 hover:bg-[#1a1d27]/70 hover:border-[#2d3348]"
                                }`}
                            >
                                {activeTab === t.index && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4f8ef7] to-[#6c63ff]" />
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4f8ef7] bg-[#4f8ef7]/10 px-2 py-0.5 rounded-md">
                                        {t.badge}
                                    </span>
                                    <ChevronRight size={14} className={`transition-transform duration-300 ${activeTab === t.index ? "translate-x-1 text-white" : "text-[#475569]"}`} />
                                </div>
                                <h3 className="text-base font-bold text-white mt-1">{t.title}</h3>
                                <p className="text-xs text-[#94a3b8] leading-relaxed">{t.desc}</p>
                            </button>
                        ))}
                    </ScrollReveal>

                    {/* Interactive Tab Showcase Display Pane */}
                    <ScrollReveal className="lg:col-span-7" delay="300ms">
                        <div className="bg-[#1e2235]/90 border border-[#2d3348]/80 rounded-3xl p-6 min-h-[360px] flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-sm">
                            {/* Inner Grid Showcase depending on Active Tab */}

                            {activeTab === 0 && (
                                <div className="flex flex-col gap-6 flex-1 justify-between">
                                    <div>
                                        <div className="flex items-center gap-2.5 text-[#4f8ef7] mb-3">
                                            <Wallet size={20} />
                                            <h4 className="font-bold text-white">Liquid Assets Allocator</h4>
                                        </div>
                                        <p className="text-xs text-[#94a3b8] leading-relaxed mb-6">
                                            Split your income using standard allocation rules (50-30-20 rule). Change the income value below to watch allocations calculate instantly.
                                        </p>

                                        {/* Mock Input Slider */}
                                        <div className="bg-[#0f1117] rounded-xl p-4 border border-[#2d3348]/70 mb-5">
                                            <div className="flex justify-between text-xs font-semibold mb-2">
                                                <span className="text-[#94a3b8]">Monthly Income</span>
                                                <span className="text-white text-sm font-bold">{formatINR(mockIncome)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="30000"
                                                max="250000"
                                                step="5000"
                                                value={mockIncome}
                                                onChange={(e) => setMockIncome(Number(e.target.value))}
                                                className="w-full h-1 bg-[#1e2235] rounded-lg appearance-none cursor-pointer accent-[#4f8ef7]"
                                            />
                                        </div>

                                        {/* Result allocation stacks */}
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <div className="flex justify-between text-xs text-[#94a3b8] mb-1.5 font-medium">
                                                    <span>Needs (50%) - Rent, bills, food</span>
                                                    <span className="font-bold text-white">{formatINR(mockIncome * 0.5)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-[#0f1117] rounded-full overflow-hidden">
                                                    <div className="h-full w-[50%] rounded-full bg-[#4f8ef7]" />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs text-[#94a3b8] mb-1.5 font-medium">
                                                    <span>Wants (30%) - Travel, entertainment</span>
                                                    <span className="font-bold text-white">{formatINR(mockIncome * 0.3)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-[#0f1117] rounded-full overflow-hidden">
                                                    <div className="h-full w-[30%] rounded-full bg-[#a78bfa]" />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs text-[#94a3b8] mb-1.5 font-medium">
                                                    <span>Savings & Debt (20%) - Future building</span>
                                                    <span className="font-bold text-[#34d399]">{formatINR(mockIncome * 0.2)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-[#0f1117] rounded-full overflow-hidden">
                                                    <div className="h-full w-[20%] rounded-full bg-[#34d399]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-[#475569] pt-4 border-t border-[#2d3348]/40">
                                        💡 MoneyMap automatically splits bank deposits using these custom rules.
                                    </div>
                                </div>
                            )}

                            {activeTab === 1 && (
                                <div className="flex flex-col gap-5 flex-1 justify-between">
                                    <div>
                                        <div className="flex items-center gap-2.5 text-[#a78bfa] mb-3">
                                            <Building2 size={20} />
                                            <h4 className="font-bold text-white">Investment Distribution Tracker</h4>
                                        </div>
                                        <p className="text-xs text-[#94a3b8] leading-relaxed mb-5">
                                            Interactive view of your assets ledger. Hover or review the allocations below:
                                        </p>

                                        {/* Interactive asset grid */}
                                        <div className="grid grid-cols-2 gap-3.5">
                                            {[
                                                { label: "Property Portfolio", value: "₹4,20,000", pct: "42%", icon: Building2, color: "text-[#4f8ef7]", bg: "bg-[#4f8ef7]/10" },
                                                { label: "Equity & Mutual Funds", value: "₹3,10,000", pct: "31%", icon: Briefcase, color: "text-[#34d399]", bg: "bg-[#34d399]/10" },
                                                { label: "Precious Metals (Gold)", value: "₹1,50,000", pct: "15%", icon: Gem, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
                                                { label: "Cash & Liquid", value: "₹1,20,000", pct: "12%", icon: Wallet, color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10" },
                                            ].map((asset) => (
                                                <div
                                                    key={asset.label}
                                                    className="bg-[#0f1117] border border-[#2d3348]/75 rounded-xl p-3.5 flex items-center gap-3.5 transition-all duration-300 hover:border-[#4f8ef7]/50 hover:shadow-glow group"
                                                >
                                                    <div className={`h-9 w-9 rounded-lg ${asset.bg} flex items-center justify-center ${asset.color} group-hover:scale-105 transition-transform`}>
                                                        <asset.icon size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[10px] text-[#475569] font-semibold uppercase block truncate">{asset.label}</span>
                                                        <div className="text-sm font-bold text-white mt-0.5">{asset.value}</div>
                                                        <span className="text-[9px] text-[#94a3b8] mt-0.5 inline-block bg-[#1a1d27] px-1.5 py-0.5 rounded font-medium">{asset.pct} share</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-[#475569] pt-4 border-t border-[#2d3348]/40">
                                        💡 Integrate properties and stocks API to automatically sync valuations.
                                    </div>
                                </div>
                            )}

                            {activeTab === 2 && (
                                <div className="flex flex-col gap-6 flex-1 justify-between">
                                    <div>
                                        <div className="flex items-center gap-2.5 text-[#fbbf24] mb-3">
                                            <Calendar size={20} />
                                            <h4 className="font-bold text-white">Interactive Expense Scheduler</h4>
                                        </div>
                                        <p className="text-xs text-[#94a3b8] leading-relaxed mb-5">
                                            Checkbox items represent auto-deducted expenses. Toggle them on/off to watch your Safe-to-Spend balance recalculate.
                                        </p>

                                        {/* Checklist elements */}
                                        <div className="flex flex-col gap-2.5 mb-5">
                                            {expenses.map((exp) => (
                                                <label
                                                    key={exp.id}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                                        exp.checked
                                                            ? "bg-[#0f1117] border-[#fbbf24]/50"
                                                            : "bg-[#161925]/30 border-[#2d3348]/50 hover:bg-[#1a1d27]/40"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={exp.checked}
                                                            onChange={() =>
                                                                setExpenses(
                                                                    expenses.map((e) =>
                                                                        e.id === exp.id ? { ...e, checked: !e.checked } : e
                                                                    )
                                                                )
                                                            }
                                                            className="rounded border-[#2d3348] text-[#fbbf24] focus:ring-[#fbbf24] h-4 w-4 bg-[#0f1117]"
                                                        />
                                                        <span className="text-xs font-semibold text-[#f1f5f9]">{exp.label}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-white">{formatINR(exp.amount)}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {/* Output Calculation */}
                                        <div className="bg-gradient-to-r from-[#fbbf24]/10 to-[#fbbf24]/5 border border-[#fbbf24]/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                            <div>
                                                <span className="text-[10px] text-[#fbbf24] font-bold uppercase tracking-wider">Remaining Safe-To-Spend</span>
                                                <div className="text-lg font-bold text-white mt-0.5">
                                                    {formatINR(
                                                        50000 -
                                                            expenses
                                                                .filter((e) => e.checked)
                                                                .reduce((sum, e) => sum + e.amount, 0)
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-[#94a3b8] font-medium bg-[#0f1117] px-2.5 py-1 rounded-md border border-[#2d3348]">
                                                Monthly remainder
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-[#475569] pt-4 border-t border-[#2d3348]/40">
                                        💡 MoneyMap links with SMS and bank alerts to map recurring schedules automatically.
                                    </div>
                                </div>
                            )}

                            {activeTab === 3 && (
                                <div className="flex flex-col gap-6 flex-1 justify-between">
                                    <div>
                                        <div className="flex items-center gap-2.5 text-[#34d399] mb-3">
                                            <MessageSquare size={20} />
                                            <h4 className="font-bold text-white">MoneyMap AI Assistant</h4>
                                        </div>

                                        {/* Simulated Chat Interface */}
                                        <div className="flex flex-col gap-4 bg-[#0f1117] rounded-2xl p-4 border border-[#2d3348]/70 min-h-[190px] justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#34d399] to-[#059669] flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                    AI
                                                </div>
                                                <div className="bg-[#1a1d27] border border-[#2d3348]/60 rounded-2xl p-3 text-xs leading-relaxed max-w-[85%] text-[#f1f5f9]">
                                                    {chatTypewriter}
                                                    {chatStep === 0 && (
                                                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-white animate-pulse" />
                                                    )}
                                                </div>
                                            </div>

                                            {chatStep === 1 && (
                                                <div className="flex gap-2 justify-end animate-fade-in-up mt-2">
                                                    <button
                                                        onClick={() => setChatStep(2)}
                                                        className="bg-[#34d399] text-[#0f1117] font-bold px-3 py-1.5 rounded-lg text-[10px] hover:bg-[#34d399]/85 transition-colors"
                                                    >
                                                        Approve Transfer
                                                    </button>
                                                    <button
                                                        onClick={() => setChatStep(3)}
                                                        className="border border-[#2d3348] text-[#94a3b8] px-3 py-1.5 rounded-lg text-[10px] hover:bg-[#1a1d27] transition-colors"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            )}

                                            {chatStep === 2 && (
                                                <div className="flex flex-col gap-4 animate-fade-in-up">
                                                    <div className="flex justify-end items-center gap-1.5 text-xs text-[#34d399] font-bold">
                                                        <Check size={14} /> Approved Transfer
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#34d399] to-[#059669] flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                            AI
                                                        </div>
                                                        <div className="bg-[#1a1d27] border border-[#2d3348]/60 rounded-2xl p-3 text-xs leading-relaxed max-w-[85%] text-[#f1f5f9]">
                                                            Excellent choice! Transfer processed. I have updated your emergency reserve dashboard widget. Your savings velocity has increased by 5.2%.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {chatStep === 3 && (
                                                <div className="flex flex-col gap-4 animate-fade-in-up">
                                                    <div className="flex justify-end items-center gap-1.5 text-xs text-[#475569] font-medium">
                                                        Dismissed recommendation
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#34d399] to-[#059669] flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                            AI
                                                        </div>
                                                        <div className="bg-[#1a1d27] border border-[#2d3348]/60 rounded-2xl p-3 text-xs leading-relaxed max-w-[85%] text-[#f1f5f9]">
                                                            No problem. I will leave this category budget as is. Feel free to ask me questions anytime.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-[#475569] pt-4 border-t border-[#2d3348]/40 flex justify-between items-center">
                                        <span>💡 Tap 'Approve Transfer' to simulate action.</span>
                                        {chatStep > 1 && (
                                            <button
                                                onClick={() => {
                                                    setChatStep(0);
                                                    setChatTypewriter("");
                                                    // restart effect
                                                    setActiveTab(0);
                                                    setTimeout(() => setActiveTab(3), 50);
                                                }}
                                                className="text-[9px] text-[#4f8ef7] hover:underline"
                                            >
                                                Reset Demo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ── Features Grid ── */}
            <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 border-t border-[#2d3348]/40">
                <ScrollReveal>
                    <div className="mb-14 text-center">
                        <span className="bg-gradient-to-r from-[#fbbf24] to-[#ec4899] bg-clip-text text-xs font-bold uppercase tracking-wider text-transparent">
                            Platform Features
                        </span>
                        <h2 className="mt-2 text-3xl font-bold text-[#f1f5f9] sm:text-4xl">
                            Everything you need to stay on top of your money
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-[#94a3b8] sm:text-base">
                            Five focused tools, one dashboard. No clutter, no guesswork.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature, i) => (
                        <ScrollReveal key={feature.title} delay={`${i * 100}ms`}>
                            <div className="group rounded-2xl border border-[#2d3348]/70 bg-[#1e2235]/70 p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-[#4f8ef7]/50 hover:shadow-glow min-h-[190px] flex flex-col justify-between">
                                <div>
                                    <div
                                        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} shadow-md transition-transform duration-300 group-hover:scale-110`}
                                    >
                                        <feature.icon size={20} className="text-white" />
                                    </div>
                                    <h3 className="mb-2 text-base font-bold text-[#f1f5f9]">{feature.title}</h3>
                                    <p className="text-xs leading-relaxed text-[#94a3b8]">{feature.description}</p>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            {/* ── Step-by-Step User Flow ── */}
            <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 border-t border-[#2d3348]/40">
                <ScrollReveal>
                    <div className="mb-14 text-center">
                        <span className="bg-gradient-to-r from-[#4f8ef7] to-[#34d399] bg-clip-text text-xs font-bold uppercase tracking-wider text-transparent">
                            Workflow
                        </span>
                        <h2 className="mt-2 text-3xl font-bold text-[#f1f5f9] sm:text-4xl">How MoneyMap works</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-[#94a3b8] sm:text-base">
                            Four steps between "just signed up" and "in control of my money."
                        </p>
                    </div>
                </ScrollReveal>

                <div className="relative grid grid-cols-1 gap-8 md:grid-cols-4">
                    {/* connecting line, desktop only */}
                    <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-[#2d3348]/70 to-transparent md:block" />

                    {STEPS.map((step, i) => (
                        <ScrollReveal key={step.title} className="relative flex flex-col items-center text-center" delay={`${i * 100}ms`}>
                            <div className="relative z-10 mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[#2d3348] bg-[#1e2235] shadow-card group hover:border-[#4f8ef7]/50 hover:shadow-glow transition-all duration-300">
                                <step.icon size={26} className="text-[#4f8ef7]" />
                            </div>
                            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#4f8ef7]">
                                {step.label}
                            </span>
                            <h3 className="mb-2 text-sm font-semibold text-[#f1f5f9]">{step.title}</h3>
                            <p className="max-w-[220px] text-xs leading-relaxed text-[#94a3b8]">
                                {step.description}
                            </p>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            {/* ── Footer / CTA ── */}
            <footer className="relative z-10 border-t border-[#2d3348]/60 bg-[#0c0e14]">
                <div className="mx-auto max-w-4xl px-6 py-20 text-center">
                    <ScrollReveal>
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
                    </ScrollReveal>

                    <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#2d3348]/40 pt-8 text-xs text-[#475569] sm:flex-row">
                        <span>© {new Date().getFullYear()} MoneyMap. All rights reserved.</span>
                        <span>Track smarter. Spend better.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}