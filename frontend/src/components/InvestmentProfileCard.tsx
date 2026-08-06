/**
 * InvestmentProfileCard.tsx — "Initial Past Investments Setup" panel shown
 * at the top of the Investments page. Lets the user record the totals they
 * already had invested before joining MoneyMap, categorized by type.
 *
 * Purely informational (like Initial Savings) — saving this does NOT touch
 * Liquid Assets, unlike "+ Add New Investment" entries.
 */

import { useEffect, useState } from "react";
import { Landmark, Plus, Trash2, Save } from "lucide-react";
import { getInvestmentProfile, updateInvestmentProfile, formatINR, getErrorMessage } from "../api";
import type { InvestmentProfile, PropertyItem } from "../api";
import { PROPERTY_TYPES } from "../constants/investmentTypes";

interface InvestmentProfileCardProps {
    userId: number;
}

type FormState = {
    properties: PropertyItem[];
    gold_grams: string;
    silver_grams: string;
    diamond_grams: string;
    platinum_grams: string;
    stocks_value: string;
    mutual_funds_value: string;
    bank_fd_value: string;
    post_office_value: string;
    comment: string;
};

const emptyForm: FormState = {
    properties: [],
    gold_grams: "0",
    silver_grams: "0",
    diamond_grams: "0",
    platinum_grams: "0",
    stocks_value: "0",
    mutual_funds_value: "0",
    bank_fd_value: "0",
    post_office_value: "0",
    comment: "",
};

const toFormState = (p: InvestmentProfile): FormState => ({
    properties: p.properties,
    gold_grams: String(p.gold_grams),
    silver_grams: String(p.silver_grams),
    diamond_grams: String(p.diamond_grams),
    platinum_grams: String(p.platinum_grams),
    stocks_value: String(p.stocks_value),
    mutual_funds_value: String(p.mutual_funds_value),
    bank_fd_value: String(p.bank_fd_value),
    post_office_value: String(p.post_office_value),
    comment: p.comment ?? "",
});

export default function InvestmentProfileCard({ userId }: InvestmentProfileCardProps) {
    const [form, setForm] = useState<FormState>(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [expanded, setExpanded] = useState(false);

    const fetchProfile = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getInvestmentProfile(userId);
            setForm(toFormState(data));
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not load your past investments."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const addPropertyRow = () => {
        setForm({ ...form, properties: [...form.properties, { property_type: PROPERTY_TYPES[0], amount: 0 }] });
    };

    const updatePropertyRow = (index: number, field: keyof PropertyItem, value: string) => {
        const next = [...form.properties];
        next[index] = { ...next[index], [field]: field === "amount" ? Number(value) : value };
        setForm({ ...form, properties: next });
    };

    const removePropertyRow = (index: number) => {
        setForm({ ...form, properties: form.properties.filter((_, i) => i !== index) });
    };

    const numField = (key: keyof FormState, value: string) => setForm({ ...form, [key]: value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const numbers = [
            form.gold_grams, form.silver_grams, form.diamond_grams, form.platinum_grams,
            form.stocks_value, form.mutual_funds_value, form.bank_fd_value, form.post_office_value,
        ];
        if (numbers.some((n) => n.trim() === "" || isNaN(Number(n)) || Number(n) < 0)) {
            setError("All amounts must be valid, non-negative numbers.");
            return;
        }
        if (form.properties.some((p) => !p.property_type || p.amount < 0)) {
            setError("Every property needs a type and a non-negative amount.");
            return;
        }

        setSaving(true);
        try {
            const saved = await updateInvestmentProfile(userId, {
                properties: form.properties,
                gold_grams: Number(form.gold_grams),
                silver_grams: Number(form.silver_grams),
                diamond_grams: Number(form.diamond_grams),
                platinum_grams: Number(form.platinum_grams),
                stocks_value: Number(form.stocks_value),
                mutual_funds_value: Number(form.mutual_funds_value),
                bank_fd_value: Number(form.bank_fd_value),
                post_office_value: Number(form.post_office_value),
                comment: form.comment.trim() || undefined,
            });
            setForm(toFormState(saved));
            setSuccess("Past investments saved successfully! ✓");
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not save your past investments."));
        } finally {
            setSaving(false);
        }
    };

    const totalPropertyValue = form.properties.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return (
        <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
                        <Landmark className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Initial Past Investments Setup</h4>
                        <p className="mt-0.5 text-xs text-[#64748b]">Investments you already had before joining MoneyMap</p>
                    </div>
                </div>
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#4f8ef7] hover:text-[#6c63ff] transition-colors"
                >
                    {expanded ? "Collapse" : "Edit"}
                </button>
            </div>

            {loading ? (
                <div className="py-6 text-center text-xs text-[#64748b]">Loading…</div>
            ) : !expanded ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <SummaryPill label="Property" value={formatINR(totalPropertyValue)} sub={`${form.properties.length} ${form.properties.length === 1 ? "property" : "properties"}`} />
                    <SummaryPill label="Precious Metals" value={`${(Number(form.gold_grams) + Number(form.silver_grams) + Number(form.diamond_grams) + Number(form.platinum_grams)).toFixed(2)} g`} sub="Gold · Silver · Diamond · Platinum" />
                    <SummaryPill label="Stocks" value={formatINR(form.stocks_value)} />
                    <SummaryPill label="Mutual Funds" value={formatINR(form.mutual_funds_value)} />
                    <SummaryPill label="Bank FDs" value={formatINR(form.bank_fd_value)} />
                    <SummaryPill label="Post Office" value={formatINR(form.post_office_value)} />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
                    {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{success}</div>}

                    {/* Property */}
                    <div className="rounded-xl border border-[#2d3348] bg-[#151827] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-[#f1f5f9]">Property</p>
                            <button type="button" onClick={addPropertyRow} className="flex items-center gap-1 text-[#4f8ef7] hover:underline">
                                <Plus className="h-3 w-3" /> Add Property
                            </button>
                        </div>
                        {form.properties.length === 0 ? (
                            <p className="text-[11px] text-[#64748b]">No properties added yet.</p>
                        ) : (
                            form.properties.map((p, i) => (
                                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                    <div>
                                        <label className="block mb-1 text-[#94a3b8]">Type</label>
                                        <select
                                            value={p.property_type}
                                            onChange={(e) => updatePropertyRow(i, "property_type", e.target.value)}
                                            className="w-full rounded-lg border border-[#2d3348] bg-[#1a1d27] p-2 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                        >
                                            {PROPERTY_TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-[#94a3b8]">Amount Invested (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={p.amount}
                                            onChange={(e) => updatePropertyRow(i, "amount", e.target.value)}
                                            className="w-full rounded-lg border border-[#2d3348] bg-[#1a1d27] p-2 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                                        />
                                    </div>
                                    <button type="button" onClick={() => removePropertyRow(i)} className="mb-0.5 text-[#94a3b8] hover:text-rose-400">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Precious Metals */}
                    <div className="rounded-xl border border-[#2d3348] bg-[#151827] p-3 space-y-2">
                        <p className="font-semibold text-[#f1f5f9]">Precious Metals (grams)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <NumberField label="Gold" value={form.gold_grams} onChange={(v) => numField("gold_grams", v)} />
                            <NumberField label="Silver" value={form.silver_grams} onChange={(v) => numField("silver_grams", v)} />
                            <NumberField label="Diamond" value={form.diamond_grams} onChange={(v) => numField("diamond_grams", v)} />
                            <NumberField label="Platinum" value={form.platinum_grams} onChange={(v) => numField("platinum_grams", v)} />
                        </div>
                    </div>

                    {/* Financial instruments */}
                    <div className="rounded-xl border border-[#2d3348] bg-[#151827] p-3 space-y-2">
                        <p className="font-semibold text-[#f1f5f9]">Financial Instruments (₹)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField label="Stocks (total value)" value={form.stocks_value} onChange={(v) => numField("stocks_value", v)} step="0.01" />
                            <NumberField label="Mutual Funds" value={form.mutual_funds_value} onChange={(v) => numField("mutual_funds_value", v)} step="0.01" />
                            <NumberField label="Bank FDs" value={form.bank_fd_value} onChange={(v) => numField("bank_fd_value", v)} step="0.01" />
                            <NumberField label="Post Office" value={form.post_office_value} onChange={(v) => numField("post_office_value", v)} step="0.01" />
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block mb-1 font-semibold text-[#94a3b8]">Comment (optional)</label>
                        <textarea
                            rows={2}
                            maxLength={255}
                            placeholder="e.g. Combined family holdings as of 2023"
                            value={form.comment}
                            onChange={(e) => setForm({ ...form, comment: e.target.value })}
                            className="w-full rounded-xl border border-[#2d3348] bg-[#151827] p-2.5 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] px-4 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                    >
                        <Save className="h-3 w-3" />
                        {saving ? "Saving…" : "Save Past Investments"}
                    </button>
                </form>
            )}
        </div>
    );
}

function SummaryPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl border border-[#2d3348] bg-[#151827] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">{label}</p>
            <p className="mt-1 text-sm font-bold text-[#f1f5f9]">{value}</p>
            {sub && <p className="mt-0.5 text-[10px] text-[#64748b]">{sub}</p>}
        </div>
    );
}

function NumberField({ label, value, onChange, step = "0.001" }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
    return (
        <div>
            <label className="block mb-1 text-[#94a3b8]">{label}</label>
            <input
                type="number"
                min="0"
                step={step}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-[#2d3348] bg-[#1a1d27] p-2 text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
            />
        </div>
    );
}