"use client";

import { useState, type FormEvent } from "react";
import { formatVnd } from "@/lib/format";
import { useTransactions } from "@/lib/store";
import type { Goal } from "@/lib/data";

const blank = { name: "", saved: "0", target: "", due: "" };

export default function GoalManager() {
  const { goals, addGoal, updateGoal, deleteGoal } = useTransactions();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit(goal: Goal) {
    setEditing(goal);
    setForm({ name: goal.name, saved: String(goal.saved), target: String(goal.target), due: goal.due });
  }

  function reset() {
    setEditing(null);
    setForm(blank);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = Number(form.saved);
    const target = Number(form.target);
    if (form.name.trim().length < 2 || form.name.trim().length > 60) {
      setError("Enter a goal name between 2 and 60 characters.");
      return;
    }
    if (!Number.isSafeInteger(saved) || saved < 0) {
      setError("Saved amount must be non-negative.");
      return;
    }
    if (!Number.isSafeInteger(target) || target <= 0) {
      setError("Target amount must be positive.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.due)) {
      setError("Choose a valid due date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { name: form.name.trim(), saved, target, due: form.due };
      if (editing) await updateGoal(editing.id, input);
      else await addGoal(input);
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this goal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">{editing ? "Edit goal" : "Create goal"}</h2>
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={60} placeholder="Goal name" className="h-11 w-full rounded-xl border border-ink-200 px-3.5 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input inputMode="numeric" value={form.saved} onChange={(event) => setForm((current) => ({ ...current, saved: event.target.value.replace(/\D/g, "") }))} placeholder="Saved" className="h-11 rounded-xl border border-ink-200 px-3.5 text-sm" />
          <input inputMode="numeric" value={form.target} onChange={(event) => setForm((current) => ({ ...current, target: event.target.value.replace(/\D/g, "") }))} placeholder="Target" className="h-11 rounded-xl border border-ink-200 px-3.5 text-sm" />
        </div>
        <input type="date" value={form.due} onChange={(event) => setForm((current) => ({ ...current, due: event.target.value }))} className="h-11 w-full rounded-xl border border-ink-200 px-3.5 text-sm" />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editing ? "Save changes" : "Create goal"}</button>
          {editing && <button type="button" onClick={reset} className="h-10 rounded-xl border border-ink-200 px-4 text-sm font-semibold text-ink-700">Cancel</button>}
        </div>
      </form>
      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Your goals</h2>
        <ul className="mt-3 divide-y divide-ink-100">
          {goals.map((goal) => (
            <li key={goal.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-ink-900">{goal.name}</p>
                <p className="text-xs text-ink-500">{formatVnd(goal.saved)} of {formatVnd(goal.target)} · due {goal.due}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => edit(goal)} className="h-9 rounded-lg border border-ink-200 px-3 text-xs font-semibold">Edit</button>
                <button type="button" onClick={() => void deleteGoal(goal.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not delete goal."))} className="h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700">Delete</button>
              </div>
            </li>
          ))}
          {!goals.length && <li className="py-4 text-sm text-ink-500">No saving goals yet.</li>}
        </ul>
      </section>
    </div>
  );
}
