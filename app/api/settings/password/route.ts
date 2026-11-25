import { getPool } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { createSession, getSessionUser } from "@/lib/server/session";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate password update:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to change your password.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Send valid password details.", 400);
  }

  const currentPassword = "currentPassword" in input && typeof input.currentPassword === "string"
    ? input.currentPassword
    : "";
  const newPassword = "newPassword" in input && typeof input.newPassword === "string"
    ? input.newPassword
    : "";
  if (currentPassword.length > 128 || newPassword.length < 8 || newPassword.length > 128 || !/\d/.test(newPassword)) {
    return jsonError("Enter a new password of 8–128 characters with at least one number.", 400);
  }

  try {
    const pool = getPool();
    const result = await pool.query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.id],
    );
    const account = result.rows[0];
    if (!account) return jsonError("Account not found.", 404);
    if (account.password_hash && (currentPassword.length < 8 || !(await verifyPassword(currentPassword, account.password_hash)))) {
      return jsonError("Current password is incorrect.", 400);
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await pool.query(
      "UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1",
      [user.id, passwordHash],
    );
    if (!updated.rowCount) return jsonError("Account not found.", 404);
    await createSession(user.id);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not change password:", error);
    return jsonError("Password storage is unavailable. Please try again.", 503);
  }
}
