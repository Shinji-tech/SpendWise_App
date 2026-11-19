import { getSessionUser } from "@/lib/server/session";
import {
  createTransactions,
  DuplicateTransactionError,
  listTransactions,
  parseTransaction,
  TransactionInputError,
} from "@/lib/server/transactions";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function authenticatedUser() {
  try {
    return await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate transaction request:", error);
    throw new Error("AUTH_SERVICE_UNAVAILABLE");
  }
}

export async function GET() {
  let user;
  try {
    user = await authenticatedUser();
  } catch {
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to view transactions.", 401);

  try {
    const transactions = await listTransactions(user.id);
    return Response.json({ userId: user.id, transactions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read transactions:", error);
    return jsonError("Transaction storage is unavailable. Please try again.", 503);
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await authenticatedUser();
  } catch {
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to save transactions.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }

  const isImport = Array.isArray(input);
  if (Array.isArray(input) && (input.length === 0 || input.length > 500)) {
    return jsonError("Import between 1 and 500 transactions at a time.", 400);
  }
  const entries: unknown[] = Array.isArray(input) ? input : [input];
  let transactions;
  try {
    transactions = entries.map((entry: unknown) => parseTransaction(entry));
    if (new Set(transactions.map((transaction) => transaction.id)).size !== transactions.length) {
      return jsonError("The import contains duplicate transaction IDs.", 400);
    }
    const saved = await createTransactions(user.id, transactions, isImport);
    return Response.json({ transactions: saved }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TransactionInputError) return jsonError(error.message, 400);
    if (error instanceof DuplicateTransactionError) return jsonError(error.message, 409);
    console.error("Could not save transactions:", error);
    return jsonError("Transaction storage is unavailable. Please try again.", 503);
  }
}
