"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ACCOUNTS,
  CATEGORY_LABEL,
  EXPENSE_CATEGORIES,
  isDraft,
  type AccountId,
  type Receipt,
  type TransactionCategory,
} from "@/lib/data";
import { formatBytes, formatDate, formatVnd, toISODate } from "@/lib/format";
import { useTransactions } from "@/lib/store";
import { ChevronDownIcon, CloseIcon, FileIcon, PaperclipIcon, TrashIcon } from "../app-icons";
import Alert from "../Alert";
import { SpinnerIcon } from "../icons";

export type DrawerMode = { kind: "add" } | { kind: "edit"; id: string };

type Props = { mode: DrawerMode; onClose: () => void; onToast: (message: string) => void };
type Errors = Partial<Record<"amount" | "title" | "category" | "account" | "date", string>>;

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const inputCls =
  "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 hover:border-ink-400 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 disabled:bg-ink-100 disabled:text-ink-500";

function Labeled({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Slide-over used for both "Add transaction" and "Edit transaction". */
export default function TransactionDrawer({ mode, onClose, onToast }: Props) {
  const { transactions, now, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const existing = mode.kind === "edit" ? transactions.find((t) => t.id === mode.id) : undefined;
  const editing = mode.kind === "edit";
  const draft = existing ? isDraft(existing) : false;

  const uid = useId();
  const panelRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(null);

  const [type, setType] = useState<"expense" | "income">(existing?.type ?? "expense");
  const [digits, setDigits] = useState(existing ? String(existing.amount) : "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<TransactionCategory | "">(existing?.category ?? "");
  const [account, setAccount] = useState<AccountId | "">(existing?.account ?? "");
  const [date, setDate] = useState(existing?.date ?? toISODate(now));
  const [note, setNote] = useState(existing?.note ?? "");
  const [receipt, setReceipt] = useState<Receipt | undefined>(existing?.receipt);
  const [errors, setErrors] = useState<Errors>({});
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Transaction vanished (deleted elsewhere): nothing left to edit.
  useEffect(() => {
    if (editing && !existing && !saving) onClose();
  }, [editing, existing, saving, onClose]);

  // Focus management: move focus in, trap Tab, restore on close, close on Escape.
  useEffect(() => {
    returnFocus.current = document.activeElement;
    const first = panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button");
    const id = requestAnimationFrame(() => (document.getElementById(`${uid}-amount`) ?? first)?.focus());
    return () => {
      cancelAnimationFrame(id);
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [uid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>("input:not([type=file]), select, textarea, button:not(:disabled)")];
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  if (editing && !existing) return null;

  const displayAmount = digits ? Number(digits).toLocaleString("en-US") : "";
  const clearError = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  function chooseType(next: "expense" | "income") {
    setType(next);
    setCategory(next === "income" ? "income" : category === "income" ? "" : category);
    clearError("category");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImage = /^image\/(jpeg|png)$/.test(file.type) || /\.(jpe?g|png)$/i.test(file.name);
    if (!isPdf && !isImage) return setReceiptError("Use a JPG, PNG or PDF file.");
    if (file.size > MAX_RECEIPT_BYTES) return setReceiptError("That file is larger than 10 MB.");
    setReceiptError(null);
    setReceipt({ name: file.name, size: file.size, kind: isPdf ? "pdf" : "image" });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const value = Number(digits);
    const next: Errors = {};
    if (!value) next.amount = "Enter an amount greater than 0.";
    if (title.trim().length < 2) next.title = "Enter a merchant or description.";
    if (!category) next.category = "Choose a category.";
    if (!account) next.account = "Choose an account.";
    if (!date) next.date = "Pick a date.";
    else if (date > toISODate(new Date())) next.date = "Date can't be in the future.";
    setErrors(next);
    const firstBad = (["amount", "title", "category", "account", "date"] as const).find((k) => next[k]);
    if (firstBad) {
      document.getElementById(`${uid}-${firstBad}`)?.focus();
      return;
    }

    setSaving(true);
    window.setTimeout(() => {
      const fields = {
        type,
        title: title.trim(),
        note: note.trim(),
        amount: value,
        date,
        category: (type === "income" ? "income" : category) as TransactionCategory,
        account: account as AccountId,
        receipt,
      };
      if (existing) {
        updateTransaction(existing.id, { ...fields, status: "confirmed" });
        onToast(draft ? `Receipt confirmed · ${formatVnd(value)} posted` : "Changes saved");
      } else {
        addTransaction(fields);
        onToast(`${type === "income" ? "Income" : "Expense"} of ${formatVnd(value)} added`);
      }
      onClose();
    }, 350);
  }

  function onDelete() {
    if (!existing) return;
    deleteTransaction(existing.id);
    onToast("Transaction deleted");
    onClose();
  }

  const heading = editing ? "Edit transaction" : "Add transaction";
  const submitLabel = editing ? (draft ? "Confirm transaction" : "Save changes") : "Add transaction";
  const attachedLabel = receipt ? `Receipt attached · 1 ${receipt.kind === "pdf" ? "PDF" : "image"}${receipt.size ? ` · ${formatBytes(receipt.size)}` : ""}` : "";

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/40" onMouseDown={() => !saving && onClose()} aria-hidden="true" />

      <form
        ref={panelRef}
        noValidate
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-heading`}
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] animate-slide-in flex-col bg-white shadow-[-20px_0_50px_-20px_rgba(15,23,42,0.35)]"
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <h2 id={`${uid}-heading`} className="text-xl font-semibold tracking-tight text-ink-900">
              {heading}
            </h2>
            <p className="mt-1 truncate text-sm text-ink-500">
              {existing ? `${existing.title} · ${formatDate(existing.date)}` : "Record it now. Understand it later."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {editing && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete transaction"
                title="Delete transaction"
                className="rounded-lg p-1.5 text-ink-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-5 pt-1">
          {draft && (
            <Alert tone="info">
              This is a receipt draft. It isn&apos;t counted in your balance, budgets or analytics until you confirm it. Check the details below.
            </Alert>
          )}

          <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => chooseType(t)}
                className={`h-11 rounded-xl border text-sm font-semibold capitalize transition focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200 ${
                  type === t ? "border-accent-600 bg-accent-600 text-white" : "border-ink-200 bg-white text-accent-600 hover:bg-accent-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <Labeled label="Amount" htmlFor={`${uid}-amount`} error={errors.amount}>
            <div className="relative">
              <input
                id={`${uid}-amount`}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                maxLength={15}
                value={displayAmount}
                onChange={(e) => {
                  setDigits(e.target.value.replace(/\D/g, ""));
                  clearError("amount");
                }}
                aria-invalid={!!errors.amount}
                className={`${inputCls} pr-8 text-base font-semibold tabular-nums ${errors.amount ? "border-red-400" : "border-ink-200"}`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-ink-500">đ</span>
            </div>
          </Labeled>

          <Labeled label="Merchant / description" htmlFor={`${uid}-title`} error={errors.title}>
            <input
              id={`${uid}-title`}
              value={title}
              maxLength={60}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
              placeholder="Enter merchant or description"
              aria-invalid={!!errors.title}
              className={`${inputCls} ${errors.title ? "border-red-400" : "border-ink-200"}`}
            />
          </Labeled>

          <Labeled label="Category" htmlFor={`${uid}-category`} error={errors.category}>
            <div className="relative">
              <select
                id={`${uid}-category`}
                value={category}
                disabled={type === "income"}
                onChange={(e) => {
                  setCategory(e.target.value as TransactionCategory);
                  clearError("category");
                }}
                aria-invalid={!!errors.category}
                className={`${inputCls} appearance-none pr-9 ${category ? "" : "text-ink-400"} ${errors.category ? "border-red-400" : "border-ink-200"}`}
              >
                {type === "income" ? (
                  <option value="income">{CATEGORY_LABEL.income}</option>
                ) : (
                  <>
                    <option value="" disabled>
                      Select category
                    </option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="text-ink-900">
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            </div>
          </Labeled>

          <Labeled label="Account" htmlFor={`${uid}-account`} error={errors.account}>
            <div className="relative">
              <select
                id={`${uid}-account`}
                value={account}
                onChange={(e) => {
                  setAccount(e.target.value as AccountId);
                  clearError("account");
                }}
                aria-invalid={!!errors.account}
                className={`${inputCls} appearance-none pr-9 ${account ? "" : "text-ink-400"} ${errors.account ? "border-red-400" : "border-ink-200"}`}
              >
                <option value="" disabled>
                  Select account
                </option>
                {ACCOUNTS.map((a) => (
                  <option key={a.id} value={a.id} className="text-ink-900">
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            </div>
          </Labeled>

          <Labeled label="Date" htmlFor={`${uid}-date`} error={errors.date}>
            <input
              id={`${uid}-date`}
              type="date"
              value={date}
              max={toISODate(new Date())}
              onChange={(e) => {
                setDate(e.target.value);
                clearError("date");
              }}
              aria-invalid={!!errors.date}
              className={`${inputCls} ${errors.date ? "border-red-400" : "border-ink-200"}`}
            />
          </Labeled>

          <Labeled label="Note" htmlFor={`${uid}-note`}>
            <textarea
              id={`${uid}-note`}
              value={note}
              rows={2}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a personal note (optional)"
              className={`${inputCls} h-auto resize-none border-ink-200 py-2.5`}
            />
          </Labeled>

          <div className="rounded-xl border border-ink-200 bg-ink-100/50 p-4">
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="hidden" onChange={onFile} aria-label="Receipt file" />
            {receipt ? (
              <div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-accent-600">{receipt.kind === "pdf" ? <FileIcon className="h-5 w-5" /> : <PaperclipIcon className="h-5 w-5" />}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{receipt.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{attachedLabel}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="h-10 rounded-xl border border-ink-200 bg-white text-sm font-semibold text-accent-600 transition hover:bg-accent-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
                  >
                    Replace receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReceipt(undefined);
                      setReceiptError(null);
                    }}
                    className="h-10 rounded-xl px-3 text-sm font-medium text-ink-500 transition hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-accent-600">
                  <PaperclipIcon className="h-5 w-5" />
                </span>
                <p className="mt-1.5 text-sm font-semibold text-ink-900">Attach receipt</p>
                <p className="mt-0.5 text-xs text-ink-500">JPG, PNG or PDF · up to 10 MB</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 h-10 w-full rounded-xl border border-ink-200 bg-white text-sm font-semibold text-accent-600 transition hover:bg-accent-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
                >
                  Choose receipt
                </button>
              </div>
            )}
            {receiptError && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {receiptError}
              </p>
            )}
          </div>
        </div>

        <footer className="space-y-2 border-t border-ink-200 bg-white px-6 py-3.5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 text-sm font-semibold text-white transition hover:bg-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200 disabled:bg-accent-400"
          >
            {saving && <SpinnerIcon />}
            {saving ? "Saving…" : submitLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 w-full rounded-xl border border-ink-200 bg-white text-sm font-semibold text-accent-600 transition hover:bg-accent-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-200 disabled:opacity-60"
          >
            Cancel
          </button>

          {editing && confirmDelete && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <span>Delete this transaction? This can&apos;t be undone.</span>
              <span className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  Keep
                </button>
              </span>
            </div>
          )}
        </footer>
      </form>
    </div>
  );
}
