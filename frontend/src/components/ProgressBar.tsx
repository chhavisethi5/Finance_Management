/**
 * ProgressBar.tsx — Reusable budget bucket progress bar
 */

const usd = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

interface ProgressBarProps {
  label: string;
  target: number;
  spent: number;
  isOverBudget: boolean;
  colorClass: "green" | "amber" | "red" | "purple";
}

export default function ProgressBar({
  label,
  target,
  spent,
  isOverBudget,
  colorClass,
}: ProgressBarProps) {
  const pct = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
  const remaining = target - spent;

  return (
    <div className="budget-bucket">
      <div className="bucket-header">
        <span className="bucket-label">{label}</span>
        <span className="bucket-values">
          {usd(spent)} / {usd(target)}
        </span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${isOverBudget ? "red" : colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`bucket-footer ${isOverBudget ? "text-red" : "text-green"}`}>
        {isOverBudget
          ? `⚠ Over by ${usd(Math.abs(remaining))}`
          : `✓ ${usd(remaining)} remaining`}
      </div>
    </div>
  );
}
