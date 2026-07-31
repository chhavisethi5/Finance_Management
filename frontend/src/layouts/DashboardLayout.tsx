/**
 * DashboardLayout.tsx — Main layout shell
 *
 * Protected route: redirects to /auth if no user is logged in.
 * Renders: Sidebar (left) + TopNav (top) + page content (right/main).
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isOnboarded } from "../api";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";

export default function DashboardLayout() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }
  if (!isOnboarded(currentUser)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      {/* ── Fixed Sidebar ── */}
      <Sidebar />

      {/* ── Main content (offset by sidebar width w-64) ── */}
      <div className="ml-64 flex flex-1 flex-col min-h-screen">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
