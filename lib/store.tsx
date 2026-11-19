"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  EXPENSE_CATEGORIES,
  type FinancialAccount,
  type Receipt,
  type Transaction,
} from "./data";

const KEY = "spendwise.transactions.v2";
const LEGACY_KEY = "spendwise.transactions.v1";
const MIGRATION_PREFIX = "spendwise.transactions.imported.v3.";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export type NewTransaction = Pick<Transaction, "type" | "title" | "note" | "amount" | "date" | "category" | "account"> &
  Partial<Pick<Transaction, "receipt">> & { status?: "needs_review" | "confirmed" };
export type TransactionPatch = Partial<Omit<Transaction, "id" | "createdAt">>;
export type NewFinancialAccount = Pick<FinancialAccount, "name" | "type" | "openingBalance">;
export type FinancialAccountPatch = Pick<FinancialAccount, "name" | "type" | "openingBalance" | "archived">;

type Migration = { userId: string; transactions: Transaction[] };
type Store = {
  transactions: Transaction[];
  accounts: FinancialAccount[];
  ready: boolean;
  now: Date;
  error: string | null;
  migration: Migration | null;
  migrationError: string | null;
  migrationBusy: boolean;
  reload: () => void;
  importLocalTransactions: () => Promise<void>;
  skipLocalImport: () => void;
  addTransaction: (input: NewTransaction) => Promise<Transaction>;
  updateTransaction: (id: string, patch: TransactionPatch) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (input: NewFinancialAccount) => Promise<FinancialAccount>;
  updateAccount: (id: string, patch: FinancialAccountPatch) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReceipt(value: unknown): value is Receipt {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0 &&
    value.size <= MAX_RECEIPT_BYTES &&
    (value.kind === "image" || value.kind === "pdf") &&
    (value.id === undefined || typeof value.id === "string")
  );
}

function isFinancialAccount(value: unknown): value is FinancialAccount {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    (value.type === "cash" || value.type === "wallet" || value.type === "bank") &&
    typeof value.openingBalance === "number" &&
    Number.isSafeInteger(value.openingBalance) &&
    value.openingBalance >= 0 &&
    typeof value.archived === "boolean" &&
    typeof value.createdAt === "number" &&
    Number.isSafeInteger(value.createdAt)
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  const validCategory =
    value.category === "income" ||
    EXPENSE_CATEGORIES.some((category) => category === value.category);
  const validStatus =
    value.status === "confirmed" || value.status === "needs_review" || value.status === "processing";
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    (value.type === "income" || value.type === "expense") &&
    typeof value.title === "string" &&
    typeof value.note === "string" &&
    typeof value.amount === "number" &&
    Number.isSafeInteger(value.amount) &&
    value.amount > 0 &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    validCategory &&
    (value.type === "income" ? value.category === "income" : value.category !== "income") &&
    typeof value.account === "string" &&
    value.account.length > 0 &&
    value.account.length <= 40 &&
    validStatus &&
    (value.receipt === undefined || isReceipt(value.receipt)) &&
    typeof value.createdAt === "number" &&
    Number.isSafeInteger(value.createdAt)
  );
}

function readLocalTransactions(): Transaction[] {
  const current = window.localStorage.getItem(KEY);
  if (current) {
    const parsed: unknown = JSON.parse(current);
    if (!Array.isArray(parsed)) throw new Error("Saved browser transactions have an unexpected format.");
    return parsed.filter((transaction): transaction is Transaction => isTransaction(transaction) && !transaction.id.startsWith("seed-"));
  }

  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (!legacy) return [];
  const parsed: unknown = JSON.parse(legacy);
  if (!Array.isArray(parsed)) throw new Error("Saved browser transactions have an unexpected format.");

  return parsed.flatMap((entry): Transaction[] => {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.startsWith("seed-")) return [];
    const { hasReceipt, ...rest } = entry;
    const migrated = {
      ...rest,
      account: "cash",
      status: "confirmed",
      ...(hasReceipt ? { receipt: { name: "receipt.jpg", size: 0, kind: "image" } } : {}),
    };
    return isTransaction(migrated) ? [migrated] : [];
  });
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("The server couldn't be reached. Please try again.");
  }

  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === "string" ? body.error : "Could not complete the request.";
    throw new Error(message);
  }
  if (!isRecord(body)) throw new Error("The server returned an invalid transaction response.");
  return body as T;
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t-${Date.now()}-${Math.random()}`;
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date(0));
  const [error, setError] = useState<string | null>(null);
  const [migration, setMigration] = useState<Migration | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([
      request<{ userId: string; transactions: Transaction[] }>("/api/transactions"),
      request<{ accounts: FinancialAccount[] }>("/api/accounts"),
    ])
      .then(([{ userId, transactions: remoteTransactions }, { accounts: remoteAccounts }]) => {
        if (!active) return;
        if (!Array.isArray(remoteAccounts) || !remoteAccounts.every(isFinancialAccount)) {
          throw new Error("The server returned invalid account data.");
        }
        const current = new Date();
        const migrationKey = `${MIGRATION_PREFIX}${userId}`;
        const migrationHandled = window.localStorage.getItem(migrationKey) === "done";
        let localTransactions: Transaction[] = [];
        if (!migrationHandled) {
          try {
            localTransactions = readLocalTransactions();
          } catch (cause) {
            setMigrationError(cause instanceof Error ? cause.message : "Could not read the saved browser transactions.");
          }
        }
        const remoteIds = new Set(remoteTransactions.map((transaction) => transaction.id));
        const candidates = localTransactions.filter((transaction) => !remoteIds.has(transaction.id));
        startTransition(() => {
          setTransactions(remoteTransactions);
          setAccounts(remoteAccounts);
          setNow(current);
          setMigration(candidates.length ? { userId, transactions: candidates } : null);
          setReady(true);
        });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Could not load your transactions.");
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setReady(false);
    setError(null);
    setAccounts([]);
    setMigration(null);
    setMigrationError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const importLocalTransactions = useCallback(async () => {
    if (!migration) return;
    setMigrationError(null);
    setMigrationBusy(true);
    try {
      const imported: Transaction[] = [];
      for (let offset = 0; offset < migration.transactions.length; offset += 500) {
        const batch = migration.transactions.slice(offset, offset + 500).map((transaction) => ({
            ...transaction,
            ...(transaction.receipt
              ? { receipt: { name: transaction.receipt.name, size: transaction.receipt.size, kind: transaction.receipt.kind } }
              : {}),
          }));
        const result = await request<{ transactions: Transaction[] }>("/api/transactions", {
          method: "POST",
          body: JSON.stringify(batch),
        });
        imported.push(...result.transactions);
      }
      setTransactions((current) => {
        const byId = new Map(current.map((transaction) => [transaction.id, transaction]));
        for (const transaction of imported) byId.set(transaction.id, transaction);
        return [...byId.values()];
      });
      window.localStorage.setItem(`${MIGRATION_PREFIX}${migration.userId}`, "done");
      setMigration(null);
      setNow(new Date());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not import your saved transactions.";
      setMigrationError(message);
      throw cause;
    } finally {
      setMigrationBusy(false);
    }
  }, [migration]);

  const skipLocalImport = useCallback(() => {
    if (!migration) return;
    window.localStorage.setItem(`${MIGRATION_PREFIX}${migration.userId}`, "done");
    setMigration(null);
    setMigrationError(null);
  }, [migration]);

  const addTransaction = useCallback(async (input: NewTransaction) => {
    const candidate: Transaction = {
      ...input,
      id: newId(),
      status: input.status ?? "confirmed",
      createdAt: Date.now(),
    };
    const result = await request<{ transactions: Transaction[] }>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(candidate),
    });
    const created = result.transactions.find((transaction) => transaction.id === candidate.id);
    if (!created) throw new Error("The server did not return the saved transaction.");
    setTransactions((current) => [...current, created]);
    setNow(new Date());
    return created;
  }, []);

  const updateTransaction = useCallback(async (id: string, patch: TransactionPatch) => {
    const existing = transactions.find((transaction) => transaction.id === id);
    if (!existing) throw new Error("Transaction not found.");
    const candidate: Transaction = { ...existing, ...patch };
    const result = await request<{ transaction: Transaction }>(`/api/transactions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(candidate),
    });
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? result.transaction : transaction)));
    setNow(new Date());
  }, [transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    await request<void>(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
    setNow(new Date());
  }, []);

  const addAccount = useCallback(async (input: NewFinancialAccount) => {
    const result = await request<{ account: FinancialAccount }>("/api/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!isFinancialAccount(result.account)) throw new Error("The server did not return the saved account.");
    setAccounts((current) => [...current, result.account]);
    return result.account;
  }, []);

  const updateAccount = useCallback(async (id: string, patch: FinancialAccountPatch) => {
    const result = await request<{ account: FinancialAccount }>(`/api/accounts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!isFinancialAccount(result.account)) throw new Error("The server returned invalid account data.");
    setAccounts((current) => current.map((account) => (account.id === id ? result.account : account)));
  }, []);

  const value = useMemo(
    () => ({
      transactions,
      accounts,
      ready,
      now,
      error,
      migration,
      migrationError,
      migrationBusy,
      reload,
      importLocalTransactions,
      skipLocalImport,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
    }),
    [
      transactions,
      accounts,
      ready,
      now,
      error,
      migration,
      migrationError,
      migrationBusy,
      reload,
      importLocalTransactions,
      skipLocalImport,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransactions(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransactions must be used inside <TransactionsProvider>");
  return ctx;
}
