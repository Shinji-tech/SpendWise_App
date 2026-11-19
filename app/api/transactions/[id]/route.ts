import { getSessionUser } from "@/lib/server/session";
import { deleteTransaction, parseTransaction, TransactionInputError, updateTransaction } from "@/lib/server/transactions";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, context: RouteContext) {
  let user;
  try {
    user = await authenticatedUser();
  } catch {
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to update transactions.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }

  const { id } = await context.params;
  let transaction;
  try {
    transaction = parseTransaction(input, id);
    const saved = await updateTransaction(user.id, transaction);
    if (!saved) return jsonError("Transaction not found.", 404);
    return Response.json({ transaction: saved }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TransactionInputError) return jsonError(error.message, 400);
    console.error("Could not update transaction:", error);
    return jsonError("Transaction storage is unavailable. Please try again.", 503);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  let user;
  try {
    user = await authenticatedUser();
  } catch {
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to delete transactions.", 401);

  const { id } = await context.params;
  if (!id || id.length > 80) return jsonError("Transaction not found.", 404);

  try {
    const deleted = await deleteTransaction(user.id, id);
    if (!deleted) return jsonError("Transaction not found.", 404);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not delete transaction:", error);
    return jsonError("Transaction storage is unavailable. Please try again.", 503);
  }
}
