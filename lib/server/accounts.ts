import { randomUUID } from "node:crypto";
import type { AccountType, FinancialAccount } from "@/lib/data";
import { getPool } from "./db";

export type AccountInput = Pick<FinancialAccount, "name" | "type" | "openingBalance">;
export type AccountUpdate = AccountInput & Pick<FinancialAccount, "archived">;
type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  opening_balance: string;
  archived: boolean;
  created_at: Date | string;
};

function isAccountType(value: unknown): value is AccountType {
  return value === "cash" || value === "wallet" || value === "bank";
}

export class AccountInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAccountInput(value: unknown): AccountInput;
export function parseAccountInput(value: unknown, allowArchived: true): AccountUpdate;
export function parseAccountInput(value: unknown, allowArchived = false): AccountInput | AccountUpdate {
  if (!isRecord(value)) throw new AccountInputError("Send valid account details.");
  const { name, type, openingBalance, archived } = value;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60) {
    throw new AccountInputError("Enter an account name between 2 and 60 characters.");
  }
  if (!isAccountType(type)) {
    throw new AccountInputError("Choose cash, e-wallet, or bank.");
  }
  if (typeof openingBalance !== "number" || !Number.isSafeInteger(openingBalance) || openingBalance < 0) {
    throw new AccountInputError("Opening balance must be a non-negative whole number.");
  }
  if (allowArchived && typeof archived !== "boolean") {
    throw new AccountInputError("Account archive status is invalid.");
  }

  return {
    name: name.trim(),
    type,
    openingBalance,
    ...(allowArchived ? { archived: archived as boolean } : {}),
  };
}

function toFinancialAccount(row: AccountRow): FinancialAccount {
  const openingBalance = Number(row.opening_balance);
  if (!Number.isSafeInteger(openingBalance)) {
    throw new Error(`Account ${row.id} has an opening balance outside the supported range.`);
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalance,
    archived: row.archived,
    createdAt: new Date(row.created_at).getTime(),
  };
}

async function ensureDefaultAccounts(userId: string) {
  await getPool().query(
    `INSERT INTO financial_accounts (user_id, id, name, type, opening_balance)
     SELECT $1, defaults.id, defaults.name, defaults.type, 0
     FROM (VALUES ('cash', 'Cash', 'cash'), ('momo', 'MoMo', 'wallet'), ('vietcombank', 'Vietcombank', 'bank'))
       AS defaults(id, name, type)
     WHERE NOT EXISTS (SELECT 1 FROM financial_accounts WHERE user_id = $1)
     ON CONFLICT (user_id, id) DO NOTHING`,
    [userId],
  );
}

export async function listAccounts(userId: string): Promise<FinancialAccount[]> {
  await ensureDefaultAccounts(userId);
  const result = await getPool().query<AccountRow>(
    `SELECT id, name, type, opening_balance::text, archived, created_at
     FROM financial_accounts WHERE user_id = $1
     ORDER BY archived, created_at, name`,
    [userId],
  );
  return result.rows.map(toFinancialAccount);
}

export async function createAccount(userId: string, input: AccountInput): Promise<FinancialAccount> {
  const result = await getPool().query<AccountRow>(
    `INSERT INTO financial_accounts (user_id, id, name, type, opening_balance)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, type, opening_balance::text, archived, created_at`,
    [userId, randomUUID(), input.name, input.type, input.openingBalance],
  );
  return toFinancialAccount(result.rows[0]);
}

export async function updateAccount(userId: string, id: string, input: AccountUpdate): Promise<FinancialAccount | null> {
  const result = await getPool().query<AccountRow>(
    `UPDATE financial_accounts
     SET name = $3, type = $4, opening_balance = $5, archived = $6
     WHERE user_id = $1 AND id = $2
     RETURNING id, name, type, opening_balance::text, archived, created_at`,
    [userId, id, input.name, input.type, input.openingBalance, input.archived],
  );
  return result.rows[0] ? toFinancialAccount(result.rows[0]) : null;
}
