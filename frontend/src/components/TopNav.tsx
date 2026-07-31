/**
 * TopNav.tsx — Top navigation bar for the dashboard layout
 */

import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Your financial snapshot" },
  "/dashboard/transactions": { title: "Transactions", subtitle: "Log and review your spending" },
  "/dashboard/budget-planner": { title: "Budget Planner", subtitle: "Configure your lifestyle tier" },
};

export default function TopNav() {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();
  const page = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#2d3348] bg-[#0f1117]/80 px-6 backdrop-blur-md">
      {/* ── Page Title ── */}
      <div>
        <h2 className="text-base font-bold text-[#f1f5f9] leading-tight">{page.title}</h2>
        <p className="text-xs text-[#475569]">{page.subtitle}</p>
      </div>

      {/* ── Right: date + user badge ── */}
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

        {/* Avatar */}
        {currentUser && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8ef7] to-[#a78bfa] text-xs font-bold text-white shadow-md">
              {currentUser.email.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
