/**
 * TopNav.tsx — Top navigation bar for the dashboard layout
 */

import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, User, LogOut, ChevronDown } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Your financial snapshot" },
  "/dashboard/transactions": { title: "Transactions", subtitle: "Log and review your spending" },
  "/dashboard/history": { title: "History", subtitle: "Log and review your spending" },
  "/dashboard/investments": { title: "Investments", subtitle: "Grow your wealth" },
  "/dashboard/budget-planner": { title: "Budget Planner", subtitle: "Configure your lifestyle tier" },
  "/dashboard/ai-advisor": { title: "AI Advisor", subtitle: "Get tailored financial advice" },
};

interface TopNavProps {
  onOpenMobileSidebar: () => void;
  onOpenProfileSettings: () => void;
}

export default function TopNav({ onOpenMobileSidebar, onOpenProfileSettings }: TopNavProps) {
  const { pathname } = useLocation();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const page = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleLogout = () => {
    navigate("/");
    setTimeout(() => {
      logout();
    }, 100);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#2d3348] bg-[#0f1117]/80 px-4 sm:px-6 backdrop-blur-md">
      {/* ── Mobile menu button + Page Title ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#1a1d27] hover:text-[#f1f5f9] transition-colors lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-base font-bold text-[#f1f5f9] leading-tight">{page.title}</h2>
          <p className="text-xs text-[#475569]">{page.subtitle}</p>
        </div>
      </div>

      {/* ── Right: date + user badge/dropdown ── */}
      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-xs text-[#475569]">{now}</span>

        {/* Notification bell placeholder */}
        <button
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#475569] hover:bg-[#1a1d27] hover:text-[#94a3b8] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Avatar & Dropdown */}
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none group"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8ef7] to-[#a78bfa] text-xs font-bold text-white shadow-md transition-transform group-hover:scale-105">
                {(currentUser.name ?? currentUser.email).charAt(0).toUpperCase()}
              </div>
              <ChevronDown className={`h-3 w-3 text-[#64748b] transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-[#2d3348] bg-[#1a1d27] p-1.5 shadow-2xl ring-1 ring-black/5 animate-scale-up">
                {/* User info */}
                <div className="px-3 py-2 border-b border-[#2d3348] mb-1">
                  <p className="truncate text-xs font-bold text-[#f1f5f9]">
                    {currentUser.name ?? "User"}
                  </p>
                  <p className="truncate text-[10px] text-[#64748b]">{currentUser.email}</p>
                </div>

                {/* Actions */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenProfileSettings();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#cbd5e1] hover:bg-[#252a3e] hover:text-[#4f8ef7] transition-all"
                >
                  <User className="h-3.5 w-3.5 text-[#4f8ef7]" />
                  Manage Profile & Baselines
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

