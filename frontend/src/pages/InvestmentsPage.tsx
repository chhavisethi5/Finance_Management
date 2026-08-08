/**
 * InvestmentsPage.tsx — /dashboard/investments
 *
 * Layout:
 *  1. Initial Past Investments Setup (InvestmentProfileCard) — top of page.
 *  2. "+ Add New Investment" button (top right) — opens InvestmentModal.
 *  3. Search/filter bar + Investment History table with Edit/Delete.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, Search } from "lucide-react";
import { getInvestments, deleteInvestment, formatINR, getErrorMessage } from "../api";
import type { Investment, InvestmentType } from "../api";
import { useAuth } from "../context/AuthContext";
import { INVESTMENT_TYPES } from "../constants/investmentTypes";
import InvestmentModal from "../components/InvestmentModal";

export default function InvestmentsPage() {
    const { currentUser } = useAuth();

    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<InvestmentType | "All">("All");

    const [showAddModal, setShowAddModal] = useState(false);
    const [isPastMode, setIsPastMode] = useState(false);
    const [editingItem, setEditingItem] = useState<Investment | null>(null);

    const fetchInvestments = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        setError("");
        try {
            const data = await getInvestments(currentUser.id, {
                investment_type: typeFilter === "All" ? undefined : typeFilter,
                search: search.trim() || undefined,
            });
            setInvestments(data);
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Could not load your investments."));
        } finally {
            setLoading(false);
        }
    }, [currentUser, typeFilter, search]);

    // Debounce the search box so we don't fire a request on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => void fetchInvestments(), 300);
        return () => clearTimeout(timer);
    }, [fetchInvestments]);

    const handleDelete = async (item: Investment) => {
        const confirmed = window.confirm(
            item.is_past
                ? `Delete this past ${item.investment_type} investment of ${formatINR(Number(item.amount))}? This cannot be undone.`
                : `Delete this ${item.investment_type} investment of ${formatINR(Number(item.amount))}? This refunds the amount back into your Liquid Assets and can't be undone.`
        );
        if (!confirmed) return;

        setDeletingId(item.id);
        setError("");
        try {
            await deleteInvestment(item.id);
            setInvestments((prev) => prev.filter((i) => i.id !== item.id));
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to delete investment."));
        } finally {
            setDeletingId(null);
        }
    };

    const totalInvested = investments.reduce((sum, i) => sum + Number(i.amount), 0);

    if (!currentUser) return null;

    return (
        <>
            <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-xl font-bold text-[#f1f5f9]">Investments</h3>
                    <p className="text-sm text-[#475569] mt-0.5">Track your portfolio across property, metals, and funds.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setIsPastMode(true);
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 rounded-xl border border-[#2d3348] bg-[#1a1d27] px-4 py-2.5 text-sm font-semibold text-[#f1f5f9] hover:bg-[#22263a] hover:border-[#4f8ef7]/50 hover:text-[#4f8ef7] transition-all shadow-md"
                    >
                        <Plus className="h-4 w-4" />
                        Add Past Investments
                    </button>
                    <button
                        onClick={() => {
                            setIsPastMode(false);
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f8ef7] to-[#6c63ff] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 transition-opacity"
                    >
                        <Plus className="h-4 w-4" />
                        Add New Investment
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>
            )}

            {/* ── Investment History ── */}
            <div className="rounded-2xl border border-[#2d3348] bg-[#1e2235] p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#252a3e] text-[#4f8ef7]">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#f1f5f9]">Investment History</h4>
                            <p className="text-[11px] text-[#64748b]">
                                {investments.length} {investments.length === 1 ? "entry" : "entries"} · {formatINR(totalInvested)} total
                            </p>
                        </div>
                    </div>

                    {/* Search / filter bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#475569]" />
                            <input
                                type="text"
                                placeholder="Search by type, sub-type, or comment…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-56 rounded-xl border border-[#2d3348] bg-[#151827] py-2 pl-9 pr-3 text-xs text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as InvestmentType | "All")}
                            className="rounded-xl border border-[#2d3348] bg-[#151827] px-3 py-2 text-xs text-[#f1f5f9] outline-none focus:border-[#4f8ef7]"
                        >
                            <option value="All">All Types</option>
                            {INVESTMENT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-xs text-[#64748b]">Loading your investments…</div>
                ) : investments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#2d3348] bg-[#151827] p-8 text-center text-xs text-[#94a3b8]">
                        {search || typeFilter !== "All" ? "No investments match your search/filter." : "No investments logged yet."}{" "}
                        {!search && typeFilter === "All" && (
                            <button onClick={() => setShowAddModal(true)} className="font-semibold text-[#4f8ef7] hover:underline">
                                Add your first one
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#2d3348] text-[#475569]">
                                    <th className="pb-3 text-left font-medium">Date</th>
                                    <th className="pb-3 text-left font-medium">Type</th>
                                    <th className="pb-3 text-left font-medium">Details</th>
                                    <th className="pb-3 text-left font-medium">Comment</th>
                                    <th className="pb-3 text-right font-medium">Amount</th>
                                    <th className="pb-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investments.map((item) => (
                                    <tr key={item.id} className="border-b border-[#2d3348] last:border-0 hover:bg-[#22263a] transition-colors">
                                        <td className="py-3 text-[#94a3b8]">{item.investment_date}</td>
                                        <td className="py-3">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#4f8ef7]/10 px-2 py-0.5 text-xs font-semibold text-[#4f8ef7]">
                                                    {item.investment_type}
                                                </span>
                                                {item.is_past && (
                                                    <span className="text-[10px] text-[#fbbf24] font-medium px-1 bg-[#fbbf24]/10 rounded border border-[#fbbf24]/20">
                                                        Past Portfolio
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 text-[#94a3b8]">
                                            {item.sub_type ? (
                                                <>
                                                    {item.sub_type}
                                                    {item.quantity !== null && (
                                                        <span className="text-[#64748b]">
                                                            {" "}
                                                            · {item.quantity}
                                                            {item.investment_type === "Commodities" ? " g" : item.investment_type === "Property" ? (item.quantity === 1 ? " property" : " properties") : ""}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-[#334155]">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-[#64748b] italic max-w-[200px] truncate">
                                            {item.comment ? `“${item.comment}”` : <span className="not-italic text-[#334155]">—</span>}
                                        </td>
                                        <td className="py-3 text-right font-semibold text-[#f1f5f9]">{formatINR(Number(item.amount))}</td>
                                        <td className="py-3">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    type="button"
                                                    aria-label="Edit investment"
                                                    onClick={() => setEditingItem(item)}
                                                    className="text-[#64748b] hover:text-[#4f8ef7] transition-colors"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label="Delete investment"
                                                    disabled={deletingId === item.id}
                                                    onClick={() => handleDelete(item)}
                                                    className="text-[#64748b] hover:text-[#f87171] transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {showAddModal && (
            <InvestmentModal
                userId={currentUser.id}
                isPastMode={isPastMode}
                onClose={() => setShowAddModal(false)}
                onSaved={() => {
                    setShowAddModal(false);
                    void fetchInvestments();
                }}
            />
        )}

        {editingItem && (
            <InvestmentModal
                userId={currentUser.id}
                editingItem={editingItem}
                onClose={() => setEditingItem(null)}
                onSaved={() => {
                    setEditingItem(null);
                    void fetchInvestments();
                }}
            />
        )}
    </>
);
}