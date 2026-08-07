/**
 * App.tsx — Route declarations only
 *
 * All section logic lives in /pages; this file just wires routes.
 */

import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardLayout from "./layouts/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import TransactionsPage from "./pages/TransactionsPage";
import TransactionHistoryPage from "./pages/TransactionHistoryPage";
import BudgetPlannerPage from "./pages/BudgetPlannerPage";
import InvestmentsPage from "./pages/InvestmentsPage";
import AIAdvisorPage from "./pages/AIAdvisorPage";

export default function App() {
  return (
    <Routes>
      {/* Public landing / marketing page */}
      <Route path="/" element={<LandingPage />} />
      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Post-signup onboarding (name, income, budget tier) */}
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Dashboard shell (protected in DashboardLayout) */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="history" element={<TransactionHistoryPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="budget-planner" element={<BudgetPlannerPage />} />
        <Route path="ai-advisor" element={<AIAdvisorPage />} />
      </Route>

      {/* Catch-all → landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
