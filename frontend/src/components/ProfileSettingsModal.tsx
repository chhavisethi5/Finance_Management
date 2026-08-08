/**
 * ProfileSettingsModal.tsx — Smooth settings modal to manage user name,
 * monthly income, and pre-existing liquid assets offset.
 */

import { useState, useEffect } from "react";
import { User as UserIcon, Wallet, PiggyBank, X } from "lucide-react";
import { updateUserProfile, getErrorMessage } from "../api";
import type { User } from "../api";

interface ProfileSettingsModalProps {
    user: User;
    onClose: () => void;
    onSaved: (updatedUser: User) => void;
}

export default function ProfileSettingsModal({ user, onClose, onSaved }: ProfileSettingsModalProps) {
    const [name, setName] = useState(user.name ?? "");
    const [income, setIncome] = useState(String(user.monthly_income ?? "0"));
    const [savingsOffset, setSavingsOffset] = useState(String(user.manual_savings_offset ?? "0"));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Make sure states sync if the user prop changes
    useEffect(() => {
        setName(user.name ?? "");
        setIncome(String(user.monthly_income ?? "0"));
        setSavingsOffset(String(user.manual_savings_offset ?? "0"));
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (name.trim() === "") {
            setError("Name cannot be empty.");
            return;
        }

        const incomeNum = Number(income);
        if (income.trim() === "" || isNaN(incomeNum) || incomeNum < 0) {
            setError("Please enter a valid, non-negative monthly income.");
            return;
        }

        const savingsNum = Number(savingsOffset);
        if (savingsOffset.trim() === "" || isNaN(savingsNum) || savingsNum < 0) {
            setError("Please enter a valid, non-negative pre-existing savings amount.");
            return;
        }

        setSaving(true);
        try {
            const updatedUser = await updateUserProfile(user.id, {
                name: name.trim(),
                monthly_income: incomeNum,
                manual_savings_offset: savingsNum,
            });
            onSaved(updatedUser);
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not update profile details."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-2xl space-y-4 animate-scale-up">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#2d3348] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
                            <UserIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#f1f5f9]">Profile & Baseline Settings</h4>
                            <p className="text-[11px] text-[#64748b]">Configure your core details and baseline savings</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {/* User Name */}
                    <div className="space-y-1">
                        <label className="block font-semibold text-[#94a3b8]">Full Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 pl-9 text-[#f1f5f9] outline-none focus:border-[#4f8ef7] transition-all"
                                placeholder="Jane Doe"
                            />
                            <UserIcon className="absolute left-3 top-3 h-3.5 w-3.5 text-[#475569]" />
                        </div>
                    </div>

                    {/* Monthly Income */}
                    <div className="space-y-1">
                        <label className="block font-semibold text-[#94a3b8]">Monthly Income (₹)</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={income}
                                onChange={(e) => setIncome(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 pl-9 text-[#f1f5f9] outline-none focus:border-[#4f8ef7] transition-all"
                                placeholder="50000.00"
                            />
                            <Wallet className="absolute left-3 top-3 h-3.5 w-3.5 text-[#475569]" />
                        </div>
                        <p className="text-[10px] text-[#64748b]">Updating income will automatically recalculate your budget targets.</p>
                    </div>

                    {/* Pre-existing savings */}
                    <div className="space-y-1">
                        <label className="block font-semibold text-[#94a3b8]">Pre-existing Savings (₹)</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={savingsOffset}
                                onChange={(e) => setSavingsOffset(e.target.value)}
                                className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 pl-9 text-[#f1f5f9] outline-none focus:border-[#4f8ef7] transition-all"
                                placeholder="100000.00"
                            />
                            <PiggyBank className="absolute left-3 top-3 h-3.5 w-3.5 text-[#475569]" />
                        </div>
                        <p className="text-[10px] text-[#64748b]">Folded into liquid assets and used for emergency safety reserve metrics.</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-[#2d3348]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-[#2d3348] py-2.5 text-xs font-semibold text-[#94a3b8] hover:bg-[#1a1d27] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            {saving ? (
                                <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
