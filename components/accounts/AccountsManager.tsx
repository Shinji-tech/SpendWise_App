"use client";

import { useState, type FormEvent } from "react";
import { ACCOUNT_TYPE_LABEL, type AccountType, type FinancialAccount } from "@/lib/data";
import { balanceForAccount } from "@/lib/finance";
import { formatVnd } from "@/lib/format";
import { useTransactions } from "@/lib/store";

const inputClass =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none transition hover:border-ink-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-100";

export default function AccountsManager() {
  const { accounts, transactions, addAccount, updateAccount } = useTransactions();
  const [editing, setEditing] = useState<FinancialAccount | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [openingDigits, setOpeningDigits] = useState("0");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setType("cash");
    setOpeningDigits("0");
    setError(null);
  };

  const editAccount = (account: FinancialAccount) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setOpeningDigits(String(account.openingBalance));
    setError(null);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const openingBalance = Number(openingDigits);
    if (name.trim().length < 2 || name.trim().length > 60) {
      setError("Enter an account name between 2 and 60 characters.");
      return;
    }
    if (!Number.isSafeInteger(openingBalance) || openingBalance < 0) {
      setError("Enter a non-negative whole-number opening balance.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateAccount(editing.id, {
          name: name.trim(),
          type,
          openingBalance,
          archived: editing.archived,
        });
      } else {
        await addAccount({ name: name.trim(), type, openingBalance });
      }
      resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this account.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchived(account: FinancialAccount) {
    setPendingId(account.id);
    setActionError(null);
    try {
      await updateAccount(account.id, {
        name: account.name,
        type: account.type,
        openingBalance: account.openingBalance,
        archived: !account.archived,
      });
      if (editing?.id === account.id) resetForm();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not update this account.");
    } finally {
      setPendingId(null);
    }
  }

  const totalBalance = accounts.reduce((total, account) => total + balanceForAccount(account, transactions), 0);

  return (
    <div className="space-y-4 pb-20">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">Accounts</h1>
        <p className="mt-0.5 text-sm text-ink-500">Manage your cash, e-wallets, and bank accounts.</p>
      </header>

      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <p className="text-xs font-medium text-ink-500">Combined balance</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-ink-900">{formatVnd(totalBalance)}</p>
      </section>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">{editing ? "Edit account" : "Add an account"}</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Each account belongs only to you. You can add as many as you need.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px] font-medium text-ink-700">
            Account name
            <input
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Personal bank"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block text-[13px] font-medium text-ink-700">
            Type
            <select value={type} onChange={(event) => setType(event.target.value as AccountType)} className={`${inputClass} mt-1.5`}>
              {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((value) => (
                <option key={value} value={value}>{ACCOUNT_TYPE_LABEL[value]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block max-w-sm text-[13px] font-medium text-ink-700">
          Opening balance
          <div className="relative mt-1.5">
            <input
              inputMode="numeric"
              maxLength={16}
              value={openingDigits ? Number(openingDigits).toLocaleString("en-US") : ""}
              onChange={(event) => setOpeningDigits(event.target.value.replace(/\D/g, ""))}
              className={`${inputClass} pr-14 tabular-nums`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-ink-500">VND</span>
          </div>
        </label>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="h-10 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">
            {saving ? "Saving…" : editing ? "Save changes" : "Add account"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} disabled={saving} className="h-10 rounded-xl border border-ink-200 px-4 text-sm font-semibold text-ink-700 hover:bg-ink-50">
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink-900">Your accounts</h2>
          <p className="text-xs text-ink-500">Archived accounts stay in transaction history and can be restored.</p>
        </div>
        {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}
        <ul className="mt-3 divide-y divide-ink-100">
          {accounts.map((account) => (
            <li key={account.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-900">{account.name}</p>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                    {ACCOUNT_TYPE_LABEL[account.type]}
                  </span>
                  {account.archived && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Archived</span>}
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  Opening {formatVnd(account.openingBalance)} · Current {formatVnd(balanceForAccount(account, transactions))}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => editAccount(account)} className="h-9 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50">
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pendingId === account.id}
                  onClick={() => void toggleArchived(account)}
                  className="h-9 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
                >
                  {pendingId === account.id ? "Saving…" : account.archived ? "Restore" : "Archive"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
