/**
 * DashboardLayout.tsx — Main layout shell
 *
 * Protected route: redirects to /auth if no user is logged in.
 * Renders: Sidebar (left, collapsible) + TopNav (top) + page content (right/main).
 */

import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isOnboarded } from "../api";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";

const COLLAPSE_STORAGE_KEY = "sidebar_collapsed";

export default function DashboardLayout() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isChatPage = location.pathname === "/dashboard/ai-advisor";
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }
  if (!isOnboarded(currentUser)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      {/* ── Sidebar (fixed, collapsible, off-canvas on mobile) ── */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* ── Main content (offset by sidebar width; 0 on mobile since sidebar is off-canvas) ── */}
      <div
        className={`flex flex-1 flex-col min-h-screen transition-all duration-300 ease-in-out ${collapsed ? "lg:ml-20" : "lg:ml-64"
          }`}
      >
        <TopNav onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className={`flex flex-col flex-1 ${isChatPage ? "overflow-hidden" : "overflow-y-auto p-6"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}