import { GOALS } from "@/lib/data";
import { formatDate, formatVnd, percent } from "@/lib/format";
import Card from "./Card";

function Ring({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#059669"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value / 100))}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-900">{value}%</span>
    </div>
  );
}

export default function SavingGoals({ className = "" }: { className?: string }) {
  const earmarked = GOALS.reduce((acc, g) => acc + g.saved, 0);
  return (
    <Card
      title="Saving goals"
      subtitle={`${formatVnd(earmarked)} earmarked within your bank balance`}
      action={{ label: "View goals", href: "/goals" }}
      className={className}
    >
      <ul className="flex h-full flex-col justify-around gap-3">
        {GOALS.map((g) => (
          <li key={g.id} className="flex items-center gap-3">
            <Ring value={percent(g.saved, g.target)} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">{g.name}</p>
              <p className="text-xs text-ink-700 tabular-nums">
                {formatVnd(g.saved)} of {formatVnd(g.target)}
              </p>
              <p className="text-xs text-ink-500">By {formatDate(g.due)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
