import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getAppUrl } from "@/lib/server/app-url";
import { getAuthSecret } from "@/lib/server/session";

const COOKIE_NAME = "spendwise_google_oauth";
const FLOW_SECONDS = 10 * 60;
const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleOAuthMode = "login" | "link";
export type GoogleOAuthFlow = {
  state: string;
  nonce: string;
  verifier: string;
  mode: GoogleOAuthMode;
};
export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};
export type GoogleIdentity = {
  subject: string;
  email: string;
  name: string;
};

function getConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in.");
  }
  const appUrl = getAppUrl();
  return {
    clientId,
    clientSecret,
    redirectUri: new URL(GOOGLE_CALLBACK_PATH, appUrl).toString(),
  };
}

function signedFlow(flow: GoogleOAuthFlow & { issuedAt: number }): string {
  const payload = Buffer.from(JSON.stringify(flow)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function parseFlow(value: string): (GoogleOAuthFlow & { issuedAt: number }) | null {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(createHmac("sha256", getAuthSecret()).update(payload).digest("base64url"));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return null;

  const flow = decoded as Record<string, unknown>;
  if (
    typeof flow.state !== "string" ||
    typeof flow.nonce !== "string" ||
    typeof flow.verifier !== "string" ||
    (flow.mode !== "login" && flow.mode !== "link") ||
    typeof flow.issuedAt !== "number" ||
    flow.issuedAt > Date.now() + 60_000 ||
    flow.issuedAt < Date.now() - FLOW_SECONDS * 1000
  ) {
    return null;
  }
  return flow as GoogleOAuthFlow & { issuedAt: number };
}

export async function beginGoogleOAuth(mode: GoogleOAuthMode): Promise<string> {
  const config = getConfig();
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const flow: GoogleOAuthFlow & { issuedAt: number } = {
    state,
    nonce,
    verifier,
    mode,
    issuedAt: Date.now(),
  };

  (await cookies()).set(COOKIE_NAME, signedFlow(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FLOW_SECONDS,
  });

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"));
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  return authorizationUrl.toString();
}

export async function consumeGoogleOAuthFlow(state: string | null): Promise<GoogleOAuthFlow | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);
  if (!value || !state) return null;

  const flow = parseFlow(value);
  if (!flow) return null;
  const expected = Buffer.from(flow.state);
  const actual = Buffer.from(state);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { state: flow.state, nonce: flow.nonce, verifier: flow.verifier, mode: flow.mode };
}

export async function exchangeGoogleCode(code: string, flow: GoogleOAuthFlow): Promise<string> {
  const config = getConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Google returned HTTP ${response.status} while exchanging the sign-in code.`);

  const tokens: unknown = await response.json();
  if (!tokens || typeof tokens !== "object" || !("id_token" in tokens) || typeof tokens.id_token !== "string") {
    throw new Error("Google did not return an ID token.");
  }
  return tokens.id_token;
}

export async function verifyGoogleIdentity(idToken: string, flow: GoogleOAuthFlow): Promise<GoogleIdentity> {
  const config = getConfig();
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    algorithms: ["RS256"],
    audience: config.clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    clockTolerance: 5,
    maxTokenAge: "10 minutes",
  });
  if (payload.nonce !== flow.nonce) throw new Error("Google returned an unexpected nonce.");
  if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.clientId) {
    throw new Error("Google returned an unexpected authorized party.");
  }
  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    payload.email_verified !== true
  ) {
    throw new Error("Google did not return a verified email identity.");
  }

  const email = payload.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    throw new Error("Google returned an invalid email address.");
  }
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "";
  return {
    subject: payload.sub,
    email,
    name: name.length >= 2 ? name : "Google user",
  };
}

