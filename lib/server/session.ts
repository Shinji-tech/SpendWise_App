import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPool } from "./db";

const COOKIE_NAME = "spendwise_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export function validateSessionConfiguration() {
  getAuthSecret();
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

export async function createSession(userId: string) {
  const result = await getPool().query<{ session_version: number }>(
    "SELECT session_version FROM users WHERE id = $1",
    [userId],
  );
  const sessionVersion = result.rows[0]?.session_version;
  if (sessionVersion === undefined) throw new Error("Cannot create a session for a missing account.");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${userId}.${sessionVersion}.${expiresAt}`;
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
  let userId: string;
  let sessionVersion: number;
  let expiresAtText: string;
  let signature: string;
  let payload: string;
  if (parts.length === 3) {
    [userId, expiresAtText, signature] = parts;
    sessionVersion = 0;
    payload = `${userId}.${expiresAtText}`;
  } else if (parts.length === 4) {
    const versionText = parts[1];
    userId = parts[0];
    expiresAtText = parts[2];
    signature = parts[3];
    if (!/^\d+$/.test(versionText)) return null;
    sessionVersion = Number(versionText);
    if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0) return null;
    payload = `${userId}.${versionText}.${expiresAtText}`;
  } else {
    return null;
  }

  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId) || !/^\d+$/.test(expiresAtText)) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const result = await getPool().query<{ id: string; name: string; email: string; session_version: number }>(
    "SELECT id, name, email, session_version FROM users WHERE id = $1",
    [userId],
  );
  const user = result.rows[0];
  if (!user || user.session_version !== sessionVersion) return null;
  return { id: user.id, name: user.name, email: user.email };
}
