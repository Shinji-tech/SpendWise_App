"use client";

import { useState } from "react";
import { CATEGORY_LABEL } from "@/lib/data";
import type { Summary } from "@/lib/finance";
import { formatVnd } from "@/lib/format";
import Card from "./Card";

export default function SpendByCategory({ summary }: { summary: Summary }) {
  const [active, setActive] = useState<string | null>(null);
  const max = summary.byCategory[0]?.amount ?? 0;

  return (
    <Card title="Spend by category" subtitle={`${summary.monthLabel} · ${formatVnd(summary.expenses)} recorded expenses`}>
      {summary.byCategory.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-500">No expenses recorded yet this month.</p>
      ) : (
        <ul className="space-y-2.5">
          {summary.byCategory.map((c) => {
            const isActive = active === c.category;
            return (
              <li
                key={c.category}
                onMouseEnter={() => setActive(c.category)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(c.category)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent-200"
              >
                <div className="mb-1 flex items-baseline justify-between text-[13px]">
                  <span className="font-medium text-ink-900">{CATEGORY_LABEL[c.category]}</span>
                  <span className="tabular-nums text-ink-700">
                    {formatVnd(c.amount)}
                    <span className={`ml-1.5 text-xs transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`}>{c.share}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isActive ? "bg-accent-700" : "bg-accent-600"}`}
                    style={{ width: `${max ? (c.amount / max) * 100 : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {summary.byCategory.length > 0 && (
        <p className="mt-3 text-[11px] text-ink-500">Bars are scaled to {CATEGORY_LABEL[summary.byCategory[0].category]}, the largest category.</p>
      )}
    </Card>
  );
}
