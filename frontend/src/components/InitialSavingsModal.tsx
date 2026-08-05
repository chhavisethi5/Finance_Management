/**
 * InitialSavingsModal.tsx — Small modal for setting pre-existing (pre-MoneyMap)
 * savings. Opened from the sleek edit icon on the "Liquid Assets" stat card.
 * Replaces the old standalone "INITIAL SAVINGS" card.
 */

import { useState } from "react";
import { Landmark, X } from "lucide-react";
import { updateSavingsOffset, getErrorMessage } from "../api";
import type { User } from "../api";

interface InitialSavingsModalProps {
    userId: number;
    currentValue: number;
    onClose: () => void;
    onSaved: (updatedUser: User) => void;
}

export default function InitialSavingsModal({ userId, currentValue, onClose, onSaved }: InitialSavingsModalProps) {
    const [value, setValue] = useState(String(currentValue ?? "0"));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const num = Number(value);
        if (value.trim() === "" || isNaN(num) || num < 0) {
            setError("Please enter a valid, non-negative amount.");
            return;
        }

        setSaving(true);
        try {
            const updatedUser = await updateSavingsOffset(userId, num);
            onSaved(updatedUser);
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not update your initial savings."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-2xl space-y-4">
                <div className="flex items-start justify-between border-b border-[#2d3348] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
                            <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#f1f5f9]">Initial Savings</h4>
                            <p className="text-[11px] text-[#64748b]">Had savings before joining MoneyMap? Add them here</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#94a3b8] hover:text-[#f1f5f9]">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Pre-existing Savings (₹)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            autoFocus
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                        />
                        <p className="mt-1.5 text-[10px] leading-relaxed text-[#64748b]">
                            This is folded into your total Liquid Assets and, in turn, your automated Emergency Fund target.
                        </p>
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
                            className="flex-1 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}