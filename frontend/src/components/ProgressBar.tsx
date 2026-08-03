import { formatINR } from "../api";

export type ProgressStatusColor = "green" | "blue" | "orange" | "red" | "amber" | "purple";

interface ProgressBarProps {
  label: string;
  target: number;
  current: number;  // Amount saved or spent
  isOverBudget?: boolean;
  status?: ProgressStatusColor;
  mode?: "spent" | "saved";
}

const COLOR_MAP: Record<ProgressStatusColor, { bar: string; text: string; bg: string }> = {
  green: {
    bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  blue: {
    bar: "bg-gradient-to-r from-blue-500 to-indigo-400",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  orange: {
    bar: "bg-gradient-to-r from-amber-500 to-orange-400",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  amber: {
    bar: "bg-gradient-to-r from-amber-500 to-orange-400",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  red: {
    bar: "bg-gradient-to-r from-rose-500 to-red-600",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  purple: {
    bar: "bg-gradient-to-r from-purple-500 to-violet-400",
    text: "text-purple-400",
    bg: "bg-purple-500/10",
  },
};

export default function ProgressBar({
  label,
  target,
  current,
  isOverBudget = false,
  status = "blue",
  mode = "spent",
}: ProgressBarProps) {
  const safeTarget = Math.max(0, target);
  const safeCurrent = Math.max(0, current);
  const rawPct = safeTarget > 0 ? (safeCurrent / safeTarget) * 100 : 0;
  const pct = Math.min(100, Math.max(0, Math.round(rawPct)));

  const remaining = safeTarget - safeCurrent;

  const colorScheme = isOverBudget
    ? COLOR_MAP.red
    : COLOR_MAP[status] || COLOR_MAP.blue;

  return (
    <div className="space-y-2 rounded-xl border border-[#2d3348] bg-[#151827] p-4">
      {/* ── Label + Values Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#f1f5f9]">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorScheme.bg} ${colorScheme.text}`}>
            {pct}%
          </span>
          <span className="text-xs font-medium text-[#94a3b8]">
            {formatINR(safeCurrent)} / {formatINR(safeTarget)}
          </span>
        </div>
      </div>

      {/* ── Thicker Progress Bar Track ── */}
      <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#22263a] p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 shadow-md ${colorScheme.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ── Footer Stats ── */}
      <div className="flex items-center justify-between text-xs text-[#94a3b8]">
        <span>
          {mode === "spent" ? "Spent: " : "Saved: "}
          <strong className="text-[#f1f5f9]">{formatINR(safeCurrent)}</strong>
        </span>
        <span className={isOverBudget ? "text-rose-400 font-semibold" : ""}>
          {isOverBudget
            ? `⚠ Over budget by ${formatINR(Math.abs(remaining))}`
            : `Remaining: ${formatINR(Math.max(0, remaining))}`}
        </span>
      </div>
    </div>
  );
}
