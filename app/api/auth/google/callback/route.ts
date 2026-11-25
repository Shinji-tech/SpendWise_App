import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/server/db";
import { getAppUrl } from "@/lib/server/app-url";
import { createSession, getSessionUser } from "@/lib/server/session";
import {
  consumeGoogleOAuthFlow,
  exchangeGoogleCode,
  verifyGoogleIdentity,
} from "@/lib/server/google-oauth";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

function errorRedirect(code: string, linked: boolean) {
  return redirectTo(`${linked ? "/settings" : "/sign-in"}?google_error=${encodeURIComponent(code)}`);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const flow = await consumeGoogleOAuthFlow(requestUrl.searchParams.get("state"));
  const linked = flow?.mode === "link";
  if (!flow) return errorRedirect("invalid_state", false);

  const providerError = requestUrl.searchParams.get("error");
  if (providerError) return errorRedirect(providerError === "access_denied" ? "cancelled" : "provider_error", linked);

  const code = requestUrl.searchParams.get("code");
  if (!code) return errorRedirect("provider_error", linked);

  try {
    const idToken = await exchangeGoogleCode(code, flow);
    const identity = await verifyGoogleIdentity(idToken, flow);
    const pool = getPool();

    if (flow.mode === "link") {
      const session = await getSessionUser();
      if (!session) return errorRedirect("sign_in_required", true);
      const owner = await pool.query<{ id: string }>(
        "SELECT id FROM users WHERE google_subject = $1",
        [identity.subject],
      );
      if (owner.rows[0] && owner.rows[0].id !== session.id) {
        return errorRedirect("already_linked", true);
      }
      await pool.query("UPDATE users SET google_subject = $2 WHERE id = $1", [session.id, identity.subject]);
      return Response.redirect(new URL("/settings?google=connected", getAppUrl()), 303);
    }

    const linkedUser = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE google_subject = $1",
      [identity.subject],
    );
    if (linkedUser.rows[0]) {
      await createSession(linkedUser.rows[0].id);
      return Response.redirect(new URL("/dashboard", getAppUrl()), 303);
    }

    const emailOwner = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [identity.email],
    );
    if (emailOwner.rows[0]) return errorRedirect("account_exists", false);

    const id = randomUUID();
    const created = await pool.query<{ id: string }>(
      `INSERT INTO users (id, name, email, password_hash, google_subject)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [id, identity.name, identity.email, null, identity.subject],
    );
    await createSession(created.rows[0].id);
    return Response.redirect(new URL("/dashboard", getAppUrl()), 303);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return errorRedirect("account_exists", linked);
    }
    console.error("Could not complete Google sign-in:", error);
    return errorRedirect("unavailable", linked);
  }
}
