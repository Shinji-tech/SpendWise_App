import { createHash, randomBytes } from "node:crypto";
import { getPool } from "@/lib/server/db";
import { getPasswordResetEmailConfig, sendPasswordResetEmail } from "@/lib/server/password-reset-email";
import { hashPassword } from "@/lib/server/password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESET_RESPONSE = {
  ok: true,
  message: "If an account exists for that email, reset instructions will arrive shortly.",
};

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function resetTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function createResetToken(email: string) {
  const client = await getPool().connect();
  let inTransaction = false;
  try {
    await client.query("BEGIN");
    inTransaction = true;
    const userResult = await client.query<{ id: string; email: string }>(
      "SELECT id, email FROM users WHERE email = $1 FOR UPDATE",
      [email],
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query("COMMIT");
      inTransaction = false;
      return null;
    }

    const recentRequest = await client.query(
      `SELECT 1 FROM password_reset_tokens
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute'
       LIMIT 1`,
      [user.id],
    );
    if (recentRequest.rowCount) {
      await client.query("COMMIT");
      inTransaction = false;
      return null;
    }

    await client.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1 AND created_at < NOW() - INTERVAL '1 day'",
      [user.id],
    );
    const token = randomBytes(32).toString("base64url");
    const tokenHash = resetTokenHash(token);
    await client.query(
      `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '60 minutes')`,
      [tokenHash, user.id],
    );
    await client.query("COMMIT");
    inTransaction = false;
    return { userId: user.id, email: user.email, token, tokenHash };
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Could not roll back password reset request:", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function consumeResetToken(tokenHash: string, newPassword: string): Promise<boolean> {
  const client = await getPool().connect();
  let inTransaction = false;
  try {
    await client.query("BEGIN");
    inTransaction = true;
    const candidate = await client.query<{ user_id: string }>(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );
    const userId = candidate.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return false;
    }

    const user = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!user.rowCount) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return false;
    }
    const token = await client.query(
      `SELECT token_hash FROM password_reset_tokens
       WHERE token_hash = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash, userId],
    );
    if (!token.rowCount) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return false;
    }

    const passwordHash = await hashPassword(newPassword);
    await client.query(
      "UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1",
      [userId, passwordHash],
    );
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [userId],
    );
    await client.query("COMMIT");
    inTransaction = false;
    return true;
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Could not roll back password reset completion:", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Send a valid JSON request.", 400);
  }
  const email = "email" in input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return jsonError("Enter a valid email address.", 400);
  }

  let config;
  try {
    config = getPasswordResetEmailConfig();
  } catch (error) {
    console.error("Password reset email configuration is invalid:", error);
    return jsonError("Password reset email is not configured. Contact the administrator.", 503);
  }

  let reset;
  try {
    reset = await createResetToken(email);
  } catch (error) {
    console.error("Could not create a password reset token:", error);
    return jsonError("Could not process the password reset request. Please try again.", 503);
  }
  if (!reset) return Response.json(RESET_RESPONSE, { headers: { "Cache-Control": "no-store" } });

  try {
    await sendPasswordResetEmail(reset.email, reset.token, config);
  } catch (error) {
    console.error("Could not send a password reset email:", error);
    try {
      await getPool().query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL",
        [reset.tokenHash],
      );
    } catch (cleanupError) {
      console.error("Could not invalidate an unsent password reset token:", cleanupError);
    }
    return Response.json(RESET_RESPONSE, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    await getPool().query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = $1 AND token_hash <> $2 AND used_at IS NULL`,
      [reset.userId, reset.tokenHash],
    );
  } catch (error) {
    console.error("Could not invalidate previous password reset tokens:", error);
  }
  return Response.json(RESET_RESPONSE, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Send valid password reset details.", 400);
  }

  const token = "token" in input && typeof input.token === "string" ? input.token : "";
  const newPassword = "newPassword" in input && typeof input.newPassword === "string" ? input.newPassword : "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return jsonError("This reset link is invalid or has expired. Request a new link.", 400);
  }
  if (newPassword.length < 8 || newPassword.length > 128 || !/\d/.test(newPassword)) {
    return jsonError("Use a password of 8–128 characters with at least one number.", 400);
  }

  try {
    const updated = await consumeResetToken(resetTokenHash(token), newPassword);
    if (!updated) return jsonError("This reset link is invalid or has expired. Request a new link.", 400);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not complete password reset:", error);
    return jsonError("Could not reset the password. Please try again.", 503);
  }
}
