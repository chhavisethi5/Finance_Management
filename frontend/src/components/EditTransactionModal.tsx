/**
 * EditTransactionModal.tsx — Inline modal for editing an existing transaction.
 *
 * Shared by TransactionsPage (Recent Transactions list) and
 * TransactionHistoryPage (Full History table) so both stay in sync with
 * a single implementation of the edit form + PUT call.
 */

import { useState } from "react";
import { updateTransaction, getErrorMessage } from "../api";
import type { Transaction } from "../api";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../constants/categories";

interface EditTransactionModalProps {
    transaction: Transaction;
    onClose: () => void;
    onSaved: (updated: Transaction) => void;
}

export default function EditTransactionModal({ transaction, onClose, onSaved }: EditTransactionModalProps) {
    const [amount, setAmount] = useState(String(transaction.amount));
    const [type, setType] = useState<"income" | "expense">(transaction.type);
    const [date, setDate] = useState(transaction.transaction_date);
    const [comment, setComment] = useState(transaction.comment ?? "");

    const activeCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const categoryIsKnown = activeCategories.includes(transaction.category);
    const [category, setCategory] = useState(categoryIsKnown ? transaction.category : "__custom__");
    const [customCategory, setCustomCategory] = useState(categoryIsKnown ? "" : transaction.category);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const resolvedCategory = category === "__custom__" ? customCategory.trim() : category;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) {
            setError("Amount must be greater than ₹0.");
            return;
        }
        if (!resolvedCategory) {
            setError("Please select or enter a category.");
            return;
        }

        setSaving(true);
        try {
            const updated = await updateTransaction(transaction.id, {
                amount: numAmount,
                category: resolvedCategory,
                type,
                transaction_date: date,
                comment: comment.trim() || null,
            });
            onSaved(updated);
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to update transaction."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#2d3348] pb-3">
                    <h4 className="text-sm font-bold text-[#f1f5f9]">Edit Transaction</h4>
                    <button onClick={onClose} className="text-xs text-[#94a3b8] hover:text-[#f1f5f9]">
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    {/* Type toggle */}
                    <div className="flex gap-2 p-1 rounded-xl bg-[#0f1117] border border-[#2d3348]">
                        {(["expense", "income"] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => {
                                    setType(t);
                                    setCategory("");
                                    setCustomCategory("");
                                }}
                                className={[
                                    "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
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

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1 font-semibold text-[#94a3b8]">Amount (₹)</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold text-[#94a3b8]">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                            required
                        >
                            <option value="">Select a category…</option>
                            {activeCategories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="__custom__">✏ Custom…</option>
                        </select>
                    </div>

                    {category === "__custom__" && (
                        <div>
                            <label className="block mb-1 font-semibold text-[#94a3b8]">Custom category name</label>
                            <input
                                type="text"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Comments / Note (optional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={255}
                            rows={2}
                            placeholder="e.g. Dinner with friends"
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7] resize-none"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-[#2d3348] py-2 text-xs font-semibold text-[#94a3b8] hover:bg-[#1a1d27]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] py-2 text-xs font-semibold text-white shadow-md hover:opacity-95"
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
