/**
 * TransactionsPage.tsx — /dashboard/transactions
 *
 * Left panel: Add Transaction form
 * Right panel: Transaction history placeholder (future)
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createTransaction, getTransactions, formatINR, getErrorMessage } from "../api";
import type { Transaction } from "../api";
import { useAuth } from "../context/AuthContext";

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investments", "Business",
  "Gifts & Bonuses", "Side Hustle", "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Rent & Housing", "Groceries", "Dining & Food", "Utilities & Bills",
  "Transport", "Shopping", "Entertainment", "Healthcare", "Debt & EMI", "Others",
];

export default function TransactionsPage() {
  const { currentUser } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = async () => {
    if (!currentUser) return;
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const data = await getTransactions(currentUser.id);
      setTransactions(data);
    } catch (err: unknown) {
      setHistoryError(getErrorMessage(err, "Could not load transaction history."));
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load the user's full history once on mount.
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // "Recent" = the 5 most recent entries from the real history (already
  // newest-first, since the backend orders by transaction_date desc).
  const recentTx = transactions.slice(0, 5);

  const resolvedCategory = category === "__custom__" ? customCategory.trim() : category;
  const activeCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Category options depend on Income vs Expense — clear the selection when the type changes
  // so a leftover category from the other list can't be silently submitted.
  useEffect(() => {
    setCategory("");
    setCustomCategory("");
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { setError("No user session found."); return; }
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await createTransaction({
        user_id: currentUser.id,
        amount: parseFloat(amount),
        category: resolvedCategory,
        type,
        transaction_date: date,
      });
      setSuccess("Transaction logged successfully! ✓");
      await fetchTransactions();
      setAmount("");
      setCategory("");
      setCustomCategory("");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to log transaction."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h3 className="text-xl font-bold text-[#f1f5f9]">Transactions</h3>
        <p className="text-sm text-[#475569] mt-0.5">Log new income or expenses and track your history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Add Transaction Form ── */}
        <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
          <p className="card-title">💸 Log a Transaction</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-[#0f1117] border border-[#2d3348]">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={[
                    "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
                    type === t
                      ? t === "expense"
                        ? "bg-gradient-to-r from-[#f87171] to-[#dc2626] text-white shadow-md"
                        : "bg-gradient-to-r from-[#34d399] to-[#059669] text-white shadow-md"
                      : "text-[#94a3b8] hover:text-[#f1f5f9]",
                  ].join(" ")}
                >
                  {t === "expense" ? "💸 Expense" : "💰 Income"}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tx-amount">Amount (₹)</label>
              <input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="150.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tx-category-select">Category</label>
              <select
                id="tx-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select a category…</option>
                {activeCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__custom__">✏ Custom…</option>
              </select>
            </div>

            {category === "__custom__" && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="tx-custom-category">Custom category name</label>
                <input
                  id="tx-custom-category"
                  type="text"
                  placeholder="e.g. pet care, gym"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tx-date">Date</label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button
              id="tx-submit-btn"
              className={`btn ${type === "income" ? "btn-success" : "btn-primary"}`}
              type="submit"
              disabled={loading}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? <span className="spinner" /> : "Log Transaction"}
            </button>
          </form>
        </div>

        {/* ── Recent Transactions ── */}
        <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="card-title" style={{ marginBottom: 0 }}>🕒 Recent Transactions</p>
            <Link
              to="/dashboard/history"
              className="text-xs font-semibold text-[#4f8ef7] hover:text-[#6c63ff] transition-colors whitespace-nowrap"
            >
              View Full History →
            </Link>
          </div>

          {historyError && <div className="alert alert-error mb-3">{historyError}</div>}

          {loadingHistory ? (
            <div className="empty-state">
              <div className="text-3xl mb-2">⏳</div>
              <p>Loading your transactions…</p>
            </div>
          ) : recentTx.length === 0 ? (
            <div className="empty-state">
              <div className="text-3xl mb-2">📋</div>
              <p>No transactions logged yet.</p>
              <p className="mt-1 text-xs">Transactions you log will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentTx.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-[#2d3348] bg-[#22263a] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">
                      {tx.type === "expense" ? "💸" : "💰"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#f1f5f9]">{tx.category}</p>
                      <p className="text-xs text-[#475569]">{tx.transaction_date}</p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${tx.type === "expense" ? "text-[#f87171]" : "text-[#34d399]"
                      }`}
                  >
                    {tx.type === "expense" ? "−" : "+"}
                    {formatINR(Number(tx.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}