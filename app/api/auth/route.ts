import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createSession, clearSession, getSessionUser, validateSessionConfiguration } from "@/lib/server/session";
import { getPool } from "@/lib/server/db";

const scrypt = promisify(scryptCallback);

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algorithm, saltHex, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex || !/^[a-f0-9]+$/i.test(saltHex + hashHex)) {
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET() {
  try {
    const session = await getSessionUser();
    return Response.json({ session }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read the SpendWise session:", error);
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!input || typeof input !== "object") return jsonError("Send a valid JSON request.", 400);

  const body = input as Record<string, unknown>;
  const action = body.action;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || password.length < 8 || password.length > 128) {
    return jsonError("Enter a valid email and a password between 8 and 128 characters.", 400);
  }

  try {
    validateSessionConfiguration();
    const pool = getPool();
    if (action === "register") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 80 || !/\d/.test(password)) {
        return jsonError("Enter a name between 2 and 80 characters and a password with at least one number.", 400);
      }

      const id = randomUUID();
      const passwordHash = await hashPassword(password);
      const inserted = await pool.query<{ id: string; name: string; email: string }>(
        "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email",
        [id, name, email, passwordHash],
      );
      await createSession(id);
      return Response.json(
        { session: { name: inserted.rows[0].name, email: inserted.rows[0].email } },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (action === "login") {
      const result = await pool.query<{ id: string; name: string; email: string; password_hash: string }>(
        "SELECT id, name, email, password_hash FROM users WHERE email = $1",
        [email],
      );
      const user = result.rows[0];
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return jsonError("Incorrect email or password.", 401);
      }
      await createSession(user.id);
      return Response.json(
        { session: { name: user.name, email: user.email } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return jsonError("Unsupported authentication action.", 400);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return jsonError("An account with this email already exists. Try logging in instead.", 409);
    }
    console.error("Could not complete the authentication request:", error);
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
}

export async function DELETE() {
  try {
    await clearSession();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not clear the SpendWise session:", error);
    return jsonError("Could not sign out. Please try again.", 500);
  }
}
