import {
  EXPENSE_CATEGORIES,
  type Receipt,
  type Transaction,
  type TransactionCategory,
  type TransactionStatus,
} from "@/lib/data";
import { getPool } from "./db";

type InputTransaction = Omit<Transaction, "createdAt"> & { createdAt?: number };
type ReceiptMetadata = Pick<Receipt, "name" | "size" | "kind" | "uploadedAt">;

type TransactionRow = {
  id: string;
  type: Transaction["type"];
  title: string;
  note: string;
  amount: string;
  date: string;
  category: Transaction["category"];
  account: Transaction["account"];
  status: TransactionStatus;
  receipt_id: string | null;
  receipt_metadata: ReceiptMetadata | null;
  created_at: Date | string;
};

export class TransactionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionInputError";
  }
}

export class DuplicateTransactionError extends Error {
  constructor() {
    super("A transaction with this ID already exists.");
    this.name = "DuplicateTransactionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExpenseCategory(value: unknown): value is Exclude<TransactionCategory, "income"> {
  return EXPENSE_CATEGORIES.some((category) => category === value);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseReceipt(value: unknown): Receipt | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new TransactionInputError("Receipt details are invalid.");

  const { id, name, size, kind, uploadedAt } = value;
  if (
    typeof name !== "string" ||
    name.length < 1 ||
    name.length > 255 ||
    !Number.isSafeInteger(size) ||
    Number(size) < 0 ||
    Number(size) > 10 * 1024 * 1024 ||
    (kind !== "image" && kind !== "pdf")
  ) {
    throw new TransactionInputError("Receipt details are invalid.");
  }

  if (id !== undefined && (typeof id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))) {
    throw new TransactionInputError("Receipt ID is invalid.");
  }
  if (uploadedAt !== undefined && (typeof uploadedAt !== "string" || !Number.isFinite(Date.parse(uploadedAt)))) {
    throw new TransactionInputError("Receipt date is invalid.");
  }

  return {
    ...(typeof id === "string" ? { id } : {}),
    name,
    size: Number(size),
    kind,
    ...(typeof uploadedAt === "string" ? { uploadedAt } : {}),
    ...(typeof id === "string" ? { status: "uploaded" as const } : { status: "local" as const }),
  };
}

export function parseTransaction(value: unknown, id?: string): InputTransaction {
  if (!isRecord(value)) throw new TransactionInputError("Send a valid transaction.");

  const transactionId = id ?? value.id;
  const { type, title, note, amount, date, category, account, status, createdAt } = value;
  if (typeof transactionId !== "string" || transactionId.length < 1 || transactionId.length > 80) {
    throw new TransactionInputError("Transaction ID is invalid.");
  }
  if (type !== "income" && type !== "expense") throw new TransactionInputError("Choose income or expense.");
  if (typeof title !== "string" || title.trim().length < 2 || title.trim().length > 60) {
    throw new TransactionInputError("Enter a description between 2 and 60 characters.");
  }
  if (typeof note !== "string" || note.length > 120) throw new TransactionInputError("Note must be 120 characters or fewer.");
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new TransactionInputError("Amount must be a positive whole number.");
  }
  if (typeof date !== "string" || !isValidDate(date)) throw new TransactionInputError("Transaction date is invalid.");
  if (typeof account !== "string" || account.length < 1 || account.length > 40) {
    throw new TransactionInputError("Choose a valid account.");
  }
  let transactionCategory: TransactionCategory;
  if (type === "income") {
    if (category !== "income") throw new TransactionInputError("Choose a valid category for this transaction.");
    transactionCategory = "income";
  } else {
    if (!isExpenseCategory(category)) throw new TransactionInputError("Choose a valid category for this transaction.");
    transactionCategory = category;
  }
  if (status !== undefined && status !== "confirmed" && status !== "needs_review" && status !== "processing") {
    throw new TransactionInputError("Transaction status is invalid.");
  }
  if (createdAt !== undefined && (typeof createdAt !== "number" || !Number.isSafeInteger(createdAt) || createdAt < 0)) {
    throw new TransactionInputError("Transaction creation time is invalid.");
  }

  const receipt = parseReceipt(value.receipt);
  return {
    id: transactionId,
    type,
    title: title.trim(),
    note,
    amount,
    date,
    category: transactionCategory,
    account,
    status: status ?? "confirmed",
    ...(receipt ? { receipt } : {}),
    createdAt: createdAt ?? Date.now(),
  };
}

function toTransaction(row: TransactionRow): Transaction {
  const receipt = row.receipt_metadata
    ? {
        ...row.receipt_metadata,
        ...(row.receipt_id ? { id: row.receipt_id, status: "uploaded" as const } : { status: "local" as const }),
      }
    : undefined;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    note: row.note,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
    account: row.account,
    status: row.status,
    ...(receipt ? { receipt } : {}),
    createdAt: new Date(row.created_at).getTime(),
  };
}

const RETURNING_COLUMNS = `
  id, type, title, note, amount::text, to_char(date, 'YYYY-MM-DD') AS date,
  category, account, status, receipt_id, receipt_metadata, created_at
`;

export async function listTransactions(userId: string): Promise<Transaction[]> {
  const result = await getPool().query<TransactionRow>(
    `SELECT ${RETURNING_COLUMNS} FROM transactions
     WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
    [userId],
  );
  return result.rows.map(toTransaction);
}

async function assertReceiptOwnership(userId: string, values: InputTransaction[]) {
  const ids = [...new Set(values.flatMap((transaction) => (transaction.receipt?.id ? [transaction.receipt.id] : [])))];
  if (!ids.length) return;

  const result = await getPool().query<{ id: string }>(
    "SELECT id FROM receipts WHERE user_id = $1 AND id = ANY($2::uuid[])",
    [userId, ids],
  );
  if (result.rows.length !== ids.length) {
    throw new TransactionInputError("A receipt is not available to this account. Upload it again before saving.");
  }
}

async function assertActiveAccounts(userId: string, values: InputTransaction[]) {
  const ids = [...new Set(values.map((transaction) => transaction.account))];
  const result = await getPool().query<{ id: string }>(
    `SELECT id FROM financial_accounts
     WHERE user_id = $1 AND id = ANY($2::varchar[]) AND archived = FALSE`,
    [userId, ids],
  );
  if (result.rows.length !== ids.length) {
    throw new TransactionInputError("Choose an active account that belongs to your account.");
  }
}

export async function createTransactions(userId: string, values: InputTransaction[], allowExisting: boolean): Promise<Transaction[]> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await assertActiveAccounts(userId, values);
    await assertReceiptOwnership(userId, values);

    const params: unknown[] = [];
    const rows = values.map((transaction, index) => {
      const offset = index * 13;
      const receiptMetadata = transaction.receipt
        ? JSON.stringify({
            name: transaction.receipt.name,
            size: transaction.receipt.size,
            kind: transaction.receipt.kind,
            ...(transaction.receipt.uploadedAt ? { uploadedAt: transaction.receipt.uploadedAt } : {}),
          })
        : null;
      params.push(
        userId,
        transaction.id,
        transaction.type,
        transaction.title,
        transaction.note,
        transaction.amount,
        transaction.date,
        transaction.category,
        transaction.account,
        transaction.status,
        transaction.receipt?.id ?? null,
        receiptMetadata,
        transaction.createdAt,
      );
      return `(${Array.from({ length: 12 }, (_, param) => `$${offset + param + 1}`).join(", ")}, to_timestamp($${offset + 13} / 1000.0))`;
    });

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO transactions (
         user_id, id, type, title, note, amount, date, category, account, status, receipt_id, receipt_metadata, created_at
       ) VALUES ${rows.join(", ")}
       ON CONFLICT (user_id, id) DO NOTHING
       RETURNING id`,
      params,
    );

    if (!allowExisting && inserted.rows.length !== values.length) throw new DuplicateTransactionError();
    const ids = values.map((transaction) => transaction.id);
    const saved = await client.query<TransactionRow>(
      `SELECT ${RETURNING_COLUMNS} FROM transactions
       WHERE user_id = $1 AND id = ANY($2::varchar[])`,
      [userId, ids],
    );
    await client.query("COMMIT");
    return saved.rows.map(toTransaction);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Could not roll back transaction creation:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTransaction(userId: string, transaction: InputTransaction): Promise<Transaction | null> {
  const existing = await getPool().query<{ account: string }>(
    "SELECT account FROM transactions WHERE user_id = $1 AND id = $2",
    [userId, transaction.id],
  );
  if (!existing.rows[0]) return null;

  const account = await getPool().query<{ archived: boolean }>(
    "SELECT archived FROM financial_accounts WHERE user_id = $1 AND id = $2",
    [userId, transaction.account],
  );
  if (!account.rows[0] || (account.rows[0].archived && transaction.account !== existing.rows[0].account)) {
    throw new TransactionInputError("Choose an active account that belongs to your account.");
  }

  await assertReceiptOwnership(userId, [transaction]);
  const receiptMetadata = transaction.receipt
    ? JSON.stringify({
        name: transaction.receipt.name,
        size: transaction.receipt.size,
        kind: transaction.receipt.kind,
        ...(transaction.receipt.uploadedAt ? { uploadedAt: transaction.receipt.uploadedAt } : {}),
      })
    : null;
  const result = await getPool().query<TransactionRow>(
    `UPDATE transactions SET
       type = $3, title = $4, note = $5, amount = $6, date = $7, category = $8,
       account = $9, status = $10, receipt_id = $11, receipt_metadata = $12
     WHERE user_id = $1 AND id = $2
     RETURNING ${RETURNING_COLUMNS}`,
    [
      userId,
      transaction.id,
      transaction.type,
      transaction.title,
      transaction.note,
      transaction.amount,
      transaction.date,
      transaction.category,
      transaction.account,
      transaction.status,
      transaction.receipt?.id ?? null,
      receiptMetadata,
    ],
  );
  return result.rows[0] ? toTransaction(result.rows[0]) : null;
}

export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  const result = await getPool().query(
    "DELETE FROM transactions WHERE user_id = $1 AND id = $2",
    [userId, id],
  );
  return (result.rowCount ?? 0) > 0;
}
