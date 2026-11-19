import { getSessionUser } from "@/lib/server/session";
import { AccountInputError, parseAccountInput, updateAccount } from "@/lib/server/accounts";

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate account update:", error);
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to update accounts.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }

  const { id } = await context.params;
  if (!id || id.length > 40) return jsonError("Account not found.", 404);
  try {
    const account = await updateAccount(user.id, id, parseAccountInput(input, true));
    if (!account) return jsonError("Account not found.", 404);
    return Response.json({ account }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountInputError) return jsonError(error.message, 400);
    console.error("Could not update account:", error);
    return jsonError("Account storage is unavailable. Please try again.", 503);
  }
}
