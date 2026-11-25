import { getPool } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/session";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to check connected accounts.", 401);

  try {
    const result = await getPool().query<{ connected: boolean }>(
      "SELECT google_subject IS NOT NULL AS connected FROM users WHERE id = $1",
      [user.id],
    );
    if (!result.rows[0]) return jsonError("Account not found.", 404);
    return Response.json({ connected: result.rows[0].connected }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read the Google connection:", error);
    return jsonError("Could not read connected accounts.", 503);
  }
}
