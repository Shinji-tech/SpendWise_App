"use client";

import { useState } from "react";
import type { Summary } from "@/lib/finance";
import { formatCompactVnd, formatVnd } from "@/lib/format";
import Card from "./Card";

// Two series: dark blue = income, light blue = expenses. Separated by lightness (CVD-safe),
// both direct-labelled and listed in the tooltip / hidden table because the light blue is low-contrast.
const INCOME = "#047857";
const EXPENSE = "#2fcf9c";

const W = 320;
const H = 150;
const TOP = 38;
const BASE = 112;
const X = [78, 242]; // previous month, this month

export default function IncomeExpenseChart({ summary }: { summary: Summary }) {
  const [hover, setHover] = useState<number | null>(null);

  const months = [summary.prevMonthLabel, summary.monthLabel.replace(/^(\w{3})\w*/, "$1")];
  const income = [summary.prevIncome, summary.income];
  const expenses = [summary.prevExpenses, summary.expenses];

  const peak = Math.max(...income, ...expenses, 1);
  const niceMax = Math.max(2_000_000, Math.ceil(peak / 2_000_000) * 2_000_000);
  const y = (v: number) => BASE - (v / niceMax) * (BASE - TOP);
  const ticks = [0, niceMax / 2, niceMax];

  const line = (values: number[]) => values.map((v, i) => `${X[i]},${y(v)}`).join(" ");
  const tipLeft = hover === null ? 0 : (X[hover] / W) * 100;

  return (
    <Card
      title="Monthly income vs. expenses"
      subtitle={`${summary.prevMonthLabel.split(" ")[0]} total → ${summary.monthLabel.split(" ")[0]} month to date`}
    >
      <ul className="mb-1 flex items-center gap-3 text-xs text-ink-700">
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: INCOME }} />
          Income
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: EXPENSE }} />
          Expenses
        </li>
      </ul>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Income and expenses, previous month versus this month so far">
          {/* grid + y axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1="34" x2={W - 8} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={t === 0 ? undefined : "3 3"} />
              <text x="28" y={y(t) + 3} textAnchor="end" fontSize="9" fill="#64748b">
                {formatCompactVnd(t)}
              </text>
            </g>
          ))}

          {/* crosshair */}
          {hover !== null && <line x1={X[hover]} x2={X[hover]} y1={TOP - 14} y2={BASE} stroke="#94a3b8" strokeWidth="1" />}

          {/* lines */}
          <polyline points={line(income)} fill="none" stroke={INCOME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={line(expenses)} fill="none" stroke={EXPENSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* points + direct labels */}
          {X.map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={y(income[i])} r={hover === i ? 5 : 4} fill={INCOME} stroke="#fff" strokeWidth="2" />
              <circle cx={x} cy={y(expenses[i])} r={hover === i ? 5 : 4} fill={EXPENSE} stroke="#fff" strokeWidth="2" />
              <text x={x} y={y(income[i]) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="#0f172a">
                {formatVnd(income[i])}
              </text>
              <text x={x} y={y(expenses[i]) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">
                {formatVnd(expenses[i])}
              </text>
              <text x={x} y={BASE + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                {months[i]}
              </text>
            </g>
          ))}

          {/* hover / focus targets, wider than the marks */}
          {X.map((x, i) => (
            <rect
              key={x}
              x={x - 60}
              y={0}
              width={120}
              height={H}
              fill="transparent"
              tabIndex={0}
              aria-label={`${months[i]}: income ${formatVnd(income[i])}, expenses ${formatVnd(expenses[i])}`}
              className="outline-none"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs shadow-card"
            style={{ left: `${Math.min(80, Math.max(20, tipLeft))}%` }}
          >
            <p className="mb-0.5 font-semibold text-ink-900">{months[hover]}</p>
            <p className="flex items-center gap-1.5 text-ink-700">
              <span className="h-2 w-2 rounded-full" style={{ background: INCOME }} /> Income {formatVnd(income[hover])}
            </p>
            <p className="flex items-center gap-1.5 text-ink-700">
              <span className="h-2 w-2 rounded-full" style={{ background: EXPENSE }} /> Expenses {formatVnd(expenses[hover])}
            </p>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Income and expenses by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Income</th>
            <th>Expenses</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m}>
              <td>{m}</td>
              <td>{formatVnd(income[i])}</td>
              <td>{formatVnd(expenses[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-1 text-[11px] text-ink-500">
        {summary.monthLabel.split(" ")[0]} covers {summary.rangeLabel.replace(/ \d{4}$/, "")}, not a completed month.
      </p>
    </Card>
  );
}
