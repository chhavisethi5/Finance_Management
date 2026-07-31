/**
 * Sidebar.tsx — Persistent dark sidebar with navigation
 */

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", icon: "📊", label: "Overview", end: true },
  { to: "/dashboard/transactions", icon: "💸", label: "Transactions" },
  { to: "/dashboard/history", icon: "🕒", label: "History" },
  { to: "/dashboard/budget-planner", icon: "🎯", label: "Budget Planner" },
];

export default function Sidebar() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#0d0f18] border-r border-[#2d3348]">
      {/* ── Branding ── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#2d3348]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8ef7] to-[#6c63ff] text-lg shadow-lg shadow-[#4f8ef7]/30">
          💼
        </div>
        <div>
          <p className="text-sm font-bold text-[#f1f5f9] leading-tight">Smart Finance</p>
          <p className="text-[10px] text-[#475569] font-medium tracking-wide uppercase">Dashboard</p>
        </div>
      </div>

      {/* ── Nav Items ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
          Main Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-gradient-to-r from-[#4f8ef7]/20 to-[#6c63ff]/10 text-[#4f8ef7] border border-[#4f8ef7]/30 shadow-[0_0_12px_rgba(79,142,247,0.12)]"
                  : "text-[#94a3b8] hover:bg-[#1a1d27] hover:text-[#f1f5f9]",
              ].join(" ")
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* ── User + Logout ── */}
      <div className="border-t border-[#2d3348] px-4 py-4 space-y-3">
        {currentUser && (
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8ef7] to-[#a78bfa] text-xs font-bold text-white">
              {(currentUser.name ?? currentUser.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#f1f5f9]">
                {currentUser.name ?? currentUser.email}
              </p>
              <p className="truncate text-[10px] text-[#475569]">{currentUser.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#94a3b8] hover:bg-[#f87171]/10 hover:text-[#f87171] transition-all duration-150"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
