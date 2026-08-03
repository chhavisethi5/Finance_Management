/**
 * EditGoalModal.tsx — Modal for updating an existing financial goal.
 *
 * Pre-fills from the goal being edited. On save, the backend recalculates
 * progress_pct, monthly_target, status, etc. from the merged values — this
 * component just sends the changed fields and swaps in the fresh response.
 */

import { useState } from "react";
import { updateFinancialGoal, getErrorMessage } from "../api";
import type { FinancialGoal } from "../api";

interface EditGoalModalProps {
    goal: FinancialGoal;
    onClose: () => void;
    onSaved: (updated: FinancialGoal) => void;
}

const GOAL_CATEGORIES = ["Vacation", "Home", "Education", "Retirement", "Health", "Vehicle", "Other"];

export default function EditGoalModal({ goal, onClose, onSaved }: EditGoalModalProps) {
    const [goalName, setGoalName] = useState(goal.goal_name);
    const [category, setCategory] = useState(goal.category);
    const [priority, setPriority] = useState<"High" | "Medium" | "Low">(goal.priority);
    const [targetAmount, setTargetAmount] = useState(String(goal.target_amount));
    const [currentSaved, setCurrentSaved] = useState(String(goal.current_saved));
    const [targetDate, setTargetDate] = useState(goal.target_date);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const numTarget = Number(targetAmount);
        const numSaved = Number(currentSaved);

        if (!goalName.trim() || !targetDate) {
            setError("Please fill out all required goal fields.");
            return;
        }
        if (numTarget <= 0) {
            setError("Goal target amount must be greater than ₹0.");
            return;
        }
        if (numSaved < 0) {
            setError("Saved amount cannot be negative.");
            return;
        }

        setSaving(true);
        try {
            const updated = await updateFinancialGoal(goal.id, {
                goal_name: goalName.trim(),
                category: category.trim(),
                priority,
                target_amount: numTarget,
                current_saved: numSaved,
                target_date: targetDate,
            });
            onSaved(updated);
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not update goal."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#2d3348] pb-3">
                    <h4 className="text-sm font-bold text-[#f1f5f9]">Edit Savings Goal</h4>
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
                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Goal Name</label>
                        <input
                            type="text"
                            value={goalName}
                            onChange={(e) => setGoalName(e.target.value)}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1 font-semibold text-[#94a3b8]">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                            >
                                {/* Preserve the existing value even if it's not in the preset list */}
                                {!GOAL_CATEGORIES.includes(category) && <option value={category}>{category}</option>}
                                {GOAL_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 font-semibold text-[#94a3b8]">Priority Level</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as "High" | "Medium" | "Low")}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                            >
                                <option value="High">🔥 High</option>
                                <option value="Medium">⚡ Medium</option>
                                <option value="Low">🌱 Low</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1 font-semibold text-[#94a3b8]">Target Amount (₹)</label>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-semibold text-[#94a3b8]">Amount Saved So Far (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={currentSaved}
                                onChange={(e) => setCurrentSaved(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Target Completion Date</label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                            required
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
