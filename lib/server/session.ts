import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPool } from "./db";

const COOKIE_NAME = "spendwise_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export function validateSessionConfiguration() {
  getSecret();
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export async function createSession(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  const token = `${payload}.${sign(payload)}`;

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<{ id: string; name: string; email: string } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAtText, signature] = parts;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId) || !/^\d+$/.test(expiresAtText)) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;

  const payload = `${userId}.${expiresAtText}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const result = await getPool().query<{ id: string; name: string; email: string }>(
    "SELECT id, name, email FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0] ?? null;
}
