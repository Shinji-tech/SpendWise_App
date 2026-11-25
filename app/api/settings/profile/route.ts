import { getPool } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/session";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate profile update:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to update your profile.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Send valid profile details.", 400);
  }
  const name = "name" in input && typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return jsonError("Enter a name between 2 and 80 characters.", 400);
  }

  try {
    const result = await getPool().query<{ name: string; email: string }>(
      "UPDATE users SET name = $2 WHERE id = $1 RETURNING name, email",
      [user.id, name],
    );
    if (!result.rows[0]) return jsonError("Account not found.", 404);
    return Response.json({ session: result.rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not update profile:", error);
    return jsonError("Profile storage is unavailable. Please try again.", 503);
  }
}
