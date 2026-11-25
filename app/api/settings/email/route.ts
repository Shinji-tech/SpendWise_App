import { createHash, randomBytes } from "node:crypto";
import { getPool } from "@/lib/server/db";
import { clearSession, getSessionUser } from "@/lib/server/session";
import { verifyPassword } from "@/lib/server/password";
import {
  getPasswordResetEmailConfig,
  sendEmailChangeConfirmation,
} from "@/lib/server/password-reset-email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function createEmailChangeToken(userId: string, newEmail: string) {
  const client = await getPool().connect();
  let inTransaction = false;
  try {
    await client.query("BEGIN");
    inTransaction = true;
    const user = await client.query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (!user.rows[0]) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "missing" as const };
    }
    if (user.rows[0].email.toLowerCase() === newEmail) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "same" as const };
    }

    const owner = await client.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1",
      [newEmail, userId],
    );
    if (owner.rowCount) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "exists" as const };
    }

    const recent = await client.query(
      `SELECT 1 FROM email_change_tokens
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute'
       LIMIT 1`,
      [userId],
    );
    if (recent.rowCount) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "cooldown" as const };
    }

    await client.query(
      "DELETE FROM email_change_tokens WHERE user_id = $1 AND created_at < NOW() - INTERVAL '1 day'",
      [userId],
    );
    const token = randomBytes(32).toString("base64url");
    const hash = tokenHash(token);
    await client.query(
      `INSERT INTO email_change_tokens (token_hash, user_id, new_email, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '60 minutes')`,
      [hash, userId, newEmail],
    );
    await client.query("COMMIT");
    inTransaction = false;
    return { kind: "created" as const, token, hash };
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Could not roll back email change request:", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function confirmEmailChange(hash: string) {
  const client = await getPool().connect();
  let inTransaction = false;
  try {
    await client.query("BEGIN");
    inTransaction = true;
    const candidate = await client.query<{ user_id: string }>(
      `SELECT user_id FROM email_change_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [hash],
    );
    const userId = candidate.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "invalid" as const };
    }

    const user = await client.query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (!user.rows[0]) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "invalid" as const };
    }

    const token = await client.query<{ new_email: string }>(
      `SELECT new_email FROM email_change_tokens
       WHERE token_hash = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hash, userId],
    );
    const pending = token.rows[0];
    if (!pending) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "invalid" as const };
    }

    const owner = await client.query(
      "SELECT 1 FROM users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1",
      [pending.new_email, userId],
    );
    if (owner.rowCount) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return { kind: "exists" as const };
    }

    await client.query(
      "UPDATE users SET email = $2, session_version = session_version + 1 WHERE id = $1",
      [userId, pending.new_email],
    );
    await client.query(
      "UPDATE email_change_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [userId],
    );
    await client.query("COMMIT");
    inTransaction = false;
    return { kind: "updated" as const };
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Could not roll back email change confirmation:", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate email change request:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to change your email address.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Send valid email change details.", 400);
  }
  const newEmail = "email" in input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const currentPassword =
    "currentPassword" in input && typeof input.currentPassword === "string" ? input.currentPassword : "";
  if (newEmail.length > 254 || !EMAIL_PATTERN.test(newEmail)) {
    return jsonError("Enter a valid email address.", 400);
  }
  if (currentPassword.length > 128) {
    return jsonError("Current password is too long.", 400);
  }

  try {
    const result = await getPool().query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.id],
    );
    const account = result.rows[0];
    if (!account) return jsonError("Account not found.", 404);
    if (
      account.password_hash &&
      (currentPassword.length < 8 || !(await verifyPassword(currentPassword, account.password_hash)))
    ) {
      return jsonError("Current password is incorrect.", 400);
    }
  } catch (error) {
    console.error("Could not verify the current password for email change:", error);
    return jsonError("Could not verify your account. Please try again.", 503);
  }

  let config;
  try {
    config = getPasswordResetEmailConfig();
  } catch (error) {
    console.error("Email change delivery is not configured:", error);
    return jsonError("Email verification is not configured. Contact the administrator.", 503);
  }

  let created;
  try {
    created = await createEmailChangeToken(user.id, newEmail);
  } catch (error) {
    console.error("Could not create an email change token:", error);
    return jsonError("Could not process the email change. Please try again.", 503);
  }
  if (created.kind === "missing") return jsonError("Account not found.", 404);
  if (created.kind === "same") return jsonError("That is already your current email address.", 400);
  if (created.kind === "exists") return jsonError("An account already uses that email address.", 409);
  if (created.kind === "cooldown") {
    return jsonError("Wait one minute before requesting another verification email.", 429, { "Retry-After": "60" });
  }

  try {
    await sendEmailChangeConfirmation(newEmail, created.token, config);
  } catch (error) {
    console.error("Could not send an email change confirmation:", error);
    try {
      await getPool().query(
        "UPDATE email_change_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL",
        [created.hash],
      );
    } catch (cleanupError) {
      console.error("Could not invalidate an unsent email change token:", cleanupError);
    }
    return jsonError("Could not send the verification email. Please try again.", 503);
  }

  try {
    await getPool().query(
      `UPDATE email_change_tokens SET used_at = NOW()
       WHERE user_id = $1 AND token_hash <> $2 AND used_at IS NULL`,
      [user.id, created.hash],
    );
  } catch (error) {
    console.error("Could not invalidate previous email change tokens:", error);
  }
  return Response.json(
    { ok: true, message: "Check your new email address for a confirmation link." },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Send a valid confirmation token.", 400);
  }
  const token = "token" in input && typeof input.token === "string" ? input.token : "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return jsonError("This email confirmation link is invalid or has expired.", 400);
  }

  try {
    const result = await confirmEmailChange(tokenHash(token));
    if (result.kind === "invalid") {
      return jsonError("This email confirmation link is invalid or has expired.", 400);
    }
    if (result.kind === "exists") {
      return jsonError("An account already uses that email address.", 409);
    }
    await clearSession();
    return Response.json(
      { ok: true, message: "Email address updated. Sign in again with your new email." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return jsonError("An account already uses that email address.", 409);
    }
    console.error("Could not confirm an email change:", error);
    return jsonError("Could not update your email address. Please try again.", 503);
  }
}
