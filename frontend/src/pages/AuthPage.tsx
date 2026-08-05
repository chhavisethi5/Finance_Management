/**
 * AuthPage.tsx — /auth
 *
 * Supports switching between Sign In and Sign Up modes.
 * - Sign Up: email, password, monthly income → POST /signup/
 * - Sign In: email, password → POST /login/
 * - On success: saves user to context & redirects to /dashboard
 */

import { useState } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signUp, logIn, isOnboarded } from "../api";

export default function AuthPage() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (currentUser) {
    return <Navigate to={isOnboarded(currentUser) ? "/dashboard" : "/onboarding"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up: email + password only. Name/income are collected next, in onboarding.
        const user = await signUp(email.trim(), password);
        login(user);
        navigate("/onboarding");
      } else {
        // Sign In: existing users may or may not have finished onboarding yet.
        const user = await logIn(email.trim(), password);
        login(user);
        navigate(isOnboarded(user) ? "/dashboard" : "/onboarding");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: any } } };
      const detail = axiosErr?.response?.data?.detail;

      let errorMessage = "Authentication failed. Please check your inputs.";
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d) => d.msg).join(",");
      } else if (typeof detail === "object" && detail !== null) {
        errorMessage = JSON.stringify(detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#4f8ef7]/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#a78bfa]/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* ── Back to Home ── */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="absolute -top-12 left-0 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
        {/* ── Logo / Brand ── */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f8ef7] to-[#6c63ff] text-3xl shadow-2xl shadow-[#4f8ef7]/40">
            💼
          </div>
          <h1 className="bg-gradient-to-r from-[#4f8ef7] to-[#a78bfa] bg-clip-text text-3xl font-bold text-transparent">
            MoneyMap
          </h1>
          <p className="mt-2 text-sm text-[#475569]">
            Track income, expenses, and hit your financial goals.
          </p>
        </div>

        {/* ── Auth Card ── */}
        <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-8 shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 mb-6 p-1 rounded-xl bg-[#0f1117] border border-[#2d3348]">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(""); }}
              className={`rounded-lg py-2 text-sm font-semibold transition-all ${!isSignUp ? "bg-[#1e2235] text-[#f1f5f9] shadow-md border border-[#2d3348]" : "text-[#475569] hover:text-[#94a3b8]"
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(""); }}
              className={`rounded-lg py-2 text-sm font-semibold transition-all ${isSignUp ? "bg-[#1e2235] text-[#f1f5f9] shadow-md border border-[#2d3348]" : "text-[#475569] hover:text-[#94a3b8]"
                }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="mb-1 text-lg font-semibold text-[#f1f5f9]">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h2>
          <p className="mb-6 text-sm text-[#475569]">
            {isSignUp ? "Enter your details to register a new profile." : "Enter your email and password to access your dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isSignUp ? 6 : undefined}
                required
              />
              {isSignUp && (
                <p className="mt-1 text-xs text-[#475569]">At least 6 characters.</p>
              )}
            </div>

            {/* Error */}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              className="btn btn-primary w-full"
              type="submit"
              disabled={loading}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? <span className="spinner" /> : isSignUp ? "Create Account →" : "Sign In →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}