import { CATEGORY_LABEL } from "@/lib/data";
import type { Summary } from "@/lib/finance";
import { formatVnd } from "@/lib/format";
import Card from "./Card";

/** Housing is a fixed bill, so the card highlights the three flexible budgets under the most pressure. */
export default function BudgetUsage({ summary }: { summary: Summary }) {
  const flexible = summary.budgets.filter((b) => b.category !== "housing");
  const shown = [...flexible].sort((a, b) => b.ratio - a.ratio).slice(0, 3);
  const ordered = flexible.filter((b) => shown.includes(b));

  return (
    <Card
      title="Budget usage"
      subtitle={`${summary.budgetUsedPct}% of combined limits used · selected categories`}
      action={{ label: "View all budgets", href: "/budgets" }}
    >
      <ul className="space-y-3.5">
        {ordered.map((b) => {
          const over = b.over > 0;
          return (
            <li key={b.category}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                <span className={`font-medium ${over ? "text-red-600" : "text-ink-900"}`}>{CATEGORY_LABEL[b.category]}</span>
                <span className={`tabular-nums ${over ? "text-red-600" : "text-ink-700"}`}>
                  {formatVnd(b.spent)} / {formatVnd(b.limit)}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-ink-100"
                role="progressbar"
                aria-label={`${CATEGORY_LABEL[b.category]} budget`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(b.ratio * 100))}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-600" : "bg-accent-600"}`}
                  style={{ width: `${Math.min(100, b.ratio * 100)}%` }}
                />
              </div>
              {over && <p className="mt-1 text-xs font-medium text-red-600">{formatVnd(b.over)} over budget</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
