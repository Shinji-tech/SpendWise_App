"use client";

import { useState, type FormEvent } from "react";
import { CATEGORY_LABEL, EXPENSE_CATEGORIES } from "@/lib/data";
import { useTransactions } from "@/lib/store";

export default function BudgetManager() {
  const { budgets, saveBudget } = useTransactions();
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(category: string, event: FormEvent) {
    event.preventDefault();
    const raw = limits[category] ?? "";
    if (!raw) {
      setError("Enter a monthly limit before saving.");
      return;
    }
    const limit = Number(raw);
    if (!Number.isSafeInteger(limit) || limit < 0) {
      setError("Enter a non-negative whole-number monthly limit.");
      return;
    }
    setSaving(category);
    setError(null);
    try {
      await saveBudget(category, limit);
      setLimits((current) => ({ ...current, [category]: String(limit) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this budget.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-ink-200 bg-white p-5">
      <h2 className="text-[15px] font-semibold text-ink-900">Monthly limits</h2>
      <p className="text-sm text-ink-500">Choose your own limits. Categories without a saved amount are not included in budget totals.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="divide-y divide-ink-100">
        {EXPENSE_CATEGORIES.map((category) => {
          const budget = budgets.find((item) => item.category === category);
          return (
          <form key={category} onSubmit={(event) => void submit(category, event)} className="flex items-center gap-3 py-3">
            <label className="flex-1 text-sm font-medium text-ink-800">
              {CATEGORY_LABEL[category]}
              <span className="mt-1 block text-xs font-normal text-ink-500">{budget ? "Monthly limit set" : "No limit set"}</span>
            </label>
            <input
              inputMode="numeric"
              aria-label={`${CATEGORY_LABEL[category]} monthly limit`}
              placeholder="Enter amount"
              value={limits[category] ?? (budget ? String(budget.limit) : "")}
              onChange={(event) => setLimits((current) => ({ ...current, [category]: event.target.value.replace(/\D/g, "") }))}
              className="h-10 w-36 rounded-xl border border-ink-200 px-3 text-sm tabular-nums"
            />
            <button type="submit" disabled={saving === category} className="h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {saving === category ? "Saving…" : "Save"}
            </button>
          </form>
        );})}
      </div>
    </section>
  );
}
