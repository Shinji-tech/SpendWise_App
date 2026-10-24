/**
 * Mock auth layer for the SpendWise frontend.
 *
 * Accounts and the session live in the browser's localStorage so every screen
 * is fully interactive without a backend. Replace the bodies of these
 * functions with real API calls (keeping the signatures) when your backend is ready.
 */

const USERS_KEY = "spendwise.users";
const SESSION_KEY = "spendwise.session";

export type Session = { name: string; email: string };
type StoredUser = Session & { passwordHash: string };

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function hash(value: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return `plain:${value}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readUsers(): StoredUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    throw new AuthError("Your browser blocked local storage, so we couldn't save your account.");
  }
}

function setSession(session: Session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function getSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Session> {
  await sleep(800);
  const email = input.email.trim().toLowerCase();
  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    throw new AuthError("An account with this email already exists. Try logging in instead.");
  }
  const session: Session = { name: input.name.trim(), email };
  writeUsers([...users, { ...session, passwordHash: await hash(input.password) }]);
  setSession(session);
  return session;
}

export async function loginUser(input: { email: string; password: string }): Promise<Session> {
  await sleep(700);
  const email = input.email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === email);
  if (!user || user.passwordHash !== (await hash(input.password))) {
    throw new AuthError("Incorrect email or password.");
  }
  const session: Session = { name: user.name, email: user.email };
  setSession(session);
  return session;
}

/**
 * Always resolves, whether or not the email has an account, so the screen never
 * reveals which emails are registered. Wire this to your real reset endpoint.
 */
export async function requestPasswordReset(_email: string): Promise<void> {
  await sleep(800);
}
