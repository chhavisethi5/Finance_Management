/**
 * TransactionHistoryPage.tsx — /dashboard/history
 *
 * Dedicated view showing every transaction ever recorded for the user
 * (not just the last 5 shown on the Transactions page).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTransactions, formatINR, getErrorMessage } from "../api";
import type { Transaction } from "../api";
import { useAuth } from "../context/AuthContext";

export default function TransactionHistoryPage() {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!currentUser) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError("");
            try {
                const data = await getTransactions(currentUser.id);
                if (!cancelled) setTransactions(data);
            } catch (err: unknown) {
                if (!cancelled) setError(getErrorMessage(err, "Could not load transaction history."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentUser]);

    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-xl font-bold text-[#f1f5f9]">Transaction History</h3>
                    <p className="text-sm text-[#475569] mt-0.5">
                        Every income and expense you've ever logged, newest first.
                    </p>
                </div>
                <Link
                    to="/dashboard/transactions"
                    className="flex items-center gap-2 rounded-xl border border-[#2d3348] bg-[#1a1d27] px-4 py-2 text-sm font-medium text-[#94a3b8] hover:border-[#4f8ef7]/50 hover:text-[#4f8ef7] transition-all"
                >
                    ← Back to Transactions
                </Link>
            </div>

            {/* Summary stats */}
            {transactions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-2">Total Entries</p>
                        <p className="text-2xl font-bold text-[#f1f5f9]">{transactions.length}</p>
                    </div>
                    <div className="rounded-xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-2">Total Income</p>
                        <p className="text-2xl font-bold text-[#34d399]">{formatINR(totalIncome)}</p>
                    </div>
                    <div className="rounded-xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-2">Total Expenses</p>
                        <p className="text-2xl font-bold text-[#f87171]">{formatINR(totalExpense)}</p>
                    </div>
                </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            {/* Full history table */}
            <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card">
                {loading ? (
                    <div className="empty-state">
                        <div className="text-3xl mb-2">⏳</div>
                        <p>Loading your full history…</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="text-3xl mb-2">📋</div>
                        <p>No transactions logged yet.</p>
                        <p className="mt-1 text-xs">
                            Go to <Link to="/dashboard/transactions" className="text-[#4f8ef7]">Transactions</Link> to log your first one.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#2d3348] text-[#475569]">
                                    <th className="pb-3 text-left font-medium">Date</th>
                                    <th className="pb-3 text-left font-medium">Category</th>
                                    <th className="pb-3 text-left font-medium">Type</th>
                                    <th className="pb-3 text-right font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-[#2d3348] last:border-0 hover:bg-[#22263a] transition-colors">
                                        <td className="py-3 text-[#94a3b8]">{tx.transaction_date}</td>
                                        <td className="py-3 font-medium text-[#f1f5f9]">{tx.category}</td>
                                        <td className="py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tx.type === "expense"
                                                        ? "bg-[#f87171]/10 text-[#f87171]"
                                                        : "bg-[#34d399]/10 text-[#34d399]"
                                                    }`}
                                            >
                                                {tx.type === "expense" ? "💸 Expense" : "💰 Income"}
                                            </span>
                                        </td>
                                        <td
                                            className={`py-3 text-right font-semibold ${tx.type === "expense" ? "text-[#f87171]" : "text-[#34d399]"
                                                }`}
                                        >
                                            {tx.type === "expense" ? "−" : "+"}
                                            {formatINR(Number(tx.amount))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}