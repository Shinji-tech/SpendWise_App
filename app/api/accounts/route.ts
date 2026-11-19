import { getSessionUser } from "@/lib/server/session";
import { AccountInputError, createAccount, listAccounts, parseAccountInput } from "@/lib/server/accounts";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate account request:", error);
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to view accounts.", 401);

  try {
    const accounts = await listAccounts(user.id);
    return Response.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read accounts:", error);
    return jsonError("Account storage is unavailable. Please try again.", 503);
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate account creation:", error);
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to create an account.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }

  try {
    const account = await createAccount(user.id, parseAccountInput(input));
    return Response.json({ account }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountInputError) return jsonError(error.message, 400);
    console.error("Could not create account:", error);
    return jsonError("Account storage is unavailable. Please try again.", 503);
  }
}
