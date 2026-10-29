"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildSeed, type Transaction } from "./data";

/**
 * Transactions live in localStorage so the app is fully interactive without a backend.
 * Swap `load` / `persist` and the three mutators for API calls later.
 */
const KEY = "spendwise.transactions.v2";
const LEGACY_KEY = "spendwise.transactions.v1";

/** Fields the caller provides when creating a transaction. */
export type NewTransaction = Pick<Transaction, "type" | "title" | "note" | "amount" | "date" | "category" | "account"> &
  Partial<Pick<Transaction, "receipt">>;
/** Fields that may change when editing. Setting `receipt: undefined` removes the receipt. */
export type TransactionPatch = Partial<Omit<Transaction, "id" | "createdAt">>;

type Store = {
  transactions: Transaction[];
  ready: boolean;
  now: Date;
  addTransaction: (input: NewTransaction) => Transaction;
  updateTransaction: (id: string, patch: TransactionPatch) => void;
  deleteTransaction: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

/** v1 had no accounts and a boolean receipt flag. Keep the user's own entries, drop the old demo rows. */
function migrateLegacy(): Transaction[] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw);
    if (!Array.isArray(old)) return null;
    return old
      .filter((t) => typeof t?.id === "string" && !t.id.startsWith("seed-"))
      .map((t) => {
        const { hasReceipt, ...rest } = t;
        return {
          ...rest,
          account: "cash",
          status: "confirmed",
          ...(hasReceipt ? { receipt: { name: "receipt.jpg", size: 0, kind: "image" } } : {}),
        } as Transaction;
      });
  } catch {
    return null;
  }
}

function load(now: Date): Transaction[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Transaction[];
    }
  } catch {
    /* fall through to seed */
  }
  return [...buildSeed(now), ...(migrateLegacy() ?? [])];
}

function persist(list: Transaction[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `t-${Date.now()}-${Math.random()}`;

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date(0));

  useEffect(() => {
    const current = new Date();
    const initial = load(current);
    persist(initial);
    startTransition(() => {
      setNow(current);
      setTransactions(initial);
      setReady(true);
    });
  }, []);

  const commit = useCallback((update: (prev: Transaction[]) => Transaction[]) => {
    setTransactions((prev) => {
      const next = update(prev);
      persist(next);
      return next;
    });
    setNow(new Date());
  }, []);

  const addTransaction = useCallback(
    (input: NewTransaction) => {
      const created: Transaction = { ...input, id: newId(), status: "confirmed", createdAt: Date.now() };
      commit((prev) => [...prev, created]);
      return created;
    },
    [commit],
  );

  const updateTransaction = useCallback(
    (id: string, patch: TransactionPatch) => commit((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [commit],
  );

  const deleteTransaction = useCallback((id: string) => commit((prev) => prev.filter((t) => t.id !== id)), [commit]);

  const value = useMemo(
    () => ({ transactions, ready, now, addTransaction, updateTransaction, deleteTransaction }),
    [transactions, ready, now, addTransaction, updateTransaction, deleteTransaction],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransactions(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransactions must be used inside <TransactionsProvider>");
  return ctx;
}
