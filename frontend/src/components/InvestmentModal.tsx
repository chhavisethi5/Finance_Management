/**
 * InvestmentModal.tsx — "+ Add New Investment" popup. Also reused to Edit
 * an existing investment from the history table (pass `editingItem`).
 *
 * Creating a new investment auto-deducts its amount from the user's Liquid
 * Assets on the backend (see create_investment in main.py); editing the
 * amount re-adjusts by the delta, and deleting refunds it.
 */

import { useState } from "react";
import { X, TrendingUp, Plus, Pencil } from "lucide-react";
import { createInvestment, updateInvestment, getErrorMessage } from "../api";
import type { Investment, InvestmentType } from "../api";
import { INVESTMENT_TYPES, METAL_TYPES, PROPERTY_TYPES, isCommodity, isProperty } from "../constants/investmentTypes";

interface InvestmentModalProps {
    userId: number;
    editingItem?: Investment | null;
    isPastMode?: boolean;
    onClose: () => void;
    onSaved: () => void; // re-fetch parent's list after create/update
}

const emptyForm = {
    investment_type: "Stocks" as InvestmentType,
    amount: "",
    sub_type: "",
    quantity: "",
    investment_date: "", // Leave blank by default for optional flexibility
    comment: "",
};

export default function InvestmentModal({ userId, editingItem, isPastMode, onClose, onSaved }: InvestmentModalProps) {
    const isEditing = !!editingItem;
    const isPast = editingItem ? !!editingItem.is_past : !!isPastMode;

    const [form, setForm] = useState(
        editingItem
            ? {
                investment_type: editingItem.investment_type,
                amount: String(editingItem.amount),
                sub_type: editingItem.sub_type ?? "",
                quantity: editingItem.quantity !== null ? String(editingItem.quantity) : "",
                investment_date: editingItem.investment_date ?? "", // handle optional null date from DB
                comment: editingItem.comment ?? "",
            }
            : emptyForm
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const needsCommodity = isCommodity(form.investment_type);
    const needsProperty = isProperty(form.investment_type);

    const [selectedSubtype, setSelectedSubtype] = useState(() => {
        if (!editingItem) return "";
        if (editingItem.investment_type === "Commodities" && editingItem.sub_type) {
            if (["Gold", "Silver", "Diamond", "Platinum"].includes(editingItem.sub_type)) {
                return editingItem.sub_type;
            }
            return "Other";
        }
        return editingItem.sub_type ?? "";
    });

    const [customSubtype, setCustomSubtype] = useState(() => {
        if (editingItem && editingItem.investment_type === "Commodities" && editingItem.sub_type) {
            if (!["Gold", "Silver", "Diamond", "Platinum"].includes(editingItem.sub_type)) {
                return editingItem.sub_type;
            }
        }
        return "";
    });

    const handleTypeChange = (type: InvestmentType) => {
        // Reset the type-specific fields whenever the investment type changes.
        setForm({ ...form, investment_type: type, sub_type: "", quantity: "" });
        setSelectedSubtype("");
        setCustomSubtype("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const amountNum = Number(form.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError("Amount must be greater than ₹0.");
            return;
        }

        let quantityNum: number | undefined;
        if (needsCommodity || needsProperty) {
            if (needsCommodity) {
                if (!selectedSubtype) {
                    setError("Please select a commodity type.");
                    return;
                }
                if (selectedSubtype === "Other" && !customSubtype.trim()) {
                    setError("Please specify the commodity name.");
                    return;
                }
            } else {
                if (!form.sub_type) {
                    setError("Please select a property type.");
                    return;
                }
            }
            quantityNum = Number(form.quantity);
            if (isNaN(quantityNum) || quantityNum <= 0) {
                setError(needsCommodity ? "Please enter the weight in grams." : "Please enter the number of properties.");
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                investment_type: form.investment_type,
                amount: amountNum,
                sub_type: needsCommodity
                    ? (selectedSubtype === "Other" ? customSubtype.trim() : selectedSubtype)
                    : (form.sub_type || undefined),
                quantity: quantityNum,
                investment_date: form.investment_date || null, // Map empty input to null
                comment: form.comment.trim() || undefined,
                is_past: isPast,
            };

            if (isEditing && editingItem) {
                await updateInvestment(editingItem.id, payload);
            } else {
                await createInvestment({ user_id: userId, ...payload });
            }
            onSaved();
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not save this investment."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-2xl space-y-4">
                <div className="flex items-start justify-between border-b border-[#2d3348] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#f1f5f9]">
                                {isPast ? (isEditing ? "Edit Past Investment" : "Add Past Investment") : (isEditing ? "Edit Investment" : "Add New Investment")}
                            </h4>
                            <p className="text-[11px] text-[#64748b]">
                                {isPast ? "Does not deduct from your Liquid Assets" : isEditing ? "Adjusts Liquid Assets by the amount difference" : "Auto-deducted from your Liquid Assets"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#94a3b8] hover:text-[#f1f5f9]">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    {/* Investment Type */}
                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Investment Type</label>
                        <select
                            value={form.investment_type}
                            onChange={(e) => handleTypeChange(e.target.value as InvestmentType)}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                        >
                            {INVESTMENT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Current Value (₹)</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            autoFocus
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                        />
                    </div>

                    {/* Commodities — type + grams */}
                    {needsCommodity && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 font-semibold text-[#94a3b8]">Commodity</label>
                                    <select
                                        value={selectedSubtype}
                                        onChange={(e) => setSelectedSubtype(e.target.value)}
                                        className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                    >
                                        <option value="">Select…</option>
                                        {METAL_TYPES.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 font-semibold text-[#94a3b8]">Weight (grams)</label>
                                    <input
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                    />
                                </div>
                            </div>
                            {selectedSubtype === "Other" && (
                                <div>
                                    <label className="block mb-1 font-semibold text-[#94a3b8]">Commodity Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Copper, Bronze, Wheat"
                                        value={customSubtype}
                                        onChange={(e) => setCustomSubtype(e.target.value)}
                                        className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Property — type + number of properties */}
                    {needsProperty && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block mb-1 font-semibold text-[#94a3b8]">Property Type</label>
                                <select
                                    value={form.sub_type}
                                    onChange={(e) => setForm({ ...form, sub_type: e.target.value })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                >
                                    <option value="">Select…</option>
                                    {PROPERTY_TYPES.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold text-[#94a3b8]">No. of Properties</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.quantity}
                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                    className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Date (Optional)</label>
                        <input
                            type="date"
                            value={form.investment_date}
                            onChange={(e) => setForm({ ...form, investment_date: e.target.value })}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                        />
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Comment (optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Bought via Zerodha SIP"
                            value={form.comment}
                            onChange={(e) => setForm({ ...form, comment: e.target.value })}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
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
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                        >
                            {isEditing ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Investment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}