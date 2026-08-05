/**
 * RecurringExpensesModal.tsx — Configure, edit, and manage automated
 * fixed/recurring expenses (rent, EMIs, subscriptions, utilities).
 *
 * Each item auto-deducts from the user's Liquid Assets / Monthly Savings on
 * its scheduled date by generating a real expense transaction on the backend
 * (see `_process_due_recurring_expenses` in main.py) — this modal is purely
 * the configuration surface: create, edit, pause/resume, or delete items.
 */

import { useEffect, useState } from "react";
import { X, Trash2, Pencil, Plus, RefreshCcw, Repeat } from "lucide-react";
import {
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    formatINR,
    getErrorMessage,
} from "../api";
import type { RecurringExpense } from "../api";
import { EXPENSE_CATEGORIES } from "../constants/categories";

interface RecurringExpensesModalProps {
    userId: number;
    items: RecurringExpense[];
    onClose: () => void;
    onChanged: () => void; // re-fetch parent's list after any create/update/delete
}

const emptyForm = {
    title: "",
    amount: "",
    category: EXPENSE_CATEGORIES[0],
    frequency: "monthly" as "monthly" | "quarterly",
    deduction_day: "1",
    comment: "",
};

export default function RecurringExpensesModal({ userId, items, onClose, onChanged }: RecurringExpensesModalProps) {
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Re-sync the form if the parent's item list refreshes mid-edit.
    useEffect(() => {
        if (editingId === null) return;
        const still = items.find((i) => i.id === editingId);
        if (!still) setEditingId(null);
    }, [items, editingId]);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const startEdit = (item: RecurringExpense) => {
        setEditingId(item.id);
        setForm({
            title: item.title,
            amount: String(item.amount),
            category: item.category,
            frequency: item.frequency,
            deduction_day: String(item.deduction_day),
            comment: item.comment ?? "",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const amountNum = Number(form.amount);
        const dayNum = Number(form.deduction_day);

        if (!form.title.trim()) {
            setError("Please give this expense a title (e.g. 'Rent').");
            return;
        }
        if (isNaN(amountNum) || amountNum <= 0) {
            setError("Amount must be greater than ₹0.");
            return;
        }
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 28) {
            setError("Deduction day must be between 1 and 28.");
            return;
        }

        setSaving(true);
        try {
            if (editingId !== null) {
                await updateRecurringExpense(editingId, {
                    title: form.title.trim(),
                    amount: amountNum,
                    category: form.category,
                    frequency: form.frequency,
                    deduction_day: dayNum,
                    comment: form.comment.trim() || null,
                });
            } else {
                await createRecurringExpense({
                    user_id: userId,
                    title: form.title.trim(),
                    amount: amountNum,
                    category: form.category,
                    frequency: form.frequency,
                    deduction_day: dayNum,
                    comment: form.comment.trim() || undefined,
                });
            }
            resetForm();
            onChanged();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not save this recurring expense."));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (item: RecurringExpense) => {
        setError("");
        try {
            await updateRecurringExpense(item.id, { is_active: !item.is_active });
            onChanged();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not update this recurring expense."));
        }
    };

    const handleDelete = async (item: RecurringExpense) => {
        setError("");
        try {
            await deleteRecurringExpense(item.id);
            if (editingId === item.id) resetForm();
            onChanged();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not delete this recurring expense."));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[#2d3348] bg-[#1e2235] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#2d3348] px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
                            <Repeat className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#f1f5f9]">Recurring Fixed Expenses</h4>
                            <p className="text-[11px] text-[#64748b]">Rent, EMIs, subscriptions — auto-deducted on schedule</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#94a3b8] hover:text-[#f1f5f9]">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {error && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                            {error}
                        </div>
                    )}

                    {/* ── Existing items list ── */}
                    <div className="space-y-2">
                        {items.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#2d3348] bg-[#151827] p-6 text-center text-xs text-[#94a3b8]">
                                No recurring expenses configured yet.
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center justify-between rounded-xl border p-3 transition-all ${item.is_active
                                            ? "border-[#2d3348] bg-[#151827]"
                                            : "border-[#2d3348]/60 bg-[#151827]/50 opacity-60"
                                        }`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-xs font-semibold text-[#f1f5f9]">{item.title}</p>
                                            <span className="rounded-full border border-[#2d3348] bg-[#1a1d27] px-2 py-0.5 text-[10px] font-medium capitalize text-[#94a3b8]">
                                                {item.frequency}
                                            </span>
                                            {!item.is_active && (
                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-[#64748b]">
                                            {item.category} · Next: {new Date(item.next_deduction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3 pl-3">
                                        <p className="text-sm font-bold text-[#f1f5f9]">{formatINR(item.amount)}</p>
                                        <button
                                            title={item.is_active ? "Pause" : "Resume"}
                                            onClick={() => handleToggleActive(item)}
                                            className="text-[#94a3b8] hover:text-[#4f8ef7]"
                                        >
                                            <RefreshCcw className="h-3.5 w-3.5" />
                                        </button>
                                        <button title="Edit" onClick={() => startEdit(item)} className="text-[#94a3b8] hover:text-[#4f8ef7]">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button title="Delete" onClick={() => handleDelete(item)} className="text-[#94a3b8] hover:text-rose-400">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ── Add / Edit form ── */}
                    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#2d3348] bg-[#151827] p-4 text-xs">
                        <p className="text-xs font-semibold text-[#f1f5f9]">
                            {editingId !== null ? "Edit Recurring Expense" : "Add a Recurring Expense"}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block mb-1 font-semibold text-[#94a3b8]">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Rent, Netflix, Car EMI"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#1a1d27] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-semibold text-[#94a3b8]">Amount (₹)</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#1a1d27] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-semibold text-[#94a3b8]">Category</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#1a1d27] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                >
                                    {EXPENSE_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 font-semibold text-[#94a3b8]">Frequency</label>
                                <select
                                    value={form.frequency}
                                    onChange={(e) => setForm({ ...form, frequency: e.target.value as "monthly" | "quarterly" })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#1a1d27] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 font-semibold text-[#94a3b8]">Deduction Day (1–28)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={form.deduction_day}
                                    onChange={(e) => setForm({ ...form, deduction_day: e.target.value })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#1a1d27] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block mb-1 font-semibold text-[#94a3b8]">Comment (optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Auto-pay via HDFC"
                                    value={form.comment}
                                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#1a1d27] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            {editingId !== null && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 rounded-xl border border-[#2d3348] py-2 text-xs font-semibold text-[#94a3b8] hover:bg-[#1a1d27]"
                                >
                                    Cancel Edit
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                            >
                                {editingId !== null ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                {saving ? "Saving…" : editingId !== null ? "Save Changes" : "Add Recurring Expense"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}